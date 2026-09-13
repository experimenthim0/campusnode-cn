import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_ac8Xlemit7hy@ep-billowing-recipe-azptkavi-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const pool = new pg.Pool({ connectionString });
  try {
    console.log('Connecting to production Neon DB (ep-billowing-recipe)...');
    const migrations = await pool.query('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at ASC');
    console.log('Applied in prod db (' + migrations.rows.length + ' migrations):');
    migrations.rows.forEach(r => console.log(' -', r.migration_name, r.finished_at ? 'FINISHED' : 'PENDING'));

    const idx = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Participation'`);
    console.log('\nParticipation indexes in prod:');
    idx.rows.forEach(r => console.log(' -', r.indexname));

    const sDups = await pool.query(`
      SELECT "eventId", "studentId", COUNT(*) as count, array_agg(id) as ids 
      FROM "Participation" 
      WHERE "studentId" IS NOT NULL 
      GROUP BY "eventId", "studentId" 
      HAVING COUNT(*) > 1
    `);
    console.log('\nStudent duplicates in prod:', sDups.rows);

    const eDups = await pool.query(`
      SELECT "eventId", "externalUserId", COUNT(*) as count, array_agg(id) as ids 
      FROM "Participation" 
      WHERE "externalUserId" IS NOT NULL 
      GROUP BY "eventId", "externalUserId" 
      HAVING COUNT(*) > 1
    `);
    console.log('External duplicates in prod:', eDups.rows);

    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('Venue', 'VenueBlackout')
    `);
    console.log('\nExisting Venue tables in prod:', tables.rows.map(r => r.table_name));

  } catch (err) {
    console.error('Error connecting to prod db:', err.message);
  } finally {
    await pool.end();
  }
}

main();
