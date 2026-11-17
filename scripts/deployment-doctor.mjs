import { existsSync,readFileSync,statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root,deploymentDirectory,properties,compose,docker } from './lib/deployment.mjs';

export async function checkDeployment({providers=true,engine=true}={}) {
  const errors=[],notes=[];
  const required=['backend.properties','deployment.env','postgres-password','application-db-password','migration-db-password','rabbitmq-password','job-encryption-secret','rabbitmq.conf','jwt-signing.p12'];
  for(const name of required)if(!existsSync(join(deploymentDirectory,name)))errors.push(`Missing private deployment file: ${name}. Run prepare-deployment.mjs.`);
  if(errors.length)return {errors,notes};
  const settings=properties(join(deploymentDirectory,'backend.properties')),publicConfig=properties(join(deploymentDirectory,'deployment.env'));
  const secret=name=>readFileSync(join(deploymentDirectory,name),'utf8').trim();
  for(const name of ['postgres-password','application-db-password','migration-db-password','rabbitmq-password','job-encryption-secret'])
    if(!/^[a-f0-9]{48,128}$/i.test(secret(name)))errors.push(`Restore the invalid ${name} secret from a private backup.`);
  if(settings['spring.datasource.password']!==secret('application-db-password')||settings['spring.flyway.password']!==secret('migration-db-password'))errors.push('Database role secrets and backend configuration do not match.');
  if(settings['up24.jobs.encryption-secret']!==secret('job-encryption-secret'))errors.push('The persisted background-job encryption key does not match backend configuration.');
  const rabbit=properties(join(deploymentDirectory,'rabbitmq.conf'));
  if(rabbit.default_pass!==secret('rabbitmq-password')||settings['spring.rabbitmq.password']!==secret('rabbitmq-password'))errors.push('RabbitMQ broker and backend credentials do not match.');
  if(settings['up24.jobs.transport']!=='rabbitmq'||settings['spring.rabbitmq.host']!=='rabbitmq'||settings['spring.rabbitmq.virtual-host']!=='up24')errors.push('Production jobs must use the private RabbitMQ service and up24 vhost.');
  if(settings['up24.auth.cookie-secure']!=='true')errors.push('Secure authentication cookies must be enabled for production.');
  if(settings['spring.datasource.username']!=='up24_app'||settings['spring.flyway.user']!=='up24_migrator')errors.push('Keep the restricted application role separate from the migration owner.');
  if(settings['spring.profiles.active']||settings['spring.datasource.hikari.schema']==='local_preview')errors.push('Preview/test profiles must not be deployed as production.');
  try {
    const site=new URL(publicConfig.SITE_URL);
    if(site.protocol!=='https:'||site.pathname!=='/'||site.search||site.hash||site.username||site.password||site.port||site.hostname!==publicConfig.SITE_HOST||site.hostname==='localhost'||site.hostname.endsWith('.local'))throw Error();
  } catch {errors.push('SITE_URL/SITE_HOST must identify the same public HTTPS origin.');}
  if(!['true','false'].includes(publicConfig.SITE_INDEXABLE))errors.push('SITE_INDEXABLE must be true or false.');
  if(!/^[1-9][0-9]{0,14}$/.test(publicConfig.UP24_MEDIA_QUOTA_BYTES??''))errors.push('Set a positive tracked-media allowance in UP24_MEDIA_QUOTA_BYTES.');
  if(!/^[a-f0-9]{64}$/i.test(settings['up24.newsroom.otp-secret']??''))errors.push('Configure the 32-byte newsroom OTP protection secret.');
  if(statSync(join(deploymentDirectory,'jwt-signing.p12')).size<2000||!settings['up24.auth.key-store-password'])errors.push('The signing keystore/password is incomplete. Restore both from the same backup.');
  if(process.platform!=='win32'&&(statSync(deploymentDirectory).mode&0o077)!==0)errors.push('Restrict .local/deployment to owner-only directory access (chmod 700).');
  for(const name of ['deploy/postgres/01-roles.sh'])if(readFileSync(join(root,name)).includes(13))errors.push(`${name} has Windows CRLF endings. Restore its required LF endings before deploying.`);
  if(providers) {
    const password=settings['up24.bootstrap.admin-password']??'';
    if(password.length<12||password.length>64||Buffer.byteLength(password,'utf8')>72)errors.push('Set a valid production ADMIN_PASSWORD.');
    if(password==='Vivek1224@nigam')errors.push('Replace the previously supplied temporary ADMIN_PASSWORD before production deployment.');
    if(!settings['up24.providers.brevo.api-key']||settings['up24.providers.brevo.api-key'].length<20)errors.push('Supply your BREVO_API_KEY so newsroom OTP and account recovery can be delivered.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings['up24.providers.brevo.sender-email']??''))errors.push('Supply BREVO_SENDER_EMAIL verified in your Brevo account.');
    if(settings['up24.media.storage']!=='s3')errors.push('Set UP24_MEDIA_STORAGE=s3 for the planned production S3 delivery setup.');
    else {
      if(!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(settings['up24.media.s3.bucket']??''))errors.push('Supply your UP24_S3_BUCKET.');
      if(!/^[a-z]{2}(-[a-z]+)+-[0-9]$/.test(settings['up24.media.s3.region']??''))errors.push('Supply a valid AWS_REGION.');
      if(!settings['up24.media.s3.access-key-id']||!settings['up24.media.s3.secret-access-key'])errors.push('Supply both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for the Contabo runtime.');
      try {const media=new URL(settings['up24.media.s3.cdn-url']);if(media.protocol!=='https:'||media.username||media.password||media.search||media.hash||media.pathname!=='/'||media.port)throw Error();if(media.origin!==publicConfig.MEDIA_CDN_URL.replace(/\/$/,''))throw Error();}
      catch {errors.push('Set matching backend and frontend HTTPS CloudFront/custom media origins.');}
    }
    if(!settings['up24.providers.astrologics.api-key'])notes.push('Rashifal requires your provider key before its automation can be enabled.');
    if(!settings['up24.providers.youtube.api-key'])notes.push('YouTube Data API is not configured; the supported feed fallback remains available.');
    notes.push('Provider account permissions, DNS and external delivery are verified after you configure the real services; this check does not send email or publish media.');
  }
  if(engine) {
    try {
      const version=await compose(['version','--short'],{capture:true});
      const match=version.stdout.match(/v?(\d+)\.(\d+)/);
      if(!match||Number(match[1])<2||(Number(match[1])===2&&Number(match[2])<24))errors.push('Use Docker Compose 2.24 or newer.');
      const info=await docker(['info','--format','{{.OSType}}'],{capture:true});
      if(info.stdout.trim()!=='linux')errors.push('Deploy using Docker Linux containers.');
      await compose(['config','--quiet'],{capture:true});
    } catch(error) {errors.push(error.message);}
  } else notes.push('Docker execution was not checked in configuration-only mode.');
  return {errors,notes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const structure=process.argv.includes('--structure-only');
  const result=await checkDeployment({providers:!structure,engine:!structure&&!process.argv.includes('--config-only')});
  for(const message of result.errors)console.error('Required: '+message);
  for(const message of result.notes)console.log('Note: '+message);
  if(result.errors.length)process.exitCode=1;
  else console.log(structure?'Deployment file structure is consistent; provider credentials and Docker execution were not checked.':'Deployment preflight passed.');
}
