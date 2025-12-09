import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { handleIncomingMessage } from './llm_service.js';
import { sendMessage } from './twilio_service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// DEBUG: Log every single request hitting the server
app.use((req, res, next) => {
    console.log(`[INCOMING] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers));
    next();
});

// DEBUG: Simple ping to check if server is alive
app.get('/ping', (req, res) => {
    res.send('PONG! Server is reachable.');
});

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
