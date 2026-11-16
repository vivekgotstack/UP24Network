import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, createWriteStream, createReadStream, openSync, closeSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const tools=join(root,'.local/android-tools');
const upload=join(root,'.local/android-upload');
mkdirSync(tools,{recursive:true,mode:0o700}); mkdirSync(upload,{recursive:true,mode:0o700});
const windows=process.platform==='win32';
const site=new URL(process.argv.find(arg=>arg.startsWith('--site='))?.slice(7) ?? 'https://www.up24network.com');
if (site.protocol!=='https:' || site.pathname!=='/' || site.search || site.hash || site.username || site.password || site.port) throw new Error('Use a public HTTPS origin without a path.');
const versionCode=process.argv.find(arg=>arg.startsWith('--version-code='))?.slice(15) ?? '1';
const versionName=process.argv.find(arg=>arg.startsWith('--version-name='))?.slice(15) ?? '1.0.0';
if (!/^[1-9][0-9]{0,8}$/.test(versionCode) || !/^[0-9]+(?:\.[0-9]+){1,3}$/.test(versionName)) throw new Error('Use a positive version code and numeric dotted version name.');
function inside(file) { const path=resolve(file); if (!path.startsWith(root+sep)) throw new Error('Tool path escaped this workspace.'); return path; }
function run(program,args,options={}) {
  let executable=program, commandArgs=args;
  if (windows && /\.(bat|cmd)$/i.test(program)) {
    const literal=value=>"'"+value.replaceAll("'","''")+"'";
    const script="$ProgressPreference='SilentlyContinue'; & "+literal(program)+' '+args.map(literal).join(' ')+'; exit $LASTEXITCODE';
    executable='powershell.exe'; commandArgs=['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
  }
  const result=spawnSync(executable,commandArgs,{cwd:join(root,'android'),env:{...process.env,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk,ANDROID_USER_HOME:join(tools,'user-home'),GRADLE_USER_HOME:join(tools,'gradle-home')},stdio:'inherit',...options});
  if (result.status!==0) throw new Error(`Command failed: ${program}. Review .local/android-tools build logs if present.`);
  return result;
}
async function download(url,file,checksum,algorithm='sha256') {
  if (existsSync(file)) {
    if (!checksum) return;
    const hash=createHash(algorithm); for await (const chunk of createReadStream(file)) hash.update(chunk);
    if (hash.digest('hex')===checksum.toLowerCase()) return;
  }
  console.log('Downloading official build tool: '+new URL(url).pathname.split('/').at(-1));
  const response=await fetch(url,{signal:AbortSignal.timeout(600000)});
  if (!response.ok || !response.body) throw new Error(`Tool download failed (${response.status}): ${url}`);
  const temporary=inside(file+'.download');
  await pipeline(Readable.fromWeb(response.body),createWriteStream(temporary,{mode:0o600}));
  if (checksum) {
    const hash=createHash(algorithm); for await (const chunk of createReadStream(temporary)) hash.update(chunk);
    if (hash.digest('hex')!==checksum.toLowerCase()) throw new Error('Downloaded tool checksum did not match official metadata.');
  }
  renameSync(temporary,file);
}
function extract(archive,destination) {
  inside(archive); inside(destination); mkdirSync(destination,{recursive:true});
  if (windows) {
    const literal=value=>"'"+value.replaceAll("'","''")+"'";
    const script=`$ProgressPreference='SilentlyContinue'; Expand-Archive -LiteralPath ${literal(archive)} -DestinationPath ${literal(destination)} -Force`;
    const result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{stdio:'inherit'});
    if (result.status!==0) throw new Error('Could not unpack official Android tools.');
  } else if(spawnSync('unzip',['-q','-o',archive,'-d',destination],{stdio:'inherit'}).status!==0) throw new Error('Install unzip to unpack Android tools.');
}

const sdk=process.env.ANDROID_HOME || join(tools,'sdk');
const androidCli=join(sdk,'cmdline-tools/latest/bin',windows?'android.exe':'android');
let gradle=join(tools,'gradle-9.6.0/bin',windows?'gradle.bat':'gradle');
if (!existsSync(androidCli) || !existsSync(gradle)) {
  if (!process.argv.includes('--setup')) throw new Error('Build tools are not installed. Run again with --setup to install the official SDK and Gradle locally.');
  if (!existsSync(androidCli)) {
    const metadata=await (await fetch('https://dl.google.com/android/repository/repository2-1.xml')).text();
    const packages=[...metadata.matchAll(/<remotePackage\b[^>]*path="([^"]+)"[\s\S]*?<\/remotePackage>/g)];
    const candidate=packages.find(entry=>entry[1]==='cmdline-tools;latest') ?? packages.filter(entry=>/^cmdline-tools;[0-9.]+$/.test(entry[1]) && /channel-0/.test(entry[0])).sort((a,b)=>parseFloat(b[1].split(';')[1])-parseFloat(a[1].split(';')[1]))[0];
    if (!candidate) throw new Error('Official command-line tools metadata is unavailable.');
    const archives=[...candidate[0].matchAll(/<archive>[\s\S]*?<\/archive>/g)];
    const platform=windows?'windows':process.platform==='darwin'?'macosx':'linux';
    const archive=archives.find(entry=>entry[0].includes(`<host-os>${platform}</host-os>`))?.[0];
    const filename=archive?.match(/<url>([^<]+)<\/url>/)?.[1];
    const checksum=archive?.match(/<checksum(?: type="([^"]+)")?>([^<]+)<\/checksum>/);
    if (!filename || !checksum) throw new Error('Official SDK archive or checksum missing.');
    const zip=join(tools,filename); await download('https://dl.google.com/android/repository/'+filename,zip,checksum[2],checksum[1] ?? (checksum[2].length===40?'sha1':'sha256'));
    const unpack=join(tools,'cmdline-extract'); extract(zip,unpack);
    const target=inside(join(sdk,'cmdline-tools/latest')); mkdirSync(dirname(target),{recursive:true});
    renameSync(inside(join(unpack,'cmdline-tools')),target);
  }
  if (!existsSync(gradle)) {
    const url='https://services.gradle.org/distributions/gradle-9.6.0-bin.zip';
    const checksum=await (await fetch(url+'.sha256')).text();
    if (!/^[a-f0-9]{64}\s*$/i.test(checksum)) throw new Error('Official Gradle checksum is unavailable.');
    const zip=join(tools,'gradle-9.6.0-bin.zip'); await download(url,zip,checksum.trim()); extract(zip,tools);
  }
}
if (!existsSync(join(sdk,'platforms/android-37/android.jar')) || !existsSync(join(sdk,'build-tools/37.0.0'))) {
  if (!process.argv.includes('--setup')) throw new Error('Android SDK 37 is missing. Run with --setup.');
  const log=openSync(join(tools,'sdk-install.log'),'a',0o600);
  try {
    console.log('Installing official SDK 37/build tools; progress is in .local/android-tools/sdk-install.log.');
    for (const name of ['platforms/android-37','build-tools/37.0.0'])
      run(androidCli,['--no-metrics',`--sdk=${sdk}`,'sdk','install',name],{input:'y\n'.repeat(100),stdio:['pipe',log,log]});
  } finally { closeSync(log); }
}
const signingFile=join(upload,'signing.properties');
const keystore=join(upload,'upload.p12');
if (!existsSync(keystore)) {
  const password=randomBytes(32).toString('hex');
  const keytool=process.env.JAVA_HOME?join(process.env.JAVA_HOME,'bin',windows?'keytool.exe':'keytool'):'keytool';
  const result=spawnSync(keytool,['-genkeypair','-alias','upload','-keyalg','RSA','-keysize','3072','-validity','10000','-storetype','PKCS12',
    '-keystore',keystore,'-storepass:env','UP24_ANDROID_UPLOAD_PASSWORD','-dname','CN=UP24Network Android Upload','-noprompt'],
    {env:{...process.env,UP24_ANDROID_UPLOAD_PASSWORD:password},stdio:'ignore'});
  if (result.status!==0) throw new Error('Could not generate the private Android upload key.');
  writeFileSync(signingFile,`storeFile=${keystore.replaceAll('\\','/')}\nstorePassword=${password}\nkeyAlias=upload\nkeyPassword=${password}\n`,{mode:0o600});
} else if (!existsSync(signingFile)) throw new Error('The upload key exists without its signing configuration. Restore both files from your private backup.');
const keyProperties=Object.fromEntries(readFileSync(signingFile,'utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
const keytool=process.env.JAVA_HOME?join(process.env.JAVA_HOME,'bin',windows?'keytool.exe':'keytool'):'keytool';
const cert=spawnSync(keytool,['-exportcert','-alias','upload','-keystore',keystore,'-storepass:env','UP24_ANDROID_UPLOAD_PASSWORD'],
  {env:{...process.env,UP24_ANDROID_UPLOAD_PASSWORD:keyProperties.storePassword},stdio:['ignore','pipe','ignore']});
if (cert.status!==0) throw new Error('Could not read the upload certificate.');
const fingerprint=createHash('sha256').update(cert.stdout).digest('hex').toUpperCase().match(/.{2}/g).join(':');
writeFileSync(join(upload,'certificate-sha256.txt'),fingerprint+'\n',{mode:0o600});
const deploymentEnv=join(root,'.local/deployment/deployment.env');
if (existsSync(deploymentEnv)) {
  const previous=readFileSync(deploymentEnv,'utf8');
  const line=previous.match(/^ANDROID_SHA256_CERT_FINGERPRINTS=(.*)$/m);
  if (!line || !line[1].trim()) writeFileSync(deploymentEnv,previous.replace(/^ANDROID_SHA256_CERT_FINGERPRINTS=.*$/m,'ANDROID_SHA256_CERT_FINGERPRINTS='+fingerprint),{mode:0o600});
}
console.log('Building signed Android App Bundle with the local upload key.');
run(gradle,['--no-daemon','--console=plain',`-Pup24SiteOrigin=${site.origin}`,`-Pup24VersionCode=${versionCode}`,`-Pup24VersionName=${versionName}`,'bundleRelease']);
console.log('Bundle: android/app/build/outputs/bundle/release/app-release.aab');
console.log('Upload certificate: .local/android-upload/certificate-sha256.txt. For Play App Signing, configure the distribution certificate from Play Console too.');
