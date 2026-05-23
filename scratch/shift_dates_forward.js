const fs = require('fs');

const shiftDate = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const daysToShift = 7;

// Update system.json
const systemPath = 'backend/data/system.json';
const system = JSON.parse(fs.readFileSync(systemPath, 'utf8'));
system.current_date = shiftDate(system.current_date, daysToShift);
fs.writeFileSync(systemPath, JSON.stringify(system, null, 2));

// Update patients.json
const patientsPath = 'backend/data/patients.json';
const patients = JSON.parse(fs.readFileSync(patientsPath, 'utf8'));
patients.forEach(p => {
  if (p.history) {
    p.history.forEach(h => {
      h.date = shiftDate(h.date, daysToShift);
    });
  }
});
fs.writeFileSync(patientsPath, JSON.stringify(patients, null, 2));

console.log('Date shift complete.');
