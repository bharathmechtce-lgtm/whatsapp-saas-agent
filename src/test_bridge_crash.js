
import { fetchConfigFromSheet } from './sheet_config.js';
import dotenv from 'dotenv';
dotenv.config();

const SHEET_URL = process.env.SHEET_URL;

async function testBridge() {
    console.log("1. Fetching Config...");
    const config = await fetchConfigFromSheet(SHEET_URL);
    if (!config) { console.error("Failed to load config"); return; }

    const garbageFolder = "NON_EXISTENT_FOLDER_" + Date.now();
    let bridgeUrl = config.context_url;

    // Append garbage folder
    const separator = bridgeUrl.includes('?') ? '&' : '?';
    bridgeUrl = `${bridgeUrl}${separator}folder=${garbageFolder}`;

    console.log(`2. Hitting Bridge with Garbage Folder: ${garbageFolder}`);
    console.log(`   URL: ${bridgeUrl}`);

    try {
        const res = await fetch(bridgeUrl);
        const text = await res.text();

        console.log("\n--- BRIDGE RESPONSE ---");
        try {
            const json = JSON.parse(text);
            if (json.error) {
                console.log("❌ FAIL: Bridge returned Error (Old Code Active)");
                console.log("Error:", json.error);
            } else {
                console.log("✅ SUCCESS: Bridge handled missing folder gracefully (New Code Active)");
                console.log("Files Found:", json.files);
            }
        } catch (e) {
            console.log("Response (Raw):", text);
        }

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testBridge();
