import { openSync,closeSync,readdirSync,existsSync,readFileSync,lstatSync } from 'node:fs';
import { join,resolve,relative } from 'node:path';
import { compose,checksum,privateDirectory,writePrivate } from './deployment.mjs';

export async function captureFile(args,file) {
  const descriptor=openSync(file,'w',0o600);
  try {await compose(args,{outputFile:descriptor});} finally {closeSync(descriptor);}
}
function regularFiles(directory,prefix='') {
  const result=[];
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const name=prefix+entry.name,path=join(directory,entry.name);
    if(entry.isSymbolicLink())throw new Error('Recovery material must not contain symbolic links.');
    if(entry.isDirectory())result.push(...regularFiles(path,name+'/'));
    else if(entry.isFile())result.push(name);
    else throw new Error('Unsupported recovery file type.');
  }
  return result;
}
export async function createManifest(directory,postgresVersion) {
  const files={};
  for(const name of ['database.dump','uploads.tar.gz',...regularFiles(join(directory,'deployment')).map(name=>'deployment/'+name)])
    files[name]=await checksum(join(directory,name));
  const manifest={format:1,createdAt:new Date().toISOString(),postgresMajor:Math.floor(Number(postgresVersion)/10000),
    media:'Local objects and private video sources. S3 bytes require their independent recovery policy.',files};
  writePrivate(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{containerReadable:false});
}
export async function verifyRecovery(directory) {
  if(!existsSync(join(directory,'COMPLETE'))||existsSync(join(directory,'INCOMPLETE'))||!existsSync(join(directory,'manifest.json')))
    throw new Error('Choose a complete checksummed recovery point, not an incomplete or legacy backup.');
  const manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
  if(manifest.format!==1||!Number.isInteger(manifest.postgresMajor)||!manifest.files||typeof manifest.files!=='object')throw new Error('Unsupported recovery manifest.');
  const required=['database.dump','uploads.tar.gz','deployment/backend.properties','deployment/deployment.env','deployment/jwt-signing.p12',
    'deployment/postgres-password','deployment/application-db-password','deployment/migration-db-password','deployment/rabbitmq-password','deployment/rabbitmq.conf','deployment/job-encryption-secret'];
  for(const file of required)if(!manifest.files[file])throw new Error('Recovery point is missing '+file+'.');
  for(const [name,expected]of Object.entries(manifest.files)) {
    if(!/^(database\.dump|uploads\.tar\.gz|deployment\/[a-zA-Z0-9._-]+)$/.test(name)||!/^[a-f0-9]{64}$/.test(expected))throw new Error('Unsafe recovery manifest entry.');
    const path=resolve(directory,name),inside=relative(resolve(directory),path);
    if(inside.startsWith('..')||lstatSync(path).isSymbolicLink())throw new Error('Recovery paths must stay inside the selected recovery point.');
    if(await checksum(path)!==expected)throw new Error('Recovery checksum failed for '+name+'.');
  }
  return manifest;
}
export async function pauseWriters(identified=()=>{}) {
  const running=await compose(['ps','--status','running','--services'],{capture:true});
  const services=running.stdout.split(/\r?\n/).filter(name=>['frontend','backend'].includes(name));
  identified(services);
  if(services.length)await compose(['stop','--timeout','40',...services]);
  return services;
}
export async function resumeWriters(services) {if(services.length)await compose(['up','-d','--no-deps','--wait','--wait-timeout','180',...services]);}
export function recoveryDirectory(directory) {privateDirectory(directory);writePrivate(join(directory,'INCOMPLETE'),'Recovery point has not completed.\n',{containerReadable:false});}
