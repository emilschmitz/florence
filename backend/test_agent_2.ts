import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const sendEmailToProvider = createTool({
  id: 'send_email_to_provider',
  description: 'Send a preparatory email to the physician.',
  inputSchema: z.object({
    subject: z.string()
  }),
  execute: async ({ subject }) => {
    return { status: "success" };
  }
});

const agent = new Agent({
  id: 'test-agent',
  name: 'TestAgent',
  instructions: 'You are a helpful assistant.',
  model: openrouter('deepseek/deepseek-chat'),
  tools: { sendEmailToProvider }
});

async function run() {
  const result = await agent.generate("Send an email to the provider with subject Hello");
  console.log(JSON.stringify(result, null, 2));
}

run();
