/** Disposable CI Postgres only. Migration and finalized-booking tamper regression. */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {Pool}=require('pg');
(async()=>{
 if(process.env.NODE_ENV==='production' || !process.env.DATABASE_URL) throw Error('Refusing non-test database');
 const pool=new Pool({connectionString:process.env.DATABASE_URL}),client=await pool.connect();
 const migrate=async(num)=>{
  const dir=path.join(__dirname,'../drizzle');
  const file=fs.readdirSync(dir).find(f=>f.startsWith(num+'_')&&f.endsWith('.sql'));
  if(!file)throw Error('Migration missing: '+num);
  for(const sql of fs.readFileSync(path.join(dir,file),'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)) await client.query(sql);
 };
 const fail=async(sql,args=[])=>{
  await client.query('SAVEPOINT security_test');
  try {await client.query(sql,args);assert.fail('Expected security SQLSTATE');}
  catch(e){assert.equal(e.code,'23514');}
  finally{await client.query('ROLLBACK TO SAVEPOINT security_test');await client.query('RELEASE SAVEPOINT security_test');}
 };
 try{
  await client.query('BEGIN');
  for(const n of ['0000','0001','0002','0003','0004','0005']) await migrate(n);
  await client.query("INSERT INTO users(firebase_uid,first_name,last_name,email) VALUES('scoped-account','Ana','Host','ana@example.test')");
  const property=(await client.query("INSERT INTO properties(user_id,name) VALUES('scoped-account','Test house') RETURNING id")).rows[0].id;
  const rental=(await client.query(`INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,profit,fee)
    VALUES('scoped-account',$1,'Ana','Guest','2027-01-01','2027-01-04',2,600,500,100) RETURNING id`,[property])).rows[0].id;
  // Before finalization, legacy edits are still permitted.
  await client.query("UPDATE rentals SET number_of_guests=3 WHERE id=$1",[rental]);
  const template=(await client.query("INSERT INTO contract_templates(user_id,name) VALUES('scoped-account','Main') RETURNING id")).rows[0].id;
  const version=(await client.query("INSERT INTO contract_template_versions(template_id,user_id,version_number,status,published_at) VALUES($1,'scoped-account',1,'PUBLISHED',now()) RETURNING id",[template])).rows[0].id;
  const contract=(await client.query("INSERT INTO contracts(rental_id,user_id) VALUES($1,'scoped-account') RETURNING id",[rental])).rows[0].id;
  await client.query(`INSERT INTO contract_revisions(contract_id,user_id,version_number,status,template_version_id,
    snapshot_ciphertext,snapshot_nonce,snapshot_auth_tag,snapshot_key_version,snapshot_sha256,
    pdf_ciphertext,pdf_nonce,pdf_auth_tag,pdf_key_version,pdf_sha256,finalized_at)
    VALUES($1,'scoped-account',1,'FINALIZED',$2,decode('aa','hex'),decode('010203','hex'),decode('0102','hex'),'v1',repeat('a',64),
    decode('bb','hex'),decode('010203','hex'),decode('0102','hex'),'v1',repeat('b',64),now())`,[contract,version]);
  await fail('UPDATE rentals SET total_revenue=2 WHERE id=$1',[rental]);
  await fail('UPDATE rentals SET number_of_guests=7 WHERE id=$1',[rental]);
  await fail('UPDATE rentals SET is_active=false WHERE id=$1',[rental]);
  await fail('DELETE FROM rentals WHERE id=$1',[rental]);
  const audit=(await client.query(`INSERT INTO contract_audit_events(user_id,actor_id,action,target_type,outcome)
    VALUES('scoped-account','scoped-account','VIEW_PDF','CONTRACT','SUCCESS') RETURNING id`)).rows[0].id;
  await fail("UPDATE contract_audit_events SET outcome='FAILED' WHERE id=$1",[audit]);
  await fail('DELETE FROM contract_audit_events WHERE id=$1',[audit]);
  console.log('PASS: finalized booking and append-only audit security guards');
 }finally{await client.query('ROLLBACK').catch(()=>{});client.release();await pool.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
