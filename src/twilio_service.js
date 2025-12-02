import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const sendMessage = async (to, body) => {
    try {
        await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER, // e.g., 'whatsapp:+14155238886'
            to: to,
            body: body
        });
        console.log(`Message sent to ${to}`);
    } catch (error) {
        console.error('Error sending message:', error);
    }
};
