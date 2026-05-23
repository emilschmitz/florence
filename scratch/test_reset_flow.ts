import { getDb } from '../backend/db';
import { spawn } from 'child_process';
import path from 'path';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log("=== FLORENCE REFRESH RESET VERIFICATION ===");

  // 1. Start backend process
  console.log("Starting backend server...");
  const backendDir = path.join(__dirname, '../backend');
  const serverProcess = spawn('bun', ['run', 'index.ts'], {
    cwd: backendDir,
    env: { ...process.env, PORT: '3001' }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data.toString().trim()}`);
  });

  // Wait 3 seconds for server to start
  await delay(3000);

  try {
    // 2. Fetch current patients list
    console.log("\n1. Fetching initial patient data...");
    const resPatientsInitial = await fetch('http://localhost:3001/api/patients');
    if (!resPatientsInitial.ok) throw new Error("Failed to fetch patients");
    const patientsInitial = await resPatientsInitial.json() as any[];
    console.log(`Successfully fetched ${patientsInitial.length} patients.`);
    
    const targetPatient = patientsInitial.find(p => p.id === '1');
    const initialHistoryLength = targetPatient.history.length;
    console.log(`Patient Sarah Jenkins initial history length: ${initialHistoryLength}`);

    // 3. Submit a new check-in
    console.log("\n2. Submitting a new patient check-in...");
    const checkInData = {
      medication_taken: true,
      tasks_completed: true,
      voice_note: "Feeling much better today, went for a run."
    };

    const resSubmit = await fetch('http://localhost:3001/api/submit-check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: '1',
        checkInData
      })
    });

    if (!resSubmit.ok) throw new Error("Failed to submit check-in");
    console.log("Check-in submitted successfully!");

    // 4. Verify check-in is added
    console.log("\n3. Fetching patient data to confirm update...");
    const resPatientsAfterCheckIn = await fetch('http://localhost:3001/api/patients');
    const patientsAfterCheckIn = await resPatientsAfterCheckIn.json() as any[];
    const targetPatientAfter = patientsAfterCheckIn.find(p => p.id === '1');
    const newHistoryLength = targetPatientAfter.history.length;
    console.log(`Patient Sarah Jenkins history length after check-in: ${newHistoryLength}`);
    
    if (newHistoryLength !== initialHistoryLength + 1) {
      throw new Error(`Expected history length to be ${initialHistoryLength + 1}, got ${newHistoryLength}`);
    }
    console.log("[PASS] Check-in successfully added to database.");

    // 5. Reset database (Simulating page mount / refresh)
    console.log("\n4. Triggering /api/reset (Simulating page refresh)...");
    const resReset = await fetch('http://localhost:3001/api/reset', {
      method: 'POST'
    });
    if (!resReset.ok) throw new Error("Failed to reset database");
    console.log("Reset request completed.");

    // 6. Verify database is reset to original state
    console.log("\n5. Fetching patient data to confirm reset...");
    const resPatientsAfterReset = await fetch('http://localhost:3001/api/patients');
    const patientsAfterReset = await resPatientsAfterReset.json() as any[];
    const targetPatientAfterReset = patientsAfterReset.find(p => p.id === '1');
    const resetHistoryLength = targetPatientAfterReset.history.length;
    console.log(`Patient Sarah Jenkins history length after reset: ${resetHistoryLength}`);

    if (resetHistoryLength !== initialHistoryLength) {
      throw new Error(`Expected history length to reset back to ${initialHistoryLength}, got ${resetHistoryLength}`);
    }
    console.log("[PASS] Database successfully reset back to original state!");
    console.log("\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===");

  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    console.log("Stopping backend server...");
    serverProcess.kill();
    process.exit(0);
  }
}

runVerification();
