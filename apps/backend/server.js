import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import multer from "multer";
import mammoth from "mammoth";
import {
  geminiChain,
  parser,
  summarizeChain,
  documentQAChain,
} from "./modules/gemini.mjs";
import { lipSync } from "./modules/lip-sync.mjs";
import {
  sendDefaultMessages,
  defaultResponse,
} from "./modules/defaultMessages.mjs";
import { convertAudioToText } from "./modules/whisper.mjs";
import { voice } from "./modules/elevenLabs.mjs";

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (origin.startsWith("http://localhost:")) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);
const port = process.env.PORT || 8002;

const upload = multer({ storage: multer.memoryStorage() });

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

app.post("/tts", async (req, res) => {
  const userMessage = req.body.message;
  console.log("Received TTS message:", userMessage);
  const defaultMessages = await sendDefaultMessages({ userMessage });
  if (defaultMessages) {
    console.log("Sent default messages");
    res.send({ messages: defaultMessages });
    return;
  }
  console.log("Invoking AI for:", userMessage);
  let openAImessages;
  try {
    if (req.session.documentText) {
      openAImessages = await documentQAChain.invoke({
        question: userMessage,
        document: req.session.documentText,
        format_instructions: parser.getFormatInstructions(),
      });
      console.log("Document Q&A invoke success");
    } else {
      openAImessages = await geminiChain.invoke({
        question: userMessage,
        format_instructions: parser.getFormatInstructions(),
      });
      console.log("General chat invoke success");
    }
  } catch (error) {
    console.error("AI invoke error:", error.message);
    openAImessages = { messages: defaultResponse };
  }
  console.log("Calling lipSync");
  try {
    openAImessages = await lipSync({ messages: openAImessages.messages });
    console.log("LipSync success");
  } catch (error) {
    console.error("LipSync error:", error.message);
    // Send messages without audio/lipsync as fallback
    res.send({ messages: openAImessages.messages });
    return;
  }
  console.log("Sending response");
  res.send({ messages: openAImessages });
});

app.post("/sts", async (req, res) => {
  const base64Audio = req.body.audio;
  const audioData = Buffer.from(base64Audio, "base64");
  const userMessage = await convertAudioToText({ audioData });
  console.log("Received STS message:", userMessage);
  let openAImessages;
  try {
    if (req.session.documentText) {
      openAImessages = await documentQAChain.invoke({
        question: userMessage,
        document: req.session.documentText,
        format_instructions: parser.getFormatInstructions(),
      });
      console.log("Document Q&A invoke success for STS");
    } else {
      openAImessages = await geminiChain.invoke({
        question: userMessage,
        format_instructions: parser.getFormatInstructions(),
      });
      console.log("General chat invoke success for STS");
    }
  } catch (error) {
    console.error("AI invoke error for STS:", error.message);
    openAImessages = { messages: defaultResponse };
  }
  console.log("Calling lipSync for STS");
  try {
    openAImessages = await lipSync({ messages: openAImessages.messages });
    console.log("LipSync success for STS");
  } catch (error) {
    console.error("LipSync error for STS:", error.message);
    res.send({ messages: openAImessages.messages });
    return;
  }
  console.log("Sending STS response");
  res.send({ messages: openAImessages });
});

app.post("/summarize", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  let text;
  try {
    if (req.file.mimetype === "text/plain") {
      text = req.file.buffer.toString("utf8");
    } else if (req.file.mimetype === "application/pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else {
      return res
        .status(400)
        .json({ error: "Unsupported file type. Supported: .txt, .pdf, .docx" });
    }
  } catch (error) {
    console.error("File parsing error:", error);
    return res.status(400).json({ error: "Failed to parse file" });
  }

  console.log(
    "Storing document for interactive Q&A:",
    text.substring(0, 100) + "..."
  );
  req.session.documentText = text;
  req.session.save((err) => {
    if (err) console.error("Session save error:", err);
  });
  // Return confirmation message
  const confirmationMessages = [
    {
      text: "Document uploaded successfully. You can now ask questions about it.",
      facialExpression: "smile",
      animation: "Idle",
    },
  ];
  try {
    const lipSyncedMessages = await lipSync({ messages: confirmationMessages });
    res.send({ messages: lipSyncedMessages });
  } catch (error) {
    console.error("LipSync error for confirmation:", error.message);
    res.send({ messages: confirmationMessages });
  }
});

app.post("/clear-document", (req, res) => {
  req.session.documentText = null;
  res.json({ message: "Document cleared from session." });
});

app.listen(port, () => {
  console.log(`Jack are listening on port ${port}`);
});
