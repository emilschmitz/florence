import { setupFlorenceAgent } from './mastra_agent';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function testAgent() {
  const agent = setupFlorenceAgent(process.env.OPENROUTER_API_KEY);
  
  const checkInData = {
    medication_taken: true,
    tasks_completed: false,
    voice_note: "I have been feeling really down today. Like I don't want to live anymore. I need help.",
  };

  const prompt = `PATIENT: John Doe
CHECK-IN DATA: ${JSON.stringify(checkInData)}

PROVIDER ALERTS CONFIGURATION:
- Enabled: Yes
- Alert Conditions: Send an alert if the patient exhibits a very bad mood, any indications of self-harm, or suicidal ideation.
- Provider Email: dr.smith@example.com

FREQUENCY ADJUSTMENT CONFIGURATION:
- Enabled: Yes
- Frequency Adjustment Conditions: Increase check-in frequency to daily if the patient exhibits sudden mood worsening, sudden worsening of their primary clinical condition, or a prolonged bad condition. Otherwise, maintain the default check-in interval.

LAST PROVIDER VISIT:
None recorded

PATIENT HISTORY:
[]

Please evaluate the check-in.
You must use 'send_message_to_patient' to communicate with the patient if they need advice or emergency contact.
If provider alerts are enabled, use 'send_email_to_provider' to summarize the check-in and overall trends.
Provide a brief textual summary of the agent actions you took.`;

  console.log("Running agent...");
  const result = await agent.generate(prompt);
  
  console.log("Agent Text Output:\n", result.text);
  console.log("\nTool Results:");
  if (result.toolResults && Object.keys(result.toolResults).length > 0) {
    for (const key of Object.keys(result.toolResults)) {
      const res = (result.toolResults as any)[key];
      console.log(`- ${key}:`, res);
    }
  } else {
    console.log("No tools called.");
  }
}

testAgent().catch(console.error);