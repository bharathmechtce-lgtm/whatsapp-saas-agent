import readline from 'readline';
import { handleIncomingMessage } from './src/llm_service.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const MOCK_USER_ID = "console_tester_123";

console.log("--------------------------------------------------");
console.log("🤖 WhatsApp Bot Console Mode (No Twilio needed)");
console.log("--------------------------------------------------");
console.log("Type your message and press Enter.");
console.log("Type 'exit' to quit.");
console.log("--------------------------------------------------");

const askQuestion = () => {
    rl.question('You: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
            console.log('Bye! 👋');
            rl.close();
            process.exit(0);
        }

        try {
            process.stdout.write("Bot: Thinking... \r");
            const response = await handleIncomingMessage(input, MOCK_USER_ID);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            console.log(`Bot: ${response}`);
        } catch (error) {
            console.error(`\nError: ${error.message}`);
        }

        console.log("-".repeat(50));
        askQuestion();
    });
};

askQuestion();
