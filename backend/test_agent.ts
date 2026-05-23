import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const myTool = createTool({
  id: 'send_message',
  description: 'Send a message to the patient',
  inputSchema: z.object({ msg: z.string() }),
  execute: async ({ msg }) => {
    return { status: "Message sent: " + msg };
  }
});

const agent = new Agent({
  id: 'test-agent',
  name: 'TestAgent',
  instructions: 'You are a helpful assistant.',
  model: openrouter('deepseek/deepseek-chat'),
  tools: { myTool }
});

async function run() {
  const result = await agent.generate("Say hello using the send_message tool");
  console.log(result.text);
  console.log(result.toolResults);
}

run();