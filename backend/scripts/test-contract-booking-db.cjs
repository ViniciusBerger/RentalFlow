/** All migrations and security assertions run inside a disposable PostgreSQL transaction. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Pool}=require('pg');
(async()=>{
 if(process.env.NODE_ENV==='production'||!process.env.DATABASE_URL)
  throw Error('Disposable test database only');
 const pool=new Pool({connectionString:process.env.DATABASE_URL});
 const client=await pool.connect();let checks=0;
 const migrate=async(number)=>{
  const dir=path.join(__dirname,'../drizzle');
  const file=fs.readdirSync(dir).find(x=>x.startsWith(number+'_')&&x.endsWith('.sql'));
  if(!file)throw Error('Missing migration '+number);
  for(const stmt of fs.readFileSync(path.join(dir,file),'utf8')
   .split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))
   await client.query(stmt);
 };
 const denied=async(code,query,args=[])=>{
  await client.query('SAVEPOINT guard');
  let actual;
  try{await client.query(query,args);}catch(e){actual=e.code;}
  await client.query('ROLLBACK TO SAVEPOINT guard');
  await client.query('RELEASE SAVEPOINT guard');
  assert.equal(actual,code);checks++;
 };
 try{
  await client.query('BEGIN');
  for(const n of ['0000','0001','0002','0003','0004','0005','0006','0007'])
   await migrate(n);
  for(const uid of ['account-a','account-b'])
   await client.query('INSERT INTO users(firebase_uid,first_name,last_name,email) VALUES($1,$2,$3,$4)',
    [uid,'Booking','Host',uid+'@example.test']);
  const property=(await client.query(
   "INSERT INTO properties(user_id,name) VALUES('account-a','Test house') RETURNING id")).rows[0].id;
  const rental=(await client.query(
   "INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,fee,profit) VALUES('account-a',$1,'Ana','Silva','2027-03-01','2027-03-03',2,500,50,450) RETURNING id",
   [property])).rows[0].id;
  // A booking created before contract linking remains editable.
  await client.query("UPDATE rentals SET total_revenue=520,profit=470 WHERE id=$1",[rental]);
  const contract=(await client.query(
   "INSERT INTO contracts(user_id,rental_id) VALUES('account-a',$1) RETURNING id",[rental])).rows[0].id;
  const revision=(await client.query(
   "INSERT INTO contract_revisions(user_id,contract_id,version_number,status) VALUES('account-a',$1,1,'DRAFT') RETURNING id",
   [contract])).rows[0].id;
  assert.ok(revision);checks++;
  await denied('23514','UPDATE rentals SET total_revenue=100 WHERE id=$1',[rental]);
  await denied('23514','UPDATE rentals SET number_of_guests=3 WHERE id=$1',[rental]);
  await denied('23514',"UPDATE rentals SET is_active=false WHERE id=$1",[rental]);
  await denied('23514',"UPDATE rentals SET first_name='Other' WHERE id=$1",[rental]);
  await denied('23514','DELETE FROM rentals WHERE id=$1',[rental]);
  await denied('23503',
   "INSERT INTO rental_guest_details(rental_id,user_id) VALUES($1,'account-b')",[rental]);
  await denied('23503',
   "INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents) VALUES($1,'account-b',1,52000)",[rental]);
  // Separate owner-a contract avoids the one-open-revision unique index taking
  // precedence over the account foreign key we are explicitly testing.
  const otherRental=(await client.query(
   "INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,fee,profit) VALUES('account-a',$1,'Ana','Silva','2027-03-05','2027-03-07',2,300,30,270) RETURNING id",
   [property])).rows[0].id;
  const otherContract=(await client.query(
   "INSERT INTO contracts(user_id,rental_id) VALUES('account-a',$1) RETURNING id",
   [otherRental])).rows[0].id;
  await denied('23503',
   "INSERT INTO contract_revisions(contract_id,user_id,version_number,status) VALUES($1,'account-b',1,'DRAFT')",[otherContract]);
  await client.query(
   "INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents,received_cents) VALUES($1,'account-a',1,52000,0)",[rental]);
  const financial=(await client.query(
   "SELECT total_revenue,profit FROM rentals WHERE id=$1",[rental])).rows[0];
  assert.equal(Number(financial.total_revenue),520);
  assert.equal(Number(financial.profit),470);checks+=2;
  console.log('PASS: '+checks+' contract-linked booking immutability and owner constraints');
 }finally{await client.query('ROLLBACK').catch(()=>{});client.release();await pool.end();}
})().catch(err=>{console.error(err);process.exitCode=1;});
