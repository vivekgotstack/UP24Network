import { cpSync,unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { root,deploymentDirectory,compose,deploymentLock,writePrivate } from './lib/deployment.mjs';
import { captureFile,createManifest,pauseWriters,resumeWriters,recoveryDirectory } from './lib/recovery.mjs';

const release=deploymentLock();
const destination=join(root,'.local/backups',new Date().toISOString().replace(/[:.]/g,'-'));
let services=[];
try {
  await compose(['config','--quiet'],{capture:true});
  recoveryDirectory(destination);
  console.log('Pausing application writers for a consistent database/local-media snapshot. PostgreSQL and RabbitMQ remain running.');
  await pauseWriters(identified=>{services=identified;});
  const version=await compose(['exec','-T','db','psql','-X','-At','--username=postgres','--dbname=up24network','-c','SHOW server_version_num'],{capture:true});
  await captureFile(['exec','-T','db','pg_dump','--username=postgres','--format=custom','--compress=lz4:1','up24network'],join(destination,'database.dump'));
  await captureFile(['run','--rm','--no-deps','-T','--entrypoint','tar','backend','--exclude=./.before-restore-*','--exclude=./.restore-*','-czf','-','-C','/app/uploads','.'],join(destination,'uploads.tar.gz'));
  cpSync(deploymentDirectory,join(destination,'deployment'),{recursive:true});
  await createManifest(destination,version.stdout.trim());
  writePrivate(join(destination,'COMPLETE'),'Database, local media/private video sources and deployment secrets captured with SHA-256 checksums. S3 object bytes are not included. Keep this private recovery point off the VPS.\n',{containerReadable:false});
  unlinkSync(join(destination,'INCOMPLETE'));
  console.log('Checksummed private recovery point: '+destination);
} finally {
  try {await resumeWriters(services);} finally {release();}
}
