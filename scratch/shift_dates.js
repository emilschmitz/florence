const fs = require('fs');
const path = require('path');

const shiftDate = (dateStr) => {
  const date = new Date(dateStr);
  // Shift by 2 months back (approx 61 days)
  // We want 2026-05-19 to become 2026-03-19
  date.setMonth(date.getMonth() - 2);
  return date.toISOString().split('T')[0];
};

// Update system.json
const systemPath = 'backend/data/system.json';
const system = JSON.parse(fs.readFileSync(systemPath, 'utf8'));
system.current_date = shiftDate(system.current_date);
fs.writeFileSync(systemPath, JSON.stringify(system, null, 2));

// Update patients.json
const patientsPath = 'backend/data/patients.json';
const patients = JSON.parse(fs.readFileSync(patientsPath, 'utf8'));
patients.forEach(p => {
  if (p.history) {
    p.history.forEach(h => {
      h.date = shiftDate(h.date);
    });
  }
});
fs.writeFileSync(patientsPath, JSON.stringify(patients, null, 2));

console.log('Date shift complete.');
