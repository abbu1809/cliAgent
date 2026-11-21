import { StateGraph, START, END } from '@langchain/langgraph';
import { LLMNode } from './node.js';
import { HumanMessage } from 'langchain';
import rl from '../utils/readline.js';
import * as z from 'zod';

const stateFormat = z.object({
  messages: z.string(z.any()),
});

const graph = new StateGraph(stateFormat)
  .addNode('LLMNode', LLMNode)
  .addEdge(START, 'LLMNode')
  .addEdge('LLMNode', END)
  .compile();

export default async function initGraph() {
  while (true) {
    const userInput = await rl.queestion('[User]:');
    const response = await graph.invoke({
      messages: [new HumanMessage(userInput)],
    });
console.log("[AI];", response)
  }
}
