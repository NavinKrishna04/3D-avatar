import { OpenAIWhisperAudio } from "@langchain/community/document_loaders/fs/openai_whisper_audio";
import { convertAudioToMp3 } from "../utils/audios.mjs";
import fs from "fs";
import os from "os";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

async function convertAudioToText({ audioData }) {
  const mp3AudioData = await convertAudioToMp3({ audioData });
  const outputPath = path.join(os.tmpdir(), "output.mp3");
  fs.writeFileSync(outputPath, mp3AudioData);
  const loader = new OpenAIWhisperAudio(outputPath, {
    clientOptions: {
      apiKey: openRouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
  const doc = (await loader.load()).shift();
  const transcribedText = doc.pageContent;
  fs.unlinkSync(outputPath);
  return transcribedText;
}

export { convertAudioToText };
