import { mkdirSync, openSync, closeSync, cpSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=join(root,'.local/backups',new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(destination,{recursive:true,mode:0o700});
writeFileSync(join(destination,'INCOMPLETE'),'Backup did not finish. Do not use it as a complete recovery point.\n',{mode:0o600});
async function capture(args,name) {
  const file=openSync(join(destination,name),'w',0o600);
  try {
    await new Promise((resolveDone,reject) => {
      const child=spawn('docker',['compose','--env-file','.local/deployment/deployment.env',...args],{cwd:root,stdio:['ignore',file,'inherit']});
      child.once('error',reject); child.once('close',code=>code===0?resolveDone():reject(new Error(`Backup failed: ${name}`)));
    });
  } finally {closeSync(file);}
}
// Share the media catalogue's lock while taking the DB snapshot and copying files.
// Readers and publishing continue; uploads/removals wait instead of producing a
// recovery point whose database refers to a photograph deleted during its backup.
const lock=spawn('docker',['compose','--env-file','.local/deployment/deployment.env','exec','-T','db',
  'psql','-X','-q','-v','ON_ERROR_STOP=1','--username=postgres','--dbname=up24network'],
  {cwd:root,stdio:['pipe','pipe','inherit']});
let lockOutput='';
const closed=new Promise((resolveDone,reject) => {
  lock.once('error',reject);
  lock.once('close',code=>code===0?resolveDone():reject(new Error('The backup storage lock was lost.')));
});
// Attach a handler immediately: failed child processes must not become unhandled rejections.
closed.catch(()=>{});
const locked=new Promise(resolveDone => lock.stdout.on('data',chunk=>{
  lockOutput+=chunk.toString();
  if(lockOutput.includes('UP24_BACKUP_LOCKED')) resolveDone();
  if(lockOutput.length>4096) lockOutput=lockOutput.slice(-4096);
}));
lock.stdin.on('error',()=>{});
lock.stdin.write("BEGIN;\nSET LOCAL lock_timeout='30s';\nSELECT pg_advisory_xact_lock(8524,1301);\n\\echo UP24_BACKUP_LOCKED\n");
let timeout;
try {
  await Promise.race([locked,closed.then(()=>{throw new Error('The storage lock ended before the backup started.');}),
    new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Timed out waiting for the storage snapshot lock.')),45000);})]);
  clearTimeout(timeout);
  await Promise.race([(async()=>{
    await capture(['exec','-T','db','pg_dump','--username=postgres','--format=custom','--compress=lz4:1','up24network'],'database.dump');
    await capture(['exec','-T','backend','tar','-czf','-','-C','/app/uploads','.'],'uploads.tar.gz');
  })(),closed.then(()=>{throw new Error('The storage lock ended during backup.');})]);
} finally {
  clearTimeout(timeout);
  lock.stdin.end('ROLLBACK;\n');
  await closed;
}
cpSync(join(root,'.local/deployment'),join(destination,'deployment'),{recursive:true});
writeFileSync(join(destination,'COMPLETE'),'Database, media and deployment secrets captured. Keep this directory private and copy it off the VPS.\n',{mode:0o600});
unlinkSync(join(destination,'INCOMPLETE'));
console.log('Private recovery point created: '+destination);
