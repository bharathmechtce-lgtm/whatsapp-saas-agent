import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to read all files in the data directory
const getKnowledgeBaseContext = () => {
  const dataDir = path.join(__dirname, '../data');
  let context = "";

  try {
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      files.forEach(file => {
        const filePath = path.join(dataDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        context += `\n--- Source: ${file} ---\n${content}\n`;
      });
    } else {
      console.warn("Data directory not found:", dataDir);
    }
  } catch (error) {
    console.error("Error reading knowledge base:", error);
  }
  return context;
};

// In-memory history storage: { userId: [ { role, parts: [{ text }], timestamp } ] }
const chatHistory = new Map();

const HISTORY_TIME_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const HISTORY_COUNT_LIMIT = 20; // 10 user + 10 model messages

export const handleIncomingMessage = async (userQuery, userId) => {
  const context = getKnowledgeBaseContext();

  const systemInstruction = `
    You are a helpful and friendly WhatsApp assistant for "Tumble Dry", a laundry and dry cleaning service.
    
    Your goal is to answer customer questions about services and pricing using the provided context.
    
    **Context (Knowledge Base):**
    ${context}
    
    **Instructions:**
    1.  **Understand Hinglish & Typos:** Users often speak in "Hinglish" (Hindi + English) and make typos.
        *   Example: "jatti" -> "Jutti" (Shoes).
        *   Example: "dhaam" -> "Daam" (Price).
        *   Example: "kapde" -> Clothes.
    2.  **Be Smart:** If a user asks about an item that isn't exactly listed, try to match it to the closest category (e.g., "Jutti" -> "Shoe Laundry", "Lehenga" -> "Womens Wear").
    3.  **Be Concise:** Keep answers short and easy to read on WhatsApp. Use emojis.
    4.  **Polite Refusal:** If you are 100% sure you don't have the info, politely say so, but try to be helpful first.
  `;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemInstruction
  });

  // 1. Retrieve and Prune History
  let history = chatHistory.get(userId) || [];
  const now = Date.now();
  const lastMsg = history[history.length - 1];

  // Check if the session is active (last message was within 1 hour)
  const isSessionActive = lastMsg && (now - lastMsg.timestamp < HISTORY_TIME_LIMIT_MS);

  if (isSessionActive) {
    // Active Session: Keep last 1 hour, capped at 20 messages
    history = history.filter(msg => (now - msg.timestamp) < HISTORY_TIME_LIMIT_MS);
    if (history.length > HISTORY_COUNT_LIMIT) {
      history = history.slice(history.length - HISTORY_COUNT_LIMIT);
    }
  } else {
    // Stale Session: Keep only the last 5 messages as context
    const FALLBACK_COUNT_LIMIT = 5;
    if (history.length > FALLBACK_COUNT_LIMIT) {
      history = history.slice(history.length - FALLBACK_COUNT_LIMIT);
    }
  }

  // 2. Start Chat with History
  // Note: Gemini API expects history without timestamps, so we map it.
  const chat = model.startChat({
    history: history.map(h => ({ role: h.role, parts: h.parts }))
  });

  // 3. Send Message
  const result = await chat.sendMessage(userQuery);
  const response = await result.response;
  const text = response.text();

  // 4. Update History
  // Add user message
  history.push({
    role: "user",
    parts: [{ text: userQuery }],
    timestamp: now
  });
  // Add model response
  history.push({
    role: "model",
    parts: [{ text: text }],
    timestamp: Date.now()
  });

  chatHistory.set(userId, history);

  return text;
};
