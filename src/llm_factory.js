import { GoogleGenerativeAI } from '@google/generative-ai';

// --- GENERIC ADAPTER INTERFACE ---
// class BaseAdapter {
//   async sendMessage(history, query, systemInstruction) { ... }
// }

// --- GEMINI ADAPTER ---
class GeminiAdapter {
    constructor(config) {
        this.apiKey = process.env.GOOGLE_API_KEY; // Still from Environment for security
        this.modelName = config.model_name || "gemini-1.5-flash";
        this.genAI = new GoogleGenerativeAI(this.apiKey);
    }

    async sendMessage(history, query, systemInstruction) {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: systemInstruction
        });

        // Map history to Gemini format
        const geminiHistory = history.map(h => ({
            role: h.role,
            parts: h.parts
        }));

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(query);
        const response = await result.response;
        return response.text();
    }
}

// --- FACTORY ---
export const createLLMAdapter = (config) => {
    const provider = (config.model_provider || 'gemini').toLowerCase();

    console.log(`[LLM Factory] Selected Provider: ${provider}, Model: ${config.model_name}`);

    switch (provider) {
        case 'gemini':
            return new GeminiAdapter(config);
        // case 'groq': return new GroqAdapter(config); // Future
        // case 'openai': return new OpenAIAdapter(config); // Future
        default:
            console.warn(`Unknown provider '${provider}', falling back to Gemini`);
            return new GeminiAdapter(config);
    }
};
