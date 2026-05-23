import { getDb } from '../backend/db';

async function checkSarah() {
  const db = await getDb();
  const row = await db.get('SELECT * FROM patients WHERE id = "1"');
  const history = JSON.parse(row.history);
  history.forEach((h, i) => {
    console.log(`${i}: ${h.date} - ${h.type}`);
  });
}
checkSarah();
