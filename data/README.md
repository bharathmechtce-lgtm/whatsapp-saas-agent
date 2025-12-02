# Knowledge Base Data

This folder contains the "brain" of your WhatsApp Agent.
The AI reads **EVERY file** in this folder and uses it to answer customer questions.

## How to add new info:
1.  Create a new file here (e.g., `offers.txt`, `faq.md`, `holiday_list.json`).
2.  Paste your text inside.
3.  **Restart the server** (`npm start`) to load the new files.

## Supported Formats:
You can use almost any text format. The AI is smart enough to understand them all:

*   **`.txt` (Plain Text)**: Good for general info, policies, or simple lists.
    *   *Example:* "We are closed on 25th December."
*   **`.json` (Structured Data)**: Good for strict data like prices or catalogs.
    *   *Example:* `{"item": "Shirt", "price": 50}`
*   **`.md` (Markdown)**: Good for formatted text with headers and bullet points.
*   **`.csv` (Spreadsheets)**: Good for long lists exported from Excel.

## Tips:
*   Keep file names descriptive (e.g., `refund_policy.txt` instead of `file1.txt`).
*   The AI knows which file the info came from, so you can say "Check the refund policy".
