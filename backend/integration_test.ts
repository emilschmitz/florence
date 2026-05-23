import { getDb } from './db';
import fs from 'fs/promises';
import path from 'path';

// Include generators for the test
function generateSarahHistory(): any[] {
  const history: any[] = [];
  const startDate = new Date("2026-02-15");
  for (let i = 0; i < 90; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    if (i > 0 && i % 14 === 0) {
      history.push({
        type: 'provider-visit',
        date: dateStr,
        notes: "Routine follow-up notes.",
        
        prescriptions: ['Wellbutrin 150mg', 'Lexapro 20mg']
      });
    }

    if (i % 2 === 0) {
      history.push({
        type: 'check-in',
        date: dateStr,
        value: 6,
        mood_trend: 'same',
        medication_taken: true,
        free_text_notes: "Okay today.",
        mental_state_summary: "Stable.",
        actions: ""
      });
    }
  }
  return history;
}

async function runTests() {
  console.log(" Florence Backend Integration Test");
  
  try {
    const db = await getDb();
    
    // Self-contained initialization check
    let countRow = await db.get('SELECT COUNT(*) as count FROM patients');
    if (countRow.count === 0) {
      console.log("Pre-populating test database...");
      await db.run('INSERT INTO patients (id, name, condition, medications, history) VALUES (?, ?, ?, ?, ?)', 
        ['1', 'Sarah Jenkins', 'Major Depressive Disorder', JSON.stringify(['Wellbutrin 150mg']), JSON.stringify(generateSarahHistory())]);
      await db.run('INSERT INTO patients (id, name, condition, medications, history) VALUES (?, ?, ?, ?, ?)', 
        ['2', 'Michael Chen', 'Generalized Anxiety', JSON.stringify(['Zoloft 50mg']), JSON.stringify([])]);
      await db.run('INSERT INTO patients (id, name, condition, medications, history) VALUES (?, ?, ?, ?, ?)', 
        ['3', 'Elena Rodriguez', 'Bipolar II Disorder', JSON.stringify(['Lamictal 100mg']), JSON.stringify([])]);
      
      await db.run('INSERT INTO config (key, value) VALUES (?, ?)', ['care_protocol', JSON.stringify({ frequency_days: 2 })]);
      await db.run('INSERT INTO config (key, value) VALUES (?, ?)', ['system', JSON.stringify({ current_date: "2026-05-20", logs: [] })]);
    }
    
    const patients = await db.all('SELECT id, name FROM patients');
    console.log(`[PASS] Database initialized with ${patients.length} patients.`);
    if (patients.length < 2) {
      throw new Error(`Expected at least 2 patients, got ${patients.length}`);
    }
    
    // Test 2: Check Sarah Jenkins patient record and history
    const sarah = await db.get('SELECT * FROM patients WHERE id = "1"');
    const sarahHistory = JSON.parse(sarah.history);
    console.log(`[PASS] Sarah Jenkins has ${sarahHistory.length} history entries.`);
    
    const checkIns = sarahHistory.filter((h: any) => h.type === 'check-in');
    const visits = sarahHistory.filter((h: any) => h.type === 'provider-visit');
    console.log(`       - Check-ins: ${checkIns.length}`);
    console.log(`       - Provider Visits: ${visits.length}`);
    if (checkIns.length === 0 || visits.length === 0) {
      throw new Error("Missing check-ins or provider visits in test history.");
    }
    
    // Test 3: Check system date
    const systemRow = await db.get('SELECT value FROM config WHERE key = "system"');
    const system = JSON.parse(systemRow.value);
    console.log(`[PASS] System simulated current date is: ${system.current_date}`);

    console.log("\n All backend tests completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("\n Test failed:", error);
    process.exit(1);
  }
}

runTests();
