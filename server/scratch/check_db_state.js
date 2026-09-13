import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB');

    // 1. Check _prisma_migrations
    const migrations = await client.query('SELECT id, migration_name, finished_at FROM _prisma_migrations ORDER BY started_at ASC');
    console.log('Applied Migrations count:', migrations.rows.length);
    migrations.rows.forEach(m => console.log(' -', m.migration_name, m.finished_at ? 'FINISHED' : 'PENDING/FAILED'));

    // 2. Check indexes on Participation
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'Participation'
    `);
    console.log('\nParticipation Indexes:');
    indexes.rows.forEach(i => console.log(' -', i.indexname, ':', i.indexdef));

    // 3. Check for duplicates (eventId, studentId)
    const studentDups = await client.query(`
      SELECT "eventId", "studentId", COUNT(*) as cnt, array_agg(id) as ids
      FROM "Participation"
      WHERE "studentId" IS NOT NULL
      GROUP BY "eventId", "studentId"
      HAVING COUNT(*) > 1
    `);
    console.log('\nStudent Duplicates:', studentDups.rows);

    // 4. Check for duplicates (eventId, externalUserId)
    const externalDups = await client.query(`
      SELECT "eventId", "externalUserId", COUNT(*) as cnt, array_agg(id) as ids
      FROM "Participation"
      WHERE "externalUserId" IS NOT NULL
      GROUP BY "eventId", "externalUserId"
      HAVING COUNT(*) > 1
    `);
    console.log('\nExternal Duplicates:', externalDups.rows);

    // 5. Check if Venue and VenueBlackout tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('Venue', 'VenueBlackout')
    `);
    console.log('\nExisting Venue tables:', tables.rows.map(r => r.table_name));

    if (tables.rows.some(r => r.table_name === 'Venue')) {
      const venueCount = await client.query('SELECT count(*) FROM "Venue"');
      console.log('Venue row count:', venueCount.rows[0].count);
    }
    if (tables.rows.some(r => r.table_name === 'VenueBlackout')) {
      const blackoutCount = await client.query('SELECT count(*) FROM "VenueBlackout"');
      console.log('VenueBlackout row count:', blackoutCount.rows[0].count);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
