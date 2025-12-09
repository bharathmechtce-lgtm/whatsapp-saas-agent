import dotenv from 'dotenv';
import { handleIncomingMessage } from './src/llm_service.js';

dotenv.config();

const runTest = async () => {
    const sheetUrl = process.env.CONFIG_SHEET_URL;
    if (!sheetUrl) {
        console.error("❌ Error: CONFIG_SHEET_URL is missing from .env");
        return;
    }

    console.log("🚀 Starting SaaS Flow Test...");
    console.log(`📋 Config Sheet: ${sheetUrl}`);

    const userQuery = "How much for a shirt?";
    const userId = "test-console-user";

    try {
        console.log(`\n💬 Sending Query: "${userQuery}"`);
        const response = await handleIncomingMessage(userQuery, userId, sheetUrl);

        console.log("\n✅ Response Received:");
        console.log("------------------------------------------------");
        console.log(response);
        console.log("------------------------------------------------");
        console.log("\n🎉 SaaS Flow Verification Successful!");
    } catch (error) {
        console.error("\n❌ Test Failed:", error);
    }
};

runTest();
