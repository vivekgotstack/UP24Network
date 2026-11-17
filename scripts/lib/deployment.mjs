import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync,openSync,closeSync,unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const deploymentDirectory=join(root,'.local/deployment');
export const composeArguments=['compose','--env-file','.local/deployment/deployment.env'];

function propertyValue(raw) {
  const value=raw.replace(/^[ \t\f]+/,'');let result='';
  for(let index=0;index<value.length;index++) {
    if(value[index]!=='\\') {result+=value[index];continue;}
    const escaped=value[++index];
    if(escaped===undefined) throw new Error('An incomplete property escape was found in configuration.');
    if(escaped==='u') {
      const code=value.slice(index+1,index+5);
      if(!/^[a-f0-9]{4}$/i.test(code)) throw new Error('An invalid Unicode property escape was found in configuration.');
      result+=String.fromCharCode(parseInt(code,16));index+=4;
    } else result+=({n:'\n',r:'\r',t:'\t',f:'\f'})[escaped]??escaped;
  }
  return result;
}
export function properties(file) {
  if(!existsSync(file)) return {};
  const result={};let continuation='';
  for(const raw of readFileSync(file,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)) {
    const line=continuation+(continuation?raw.replace(/^[ \t\f]+/,''):raw);
    if((line.match(/\\+$/)?.[0].length??0)%2) {continuation=line.slice(0,-1);continue;}
    continuation='';
    if(!line.trim() || /^\s*[#!]/.test(line) || !line.includes('=')) continue;
    result[line.slice(0,line.indexOf('=')).trim()]=propertyValue(line.slice(line.indexOf('=')+1));
  }
  if(continuation) throw new Error('An unfinished property continuation was found in configuration.');
  return result;
}
export function propertyText(settings) {
  const escape=value=>String(value).replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll('\r','\\r').replaceAll('\t','\\t').replaceAll('\f','\\f').replaceAll(' ','\\ ');
  return Object.entries(settings).map(([key,value])=>`${key}=${escape(value)}`).join('\n')+'\n';
}
export function privateDirectory(directory) {
  mkdirSync(directory,{recursive:true,mode:0o700});
  if(process.platform!=='win32') chmodSync(directory,0o700);
}
export function writePrivate(file,value,{containerReadable=true}={}) {
  privateDirectory(dirname(file));const temporary=file+'.new';
  writeFileSync(temporary,value,{mode:0o600});
  // Compose file-backed secrets retain host UID. Only the 0700 parent is exposed
  // to the operator; each service receives its own readable file mount.
  if(process.platform!=='win32') chmodSync(temporary,containerReadable?0o444:0o600);
  renameSync(temporary,file);
}
export async function checksum(file) {
  const hash=createHash('sha256');for await(const chunk of createReadStream(file)) hash.update(chunk);return hash.digest('hex');
}
export function docker(args,{inputFile,input,outputFile,capture=false,onStdout,allowFailure=false}={}) {
  return new Promise((resolveDone,reject)=>{
    const child=spawn('docker',args,{cwd:root,windowsHide:true,stdio:[inputFile||input!==undefined?'pipe':'ignore',outputFile??(capture||onStdout?'pipe':'inherit'),capture?'pipe':'inherit']});
    let stdout='',stderr='',settled=false;
    const fail=error=>{if(!settled){settled=true;reject(error);}};
    child.once('error',()=>fail(new Error('Docker could not be started. Install Docker Engine with the Compose plugin.')));
    if(capture) {
      child.stdout.on('data',chunk=>{stdout+=chunk.toString();if(stdout.length>2*1024*1024){child.kill();fail(new Error('Docker output exceeded its bounded limit.'));}});
      child.stderr.on('data',chunk=>{stderr+=chunk.toString();if(stderr.length>65536)stderr=stderr.slice(-65536);});
    }
    if(onStdout)child.stdout.on('data',chunk=>{try{onStdout(chunk);}catch(error){child.kill();fail(error);}});
    if(inputFile) {const stream=createReadStream(inputFile);stream.once('error',fail);child.stdin.on('error',()=>{});stream.pipe(child.stdin);}
    else if(input!==undefined) {child.stdin.on('error',()=>{});child.stdin.end(input);}
    child.once('close',code=>{
      if(settled)return;settled=true;
      if(code!==0&&!allowFailure)reject(new Error(`Docker command failed (${code}).${capture&&stderr.trim()?' '+stderr.trim():''}`));
      else resolveDone({code,stdout,stderr});
    });
  });
}
export function compose(args,options) {return docker([...composeArguments,...args],options);}
export function argument(name) {return process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);}
export function deploymentLock() {
  privateDirectory(join(root,'.local'));
  const path=join(root,'.local/deployment.lifecycle.lock');let descriptor;
  try {descriptor=openSync(path,'wx',0o600);writeFileSync(descriptor,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})+'\n');}
  catch {throw new Error('Another deployment operation owns .local/deployment.lifecycle.lock. If it crashed, verify its process has stopped before removing that lock.');}
  return ()=>{closeSync(descriptor);unlinkSync(path);};
}
