import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const template = `
You are Sona College Assistant, created by Navin's team.
  You will always respond with a JSON array of messages, with a maximum of 3 messages:
  \n{format_instructions}.
  Each message has properties for text, facialExpression, and animation.
  The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
  The different animations are: Idle, TalkingOne, TalkingThree, SadIdle, Defeated, Angry,
  Surprised, DismissingGesture and ThoughtfulHeadShake.
`;

const summarizeTemplate = `
You are a helpful document summarization assistant.
Summarize the provided document content in 1-3 concise, spoken messages suitable for an AI avatar.
Focus on key points, main ideas, and conclusions. Keep each message engaging and natural.

Document content:
{document}

Respond strictly with a JSON object containing a 'messages' array of up to 3 message objects, following the format instructions.
Use appropriate facial expressions (smile, sad, angry, surprised, funnyFace, default) and animations (Idle, TalkingOne, TalkingThree, SadIdle, Defeated, Angry, Surprised, DismissingGesture, ThoughtfulHeadShake) to match the summary tone, e.g., thoughtful for analysis.

{format_instructions}
`;

const documentQATemplate = `
You are Sona College Assistant, created by Navin's team.
You have access to the following document content. Answer questions or provide summaries based on this document. If the question is not related to the document, respond as a general assistant.

Document content:
{document}

Respond with a JSON array of messages, with a maximum of 3 messages:
{format_instructions}.
Each message has properties for text, facialExpression, and animation.
The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
The different animations are: Idle, TalkingOne, TalkingThree, SadIdle, Defeated, Angry,
Surprised, DismissingGesture and ThoughtfulHeadShake.
`;

const prompt = ChatPromptTemplate.fromMessages([
  ["ai", template],
  ["human", "{question}"],
]);

const summarizePrompt = ChatPromptTemplate.fromMessages([
  ["ai", summarizeTemplate],
]);

const documentQAPrompt = ChatPromptTemplate.fromMessages([
  ["ai", documentQATemplate],
  ["human", "{question}"],
]);

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  modelName:
    process.env.OPENROUTER_MODEL_NAME ||
    "google/gemini-2.5-flash-preview-09-2025",
  temperature: 0.2,
  maxTokens: 2000, // ✅ FIX: set within your credit limit
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    messages: z.array(
      z.object({
        text: z.string().describe("Text to be spoken by the AI"),
        facialExpression: z
          .string()
          .describe(
            "Facial expression to be used by the AI. Select from: smile, sad, angry, surprised, funnyFace, and default"
          ),
        animation: z.string().describe(
          `Animation to be used by the AI. Select from:  Idle, TalkingOne, TalkingThree, SadIdle,
            Defeated, Angry, Surprised, DismissingGesture, and ThoughtfulHeadShake.`
        ),
      })
    ),
  })
);

const geminiChain = prompt.pipe(model).pipe(parser);

const summarizeChain = summarizePrompt.pipe(model).pipe(parser);

const documentQAChain = documentQAPrompt.pipe(model).pipe(parser);

export { geminiChain, parser, summarizeChain, documentQAChain };
