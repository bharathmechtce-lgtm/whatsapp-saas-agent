import express from 'express';
import bodyParser from 'body-parser';
import { fetchConfigFromSheet } from './sheet_config.js';
import dotenv from 'dotenv';
import { handleIncomingMessage } from './llm_service.js';
import { sendMessage } from './twilio_service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Add JSON support for /api/chat
app.use(express.static('public')); // Serve Dashboard

// DEBUG: Simple ping to check if server is alive
app.get('/ping', (req, res) => {
    res.send('PONG! Server is reachable.');
});

// API to let Dashboard know where the Bridge is
app.get('/api/dashboard-config', async (req, res) => {
    try {
        const sheetUrl = process.env.CONFIG_SHEET_URL;
        if (!sheetUrl) return res.status(500).json({ error: "Missing CONFIG_SHEET_URL env" });

        const config = await fetchConfigFromSheet(sheetUrl);
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// API for Web Simulator (Chat without Twilio)
app.post('/api/chat', async (req, res) => {
    const { message, userId, folderOverride, modelOverride } = req.body;
    // Default to "web-user" if no ID provided
    const user = userId || "web_demo_user";

    try {
        const sheetUrl = process.env.CONFIG_SHEET_URL;

        // Pass overrides to the LLM Service
        const overrides = {};
        if (folderOverride) overrides.folder = folderOverride;
        if (modelOverride) overrides.model = modelOverride;

        const responseText = await handleIncomingMessage(message, user, sheetUrl, overrides);
        res.json({ response: responseText });
    } catch (e) {
        console.error("Web Chat Error:", e);
        res.status(500).json({ error: "Brain Malfunction" });
    }
});

// WhatsApp Webhook
app.post('/webhook', async (req, res) => {
    const incomingMsg = req.body.Body;
    const sender = req.body.From;

    console.log(`Message from ${sender}: ${incomingMsg}`);

    try {
        const sheetUrl = process.env.CONFIG_SHEET_URL;
        const responseText = await handleIncomingMessage(incomingMsg, sender, sheetUrl);
        await sendMessage(sender, responseText);
    } catch (error) {
        console.error('Error processing message:', error);
        await sendMessage(sender, "Sorry, I'm having trouble processing your request right now.");
    }

    res.status(200).end();
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
