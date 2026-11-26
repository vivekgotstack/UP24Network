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
  for(const service of ['redis','rabbitmq','backend','frontend','proxy'])
    await compose(['up','-d','--no-deps','--force-recreate','--wait','--wait-timeout','180',service]);
  const site=properties(join(deploymentDirectory,'deployment.env')).SITE_URL;
  let available=false;
  for(let attempt=0;attempt<12;attempt++) {
    try {
      const options={signal:AbortSignal.timeout(10000),redirect:'error'};
      const [home,manifest]=await Promise.all([
        fetch(site+'/', options),
        fetch(site+'/manifest.webmanifest', options),
      ]);
      const hasReaderSecurityPolicy=home.headers.get('content-security-policy')?.includes("'nonce-");
      await home.body?.cancel();
      const app=manifest.ok ? await manifest.json() : null;
      if(home.ok&&hasReaderSecurityPolicy&&app?.name==='TheMorningExpress'&&app.id==='/') {available=true;break;}
    } catch { }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!available)throw new Error('Containers started, but the HTTPS reader or app manifest did not verify. Check DNS, ports 80/443 and Caddy logs; persistent volumes were retained.');
  console.log('TheMorningExpress is healthy at '+site+'. Verify one administrator OTP and published report with your configured services.');
} finally {release();}
