const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {ContractQuestionnairePage}=require('../src/features/contracts/index.tsx');
const {LanguageProvider}=require('../src/i18n/language.tsx');
const {initialLandlord,initialPolicy,initialPayment,contractFeatureEnabled}=require('../src/features/contracts/contract-api.ts');

test('contract questionnaire is opt-in and does not collect identity data before backend activation',()=>{
 assert.equal(contractFeatureEnabled,false);
 for(const locale of ['pt-BR','en']){
  const html=renderToStaticMarkup(React.createElement(LanguageProvider,{initialLocale:locale},React.createElement(ContractQuestionnairePage)));
  assert.match(html,locale==='pt-BR'?/não está ativada/:/not enabled/);
  assert.doesNotMatch(html,/<input/);
  assert.doesNotMatch(html,/value="529982/);
 }
});
test('contract questionnaire starts without copying anyone’s identity or banking secrets',()=>{
 assert.equal(initialLandlord.documentType,'CPF'); // Non-sensitive legacy default
 for(const [key,value] of Object.entries(initialLandlord))if(key!=='documentType')assert.equal(value,'');
 assert.equal(initialPolicy.jurisdiction,'');
 assert.equal(initialPayment.installmentCount,2);
 assert.ok(initialPayment.acceptedMethods.includes('PIX'));
});
