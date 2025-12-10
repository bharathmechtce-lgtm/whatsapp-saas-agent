import { createLLMAdapter } from './llm_factory.js';
import { fetchConfigFromSheet } from './sheet_config.js';
import { calculateEstimatedCost } from './pricing_calculator.js';
import dotenv from 'dotenv';

dotenv.config();

// In-memory history storage
const chatHistory = new Map();
const HISTORY_TIME_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const HISTORY_COUNT_LIMIT = 20;

import pdf from 'pdf-parse';

// Helper to fetch context (Handles Raw Text, JSON, or PDF Base64)
const fetchContextFromUrl = async (url) => {
  if (!url) return "";
  try {
    console.log(`Fetching context from: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Context fetch failed: ${res.statusText}`);

    const contentType = res.headers.get("content-type");

    // 1. JSON Response (New Bridge Format)
    if (contentType && contentType.includes("application/json")) {
      const json = await res.json();

      // Legacy or Simple Text
      if (!json.file_objects) return json.content || "";

      // New Rich Parsing (Text + PDF)
      let combinedContent = "";
      for (const file of json.file_objects) {
        if (file.type === 'text') {
          combinedContent += `\n\n--- SOURCE: ${file.name} ---\n${file.content}`;
        }
        else if (file.type === 'pdf') {
          try {
            const buffer = Buffer.from(file.content, 'base64');
            const data = await pdf(buffer);
            combinedContent += `\n\n--- SOURCE: ${file.name} (PDF) ---\n${data.text}`;
          } catch (e) {
            console.error(`Failed to parse PDF ${file.name}:`, e);
            combinedContent += `\n\n--- SOURCE: ${file.name} (PDF) ---\n[Error parsing PDF]`;
          }
        }
      }
      return combinedContent || "No readable content found.";
    }
    // 2. Raw Text Response
    else {
      return await res.text();
    }
  } catch (e) {
    console.warn("Context fetch warning (ignoring):", e.message);
    return "";
  }
};

export const handleIncomingMessage = async (userQuery, userId, sheetUrl, overrides = {}) => {
  // 1. Fetch Configuration (The Brain Control)
  if (!sheetUrl) {
    console.error("No SHEET_URL provided!");
    return "System Error: Configuration missing.";
  }

  const config = await fetchConfigFromSheet(sheetUrl);
  if (!config) {
    return "System Error: Failed to load configuration.";
  }

  // Apply Overrides (For Web Simulator)
  if (overrides.folder) config.client_folder_name = overrides.folder;
  if (overrides.model) config.model_name = overrides.model;

  // 2. Fetch Knowledge Base (The Memory)
  let contextUrl = config.context_url;

  // Auto-append folder name if specified in sheet (or override)
  if (config.client_folder_name) {
    const separator = contextUrl.includes('?') ? '&' : '?';
    contextUrl = `${contextUrl}${separator}folder=${encodeURIComponent(config.client_folder_name)}`;
    console.log(`[Context] Targeting Folder: ${config.client_folder_name}`);
  }

  const contextContent = await fetchContextFromUrl(contextUrl);

  // 3. Calculate "Taximeter" Cost (The Wallet)
  // We combine System Prompt Context + History (Approx) + User Query
  const fullInputForCost = contextContent + userQuery;
  const costEstimate = calculateEstimatedCost(fullInputForCost, config);

  console.log("------------------------------------------------");
  console.log(`[TAXIMETER] Client: ${userId}`);
  console.log(`[TAXIMETER] Model: ${config.model_name}`);
  console.log(`[TAXIMETER] Input Price: $${config.input_price_per_1m}/1M`);
  console.log(`[TAXIMETER] Est. Cost: $${costEstimate.totalCost}`);
  console.log("------------------------------------------------");

  // 4. Prepare System Instruction
  // 4. Prepare System Instruction
  let systemInstruction = "";

  // PRIORITY 1: Dynamic Override from Sheet (The "Instructor Mode" Data)
  if (config.system_instruction_override && config.system_instruction_override.length > 5) {
    systemInstruction = config.system_instruction_override;
    systemInstruction += `\n\n**Context:**\n${contextContent}`;
    console.log("[System] Using Override from Sheet");
  }
  // PRIORITY 2: Default Hardcoded Logic (Script Detection)
  else {
    systemInstruction = `
    You are a helpful assistant.
    
    **Language Rules:**
    1. **SCRIPT CHECK**: Does the user message use **Devanagari characters** (e.g., नमस्ते, क्या)?
       - YES: Answer in **Hindi** (Devanagari script).
       - NO (Latin/Roman characters): Answer in **English**.
    2. **CRITICAL**: Even if the user types Hindi words in English letters (Hinglish like "kya rate hai"), you MUST answer in **English**.
    
    **Context:**
    ${contextContent}
    
    **Instructions:**
    1. Answer based on the context.
    2. Be concise (approx 50 words).
    3. Be friendly, natural, and a little witty. Avoid heavy corporate jargon.
    `;
  }

  // 5. Manage Chat History (Sliding Window)
  if (!history[userId]) history[userId] = [];

  // Add User Message with Timestamp
  // NOTE: We do NOT filter before adding the new message, to ensure context is fresh.

  // SLIDING WINDOW FILTER:
  // Rule: Keep last 1 hour OR last 10 messages (whichever keeps MORE).
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();

  // Filter for time (Keep if < 1h old)
  const recentHistory = history[userId].filter(msg => (now - (msg.timestamp || 0)) < ONE_HOUR);

  // But ensure practically at least 10 messages (even if old)
  let activeHistory = recentHistory;
  if (activeHistory.length < 10 && history[userId].length >= 10) {
    // If time filter left us with too few, grab the last 10 raw
    activeHistory = history[userId].slice(-10);
  }

  // Construct Chat (Gemini Format)
  // We map cleanly to { role, parts } removing timestamp
  const chatHistory = activeHistory.map(h => ({ role: h.role, parts: h.parts }));

  // 6. Execute (The Factory)
  try {
    const llmAdapter = createLLMAdapter(config);
    const responseText = await llmAdapter.sendMessage(chatHistory, userQuery, systemInstruction);

    // Update History (Add current interaction)
    history[userId].push({ role: "user", parts: [{ text: userQuery }], timestamp: now });
    history[userId].push({ role: "model", parts: [{ text: responseText }], timestamp: Date.now() });

    // Save back to memory (pruning old old stuff to prevent memory leaks? Optional for now)
    // We let the history grow in RAM but only SEND the activeHistory to LLM.

    return responseText;
  } catch (error) {
    console.error("LLM Execution Error:", error);
    return `Error: ${error.message || "Unknown Brain Error"}`;
  }
};
