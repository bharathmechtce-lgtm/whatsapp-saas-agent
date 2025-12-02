import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function troubleshootGemini() {
    console.log("🔍 Starting Gemini Connection Test...");

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("❌ CRITICAL: GOOGLE_API_KEY is missing from process.env");
        return;
    }
    console.log("✅ API Key found (starts with: " + apiKey.substring(0, 4) + "...)");

    // Define the models to test
    const modelsToTest = ["gemini-pro", "gemini-1.5-flash"];

    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelsToTest) {
        console.log(`\nTesting model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Reply with 'Working' if you can hear me.");
            const response = await result.response;
            console.log(`✅ SUCCESS! ${modelName} is working.`);
            console.log(`   Response: ${response.text()}`);
            return; // Stop if we find one
        } catch (error) {
            console.error(`❌ FAILED: ${modelName}`);
            console.error("   Error:", error.message);
        }
    }
}

troubleshootGemini();
