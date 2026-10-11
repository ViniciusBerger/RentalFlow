/** Tests new questionnaire foundations using ONLY a disposable CI PostgreSQL. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Pool}=require('pg');
(async()=>{
 if(process.env.NODE_ENV==='production'||!process.env.DATABASE_URL)throw Error('Only CI disposable DB is allowed');
 const pool=new Pool({connectionString:process.env.DATABASE_URL});
 const client=await pool.connect();let assertions=0;
 async function migrate(n){
  const directory=path.join(__dirname,'../drizzle');
  const file=fs.readdirSync(directory).find(x=>x.startsWith(n+'_')&&x.endsWith('.sql'));
  if(!file)throw Error('Missing migration '+n);
  for(const fragment of fs.readFileSync(path.join(directory,file),'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await client.query(fragment);
 }
 async function denied(code,query,params=[]){
  await client.query('SAVEPOINT denied');let actual;
  try{await client.query(query,params);}catch(e){actual=e.code;}
  await client.query('ROLLBACK TO SAVEPOINT denied');await client.query('RELEASE SAVEPOINT denied');
  assert.equal(actual,code);assertions++;
 }
 try{
  await client.query('BEGIN');
  for(const n of ['0000','0001','0002','0003','0004','0005','0006'])await migrate(n);
  for(const uid of ['owner-a','owner-b'])await client.query('INSERT INTO users(firebase_uid,first_name,last_name,email) VALUES($1,$2,$3,$4)',[uid,'Test','Owner',uid+'@example.test']);
  const template=(await client.query("INSERT INTO contract_templates(user_id,name,is_default) VALUES('owner-a','Seasonal',true) RETURNING id")).rows[0].id;
  const draft=(await client.query("INSERT INTO contract_template_versions(template_id,user_id,version_number,status) VALUES($1,'owner-a',1,'DRAFT') RETURNING id",[template])).rows[0].id;
  await denied('23503',"INSERT INTO contract_template_versions(template_id,user_id,version_number,status,published_at) VALUES($1,'owner-b',2,'PUBLISHED',now())",[template]);
  await denied('23505',"INSERT INTO contract_template_versions(template_id,user_id,version_number) VALUES($1,'owner-a',1)",[template]);
  await client.query("UPDATE contract_template_versions SET clauses=$2,status='PUBLISHED',published_at=now() WHERE id=$1",[draft,JSON.stringify([{id:'1',body:'Owner-approved test'}])]);
  const state=(await client.query("SELECT status,published_at,clauses FROM contract_template_versions WHERE id=$1",[draft])).rows[0];
  assert.equal(state.status,'PUBLISHED');assert.ok(state.published_at);assert.deepEqual(state.clauses,[{id:'1',body:'Owner-approved test'}]);assertions+=3;
  await denied('23514',"UPDATE contract_template_versions SET clauses='[]' WHERE id=$1",[draft]);
  await denied('23514',"DELETE FROM contract_template_versions WHERE id=$1",[draft]);
  await denied('23514',"INSERT INTO contract_settings(user_id,profile_ciphertext) VALUES('owner-a',decode('aa','hex'))");
  await client.query("INSERT INTO contract_settings(user_id,policy_config,payment_defaults) VALUES('owner-a',$1,$2)",[JSON.stringify({jurisdiction:'Vitória/ES'}),JSON.stringify({installmentCount:2})]);
  const policy=(await client.query("SELECT policy_config FROM contract_settings WHERE user_id='owner-a'")).rows[0].policy_config;
  assert.equal(policy.jurisdiction,'Vitória/ES');assertions++;
  const p=(await client.query("INSERT INTO properties(user_id,name,address) VALUES('owner-a','Test house','Rua 123') RETURNING id")).rows[0].id;
  await denied('23503',"INSERT INTO property_contract_settings(property_id,user_id,included_occupancy,maximum_occupancy,extra_guest_rate_cents) VALUES($1,'owner-b',10,12,25000)",[p]);
  await denied('23514',"INSERT INTO property_contract_settings(property_id,user_id,included_occupancy,maximum_occupancy,extra_guest_rate_cents) VALUES($1,'owner-a',13,12,25000)",[p]);
  await client.query("INSERT INTO property_contract_settings(property_id,user_id,included_occupancy,maximum_occupancy,extra_guest_rate_cents) VALUES($1,'owner-a',10,12,25000)",[p]);
  assert.equal((await client.query("SELECT maximum_occupancy FROM property_contract_settings WHERE property_id=$1",[p])).rows[0].maximum_occupancy,12);assertions++;
  console.log('PASS: '+assertions+' questionnaire database authorization and immutability assertions');
 }finally{await client.query('ROLLBACK').catch(()=>{});client.release();await pool.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
