import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = join(root, '.local/deployment');
mkdirSync(directory, { recursive: true, mode: 0o700 });
if (process.platform !== 'win32') chmodSync(directory, 0o700);
// Backend files use Spring/Java properties syntax, including escaped secret values.
// Decode values before re-encoding them, so a password does not change on deployment.
function propertyValue(raw) {
  const text=raw.replace(/^[ \t\f]+/,'');
  let result='';
  for(let index=0;index<text.length;index++) {
    if(text[index]!=='\\') { result+=text[index]; continue; }
    const escaped=text[++index];
    if(escaped===undefined) throw new Error('An incomplete property escape was found in local configuration.');
    if(escaped==='u') {
      const code=text.slice(index+1,index+5);
      if(!/^[a-f0-9]{4}$/i.test(code)) throw new Error('An invalid Unicode property escape was found in local configuration.');
      result+=String.fromCharCode(parseInt(code,16)); index+=4;
    } else result+=({n:'\n',r:'\r',t:'\t',f:'\f'})[escaped] ?? escaped;
  }
  return result;
}
function properties(file) {
  if(!existsSync(file)) return {};
  const lines=[]; let continuation='';
  for(const raw of readFileSync(file,'utf8').split(/\r?\n/)) {
    const line=continuation+(continuation?raw.replace(/^[ \t\f]+/,''):raw);
    const slashes=line.match(/\\+$/)?.[0].length ?? 0;
    if(slashes%2) { continuation=line.slice(0,-1); continue; }
    continuation='';
    if(line.trim() && !/^\s*[#!]/.test(line) && line.includes('=')) lines.push(line);
  }
  if(continuation) throw new Error('An unfinished property continuation was found in local configuration.');
  return Object.fromEntries(lines.map(line=>[line.slice(0,line.indexOf('=')).trim(),propertyValue(line.slice(line.indexOf('=')+1))]));
}
const environment = properties(join(root,'backend/.env'));
const existing = properties(join(directory,'backend.properties'));
const local = Object.assign({}, ...['application','providers','mail'].map(name => properties(join(root,`backend/.local/${name}.properties`))));
const secret = (name, bytes=24) => {
  const file=join(directory,name);
  if (existsSync(file)) return readFileSync(file,'utf8').trim();
  const value=randomBytes(bytes).toString('hex'); writePrivate(file,value+'\n'); return value;
};
function writePrivate(file, value) {
  const temporary=file+'.new';
  writeFileSync(temporary,value,{mode:0o600});
  // A private 0700 parent prevents host access; mounted files must be readable by
  // each container's non-root user. Compose file-backed secrets do not remap UID.
  if (process.platform !== 'win32') chmodSync(temporary,0o444);
  renameSync(temporary,file);
}
const previousPublic=properties(join(directory,'deployment.env'));
const requestedSite=process.argv.find(value => value.startsWith('--site='))?.slice(7) ?? previousPublic.SITE_URL ?? 'https://www.up24network.com';
const site=new URL(requestedSite);
if (site.protocol!=='https:' || site.pathname!=='/' || site.search || site.hash || site.username || site.password || site.port)
  throw new Error('Use a public HTTPS origin without a path or custom port, e.g. --site=https://www.up24network.com');
const adminEmail=process.env.ADMIN_EMAIL ?? environment.ADMIN_EMAIL;
const adminPassword=process.env.ADMIN_PASSWORD ?? environment.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first.');
if(adminPassword.length<12 || adminPassword.length>64 || Buffer.byteLength(adminPassword,'utf8')>72)
  throw new Error('ADMIN_PASSWORD must use 12-64 characters and at most 72 UTF-8 bytes.');
secret('postgres-password');
const applicationPassword=secret('application-db-password');
const migrationPassword=secret('migration-db-password');
const signingPath=join(directory,'jwt-signing.p12');
let signingPassword=existing['up24.auth.key-store-password'];
if (!existsSync(signingPath)) {
  signingPassword=randomBytes(32).toString('hex');
  const keytool=process.env.JAVA_HOME ? join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'keytool.exe':'keytool') : 'keytool';
  const generated=spawnSync(keytool,['-genkeypair','-alias','up24','-keyalg','RSA','-keysize','3072','-validity','3650',
    '-storetype','PKCS12','-keystore',signingPath,'-storepass:env','UP24_DEPLOY_KEY_PASSWORD','-dname','CN=UP24Network Signing','-noprompt'],
    {env:{...process.env,UP24_DEPLOY_KEY_PASSWORD:signingPassword},stdio:'ignore'});
  if (generated.status!==0) throw new Error('Could not create deployment signing key. Install JDK 21+ and set JAVA_HOME.');
  if (process.platform !== 'win32') chmodSync(signingPath,0o444);
} else if (!signingPassword) throw new Error('Signing key exists without its password. Restore .local/deployment/backend.properties.');
const settings={
  'spring.datasource.url':'jdbc:postgresql://db:5432/up24network', 'spring.datasource.username':'up24_app', 'spring.datasource.password':applicationPassword,
  'spring.flyway.url':'jdbc:postgresql://db:5432/up24network', 'spring.flyway.user':'up24_migrator','spring.flyway.password':migrationPassword,
  'up24.bootstrap.admin-email':adminEmail,'up24.bootstrap.admin-password':adminPassword,'up24.newsroom.admin-email':adminEmail,
  'up24.newsroom.otp-secret':existing['up24.newsroom.otp-secret'] ?? randomBytes(32).toString('hex'),
  'up24.auth.key-store':'file:/run/secrets/jwt-signing.p12','up24.auth.key-store-password':signingPassword,
  'up24.auth.cookie-secure':'true','up24.auth.issuer':site.origin+'/identity',
};
for (const key of ['up24.providers.brevo.api-key','up24.providers.brevo.sender-email','up24.providers.astrologics.api-key']) {
  const value=local[key] || existing[key]; if (value) settings[key]=value;
}
const escape = value => String(value).replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll('\r','\\r').replaceAll('\t','\\t').replaceAll('\f','\\f').replaceAll(' ','\\ ');
writePrivate(join(directory,'backend.properties'),Object.entries(settings).map(([key,value])=>`${key}=${escape(value)}`).join('\n')+'\n');
const publicConfig={SITE_URL:site.origin,SITE_HOST:site.hostname,SITE_INDEXABLE:previousPublic.SITE_INDEXABLE ?? 'false',
  ANDROID_SHA256_CERT_FINGERPRINTS:previousPublic.ANDROID_SHA256_CERT_FINGERPRINTS ?? ''};
writePrivate(join(directory,'deployment.env'),Object.entries(publicConfig).map(([key,value])=>`${key}=${value}`).join('\n')+'\n');
console.log('Deployment configuration prepared in ignored .local/deployment; existing secrets were preserved.');
console.log('Copy that private directory with the project to your VPS; protect it with owner-only directory access.');
console.log('Start: docker compose --env-file .local/deployment/deployment.env up --build -d');
console.log('Enable indexing by setting SITE_INDEXABLE=true after verifying the deployed domain.');
