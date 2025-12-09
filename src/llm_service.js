import { createLLMAdapter } from './llm_factory.js';
import { fetchConfigFromSheet } from './sheet_config.js';
import { calculateEstimatedCost } from './pricing_calculator.js';
import dotenv from 'dotenv';

dotenv.config();

// In-memory history storage
const chatHistory = new Map();
const HISTORY_TIME_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const HISTORY_COUNT_LIMIT = 20;

// Helper to fetch context (Handles Raw Text or JSON from Drive Bridge)
const fetchContextFromUrl = async (url) => {
  if (!url) return "";
  try {
    console.log(`Fetching context from: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Context fetch failed: ${res.statusText}`);

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const json = await res.json();
      return json.content || "Error: No content in Drive response.";
    } else {
      return await res.text();
    }
  } catch (e) {
    console.warn("Context fetch warning (ignoring):", e.message);
    return ""; // Return empty context so chat can continue comfortably
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
  const targetLanguage = config.target_language || "English";
  const systemInstruction = `
    You are a helpful assistant.
    You MUST answer in ${targetLanguage}.
    
    **Context:**
    ${contextContent}
    
    **Instructions:**
    1. Answer based on the context.
    2. Be concise (approx 50 words).
    3. Be friendly.
    `;

  // 5. Manage History
  let history = chatHistory.get(userId) || [];
  const now = Date.now();
  const lastMsg = history[history.length - 1];
  const isSessionActive = lastMsg && (now - lastMsg.timestamp < HISTORY_TIME_LIMIT_MS);

  if (isSessionActive) {
    history = history.filter(msg => (now - msg.timestamp) < HISTORY_TIME_LIMIT_MS);
    if (history.length > HISTORY_COUNT_LIMIT) history = history.slice(history.length - HISTORY_COUNT_LIMIT);
  } else {
    const FALLBACK_COUNT_LIMIT = 5;
    if (history.length > FALLBACK_COUNT_LIMIT) history = history.slice(history.length - FALLBACK_COUNT_LIMIT);
  }

  // 6. Execute (The Factory)
  try {
    const llmAdapter = createLLMAdapter(config);
    const responseText = await llmAdapter.sendMessage(history, userQuery, systemInstruction);

    // Update History
    history.push({ role: "user", parts: [{ text: userQuery }], timestamp: now });
    history.push({ role: "model", parts: [{ text: responseText }], timestamp: Date.now() });
    chatHistory.set(userId, history);

    return responseText;
  } catch (error) {
    console.error("LLM Execution Error:", error);
    return `Error: ${error.message || "Unknown Brain Error"}`;
  }
};
