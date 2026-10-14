const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Pool}=require('pg');
(async()=>{
 if(!process.env.DATABASE_URL||process.env.NODE_ENV==='production')throw Error('Disposable CI database required');
 const db=new Pool({connectionString:process.env.DATABASE_URL}),c=await db.connect();
 const migrate=async(n)=>{
  const file=fs.readdirSync(path.join(__dirname,'../drizzle')).find(x=>x.startsWith(n+'_')&&x.endsWith('.sql'));
  if(!file)throw Error('Missing migration '+n);
  for(const stmt of fs.readFileSync(path.join(__dirname,'../drizzle',file),'utf8')
   .split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await c.query(stmt);
 };
 const denied=async(q,args=[],status='23514')=>{
  await c.query('SAVEPOINT denied');
  let actual='';
  try{await c.query(q,args)}catch(e){actual=e.code}
  await c.query('ROLLBACK TO SAVEPOINT denied');await c.query('RELEASE SAVEPOINT denied');
  assert.equal(actual,status,q);
 };
 try{
  await c.query('BEGIN');
  for(const n of ['0000','0001','0002','0003','0004','0005','0006','0007','0008','0009'])await migrate(n);
  await c.query("INSERT INTO users(firebase_uid,first_name,last_name,email) VALUES('cancel-owner','Owner','One','cancel1@test.invalid'),('other-owner','Other','Two','cancel2@test.invalid')");
  const p=(await c.query("INSERT INTO properties(user_id,name) VALUES('cancel-owner','Casa') RETURNING id")).rows[0].id;
  const rental=(await c.query("INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,profit,fee) VALUES('cancel-owner',$1,'Ana','Silva','2027-04-01','2027-04-03',2,400,300,100) RETURNING id",[p])).rows[0].id;
  const other=(await c.query("INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,profit,fee) VALUES('cancel-owner',$1,'Bruno','Costa','2027-04-04','2027-04-05',1,200,150,50) RETURNING id",[p])).rows[0].id;
  const contract=(await c.query("INSERT INTO contracts(user_id,rental_id) VALUES('cancel-owner',$1) RETURNING id",[rental])).rows[0].id;
  await c.query("INSERT INTO contract_revisions(user_id,contract_id,version_number,status) VALUES('cancel-owner',$1,1,'DRAFT')",[contract]);
  const paid=(await c.query("INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents,received_cents,due_event) VALUES($1,'cancel-owner',1,40000,5000,'CHECKIN') RETURNING id",[rental])).rows[0].id;
  const pending=async()=>Number((await c.query("SELECT count(*) AS n FROM contract_revisions cr JOIN contracts co ON co.id=cr.contract_id JOIN rentals r ON r.id=co.rental_id WHERE co.user_id='cancel-owner' AND r.is_active=true AND cr.status IN ('DRAFT','READY')")).rows[0].n);
  assert.equal(await pending(),1);
  const totals=async()=> (await c.query("SELECT coalesce(sum(total_revenue),0)::numeric AS revenue,coalesce(sum(profit),0)::numeric AS profit,count(*)::int AS bookings FROM rentals WHERE user_id='cancel-owner' AND is_active=true")).rows[0];
  assert.deepEqual((await totals()),{revenue:'600',profit:'450',bookings:2});
  await denied('UPDATE rentals SET is_active=false WHERE id=$1',[rental]);
  await denied('UPDATE rentals SET profit=100 WHERE id=$1',[rental]);
  await denied('DELETE FROM rentals WHERE id=$1',[rental]);
  await denied("INSERT INTO contract_cancellations(contract_id,rental_id,user_id,actor_id,transaction_id,excluded_revenue_cents,excluded_profit_cents) VALUES($1,$2,'other-owner','other-owner',txid_current(),40000,30000)",[contract,rental],'23503');
  await c.query("INSERT INTO contract_cancellations(contract_id,rental_id,user_id,actor_id,transaction_id,excluded_revenue_cents,excluded_profit_cents) VALUES($1,$2,'cancel-owner','cancel-owner',txid_current(),40000,30000)",[contract,rental]);
  await denied('UPDATE rentals SET is_active=false,profit=0 WHERE id=$1',[rental]);
  await c.query('UPDATE rentals SET is_active=false WHERE id=$1',[rental]);
  assert.deepEqual((await totals()),{revenue:'200',profit:'150',bookings:1});
  assert.equal(await pending(),0,'Cancelled drafts must not remain dashboard readiness alerts');
  const cancelled=(await c.query('SELECT is_active,total_revenue,profit FROM rentals WHERE id=$1',[rental])).rows[0];
  assert.deepEqual(cancelled,{is_active:false,total_revenue:400,profit:300});
  assert.equal((await c.query('SELECT received_cents FROM rental_installments WHERE id=$1',[paid])).rows[0].received_cents,5000);
  assert.equal((await c.query('SELECT status FROM contract_revisions WHERE contract_id=$1',[contract])).rows[0].status,'DRAFT');
  await denied('UPDATE rentals SET is_active=true WHERE id=$1',[rental]);
  await denied('UPDATE rentals SET total_revenue=1 WHERE id=$1',[rental]);
  await denied('DELETE FROM contract_cancellations WHERE contract_id=$1',[contract]);
  await denied('UPDATE contract_cancellations SET excluded_revenue_cents=0 WHERE contract_id=$1',[contract]);
  await denied("INSERT INTO contract_cancellations(contract_id,rental_id,user_id,actor_id,transaction_id,excluded_revenue_cents,excluded_profit_cents) VALUES($1,$2,'cancel-owner','cancel-owner',txid_current(),40000,30000)",[contract,rental],'23505');
  assert.equal((await c.query('SELECT is_active FROM rentals WHERE id=$1',[other])).rows[0].is_active,true);
  console.log('PASS: tenant isolation, cancellation lock, immutability, receipt preservation and financial exclusion');
 }finally{await c.query('ROLLBACK').catch(()=>{});c.release();await db.end();}
})().catch(e=>{console.error(e);process.exitCode=1});
