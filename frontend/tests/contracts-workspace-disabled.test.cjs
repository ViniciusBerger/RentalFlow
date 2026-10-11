const {test}=require('node:test');
const assert=require('node:assert/strict');
delete process.env.VITE_CONTRACT_WORKSPACE_ENABLED;
require('./register-typescript.cjs');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {LanguageProvider}=require('../src/i18n/language.tsx');
const {ContractsWorkspacePage}=require('../src/features/contracts/workspace.tsx');
const {contractsWorkspaceEnabled}=require('../src/features/contracts/contract-workspace-api.ts');
test('disabled workspace reveals neither guest identity nor booking finance information',()=>{
 assert.equal(contractsWorkspaceEnabled,false);
 for(const locale of ['en','pt-BR']){
  const html=renderToStaticMarkup(React.createElement(LanguageProvider,
   {initialLocale:locale},React.createElement(ContractsWorkspacePage)));
  assert.match(html,locale==='en'?/Contracts unavailable/:/Contratos indisponíveis/);
  assert.doesNotMatch(html,/<input/);
  assert.doesNotMatch(html,/R\$/);
 }
});
