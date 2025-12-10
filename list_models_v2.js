import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log("Fetching available models...");
    try {
        const modelFactory = genAI.getGenerativeModelFactory ? genAI.getGenerativeModelFactory() : genAI;
        // The SDK API for listing might vary by version, trying standard approach
        // Note: JS SDK might not expose listModels directly on the main class in all versions
        // If this fails, we will try a direct fetch.

        // Alternative: Direct REST test for common models if list isn't exposed easily in this version
        const candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
            "gemini-pro",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash-lite-preview-02-05",
            "gemini-2.0-flash-exp"
        ];

        console.log("Testing specific candidates:");
        for (const m of candidates) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent("Hi");
                console.log(`✅ AVAILABLE: ${m}`);
            } catch (e) {
                if (e.message.includes("404")) console.log(`❌ 404 NOT FOUND: ${m}`);
                else if (e.message.includes("403")) console.log(`⛔ 403 FORBIDDEN: ${m}`);
                else console.log(`⚠️ Error ${m}: ${e.message.split(' ')[0]}`);
            }
        }

    } catch (error) {
        console.error("Global Error:", error);
    }
}

listModels();
