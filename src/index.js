import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { handleIncomingMessage } from './llm_service.js';
import { sendMessage } from './twilio_service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/webhook', async (req, res) => {
    const incomingMsg = req.body.Body;
    const sender = req.body.From;

    console.log(`Message from ${sender}: ${incomingMsg}`);

    try {
        const responseText = await handleIncomingMessage(incomingMsg, sender);
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
