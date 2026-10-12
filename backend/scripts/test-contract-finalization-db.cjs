const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Pool}=require('pg');
(async()=>{
 if(!process.env.DATABASE_URL||process.env.NODE_ENV==='production')throw Error('Disposable database required');
 const db=new Pool({connectionString:process.env.DATABASE_URL}),client=await db.connect();
 const migrate=async(n)=>{
  const filename=fs.readdirSync(path.join(__dirname,'../drizzle')).find(x=>x.startsWith(n+'_')&&x.endsWith('.sql'));
  if(!filename)throw Error('Missing migration '+n);
  const data=fs.readFileSync(path.join(__dirname,'../drizzle',filename),'utf8');
  for(const statement of data.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))
   await client.query(statement);
 };
 const forbidden=async(query,values)=>{
  await client.query('SAVEPOINT final_guard');
  let sqlstate='';
  try{await client.query(query,values);}catch(e){sqlstate=e.code;}
  await client.query('ROLLBACK TO SAVEPOINT final_guard');
  await client.query('RELEASE SAVEPOINT final_guard');
  assert.equal(sqlstate,'23514');
 };
 try{
  await client.query('BEGIN');
  for(const n of ['0000','0001','0002','0003','0004','0005','0006','0007','0008'])await migrate(n);
  await client.query("INSERT INTO users(firebase_uid,first_name,last_name,email) VALUES('final-test','Test','Owner','test-final@example.test')");
  const property=(await client.query("INSERT INTO properties(user_id,name) VALUES('final-test','Seasonal property') RETURNING id")).rows[0].id;
  const rental=(await client.query(`INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,profit,fee)
   VALUES('final-test',$1,'Ana','Silva','2027-03-01','2027-03-04',2,550,500,50) RETURNING id`,[property])).rows[0].id;
  await client.query("INSERT INTO rental_guest_details(rental_id,user_id) VALUES($1,'final-test')",[rental]);
  const row=(await client.query("INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents,payment_method,due_event) VALUES($1,'final-test',1,55000,'PIX','CHECKIN') RETURNING id",[rental])).rows[0].id;
  const template=(await client.query("INSERT INTO contract_templates(user_id,name) VALUES('final-test','Approved') RETURNING id")).rows[0].id;
  const version=(await client.query("INSERT INTO contract_template_versions(template_id,user_id,version_number,status,published_at) VALUES($1,'final-test',1,'PUBLISHED',now()) RETURNING id",[template])).rows[0].id;
  const contract=(await client.query("INSERT INTO contracts(user_id,rental_id) VALUES('final-test',$1) RETURNING id",[rental])).rows[0].id;
  await client.query(`INSERT INTO contract_revisions(contract_id,user_id,version_number,status,template_version_id,
   snapshot_ciphertext,snapshot_nonce,snapshot_auth_tag,snapshot_key_version,snapshot_sha256,
   pdf_ciphertext,pdf_nonce,pdf_auth_tag,pdf_key_version,pdf_sha256,finalized_at)
   VALUES($1,'final-test',1,'DRAFT',$2,decode('aa','hex'),decode('010203','hex'),decode('0102','hex'),'v1',repeat('a',64),
   decode('bb','hex'),decode('010203','hex'),decode('0102','hex'),'v1',repeat('b',64),now())`,[contract,version]);
  const finalized=(await client.query("UPDATE contract_revisions SET status='FINALIZED' WHERE contract_id=$1 RETURNING status",[contract])).rows;
  assert.equal(finalized[0]?.status,'FINALIZED','The update must persist instead of returning OLD');
  const stored=(await client.query('SELECT status FROM contract_revisions WHERE contract_id=$1',[contract])).rows[0];
  assert.equal(stored.status,'FINALIZED');
  await forbidden("UPDATE contract_revisions SET status='DRAFT' WHERE contract_id=$1",[contract]);
  await forbidden("UPDATE rental_guest_details SET updated_at=now()+interval '1 minute' WHERE rental_id=$1",[rental]);
  await forbidden("DELETE FROM rental_guest_details WHERE rental_id=$1",[rental]);
  await forbidden("UPDATE rental_installments SET agreed_cents=54000 WHERE id=$1",[row]);
  await forbidden("UPDATE rental_installments SET due_event='KEY_HANDOVER' WHERE id=$1",[row]);
  await forbidden("INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents) VALUES($1,'final-test',2,1000)",[rental]);
  await forbidden("DELETE FROM rental_installments WHERE id=$1",[row]);
  await client.query("UPDATE rental_installments SET received_cents=10000 WHERE id=$1",[row]);
  console.log('PASS: finalized identity and agreed installment immutability; receipt remains writable');
 }finally{await client.query('ROLLBACK').catch(()=>{});client.release();await db.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
