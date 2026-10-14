const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const docker=fs.readFileSync(path.join(__dirname,'../Dockerfile'),'utf8');
const flags=['QUESTIONNAIRE','WORKSPACE','FINALIZATION','CANCELLATIONS','AMENDMENTS','CHANGES'];

test('Docker builder forwards every contract flag to the Vite production build',()=>{
 const buildStage=docker.split(/^FROM\s+nginx\b/m)[0];
 for(const feature of flags){
  const flag=`VITE_CONTRACT_${feature}_ENABLED`;
  assert.match(buildStage,new RegExp(`^ARG ${flag}$`,'m'),`Missing build argument: ${flag}`);
  assert.match(buildStage,new RegExp(`^ENV ${flag}=\\$${flag}$`,'m'),`Missing build environment: ${flag}`);
 }
 assert.ok(buildStage.indexOf('RUN npm run build')>buildStage.indexOf('ARG VITE_CONTRACT_CHANGES_ENABLED'));
});
