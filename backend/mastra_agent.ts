import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import nodemailer from 'nodemailer';

export const setupFlorenceAgent = (apiKey: string | undefined) => {
  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
  });

  const sendMessageToPatient = createTool({
    id: 'send_message_to_patient',
    description: 'Send a message to the patient. This will be shown to them immediately after submitting their check-in. This should be used for crisis or suicide hotline messages, or recommendations to contact the provider.',
    inputSchema: z.object({
      message: z.string().describe('The message content to show to the patient.')
    }),
    execute: async (args) => {
      return { status: "Message staged for patient", message: (args as any).context?.message || (args as any).message || (args as any).data?.message };
    }
  });

  const sendEmailToProvider = createTool({
    id: 'send_email_to_provider',
    description: 'Send a preparatory email to the physician/provider with a summary, trends, and raw data.',
    inputSchema: z.object({
      providerEmail: z.string().describe('The email address of the provider.'),
      subject: z.string().describe('The email subject.'),
      body: z.string().describe('The email body content containing the summary and trends.')
    }),
    execute: async (args) => {
      const email = (args as any).providerEmail || (args as any).context?.providerEmail || (args as any).data?.providerEmail;
      const sub = (args as any).subject || (args as any).context?.subject || (args as any).data?.subject;
      const bdy = (args as any).body || (args as any).context?.body || (args as any).data?.body;
      
      const from = 'Florence Assistant <noreply@florence.care>';

      console.log(`[SMTP] send_email_to_provider: Attempting to send email to ${email} via local SMTP`);

      try {
        const transporter = nodemailer.createTransport({
          host: "localhost",
          port: 1025,
          secure: false,
          ignoreTLS: true
        });

        const info = await transporter.sendMail({
          from,
          to: email,
          subject: sub,
          text: bdy
        });

        console.log(`[SMTP SUCCESS] Real email sent successfully via local SMTP: ${info.messageId}`);
        return { status: "Email sent successfully via local SMTP", messageId: info.messageId };
      } catch (error) {
        console.error(`[SMTP ERROR] Local SMTP sending failed:`, error);
        return { status: "Email sending failed via local SMTP", error: String(error) };
      }
    }
  });

  const adjustSchedule = createTool({
    id: 'adjust_checkin_schedule',
    description: 'Adjust the check-in schedule frequency for the patient.',
    inputSchema: z.object({
      newFrequencyDays: z.number().describe('The new check-in frequency in days.')
    }),
    execute: async (args) => {
      return { status: "Schedule adjusted", newFrequency: (args as any).context?.newFrequencyDays || (args as any).newFrequencyDays || (args as any).data?.newFrequencyDays };
    }
  });

  const setPatientEncouragement = createTool({
    id: 'set_patient_encouragement',
    description: 'Set the patient-facing encouraging header and body message on the check-in completion screen. This is mandatory and must be called for every check-in evaluation to acknowledge their check-in.',
    inputSchema: z.object({
      header: z.string().describe('The encouraging or clinical heading, e.g. "Great job, Sarah!" or "Thank you for checking in, Sarah"'),
      body: z.string().describe('Contextually appropriate body text acknowledging medication adherence or task completion if things are going well, or supportive non-judgmental acknowledgment if things are not going well.')
    }),
    execute: async (args) => {
      return { status: "Encouragement message set", header: (args as any).header, body: (args as any).body };
    }
  });

  const agent = new Agent({
    id: 'florence-agent',
    name: 'FlorenceAgent',
    instructions: `You are the Florence clinical assistant. You review patient check-ins.
You have access to the patient's full history, the last date they saw the provider, and clinical guidelines.
You must analyze the patient's check-in data and determine:
1. If the patient is in crisis (e.g., severe bad mood, self-harm, suicidal ideation), you should use 'send_message_to_patient' to provide a crisis hotline or emergency advice.
2. If the patient has milder issues, you can use 'send_message_to_patient' to recommend they contact the provider.
3. You can use 'send_email_to_provider' to send a summary email to the provider with longitudinal trend analysis, guided by the clinician's instructions.
4. You can use 'adjust_checkin_schedule' to change how often they check in, guided by the clinician's instructions.
5. If a provider visit is upcoming in the next week or few days, you MUST warn/alert the patient about this by calling the 'send_message_to_patient' tool.
6. You MUST call the 'set_patient_encouragement' tool on every check-in to set the dynamic encouraging header and body message for the patient.

CRITICAL PATIENT ENCOURAGEMENT GUIDELINES:
- If things are going well (e.g. medication taken, tasks completed, stable/good mood), generate an encouraging message. The header should be "Great job, [Name]!" (e.g., "Great job, Sarah!") and the body should mention specific fields (e.g. "Great job Sarah! You've taken your Wellbutrin and Lexapro, and completed your tasks today.").
- If things are not going well (e.g. missed medications, low mood, or mild clinical distress), avoid overly positive phrases. Use a heading like "Thank you for checking in, [Name]" without an exclamation mark, and a supportive, clinical body text.
- If things are serious or high risk (e.g. self-harm thoughts or suicidal ideation reported in voice note), do NOT over-dramatize or use words like "critical". Acknowledge their check-in calmly, e.g., "Thank you for checking in, Sarah", and keep the encouragement message non-judgmental. Do not mention self-harm or suicide in the encouragement message itself. You must separately use the 'send_message_to_patient' tool to provide the crisis hotline/emergency information. Remember that thoughts of self-harm or suicide are normal occurrences for psychiatric patients and should be handled clinically and calmly without alarmism.

CRITICAL TONE & FORMAT GUIDELINES FOR THE FINAL SUMMARY:
- Be terse, matter-of-fact, and clinical in tone.
- Avoid dramatization or flowery language.
- Limit your final response summary to a maximum of 60 words.`,
    model: openrouter('deepseek/deepseek-chat'),
    tools: { sendMessageToPatient, sendEmailToProvider, adjustSchedule, setPatientEncouragement }
  });

  return agent;
};
