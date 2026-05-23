import { getDb } from '../backend/db';

async function main() {
  const db = await getDb();
  const configRow = await db.get('SELECT value FROM config WHERE key = "care_protocol"');
  console.log("CARE PROTOCOL CONFIG IN DB:");
  console.log(JSON.stringify(JSON.parse(configRow.value), null, 2));
}

main().catch(console.error);
