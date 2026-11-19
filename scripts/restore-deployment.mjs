import { existsSync,readFileSync,readdirSync,cpSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join,resolve } from 'node:path';
import { root,deploymentDirectory,compose,argument,deploymentLock,privateDirectory,writePrivate,properties,propertyText,prepareRedisCache } from './lib/deployment.mjs';
import { verifyRecovery,pauseWriters } from './lib/recovery.mjs';

const requested=argument('from');
if(!requested)throw new Error('Use --from=/absolute/path/to/recovery-point --verify-only to inspect a backup, or --replace-existing to restore it.');
const source=resolve(requested),manifest=await verifyRecovery(source);
if(process.argv.includes('--verify-only')) {
  console.log('Recovery file checksums verified. PostgreSQL major '+manifest.postgresMajor+'; created '+manifest.createdAt+'. No deployment data was changed.');
  process.exit(0);
}
if(!process.argv.includes('--replace-existing'))throw new Error('Restoration replaces the current database and media. Take a current backup, then explicitly pass --replace-existing.');
const release=deploymentLock();
const token=randomUUID();
let restored=false;
try {
  if(existsSync(join(deploymentDirectory,'deployment.env'))) {
    await pauseWriters();
    const safety=join(root,'.local/restore-safety',new Date().toISOString().replace(/[:.]/g,'-'));privateDirectory(safety);
    cpSync(deploymentDirectory,join(safety,'deployment'),{recursive:true});
  }
  privateDirectory(deploymentDirectory);
  for(const name of readdirSync(join(source,'deployment')))writePrivate(join(deploymentDirectory,name),readFileSync(join(source,'deployment',name)));
  const backendConfig=join(deploymentDirectory,'backend.properties');
  const settings=properties(backendConfig);
  prepareRedisCache(settings);
  writePrivate(backendConfig,propertyText(settings));
  await compose(['config','--quiet'],{capture:true});
  await compose(['build','backend']);
  await compose(['up','-d','--force-recreate','--wait','--wait-timeout','180','db','rabbitmq','redis']);
  const version=await compose(['exec','-T','db','psql','-X','-At','--username=postgres','--dbname=up24network','-c','SHOW server_version_num'],{capture:true});
  if(Math.floor(Number(version.stdout.trim())/10000)!==manifest.postgresMajor)throw new Error('Restore using the PostgreSQL major version recorded by the recovery point before performing a separate database-version upgrade.');
  // Validate every tar header before extraction. Only regular files/directories
  // and relative paths beneath the upload volume are accepted; links are rejected.
  let pending='';
  const inspect=chunk=>{
    pending+=chunk.toString();let end;
    while((end=pending.indexOf('\n'))>=0) {
      const line=pending.slice(0,end).trim();pending=pending.slice(end+1);if(!line)continue;
      const path=line.split(/\s+/).at(-1);
      if(!['-','d'].includes(line[0])||!/^\.?\/?[a-zA-Z0-9._/-]*$/.test(path)||path.startsWith('/')||path.split('/').includes('..')||path.startsWith('./.before-restore-')||path.startsWith('./.restore-'))
        throw new Error('Unsafe or unsupported media archive entry.');
    }
    if(pending.length>8192)throw new Error('Media archive contains an oversized entry.');
  };
  await compose(['run','--rm','--no-deps','-T','--entrypoint','tar','backend','-tvzf','-'],{inputFile:join(source,'uploads.tar.gz'),onStdout:inspect});
  if(pending.trim())inspect(Buffer.from('\n'));
  const staging='/app/uploads/.restore-'+token;
  await compose(['run','--rm','--no-deps','-T','--entrypoint','mkdir','backend','-p',staging]);
  await compose(['run','--rm','--no-deps','-T','--entrypoint','tar','backend','-xzf','-','-C',staging],{inputFile:join(source,'uploads.tar.gz')});
  // Role material comes from this same recovery point. Password values travel
  // over stdin, never shell interpolation, command arguments or console output.
  await compose(['exec','-T','db','sh','/docker-entrypoint-initdb.d/01-roles.sh']);
  const postgres=readFileSync(join(deploymentDirectory,'postgres-password'),'utf8').trim();
  if(!/^[a-f0-9]{48,128}$/i.test(postgres))throw new Error('Invalid PostgreSQL secret in recovery material.');
  await compose(['exec','-T','db','psql','-X','-q','-v','ON_ERROR_STOP=1','--username=postgres','--dbname=up24network'],{
    input:"SET log_min_duration_statement=-1; SET log_min_error_statement=panic; ALTER ROLE postgres PASSWORD '"+postgres+"';\n"});
  await compose(['exec','-T','-e','PGOPTIONS=-c lock_timeout=10000','db','pg_restore','--username=postgres','--role=up24_migrator','--dbname=up24network','--clean','--if-exists','--no-owner','--no-privileges','--single-transaction','--exit-on-error'],{inputFile:join(source,'database.dump')});
  // The runtime role never receives migration-history access during recovery.
  await compose(['exec','-T','db','psql','-X','-q','-v','ON_ERROR_STOP=1','--username=postgres','--dbname=up24network'],{
    input:readFileSync(join(root,'backend/src/main/resources/db/callback/afterMigrate.sql'),'utf8')});
  const swap=`set -eu
cd /app/uploads
mkdir .before-restore-${token}
for entry in ./* ./.[!.]* ./..?*; do
  [ -e "$entry" ] || continue
  case "$entry" in ./.restore-${token}|./.before-restore-${token}) continue;; esac
  mv -- "$entry" ./.before-restore-${token}/
done
for entry in ./.restore-${token}/* ./.restore-${token}/.[!.]* ./.restore-${token}/..?*; do
  [ -e "$entry" ] || continue
  mv -- "$entry" ./
done
rmdir ./.restore-${token}
`;
  await compose(['run','--rm','--no-deps','-T','--entrypoint','sh','backend','-s'],{input:swap});
  // Rabbit messages contain UUIDs only; the restored DB is the authoritative
  // outbox. Resetting the broker also restores the matching private credential.
  await compose(['exec','-T','rabbitmq','rabbitmqctl','stop_app']);
  await compose(['exec','-T','rabbitmq','rabbitmqctl','reset']);
  await compose(['exec','-T','rabbitmq','rabbitmqctl','start_app']);
  await compose(['exec','-T','db','psql','-X','-q','-v','ON_ERROR_STOP=1','--username=postgres','--dbname=up24network'],{
    input:"DO $$ BEGIN IF to_regclass('public.background_job') IS NOT NULL THEN UPDATE public.background_job SET state='PENDING',lease_token=NULL,lease_until=NULL,next_attempt_at=CURRENT_TIMESTAMP WHERE state IN ('DISPATCHED','RUNNING') AND expires_at>CURRENT_TIMESTAMP AND attempts<5; END IF; END $$;\n"});
  await compose(['up','--build','-d','--wait','--wait-timeout','240']);restored=true;
  console.log('Recovery completed. Previous local media remains in /app/uploads/.before-restore-'+token+' until you verify and remove it. S3 objects must be recovered through their independent backup/versioning policy.');
} finally {
  release();
  if(!restored)console.error('Recovery stopped before completion. Application writers were left stopped where possible; inspect the failure and retained recovery directories before restarting.');
}
