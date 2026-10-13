const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Pool}=require('pg');
(async()=>{
 if(!process.env.DATABASE_URL||process.env.NODE_ENV==='production')throw Error('Disposable test database only');
 const db=new Pool({connectionString:process.env.DATABASE_URL}),c=await db.connect();
 const q=(sql,args)=>c.query(sql,args);
 const migrate=async(n)=>{
  const file=fs.readdirSync(path.join(__dirname,'../drizzle')).find(x=>x.startsWith(n+'_')&&x.endsWith('.sql'));
  if(!file)throw Error('Missing migration '+n);
  for(const statement of fs.readFileSync(path.join(__dirname,'../drizzle',file),'utf8')
   .split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await q(statement);
 };
 const denied=async(sql,args=[],code='23514')=>{
  await q('SAVEPOINT protected');
  let actual='';
  try{await q(sql,args)}catch(e){actual=e.code;}
  await q('ROLLBACK TO SAVEPOINT protected');await q('RELEASE SAVEPOINT protected');
  assert.equal(actual,code,sql);
 };
 try{
  await q('BEGIN');
  for(const n of ['0000','0001','0002','0003','0004','0005','0006','0007','0008','0009','0010'])await migrate(n);
  await q("INSERT INTO users(firebase_uid,first_name,last_name,email) VALUES('amend-owner','Owner','One','amend1@example.test'),('amend-other','Owner','Two','amend2@example.test')");
  const p1=(await q("INSERT INTO properties(user_id,name) VALUES('amend-owner','Original') RETURNING id")).rows[0].id;
  const p2=(await q("INSERT INTO properties(user_id,name) VALUES('amend-owner','Replacement') RETURNING id")).rows[0].id;
  const rental=(await q("INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,profit,fee) VALUES('amend-owner',$1,'Ana','Silva','2027-04-01','2027-04-03',2,400,300,100) RETURNING id",[p1])).rows[0].id;
  const contract=(await q("INSERT INTO contracts(user_id,rental_id) VALUES('amend-owner',$1) RETURNING id",[rental])).rows[0].id;
  const tpl=(await q("INSERT INTO contract_templates(user_id,name) VALUES('amend-owner','Approved') RETURNING id")).rows[0].id;
  const ver=(await q("INSERT INTO contract_template_versions(template_id,user_id,version_number,status,published_at) VALUES($1,'amend-owner',1,'PUBLISHED',now()) RETURNING id",[tpl])).rows[0].id;
  const old=(await q("INSERT INTO contract_revisions(contract_id,user_id,version_number,status,template_version_id,snapshot_ciphertext,snapshot_nonce,snapshot_auth_tag,snapshot_key_version,snapshot_sha256,pdf_ciphertext,pdf_nonce,pdf_auth_tag,pdf_key_version,pdf_sha256,finalized_at) VALUES($1,'amend-owner',1,'DRAFT',$2,decode('aa','hex'),decode('010203','hex'),decode('0102','hex'),'v1',repeat('a',64),decode('bb','hex'),decode('010203','hex'),decode('0102','hex'),'v1',repeat('b',64),now()) RETURNING id",[contract,ver])).rows[0].id;
  await q("UPDATE contract_revisions SET status='FINALIZED' WHERE id=$1",[old]);
  const installment=(await q("INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents,received_cents,due_event) VALUES($1,'amend-owner',1,40000,0,'CHECKIN') RETURNING id",[rental])).rows[0].id;
  await denied('UPDATE rentals SET total_revenue=500 WHERE id=$1',[rental]);
  await denied('UPDATE rental_installments SET agreed_cents=50000 WHERE id=$1',[installment]);
  const next=(await q("INSERT INTO contract_revisions(contract_id,user_id,version_number,status,template_version_id) VALUES($1,'amend-owner',2,'DRAFT',$2) RETURNING id",[contract,ver])).rows[0].id;
  const before={propertyId:p1,startDate:'2027-04-01',endDate:'2027-04-03',guests:2,
   revenueCents:40000,feeCents:10000,profitCents:30000};
  const after={propertyId:p2,startDate:'2027-05-01',endDate:'2027-05-04',guests:3,
   revenueCents:50000,feeCents:10000,profitCents:40000};
  await denied("INSERT INTO contract_amendments(contract_id,rental_id,user_id,actor_id,from_revision_id,to_revision_id,transaction_id,before_facts,after_facts,payment_changed) VALUES($1,$2,'amend-other','amend-other',$3,$4,txid_current(),$5,$6,true)",[contract,rental,old,next,before,after],'23503');
  await q("INSERT INTO contract_amendments(contract_id,rental_id,user_id,actor_id,from_revision_id,to_revision_id,transaction_id,before_facts,after_facts,payment_changed) VALUES($1,$2,'amend-owner','amend-owner',$3,$4,txid_current(),$5,$6,true)",[contract,rental,old,next,before,after]);
  await denied("UPDATE rentals SET property_id=$1,start_date='2027-05-01',end_date='2027-05-04',number_of_guests=3,total_revenue=600,profit=500 WHERE id=$2",[p2,rental]);
  await q("UPDATE rentals SET property_id=$1,start_date='2027-05-01',end_date='2027-05-04',number_of_guests=3,total_revenue=500,profit=400 WHERE id=$2",[p2,rental]);
  await q('DELETE FROM rental_installments WHERE id=$1',[installment]);
  await q("INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents,received_cents,due_event) VALUES($1,'amend-owner',1,50000,0,'KEY_HANDOVER')",[rental]);
  const changed=(await q('SELECT is_active,property_id,start_date,end_date,number_of_guests,total_revenue,profit FROM rentals WHERE id=$1',[rental])).rows[0];
  assert.equal(changed.is_active,true);assert.equal(changed.property_id,p2);
  assert.equal(changed.start_date,'2027-05-01');assert.equal(changed.end_date,'2027-05-04');
  assert.equal(changed.total_revenue,500);assert.equal(changed.profit,400);
  assert.equal((await q('SELECT status FROM contract_revisions WHERE id=$1',[old])).rows[0].status,'FINALIZED');
  assert.equal((await q('SELECT status FROM contract_revisions WHERE id=$1',[next])).rows[0].status,'DRAFT');
  assert.equal((await q('SELECT agreed_cents FROM rental_installments WHERE rental_id=$1',[rental])).rows[0].agreed_cents,50000);
  await denied('UPDATE contract_revisions SET status=\'DRAFT\' WHERE id=$1',[old]);
  await denied('UPDATE rentals SET total_revenue=700 WHERE id=$1',[rental]);
  await denied("UPDATE contract_amendments SET payment_changed=false WHERE to_revision_id=$1",[next]);
  await denied('DELETE FROM contract_amendments WHERE to_revision_id=$1',[next]);
  await denied("INSERT INTO contract_amendments(contract_id,rental_id,user_id,actor_id,from_revision_id,to_revision_id,transaction_id,before_facts,after_facts) VALUES($1,$2,'amend-owner','amend-owner',$3,$4,txid_current(),$5,$6)",[contract,rental,old,next,before,after],'23505');
  console.log('PASS: landlord amendment atomic guard, immutable finalized original, tenant isolation, installments and active metrics');
 }finally{await q('ROLLBACK').catch(()=>{});c.release();await db.end();}
})().catch(e=>{console.error(e);process.exitCode=1});
