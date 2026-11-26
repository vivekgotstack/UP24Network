import { checkDeployment } from './deployment-doctor.mjs';
import { compose,deploymentLock,properties,deploymentDirectory } from './lib/deployment.mjs';
import { join } from 'node:path';

const release=deploymentLock();
try {
  const result=await checkDeployment();
  if(result.errors.length)throw new Error('Deployment preflight failed:\n'+result.errors.map(message=>' - '+message).join('\n'));
  await compose(['build']);
  await compose(['up','-d','--wait','--wait-timeout','180','db']);
  // Recreate services with file-backed secrets so atomically replaced config
  // files are mounted afresh. PostgreSQL data and its container are preserved.
  for(const service of ['redis','rabbitmq','backend','frontend'])
    await compose(['up','-d','--no-deps','--force-recreate','--wait','--wait-timeout','180',service]);
  const { SITE_URL: site, SITE_INDEXABLE: indexing } = properties(join(deploymentDirectory,'deployment.env'));
  let available=false;
  for(let attempt=0;attempt<12;attempt++) {
    try {
      const options={signal:AbortSignal.timeout(10000),redirect:'error'};
      const [home,manifest,robots]=await Promise.all([
        fetch(site+'/', options),
        fetch(site+'/manifest.webmanifest', options),
        fetch(site+'/robots.txt', options),
      ]);
      const hasReaderSecurityPolicy=home.headers.get('content-security-policy')?.includes("'nonce-");
      await home.body?.cancel();
      const app=manifest.ok ? await manifest.json() : null;
      const crawlRules = robots.ok ? await robots.text() : '';
      const blocksAll = /^Disallow:[ \t]*\/[ \t]*\r?$/im.test(crawlRules);
      const crawlReady = robots.ok && (indexing === 'true'
        ? !blocksAll && crawlRules.includes(`Sitemap: ${site}/sitemap-index.xml`)
        : blocksAll);
      if(home.ok&&hasReaderSecurityPolicy&&app?.name==='TheMorningExpress'&&app.id==='/'&&crawlReady) {available=true;break;}
    } catch { }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!available)throw new Error('Containers started, but the HTTPS reader, app manifest or crawl settings did not verify. Check DNS, your HTTPS proxy and SITE_INDEXABLE.');
  console.log('TheMorningExpress is healthy at '+site+'. Verify one administrator OTP and published report with your configured services.');
} finally {release();}
