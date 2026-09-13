import pg from 'pg';

async function checkTable(connectionString, name) {
  const pool = new pg.Pool({ connectionString });
  try {
    console.log(`\n=== Checking ${name} ===`);
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('Venue', 'VenueBlackout')
      ORDER BY table_name, ordinal_position
    `);
    console.log('Columns:');
    cols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable}, default: ${r.column_default})`));

    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('Venue', 'VenueBlackout')
    `);
    console.log('Indexes:');
    indexes.rows.forEach(r => console.log(` - ${r.indexname}: ${r.indexdef}`));
  } finally {
    await pool.end();
  }
}

const staging = 'postgresql://neondb_owner:npg_GKSCT7r8Qhva@ep-patient-mode-aztzf3z6-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const prod = 'postgresql://neondb_owner:npg_ac8Xlemit7hy@ep-billowing-recipe-azptkavi-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function run() {
  await checkTable(staging, 'STAGING');
  await checkTable(prod, 'PRODUCTION');
}

run().catch(console.error);
