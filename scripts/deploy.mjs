import { checkDeployment } from './deployment-doctor.mjs';
import { compose,deploymentLock,properties,deploymentDirectory } from './lib/deployment.mjs';
import { join } from 'node:path';

const result=await checkDeployment();
if(result.errors.length)throw new Error('Deployment preflight failed:\n'+result.errors.map(message=>' - '+message).join('\n'));
const release=deploymentLock();
try {
  await compose(['build']);
  await compose(['up','-d','--wait','--wait-timeout','180','db']);
  // Recreate services with file-backed secrets so atomically replaced config
  // files are mounted afresh. PostgreSQL data and its container are preserved.
  for(const service of ['rabbitmq','backend','frontend','proxy'])
    await compose(['up','-d','--no-deps','--force-recreate','--wait','--wait-timeout','180',service]);
  const site=properties(join(deploymentDirectory,'deployment.env')).SITE_URL;
  let available=false;
  for(let attempt=0;attempt<12;attempt++) {
    try {
      const response=await fetch(site+'/manifest.webmanifest',{signal:AbortSignal.timeout(10000),redirect:'error'});
      if(response.ok&&(await response.json()).name?.includes('UP24')) {available=true;break;}
    } catch { }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(!available)throw new Error('Containers started, but the public HTTPS manifest did not verify. Check DNS, ports 80/443 and Caddy certificate logs; persistent volumes were retained.');
  console.log('UP24Network is healthy at '+site+'. Verify one administrator OTP and published report with your configured services.');
} finally {release();}
