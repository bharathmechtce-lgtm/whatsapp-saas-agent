import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`\nTesting ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you working?");
        console.log(`✅ Success: ${modelName}`);
        console.log(`Response: ${result.response.text()}`);
    } catch (error) {
        console.log(`❌ Failed: ${modelName}`);
        console.log(`Error: ${error.message}`);
    }
}

async function run() {
    await testModel('gemini-flash-latest');
    await testModel('gemini-1.5-flash');
    await testModel('gemini-2.0-flash-lite-preview-02-05');
}

run();
