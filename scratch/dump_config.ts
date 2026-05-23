import { getDb } from '../backend/db';

async function checkConfig() {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM config');
  rows.forEach(r => {
    console.log(`KEY: ${r.key}`);
    console.log(`VALUE: ${r.value}`);
  });
}
checkConfig();
