/** Task 4.1 migration regression tests; disposable CI PostgreSQL ONLY.
 * Executes all migrations inside a transaction and always rolls back.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Pool } = require('pg');

async function main() {
  if (process.env.NODE_ENV === 'production') throw Error('Refusing production fixture execution');
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL must point to disposable CI PostgreSQL');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let checks = 0;
  const equal = (actual, expected, title) => { assert.equal(actual, expected, title); checks++; };
  const migration = async (number) => {
    const dir = path.join(__dirname, '../drizzle');
    const filename = fs.readdirSync(dir).find(f => f.startsWith(`${number}_`) && f.endsWith('.sql'));
    if (!filename) throw Error(`Missing migration ${number}`);
    for (const sql of fs.readFileSync(path.join(dir, filename), 'utf8')
      .split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await client.query(sql);
  };
  const fail = async (expected, operation) => {
    await client.query('SAVEPOINT negative_case');
    try { await operation(); assert.fail(`Expected SQLSTATE ${expected}`); }
    catch (error) { equal(error.code, expected, `SQLSTATE ${expected}: ${error.message}`); }
    finally {
      await client.query('ROLLBACK TO SAVEPOINT negative_case');
      await client.query('RELEASE SAVEPOINT negative_case');
    }
  };
  try {
    await client.query('BEGIN');
    await migration('0000'); await migration('0001'); await migration('0002');
    for (const uid of ['companyA', 'companyB']) {
      await client.query(`INSERT INTO users(firebase_uid,first_name,last_name,email)
        VALUES($1,'Test','Owner',$2)`, [uid, `${uid}@example.test`]);
    }
    // Simulate existing bookings before Task 3 migration.
    const before = await client.query(`INSERT INTO rentals(user_id,first_name,last_name,start_date,end_date,
      number_of_guests,total_revenue,profit,fee)
      VALUES ('companyA','Test','Guest','2026-12-01','2026-12-03',2,800,700,100),
      ('companyB','Test','Guest','2026-12-01','2026-12-03',2,700,650,50)
      RETURNING id,user_id`);
    await migration('0003'); await migration('0004');
    equal((await client.query('SELECT COUNT(*)::int AS n FROM rentals')).rows[0].n, 2,
      'Task 4 migration must preserve existing bookings');
    equal((await client.query('SELECT COUNT(*)::int AS n FROM contracts')).rows[0].n, 0,
      'No historical contracts are automatically generated');
    equal((await client.query('SELECT COUNT(*)::int AS n FROM property_contract_settings')).rows[0].n, 0,
      'Legacy property settings remain explicitly unconfigured');

    const idA = before.rows.find(r => r.user_id === 'companyA').id;
    const idB = before.rows.find(r => r.user_id === 'companyB').id;
    const property = (await client.query(`SELECT id FROM properties WHERE user_id='companyA'`)).rows[0].id;
    await fail('23503', () => client.query(`INSERT INTO rental_guest_details(rental_id,user_id)
      VALUES($1,'companyB')`, [idA]));
    await fail('23503', () => client.query(`INSERT INTO rental_installments(rental_id,user_id,sequence,agreed_cents)
      VALUES($1,'companyB',1,40000)`, [idA]));
    await fail('23503', () => client.query(`INSERT INTO contracts(rental_id,user_id)
      VALUES($1,'companyA')`, [idB]));
    await fail('23503', () => client.query(`INSERT INTO property_contract_settings
      (property_id,user_id,included_occupancy,maximum_occupancy,extra_guest_rate_cents)
      VALUES($1,'companyB',4,8,25000)`, [property]));
    await fail('23514', () => client.query(`INSERT INTO property_contract_settings
      (property_id,user_id,included_occupancy,maximum_occupancy,extra_guest_rate_cents)
      VALUES($1,'companyA',12,8,25000)`, [property]));
    await fail('23514', () => client.query(`INSERT INTO property_contract_settings
      (property_id,user_id,included_occupancy,maximum_occupancy,extra_guest_rate_cents)
      VALUES($1,'companyA',10,12,-1)`, [property]));
    // Encrypted sensitive-data fields must either be fully populated or all NULL.
    await fail('23514', () => client.query(`INSERT INTO rental_guest_details
      (rental_id,user_id,identity_ciphertext) VALUES($1,'companyA',decode('aa','hex'))`, [idA]));
    await client.query(`INSERT INTO rental_guest_details(rental_id,user_id) VALUES($1,'companyA')`, [idA]);

    await client.query(`INSERT INTO rental_installments
      (rental_id,user_id,sequence,agreed_cents) VALUES($1,'companyA',1,40000)`, [idA]);
    await fail('23514', () => client.query(`INSERT INTO rental_installments
      (rental_id,user_id,sequence,agreed_cents) VALUES($1,'companyA',2,-50)`, [idA]));
    await fail('23505', () => client.query(`INSERT INTO rental_installments
      (rental_id,user_id,sequence,agreed_cents) VALUES($1,'companyA',1,40000)`, [idA]));

    const templateA = (await client.query(`INSERT INTO contract_templates(user_id,name,is_default)
      VALUES('companyA','Temporada',true) RETURNING id`)).rows[0].id;
    const templateB = (await client.query(`INSERT INTO contract_templates(user_id,name,is_default)
      VALUES('companyB','Temporada',true) RETURNING id`)).rows[0].id;
    await fail('23503', () => client.query(`INSERT INTO contract_template_versions
      (template_id,user_id,version_number) VALUES($1,'companyA',1)`, [templateB]));
    const published = (await client.query(`INSERT INTO contract_template_versions
      (template_id,user_id,version_number,status,published_at)
      VALUES($1,'companyA',1,'PUBLISHED',now()) RETURNING id`, [templateA])).rows[0].id;
    await fail('23514', () => client.query(`UPDATE contract_template_versions
      SET clauses='[]'::jsonb WHERE id=$1`, [published]));
    await fail('23514', () => client.query(`DELETE FROM contract_template_versions WHERE id=$1`, [published]));

    const contract = (await client.query(`INSERT INTO contracts(rental_id,user_id)
      VALUES($1,'companyA') RETURNING id`, [idA])).rows[0].id;
    await fail('23505', () => client.query(`INSERT INTO contracts(rental_id,user_id)
      VALUES($1,'companyA')`, [idA]));
    const revision = (await client.query(`INSERT INTO contract_revisions
      (contract_id,user_id,version_number,status,template_version_id,
       snapshot_ciphertext,snapshot_nonce,snapshot_auth_tag,snapshot_key_version,snapshot_sha256,
       pdf_ciphertext,pdf_nonce,pdf_auth_tag,pdf_key_version,pdf_sha256,finalized_at)
      VALUES($1,'companyA',1,'FINALIZED',$2,decode('aa','hex'),decode('010203','hex'),
       decode('0102','hex'),'test-key',repeat('a',64),decode('bb','hex'),
       decode('010203','hex'),decode('0102','hex'),'test-key',repeat('b',64),now()) RETURNING id`,
       [contract, published])).rows[0].id;
    await fail('23514', () => client.query(`UPDATE contract_revisions
      SET status='DRAFT' WHERE id=$1`, [revision]));
    await fail('23514', () => client.query(`DELETE FROM contract_revisions WHERE id=$1`, [revision]));
    await fail('23503', () => client.query(`DELETE FROM rentals WHERE id=$1`, [idA]));
    await fail('23503', () => client.query(`DELETE FROM users WHERE firebase_uid='companyA'`));

    const contractB = (await client.query(`INSERT INTO contracts(rental_id,user_id)
      VALUES($1,'companyB') RETURNING id`, [idB])).rows[0].id;
    await fail('23503', () => client.query(`INSERT INTO contract_revisions
      (contract_id,user_id,version_number) VALUES($1,'companyA',1)`, [contractB]));
    equal((await client.query('SELECT COUNT(*)::int AS n FROM contracts')).rows[0].n, 2);
    console.log(`PASS: ${checks} Task 4.1 database and security assertions`);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release(); await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
