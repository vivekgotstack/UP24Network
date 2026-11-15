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
await capture(['exec','-T','db','pg_dump','--username=postgres','--format=custom','--compress=lz4:1','up24network'],'database.dump');
await capture(['exec','-T','backend','tar','-czf','-','-C','/app/uploads','.'],'uploads.tar.gz');
cpSync(join(root,'.local/deployment'),join(destination,'deployment'),{recursive:true});
writeFileSync(join(destination,'COMPLETE'),'Database, media and deployment secrets captured. Keep this directory private and copy it off the VPS.\n',{mode:0o600});
unlinkSync(join(destination,'INCOMPLETE'));
console.log('Private recovery point created: '+destination);
