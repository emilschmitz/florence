import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const myTool = createTool({
  id: 'my_tool',
  description: 'Does something',
  inputSchema: z.object({ msg: z.string() }),
  execute: async ({ msg }) => {
    console.log(msg);
    return { ok: true };
  }
});

console.log(myTool.id);
