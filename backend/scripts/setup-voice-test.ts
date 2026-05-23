import fs from 'fs/promises';
import path from 'path';

// Realistic 1-second WAV file (base64) for "I took my meds" or similar.
// This is a minimal valid WAV file header + some data to satisfy the parser.
const SILENT_WAV = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const DATA_DIR = path.join(__dirname, '../data');

async function setupStaticAudio() {
  const buffer = Buffer.from(SILENT_WAV, 'base64');
  const filePath = path.join(DATA_DIR, 'integration_test.mp3');
  await fs.writeFile(filePath, buffer);
  console.log(`✅ Static audio snippet saved to: ${filePath}`);
}

setupStaticAudio().catch(console.error);
