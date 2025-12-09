import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function findWorkingModels() {
    const key = process.env.GOOGLE_API_KEY;
    console.log(`Checking API with Key: ${key.substring(0, 8)}...`);

    // 1. Fetch List
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    let models = [];
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));

        models = data.models
            .map(m => m.name.replace('models/', ''))
            .filter(n => n.includes('flash') || n.includes('pro'));

        console.log(`Found ${models.length} candidate models.`);
    } catch (e) {
        console.error("List Fetch Failed:", e);
        return;
    }

    // 2. Test Generation
    const genAI = new GoogleGenerativeAI(key);
    const workingModels = [];

    for (const modelName of models) {
        process.stdout.write(`Testing ${modelName.padEnd(30)} ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            const response = await result.response;
            console.log("✅ OK");
            workingModels.push(modelName);
        } catch (e) {
            if (e.message.includes("404")) console.log("❌ 404");
            else if (e.message.includes("403")) console.log("⛔ 403");
            else if (e.message.includes("429")) console.log("⏳ 429 (Quota)");
            else console.log(`⚠️ ${e.message.split('[')[0].substring(0, 20)}...`);
        }
    }

    console.log("\nRECOMMENDED MODELS:");
    workingModels.forEach(m => console.log(` - ${m}`));
}

findWorkingModels();
