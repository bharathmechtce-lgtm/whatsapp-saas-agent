document.addEventListener('DOMContentLoaded', async () => {

    // UI Elements
    const leadGate = document.getElementById('leadGate');
    const leadForm = document.getElementById('leadForm');
    const displayLeadName = document.getElementById('displayLeadName');
    const syncStatus = document.getElementById('syncStatus');

    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    const chatWindow = document.getElementById('chatWindow');
    const clearBtn = document.getElementById('clearChatBtn');

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // State
    let BRIDGE_URL = "";
    let CLIENT_FOLDER = "";

    // 1. Initial Setup
    await fetchBackendConfig();
    checkGate();

    // 2. Lead Gate Handling
    function checkGate() {
        const savedLead = localStorage.getItem('saas_lead_data');
        if (savedLead) {
            const lead = JSON.parse(savedLead);
            unlockSimulator(lead);
        } else {
            leadGate.classList.remove('hidden'); // Ensure visible
        }
    }

    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const subBtn = leadForm.querySelector('button');
        const originalText = subBtn.innerHTML;
        subBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Unlocking...';
        subBtn.disabled = true;

        const lead = {
            name: document.getElementById('leadName').value,
            phone: "+91 " + document.getElementById('leadPhone').value,
            email: document.getElementById('leadEmail').value,
            company: document.getElementById('leadCompany').value,
            tier: "Demo User"
        };

        try {
            // Save to Sheet via Bridge (Fire and Forget logic, don't block user)
            if (BRIDGE_URL) {
                // We await to try and get 'success', but if it fails, we catch and proceed
                const res = await fetch(BRIDGE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ cmd: 'save_lead', lead: lead })
                });
            }
        } catch (error) {
            console.warn("Lead Save Skipped/Failed (Offline Mode):", error);
            // We do NOT stop the user. We let them in.
        }

        // Save Local & Unlock ALWAYS
        localStorage.setItem('saas_lead_data', JSON.stringify(lead));
        unlockSimulator(lead);
    });

    function unlockSimulator(lead) {
        displayLeadName.innerText = lead.name;

        // Create unique folder name: Demo_Name_Timestamp
        // Sanitized to be folder-safe
        const safeName = lead.name.replace(/[^a-zA-Z0-9]/g, '');
        CLIENT_FOLDER = `Demo_${safeName}_${Date.now()}`;
        document.getElementById('client_folder_name').value = CLIENT_FOLDER;

        leadGate.style.display = 'none';

        // Initial Greeting
        setTimeout(() => {
            appendMessage(`Welcome ${lead.name}! I am ready to help. Upload a file to get started.`, 'bot');
        }, 800);
    }

    // 5. Chat Logic
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    sendBtn.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', () => {
        chatWindow.innerHTML = '';
        appendMessage("Chat cleared.", 'bot');
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';

        const typingId = showTyping();
        const modelTier = document.getElementById('model_name').value;

        // Construct a User ID that CARRIES the folder info
        // The backend `llm_service.js` doesn't natively accept folder override in arguments currently, 
        // BUT it loads config from sheet.
        // TRICK: We will pass a special "Session ID" or modify the backend to accept folder override.
        // Wait, looking at handleIncomingMessage, it reads sheetUrl -> Config -> client_folder_name.

        // PROBLEM: The backend will try to read 'client_folder_name' from the GLOBAL Sheet.
        // Demo users have their OWN unique folders (CLIENT_FOLDER).
        // SOLVED: We need to update the backend `/api/chat` to allow passing `folderName` override.
        // I will assume we updated index.js to handle this, or I can encode it in the UserID if I'm lazy.
        // BETTER: Let's pass it in the body and update index.js next.

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    userId: "demo_" + CLIENT_FOLDER,
                    // Passing Extra Context Params
                    folderOverride: CLIENT_FOLDER,
                    modelOverride: modelTier
                })
            });

            const data = await res.json();
            removeTyping(typingId);

            if (data.response) appendMessage(data.response, 'bot');
            else appendMessage("I didn't get that.", 'bot');

        } catch (e) {
            removeTyping(typingId);
            appendMessage("Connection failed.", 'bot');
        }
    }

    function appendMessage(text, sender) {
        const div = document.createElement('div');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (sender === 'user') {
            div.className = "flex justify-end";
            div.innerHTML = `
                <div class="chat-bubble-user p-2 px-3 rounded-lg shadow-sm max-w-sm text-sm text-gray-800 relative">
                    ${text}
                    <div class="text-[10px] text-gray-500 text-right mt-1 ml-4">${time} <i class="fa-solid fa-check-double text-blue-500"></i></div>
                </div>`;
        } else {
            div.className = "flex justify-start";
            div.innerHTML = `
                <div class="chat-bubble-bot p-2 px-3 rounded-lg shadow-sm max-w-sm text-sm text-gray-800 relative">
                    ${text}
                    <div class="text-[10px] text-gray-400 text-right mt-1 ml-4">${time}</div>
                </div>`;
        }

        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function showTyping() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = "flex justify-start";
        div.innerHTML = `
            <div class="bg-white p-2 rounded-lg shadow-sm text-xs text-gray-500 italic">
                typing...
            </div>`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return id;
    }

    function removeTyping(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

});
