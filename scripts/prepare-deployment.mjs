import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root,deploymentDirectory as directory,properties,propertyText,privateDirectory,writePrivate,deploymentLock,prepareRedisCache } from './lib/deployment.mjs';

const release=deploymentLock();
try {
privateDirectory(directory);
const environment = properties(join(root,'backend/.env'));
const existing = properties(join(directory,'backend.properties'));
const local = Object.assign({}, ...['application','providers','mail'].map(name => properties(join(root,`backend/.local/${name}.properties`))));
const secret = (name, bytes=24) => {
  const file=join(directory,name);
  if (existsSync(file)) {
    const value=readFileSync(file,'utf8').trim();
    if(!/^[a-f0-9]{48,128}$/i.test(value))throw new Error(`Restore the invalid ${name} from your private backup.`);
    return value;
  }
  const value=randomBytes(bytes).toString('hex'); writePrivate(file,value+'\n'); return value;
};
const previousPublic=properties(join(directory,'deployment.env'));
const frontendProduction=properties(join(root,'frontend/.env.production'));
const requestedSite=process.argv.find(value => value.startsWith('--site='))?.slice(7) ?? process.env.SITE_URL ?? frontendProduction.SITE_URL ?? previousPublic.SITE_URL ?? 'https://www.up24network.com';
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
const rabbitPassword=secret('rabbitmq-password',32);
const requestedJobSecret=process.env.JOB_ENCRYPTION_SECRET||environment.JOB_ENCRYPTION_SECRET;
if(requestedJobSecret&&!/^[a-f0-9]{64}$/i.test(requestedJobSecret))throw new Error('JOB_ENCRYPTION_SECRET must be 32 bytes encoded as 64 hexadecimal characters.');
if(requestedJobSecret&&!existsSync(join(directory,'job-encryption-secret')))writePrivate(join(directory,'job-encryption-secret'),requestedJobSecret+'\n');
const jobSecret=secret('job-encryption-secret',32);
if(requestedJobSecret&&jobSecret!==requestedJobSecret)throw new Error('The job encryption key differs from the existing deployment key. Drain pending jobs before explicitly rotating the matching private key files.');
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
  'up24.jobs.encryption-secret':jobSecret,'up24.jobs.transport':'rabbitmq',
  'spring.rabbitmq.host':'rabbitmq','spring.rabbitmq.port':'5672','spring.rabbitmq.username':'up24','spring.rabbitmq.password':rabbitPassword,'spring.rabbitmq.virtual-host':'up24',
  'up24.auth.key-store':'file:/run/secrets/jwt-signing.p12','up24.auth.key-store-password':signingPassword,
  'up24.auth.cookie-secure':'true','up24.auth.issuer':site.origin+'/identity',
  'up24.public-site-url':site.origin,
};
for (const [variable,key] of Object.entries({BREVO_API_KEY:'up24.providers.brevo.api-key',BREVO_SENDER_EMAIL:'up24.providers.brevo.sender-email',ASTROLOGICS_API_KEY:'up24.providers.astrologics.api-key',YOUTUBE_API_KEY:'up24.providers.youtube.api-key',WEATHERBIT_API_KEY:'up24.providers.weatherbit.api-key'})) {
  const value=process.env[variable] || environment[variable] || local[key] || existing[key]; if (value!==undefined) settings[key]=value;
}
for (const [variable,key] of Object.entries({NEWSLETTER_LIST_ID:'up24.newsletter.list-id',NEWSLETTER_DOI_TEMPLATE_ID:'up24.newsletter.doi-template-id'})) {
  const value=process.env[variable] ?? environment[variable] ?? local[key] ?? existing[key];
  if (value) settings[key]=value;
}
const newsletterReturn=new URL(process.env.NEWSLETTER_CONFIRM_URL || environment.NEWSLETTER_CONFIRM_URL || local['up24.newsletter.confirmation-url'] || '/newsletter?confirmed=1',site);
if (newsletterReturn.origin!==site.origin || newsletterReturn.username || newsletterReturn.password || newsletterReturn.hash)
  throw new Error('Use the public site HTTPS origin for NEWSLETTER_CONFIRM_URL.');
settings['up24.newsletter.confirmation-url']=newsletterReturn.href;
const mediaKeys={
  UP24_MEDIA_STORAGE:'up24.media.storage',UP24_S3_BUCKET:'up24.media.s3.bucket',AWS_REGION:'up24.media.s3.region',
  UP24_S3_PREFIX:'up24.media.s3.prefix',UP24_MEDIA_CDN_URL:'up24.media.s3.cdn-url',
  UP24_S3_VIDEO_PREFIX:'up24.media.s3.video-prefix',UP24_S3_STAGING_PREFIX:'up24.media.s3.staging-prefix',
  UP24_VIDEO_QUOTA_BYTES:'up24.video.quota-bytes',UP24_VIDEO_MAX_UPLOAD_BYTES:'up24.video.max-upload-bytes',
  AWS_ACCESS_KEY_ID:'up24.media.s3.access-key-id',AWS_SECRET_ACCESS_KEY:'up24.media.s3.secret-access-key',AWS_SESSION_TOKEN:'up24.media.s3.session-token',
};
for(const [variable,key] of Object.entries(mediaKeys)) {
  const value=process.env[variable] ?? environment[variable] ?? local[key] ?? existing[key];
  if(value!==undefined) settings[key]=value;
}
const frontendCdn = frontendProduction.MEDIA_CDN_URL?.replace(/\/$/, '');
const backendCdn = settings['up24.media.s3.cdn-url']?.replace(/\/$/, '');
if (frontendCdn && backendCdn && frontendCdn !== backendCdn)
  throw new Error('MEDIA_CDN_URL in frontend/.env.production must match UP24_MEDIA_CDN_URL in backend/.env.');
if (frontendCdn) settings['up24.media.s3.cdn-url'] = frontendCdn;
prepareRedisCache(settings, existing['spring.data.redis.password']);
writePrivate(join(directory,'backend.properties'),propertyText(settings));
writePrivate(join(directory,'rabbitmq.conf'),[
  'default_user = up24',`default_pass = ${rabbitPassword}`,'default_vhost = up24','default_user_tags.administrator = false',
  'default_permissions.configure = ^up24[.].*','default_permissions.read = ^up24[.].*','default_permissions.write = ^up24[.].*',
  'listeners.tcp.default = 5672','vm_memory_high_watermark.absolute = 256MiB','disk_free_limit.absolute = 1GB',
  'max_connections = 40','max_channels_per_connection = 64','max_message_size = 65536','consumer_timeout = 900000',
  'quorum_queue.initial_cluster_size = 1','log.console = true','log.file = false','log.console.level = warning',
].join('\n')+'\n');
const publicConfig={SITE_URL:site.origin,SITE_HOST:site.hostname,SITE_INDEXABLE:process.env.SITE_INDEXABLE ?? frontendProduction.SITE_INDEXABLE ?? previousPublic.SITE_INDEXABLE ?? 'false',
  MEDIA_CDN_URL:settings['up24.media.s3.cdn-url'] ?? '',
  MEDIA_UPLOAD_ORIGIN:settings['up24.media.s3.bucket']?(settings['up24.media.s3.bucket'].includes('.')?`https://s3.${settings['up24.media.s3.region']||'ap-south-1'}.amazonaws.com`:`https://${settings['up24.media.s3.bucket']}.s3.${settings['up24.media.s3.region']||'ap-south-1'}.amazonaws.com`):'',
  UP24_MEDIA_QUOTA_BYTES:process.env.UP24_MEDIA_QUOTA_BYTES ?? environment.UP24_MEDIA_QUOTA_BYTES ?? previousPublic.UP24_MEDIA_QUOTA_BYTES ?? '1073741824',
  ANDROID_SHA256_CERT_FINGERPRINTS:process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? frontendProduction.ANDROID_SHA256_CERT_FINGERPRINTS ?? previousPublic.ANDROID_SHA256_CERT_FINGERPRINTS ?? ''};
if(!['true','false'].includes(publicConfig.SITE_INDEXABLE)) throw new Error('Set SITE_INDEXABLE to true or false in frontend/.env.production.');
if(!/^[1-9][0-9]{0,14}$/.test(publicConfig.UP24_MEDIA_QUOTA_BYTES)) throw new Error('Set a positive media allowance in UP24_MEDIA_QUOTA_BYTES.');
writePrivate(join(directory,'deployment.env'),Object.entries(publicConfig).map(([key,value])=>`${key}=${value}`).join('\n')+'\n');
console.log('Deployment configuration prepared in ignored .local/deployment; existing secrets were preserved.');
console.log('Copy that private directory with the project to your VPS; protect it with owner-only directory access.');
console.log('Next: node scripts/deployment-doctor.mjs, then node scripts/deploy.mjs');
console.log('Frontend settings are read from frontend/.env.production. Enable indexing there after verifying the deployed domain.');
} finally {release();}
