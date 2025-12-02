# WhatsApp AI Agent for Tumble Dry 🧺

This is an intelligent WhatsApp bot built for **Tumble Dry**, a laundry and dry cleaning service.
It uses **Google Gemini 2.0 Flash** to understand natural language (including Hinglish and typos) and answers customer queries about pricing, services, and policies.

## Features 🌟

*   **Natural Language Understanding**: Handles "Hinglish" (e.g., "kapde", "dhaam") and typos.
*   **Dynamic Knowledge Base**: Reads pricing and policy info from the `data/` folder.
*   **Context Awareness**: Remembers conversation history (1 hour / 20 messages) to handle follow-up questions (e.g., "How much to clean *it*?").
*   **Smart Fallback**: Gracefully declines if information is missing.

## Setup 🛠️

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file with:
    ```env
    GOOGLE_API_KEY=your_gemini_key
    TWILIO_ACCOUNT_SID=your_sid
    TWILIO_AUTH_TOKEN=your_token
    TWILIO_PHONE_NUMBER=your_twilio_number
    ```

3.  **Run Locally**:
    ```bash
    npm start
    ```

4.  **Console Testing (No Twilio needed)**:
    ```bash
    node test_console.js
    ```

## Knowledge Base 📚

To update the bot's knowledge, simply edit or add files in the `data/` directory.
*   `pricing.json`: Service rates.
*   `delivery_policy.txt`: Delivery times.
*   `terms_conditions.txt`: Refund and damage policies.

## Deployment 🚀

This project is ready for deployment on **Render**.
See `deployment_guide.md` for full instructions.
