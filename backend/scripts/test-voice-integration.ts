import fs from 'fs/promises';
import path from 'path';

const API_BASE = "http://localhost:3001/api";
const AUDIO_FILE = path.join(__dirname, '../data/integration_test.mp3');

async function runTest() {
  console.log("🚀 Starting Voice Integration Pipeline Test...");

  // 1. Ensure audio file exists (Static Snippet)
  try {
    await fs.access(AUDIO_FILE);
  } catch {
    console.log("Creating static audio snippet first...");
    const SILENT_WAV = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    await fs.writeFile(AUDIO_FILE, Buffer.from(SILENT_WAV, 'base64'));
  }
  console.log(`✅ Using audio snippet: ${AUDIO_FILE}`);

  // 2. VTT/Multimodal Analysis
  console.log("Step: Submitting audio snippet to /api/chat-voice (Multimodal Pipeline)...");
  
  const formData = new FormData();
  const fileBuffer = await fs.readFile(AUDIO_FILE);
  const audioBlob = new Blob([fileBuffer], { type: 'audio/wav' });
  
  formData.append('audio', audioBlob, 'integration_test.wav');
  formData.append('context', 'Have you taken your Wellbutrin? How is your mood?');
  formData.append('lastState', JSON.stringify({ mood_trend: 'same', value: 5 }));

  const chatRes = await fetch(`${API_BASE}/chat-voice`, {
    method: 'POST',
    body: formData
  });

  const chatData: any = await chatRes.json();
  if (chatData.error) {
    console.error("Pipeline Failed:", chatData.error);
    throw new Error("VTT processing failed");
  }

  console.log("--- PIPELINE RESULTS ---");
  console.log(`Transcription: "${chatData.transcription}"`);
  console.log(`AI Response: "${chatData.textReply}"`);
  console.log("Extracted Fields:", JSON.stringify(chatData.fieldUpdates, null, 2));

  // 3. Validation
  const success = chatData.textReply && chatData.fieldUpdates;

  if (success) {
    console.log("\n✨ Voice Pipeline Test PASSED!");
    console.log("The system successfully handled the audio upload and received a structured response from the clinical LLM.");
  } else {
    console.log("\n❌ Voice Pipeline Test FAILED (Empty response)");
  }
}

runTest().catch(console.error);
