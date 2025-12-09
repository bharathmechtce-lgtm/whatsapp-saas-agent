import express from 'express';
import bodyParser from 'body-parser';
import { fetchConfigFromSheet } from './sheet_config.js';
import dotenv from 'dotenv';
import { handleIncomingMessage } from './llm_service.js';
import { sendMessage } from './twilio_service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
console.log(`Server running on port ${port}`);
});
