
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchConfigFromSheet } from './sheet_config.js';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * The META-AGENT that updates the bot's configuration based on natural language.
 */
export const handleInstructorChat = async (instruction) => {
    try {
        console.log(`[Instructor] Received instruction: "${instruction}"`);

        // 1. Fetch Current Config (to know what we are changing)
        const currentConfig = await fetchConfigFromSheet(process.env.SHEET_URL);

        // 2. META-PROMPT: The brain that knows how to config the other brain
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `
        You are the "Bot Instructor". Your job is to update the configuration of a Customer Service AI.
        
        **Current Configuration:**
        - System Instruction: "${currentConfig.system_instruction_override || '(Default Hardcoded)'}"
        - Model Name: "${currentConfig.model_name || 'gemini-1.5-flash'}"
        
        **User Instruction:** "${instruction}"
        
        **Your Goal:**
        Based on the instruction, generate a JSON object to update the configuration.
        - If the user wants to change tone/behavior, update "system_instruction_override".
        - If the user wants to change the model, update "model_name" (valid: gemini-1.5-flash, gemini-1.5-pro).
        - Also provide a "reply" to tell the user what you did.
        
        **Output Format (JSON ONLY):**
        {
            "cmd": "update_config",
            "config": {
                "system_instruction_override": "New system prompt here...",
                "model_name": "gemini-1.5-flash" 
            },
            "reply": "I have updated the bot to be more sarcastic."
        }
        
        IMPORTANT:
        - Keep the new system prompt complete and robust (don't just say "be rude", write out "You are a rude assistant...").
        - If the instruction is just "Hi", reply without config changes.
        `;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        // 3. Parse JSON Response
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const action = JSON.parse(cleanJson);

        // 4. Update the Sheet (if config is present)
        if (action.config) {
            console.log("[Instructor] Updating Config:", action.config);
            // We need to write back to the sheet. 
            // We reuse the existing Bridge POST endpoint for "update_config"

            // Note: In a real app, we'd use the Bridge URL.
            // For now, we assume the Bridge URL is in the config or env.
            const bridgeUrl = currentConfig.context_url.split('?')[0]; // Base URL

            await fetch(bridgeUrl, {
                method: "POST",
                body: JSON.stringify({
                    cmd: "update_config",
                    config: action.config
                })
            });
        }

        return { success: true, reply: action.reply };

    } catch (e) {
        console.error("[Instructor] Error:", e);
        return { success: false, error: e.message };
    }
};
