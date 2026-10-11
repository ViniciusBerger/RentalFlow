/** Runs only against an isolated, disposable PostgreSQL database in CI.
 * Uses a single transaction and rolls it back, leaving no fixture data behind.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {Pool}=require('pg');
async function main(){
 if(process.env.NODE_ENV==='production')throw Error('Refusing to run integration fixtures in production');
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL must point to a disposable CI database');
 const pool=new Pool({connectionString:process.env.DATABASE_URL});
 const client=await pool.connect();
 let checks=0;
 const equal=(a,b,message)=>{assert.equal(a,b,message);checks++};
 const migration=async(number)=>{
  const filename=fs.readdirSync(path.join(__dirname,'../drizzle')).find(name=>name.startsWith(`${number}_`)&&name.endsWith('.sql'));
  if(!filename)throw Error(`Migration ${number} not found`);
  const sql=fs.readFileSync(path.join(__dirname,'../drizzle',filename),'utf8');
  for(const segment of sql.split('--> statement-breakpoint').map(v=>v.trim()).filter(Boolean))await client.query(segment);
 };
 const user=async(uid)=>client.query('INSERT INTO users(firebase_uid,first_name,last_name,email) VALUES($1,$2,$3,$4)',[uid,'Test','Host',`${uid}@example.test`]);
 const booking=async(owner,propertyId,start,end)=>client.query(`INSERT INTO rentals(user_id,property_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,profit,fee)
 VALUES($1,$2,'Ana','Silva',$3,$4,2,450,390,60) RETURNING id`,[owner,propertyId,start,end]);
 const expectedFail=async(code,fn)=>{
  await client.query('SAVEPOINT expected_error');
  try{await fn();throw Error(`Expected PostgreSQL SQLSTATE ${code}`);}
  catch(err){equal(err.code,code,`Expected SQLSTATE ${code}, got ${err.code??err.message}`);}
  finally{await client.query('ROLLBACK TO SAVEPOINT expected_error');await client.query('RELEASE SAVEPOINT expected_error');}
 };
 try{
  await client.query('BEGIN');
  await migration('0000');await migration('0001');await migration('0002');
  await user('companyA');await user('companyB');
  await client.query(`INSERT INTO rentals(user_id,first_name,last_name,start_date,end_date,number_of_guests,total_revenue,profit,fee)
 VALUES ('companyA','Old','Guest','2026-09-02','2026-09-05',2,500,400,100),
 ('companyB','Old','Guest','2026-09-02','2026-09-05',2,400,300,100)`);
  await migration('0003');
  const defaults=await client.query('SELECT user_id,id,name FROM properties WHERE is_default=true ORDER BY user_id');
  equal(defaults.rows.length,2,'Every existing company gets a default property');
  equal(defaults.rows[0].name,'Imóvel principal');
  const old=await client.query(`SELECT r.user_id,r.property_id,p.user_id AS property_owner
 FROM rentals r JOIN properties p ON r.property_id=p.id ORDER BY r.user_id`);
  equal(old.rows.length,2,'Both existing reservations are preserved');
  for(const row of old.rows)equal(row.user_id,row.property_owner,'Migrated property ownership');
  const first=defaults.rows.find(p=>p.user_id==='companyA').id;
  const secondCompany=defaults.rows.find(p=>p.user_id==='companyB').id;
  const prop=await client.query("INSERT INTO properties(user_id,name,color,icon) VALUES('companyA','Casa da Praia','#2563EB','waves') RETURNING id");
  const second=prop.rows[0].id;
  await booking('companyA',first,'2026-11-01','2026-11-04');checks++;
  await booking('companyA',second,'2026-11-01','2026-11-04');checks++;
  // Checkout day is free for the next guest at the same property.
  await booking('companyA',first,'2026-11-04','2026-11-06');checks++;
  await expectedFail('23P01',()=>booking('companyA',first,'2026-11-03','2026-11-05'));
  await expectedFail('23503',()=>booking('companyB',second,'2026-12-01','2026-12-04'));
  await expectedFail('23503',()=>booking('companyA',secondCompany,'2026-12-01','2026-12-04'));
  // Ensure per-account aggregations cannot leak another tenant's bookings.
  const totals=await client.query(`SELECT user_id,SUM(total_revenue)::int AS total FROM rentals WHERE start_date>='2026-11-01' GROUP BY user_id`);
  equal(totals.rows.length,1);equal(totals.rows[0].user_id,'companyA');equal(totals.rows[0].total,1350);
  console.log(`PASS: ${checks} PostgreSQL migration/ownership/overlap assertions`);
 }finally{await client.query('ROLLBACK').catch(()=>{});client.release();await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
