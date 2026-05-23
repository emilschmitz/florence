import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from './db';

dotenv.config({ path: '../.env' });

const app = express();
const host = process.env.HOST || '127.0.0.1';
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('/', async (req, res) => {
  await initData(true);
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.post('/api/reset', async (req, res) => {
  await initData(true);
  res.json({ status: 'success', message: 'Database reset to default dummy data.' });
});

const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const VOICE_MODEL = "google/gemini-2.0-flash-001"; 
const LLM_MODEL = "deepseek/deepseek-chat"; 

const DATA_DIR = path.join(__dirname, 'data');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');

async function initData(forceReset = false) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const db = await getDb();

    if (forceReset) {
      console.log('Florence: Wiping database tables for reset...');
      await db.run('DELETE FROM patients');
      await db.run('DELETE FROM config');
      await db.run('DELETE FROM grounding');
    }

    const patientCount = await db.get('SELECT COUNT(*) as count FROM patients');
    if (patientCount.count === 0) {
      const patientsJson = await fs.readFile(PATIENTS_FILE, 'utf-8');
      const initialPatients = JSON.parse(patientsJson);
      
      for (const p of initialPatients) {
        await db.run('INSERT INTO patients (id, name, condition, medications, history, next_provider_visit) VALUES (?, ?, ?, ?, ?, ?)', 
          [p.id, p.name, p.condition, JSON.stringify(p.medications), JSON.stringify(p.history), p.nextProviderVisitDate || null]);
      }
    }

    const configCount = await db.get('SELECT COUNT(*) as count FROM config');
    if (configCount.count === 0) {
      const defaultConfig = {
        frequency_days: 2,
        agent_instructions: "Check in generally every other day, with the frequency adapting plus or minus one day depending on your holistic assessment of the mood check-ins, provider notes, and medical guidelines.\n\nAdd a provider alert in case of self-harming thoughts or suicidal ideation, a sudden drop in mood, or indications of serious adverse effects of medication. Include some document you can also load into context, like a guideline or assessment of the medicine (I don't know what they use).\n\nOkay so now that we have the provider alerts, in case of strong depressive symptoms or worsening of depressive symptoms, alert the patient that they can get in touch with me by email to try to book an emergency visit.\n\nIn case of suicidal ideation or self-harm, also notify the patient of the emergency hotline or whatever you already had there.",
        notification_channels: [
          { type: "email", destination: "drdoe@example.com" }
        ],
        medications: [
          { name: "Wellbutrin", dosage: "150mg" },
          { name: "Lexapro", dosage: "10mg" }
        ],
        medications_text: "Wellbutrin 150mg and Lexapro 10mg",
        questions: [
          { id: "q1", text: "Did you take your {{medications}}?", type: "categorical", options: ["Yes", "No"] },
          { id: "q2", text: "Did you manage to complete the tasks that you had planned for today?", type: "categorical", options: ["Yes", "No"] }
        ]
      };
      await db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['care_protocol', JSON.stringify(defaultConfig)]);
      // Note: The current system date is 2026-05-21. To ensure that the patient check-in view starts directly on the check-in quiz (rather than the "Thank you" completion screen) upon refresh/reset, we deliberately deleted the 2026-05-21 check-in records from the seed data (patients.json). Do not add a check-in for 2026-05-21 to the seeded mock history.
      await db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['system', JSON.stringify({ current_date: "2026-05-21", logs: [] })]);
    }

    const groundingCount = await db.get('SELECT COUNT(*) as count FROM grounding');
    if (groundingCount.count === 0) {
      const sources = [
        { title: "PHQ-9", description: "Depression screening", validity: "88% sensitivity", use_case: "Mood tracking" },
        { title: "GAD-7", description: "Anxiety screening", validity: "89% sensitivity", use_case: "Anxiety monitoring" }
      ];
      for (const s of sources) {
        await db.run('INSERT INTO grounding (title, description, validity, use_case) VALUES (?, ?, ?, ?)', [s.title, s.description, s.validity, s.use_case]);
      }
    }
  } catch (error) {
    console.error('Florence: Data initialization failed:', error);
  }
}
initData(true);

import { setupFlorenceAgent } from './mastra_agent';



async function runFlorenceAgentMastra(checkInData: any, patientId: string) {
  console.log(`[Florence Agent] Starting agent run for patientId: ${patientId}`);
  try {
    const db = await getDb();
    const configRow = await db.get('SELECT value FROM config WHERE key = "care_protocol"');
    const config = JSON.parse(configRow.value);
    const patientRow = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    const patient = { ...patientRow, medications: JSON.parse(patientRow.medications), history: JSON.parse(patientRow.history) };

    const providerVisits = patient.history.filter((h: any) => h.type === 'provider-visit');
    const lastProviderVisit = providerVisits.length > 0 ? providerVisits[providerVisits.length - 1] : null;

    const systemRow = await db.get('SELECT value FROM config WHERE key = "system"');
    const systemDate = JSON.parse(systemRow.value).current_date;

    // Calculate if this check-in is the last one before the next scheduled visit
    const nextVisitTime = patientRow.next_provider_visit ? new Date(patientRow.next_provider_visit).getTime() : null;
    const nextCheckInTime = new Date(systemDate);
    nextCheckInTime.setDate(nextCheckInTime.getDate() + (config.frequency_days || 2));
    const isLastCheckInBeforeVisit = nextVisitTime ? (nextCheckInTime.getTime() >= nextVisitTime) : false;

    // Calculate days until next provider visit
    let daysUntilVisit = null;
    if (patientRow.next_provider_visit) {
      const diffTime = new Date(patientRow.next_provider_visit).getTime() - new Date(systemDate).getTime();
      daysUntilVisit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Retrieve clinical grounding guidelines
    const groundingSources = await db.all('SELECT * FROM grounding');
    const groundingSourcesText = groundingSources
      .map((g: any) => `- ${g.title}: ${g.description} (${g.use_case}, Validity: ${g.validity})`)
      .join('\n');

    const providerContactMethodsText = config.notification_channels && config.notification_channels.length > 0
      ? config.notification_channels.map((chan: any) => `- ${chan.type.toUpperCase()}: ${chan.destination}`).join('\n')
      : 'None configured';

    console.log(`[Florence Agent] System date: ${systemDate}`);
    console.log(`[Florence Agent] Next provider visit date: ${patientRow.next_provider_visit || 'None'}`);
    console.log(`[Florence Agent] Computed next check-in time: ${nextCheckInTime.toISOString().split('T')[0]}`);
    console.log(`[Florence Agent] Is this the last check-in before the next visit? ${isLastCheckInBeforeVisit ? 'YES' : 'NO'}`);

    const agent = setupFlorenceAgent(process.env.OPENROUTER_API_KEY);

    const prompt = `PATIENT: ${patient.name}
CHECK-IN DATA: ${JSON.stringify(checkInData)}

AGENT CLINICAL INSTRUCTIONS:
${config.agent_instructions || "Check in generally every other day."}

PROVIDER CONTACT METHODS:
${providerContactMethodsText}

CLINICAL GROUNDING GUIDELINES:
${groundingSourcesText}

NEXT PROVIDER VISIT:
- Scheduled Date: ${patientRow.next_provider_visit || "None scheduled"}
- Days until visit: ${daysUntilVisit !== null ? daysUntilVisit : "N/A"}
- Is a provider visit upcoming in the next week/few days? ${daysUntilVisit !== null && daysUntilVisit >= 0 && daysUntilVisit <= 7 ? "YES" : "NO"}

LAST PROVIDER VISIT:
${lastProviderVisit ? JSON.stringify(lastProviderVisit) : "None recorded"}

PATIENT HISTORY:
${JSON.stringify(patient.history)} // Full context

Please evaluate the check-in.
- Tone guidelines: be terse, matter-of-fact, clinical in tone. Avoid flowery language or dramatization.
- Summarize your assessment and action steps in under 60 words.
- If a provider visit is upcoming in the next week or few days, you MUST warn/alert the patient about this by calling the 'send_message_to_patient' tool.
- If this is the last check-in before the next visit, you MUST trigger the 'send_email_to_provider' tool to send a summary email to the provider.
- Provide a brief textual summary of the agent actions you took.`;

    console.log(`[Florence Agent] Generating agent response with prompt...`);
    const result = await agent.generate(prompt);
    console.log(`[Florence Agent] Text result received: "${result.text}"`);
    console.log(`[Florence Agent] Tool calls:`, JSON.stringify(result.toolCalls));

    let notifyProvider = false;
    let notificationMessage = "";
    let adjustSchedule = false;
    let newFrequency = undefined;
    let patientMessage = undefined;
    let patientEncouragementHeader = undefined;
    let patientEncouragementBody = undefined;
    
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const t of result.toolCalls as any[]) {
        const payload = t.payload || {};
        if (payload.toolName === 'send_message_to_patient' || payload.toolName === 'sendMessageToPatient') {
          patientMessage = payload.args.message;
          console.log(`[Florence Agent] Staged message to patient: "${patientMessage}"`);
        }
        if (payload.toolName === 'send_email_to_provider' || payload.toolName === 'sendEmailToProvider') {
          notifyProvider = true;
          notificationMessage = payload.args.subject + " - " + payload.args.body.substring(0, 50) + "...";
          console.log(`[Florence Agent] Staged email to provider with subject: "${payload.args.subject}"`);
        }
        if (payload.toolName === 'adjust_checkin_schedule' || payload.toolName === 'adjustSchedule') {
          adjustSchedule = true;
          newFrequency = payload.args.newFrequencyDays;
          console.log(`[Florence Agent] Staged schedule adjustment to: ${newFrequency} days`);
        }
        if (payload.toolName === 'set_patient_encouragement' || payload.toolName === 'setPatientEncouragement') {
          patientEncouragementHeader = payload.args.header;
          patientEncouragementBody = payload.args.body;
          console.log(`[Florence Agent] Patient encouragement set. Header: "${patientEncouragementHeader}", Body: "${patientEncouragementBody}"`);
        }
      }
    }

    if (notifyProvider) {
      const emailMethod = config.notification_channels?.find((c: any) => c.type === 'email');
      if (!emailMethod || !emailMethod.destination) {
        console.log(`[Florence Agent] Provider email requested but no provider email address is configured; overriding email.`);
        notifyProvider = false;
        notificationMessage = "";
      }
    }

    if (adjustSchedule && typeof newFrequency === 'number') {
      config.frequency_days = newFrequency;
      await db.run('UPDATE config SET value = ? WHERE key = "care_protocol"', [JSON.stringify(config)]);
      console.log(`[Florence Agent] Updated care protocol frequency_days in database to: ${newFrequency}`);
    }

    return { 
      notifyProvider, 
      notificationMessage, 
      adjustSchedule, 
      newFrequency, 
      patientMessage, 
      traceSummary: result.text,
      patientEncouragementHeader,
      patientEncouragementBody
    };

  } catch (error) {
    console.error('Florence Agent Error:', error);
  }
}

app.get('/api/patients', async (req, res) => {
  console.log(`[GET /api/patients] Fetching and mapping patient records...`);
  const db = await getDb();
  try {
    const configRow = await db.get('SELECT value FROM config WHERE key = "care_protocol"');
    const config = JSON.parse(configRow.value);
    const systemRow = await db.get('SELECT value FROM config WHERE key = "system"');
    const system = JSON.parse(systemRow.value);
    
    const rows = await db.all('SELECT * FROM patients');
    console.log(`[GET /api/patients] Found ${rows.length} patient rows in database.`);
    
    const mapped = rows.map(r => {
      const history = JSON.parse(r.history);
      const medications = JSON.parse(r.medications);
      
      // Find last check-in date
      const checkIns = history.filter((h: any) => h.type === 'check-in');
      let nextCheckInDate = system.current_date; // default
      if (checkIns.length > 0) {
        const lastCheckIn = checkIns[checkIns.length - 1];
        const d = new Date(lastCheckIn.date);
        d.setDate(d.getDate() + config.frequency_days);
        nextCheckInDate = d.toISOString().split('T')[0];
      } else {
        nextCheckInDate = system.current_date;
      }
      
      console.log(`[GET /api/patients] Mapping patient: ${r.name} (ID: ${r.id}). Next check-in: ${nextCheckInDate}, Next visit: ${r.next_provider_visit || 'None'}`);

      return {
        ...r,
        id: r.id.toString(),
        medications,
        history,
        nextCheckInDate,
        nextProviderVisitDate: r.next_provider_visit || null
      };
    });
    res.json(mapped);
  } catch (error) {
    console.error(`[GET /api/patients] Error loading patients:`, error);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
});

app.get('/api/config', async (req, res) => {
  const db = await getDb();
  const row = await db.get('SELECT value FROM config WHERE key = "care_protocol"');
  res.json(JSON.parse(row.value));
});

app.get('/api/system', async (req, res) => {
  const db = await getDb();
  const row = await db.get('SELECT value FROM config WHERE key = "system"');
  res.json(JSON.parse(row.value));
});

app.post('/api/chat-voice', upload.single('audio'), async (req, res) => {
  const { currentHistory, context, lastState, textInput } = req.body;
  try {
    const history = JSON.parse(currentHistory || '[]');
    let userContent: any[] = [];
    if (req.file) {
      userContent.push({ type: "input_audio", input_audio: { data: req.file.buffer.toString('base64'), format: "wav" } });
    }
    if (textInput) userContent.push({ type: "text", text: textInput });

    const response = await openai.chat.completions.create({
      model: VOICE_MODEL,
      messages: [
        {
          role: "system",
          content: `You are the Florence clinical assistant. 
          Questions: ${context}
          Last State: ${lastState}
          Agentically cross off answered question IDs. 
          Return JSON: { "textReply": "string", "answeredQuestionIds": ["id1", "id2"], "fieldUpdates": {}, "isComplete": boolean }`
        },
        ...history,
        { role: "user", content: userContent }
      ] as any,
      response_format: { type: "json_object" }
    });
    res.json(JSON.parse(response.choices[0]?.message?.content || '{}'));
  } catch (error) {
    res.status(500).json({ error: 'Florence Voice AI failed' });
  }
});

async function assessMoodWithLLM(text: string): Promise<number> {
  if (!text || text.trim() === '') {
    return 3;
  }
  try {
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a clinical mood assessment assistant. Analyze the patient's voice note transcript and rate their mood on a scale of 1 to 5, where 1 is bad (depressed/anxious/severe low mood), 3 is neutral/stable, and 5 is good (excellent/happy/energetic mood). Return ONLY a JSON object with a single field 'score' which must be an integer between 1 and 5."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (typeof parsed.score === 'number') {
        return Math.max(1, Math.min(5, Math.round(parsed.score)));
      }
    }
    return 3;
  } catch (error) {
    console.error('assessMoodWithLLM failed, returning default 3:', error);
    return 3;
  }
}

app.post('/api/submit-check-in', async (req, res) => {
  const { patientId, checkInData } = req.body;
  console.log(`[POST /api/submit-check-in] Received check-in for patientId: ${patientId}. Data:`, JSON.stringify(checkInData));
  const db = await getDb();
  try {
    const patientRow = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patientRow) {
      console.warn(`[POST /api/submit-check-in] Patient not found: ${patientId}`);
      return res.status(404).json({ error: 'Not found' });
    }
    const history = JSON.parse(patientRow.history);
    const systemRow = await db.get('SELECT value FROM config WHERE key = "system"');
    const systemDate = JSON.parse(systemRow.value).current_date;
    
    let moodValue = undefined;
    if (checkInData.voice_note && checkInData.voice_note.trim() !== '') {
      console.log(`[POST /api/submit-check-in] Patient provided voice note. Assessing mood with LLM...`);
      moodValue = await assessMoodWithLLM(checkInData.voice_note);
      console.log(`[POST /api/submit-check-in] Mood assessment result score: ${moodValue}`);
    } else {
      console.log(`[POST /api/submit-check-in] No voice note provided, skipping mood assessment.`);
    }
 
    const newEntry: any = {
      type: 'check-in',
      date: systemDate,
      completed: true,
      medication_taken: checkInData.medication_taken !== undefined ? !!checkInData.medication_taken : undefined,
      medication_explain: checkInData.medication_explain || undefined,
      tasks_completed: checkInData.tasks_completed !== undefined ? !!checkInData.tasks_completed : undefined,
      tasks_explain: checkInData.tasks_explain || undefined,
      voice_note: checkInData.voice_note || undefined,
      value: moodValue,
      mental_state_summary: checkInData.voice_note 
        ? `Patient left voice update: "${checkInData.voice_note.slice(0, 30)}..."` 
        : "Completed daily routine.",
      actions: ""
    };
 
    console.log(`[POST /api/submit-check-in] Running Florence Mastra Agent decision logic...`);
    const agentDecision = await runFlorenceAgentMastra(newEntry, patientId);
    
    if (agentDecision) {
      console.log(`[POST /api/submit-check-in] Agent decision results:`, JSON.stringify(agentDecision));
      let finalActions = agentDecision.traceSummary || "Analyzed by Florence Agent";
      if (agentDecision.notifyProvider) {
        finalActions = "[Email Alert Sent] " + finalActions;
      }
      newEntry.actions = finalActions;
      if (agentDecision.patientMessage) {
        newEntry.agent_message = agentDecision.patientMessage;
      }
      newEntry.patient_encouragement_header = agentDecision.patientEncouragementHeader || `Thank you for checking in, ${patientRow.name ? patientRow.name.split(' ')[0] : 'Patient'}`;
      newEntry.patient_encouragement_body = agentDecision.patientEncouragementBody || "Your check-in has been successfully received.";
    } else {
      console.warn(`[POST /api/submit-check-in] Florence Agent failed to return a decision.`);
      newEntry.actions = "Analyzed by Florence Agent";
      newEntry.patient_encouragement_header = `Thank you for checking in, ${patientRow.name ? patientRow.name.split(' ')[0] : 'Patient'}`;
      newEntry.patient_encouragement_body = "Your check-in has been successfully received.";
    }
 
    history.push(newEntry);
    await db.run('UPDATE patients SET history = ? WHERE id = ?', [JSON.stringify(history), patientId]);
    console.log(`[POST /api/submit-check-in] Patient history updated successfully in database.`);
    
    // Automatically advance simulated date in config key="system"
    const configRow = await db.get('SELECT value FROM config WHERE key = "care_protocol"');
    const config = JSON.parse(configRow.value);
    const freq = (agentDecision?.adjustSchedule && typeof agentDecision.newFrequency === 'number') 
      ? agentDecision.newFrequency 
      : config.frequency_days;
    
    const d = new Date(systemDate);
    d.setDate(d.getDate() + freq);
    const nextCheckInDate = d.toISOString().split('T')[0];

    const currentSystem = JSON.parse(systemRow.value);
    currentSystem.current_date = nextCheckInDate;
    currentSystem.logs.push(`Clock advanced to ${nextCheckInDate} after check-in submission`);
    await db.run('UPDATE config SET value = ? WHERE key = "system"', [JSON.stringify(currentSystem)]);
    console.log(`[POST /api/submit-check-in] Automatically advanced simulated date to: ${nextCheckInDate}`);

    res.json({ 
      status: 'success',
      agentMessage: agentDecision?.patientMessage,
      patientEncouragementHeader: newEntry.patient_encouragement_header,
      patientEncouragementBody: newEntry.patient_encouragement_body,
      nextCheckInDate: nextCheckInDate
    });
  } catch (error) {
    console.error('[POST /api/submit-check-in] Failed to submit check-in:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/skip-check-in', async (req, res) => {
  const { patientId } = req.body;
  console.log(`[POST /api/skip-check-in] Skipping check-in for patientId: ${patientId}`);
  const db = await getDb();
  try {
    const patientRow = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patientRow) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const history = JSON.parse(patientRow.history);
    const systemRow = await db.get('SELECT value FROM config WHERE key = "system"');
    const systemDate = JSON.parse(systemRow.value).current_date;
    
    const newEntry = {
      type: 'check-in',
      date: systemDate,
      completed: false,
      actions: "Skipped check-in"
    };
    
    history.push(newEntry);
    await db.run('UPDATE patients SET history = ? WHERE id = ?', [JSON.stringify(history), patientId]);
    console.log(`[POST /api/skip-check-in] Patient history updated with skipped check-in.`);
    
    res.json({ status: 'success' });
  } catch (error) {
    console.error('[POST /api/skip-check-in] Failed to skip check-in:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/configure-nl', async (req, res) => {
  const { rawInstruction, manualConfig } = req.body;
  const db = await getDb();
  try {
    if (manualConfig) {
      await db.run('UPDATE config SET value = ? WHERE key = "care_protocol"', [JSON.stringify(manualConfig)]);
      return res.json({ configuration: manualConfig });
    }
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [{ role: "system", content: "Translate instructions into Florence care protocol config (JSON)." }, { role: "user", content: rawInstruction }],
      response_format: { type: "json_object" }
    });
    const configuration = JSON.parse(response.choices[0]?.message?.content || '{}');
    await db.run('UPDATE config SET value = ? WHERE key = "care_protocol"', [JSON.stringify(configuration)]);
    res.json({ configuration });
  } catch (error) {
    res.status(500).json({ error: 'Config failed' });
  }
});

app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  try {
    const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "alloy", input: text });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'TTS failed' });
  }
});

app.post('/api/time-skip', async (req, res) => {
  const { days, targetDate } = req.body;
  const db = await getDb();
  try {
    const row = await db.get('SELECT value FROM config WHERE key = "system"');
    const system = JSON.parse(row.value);
    
    if (targetDate) {
      system.current_date = targetDate;
      system.logs.push(`Clock advanced to ${targetDate}`);
    } else if (days) {
      const d = new Date(system.current_date);
      d.setDate(d.getDate() + days);
      system.current_date = d.toISOString().split('T')[0];
      system.logs.push(`Clock advanced to ${system.current_date}`);
    }
    
    await db.run('UPDATE config SET value = ? WHERE key = "system"', [JSON.stringify(system)]);
    res.json({ status: 'success', current_date: system.current_date });
  } catch (error) {
    res.status(500).json({ error: 'Time skip failed' });
  }
});

app.listen(port, host, () => console.log(`Florence Backend running at http://${host}:${port}`));
