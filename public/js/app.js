document.addEventListener('DOMContentLoaded', async () => {

    // UI Elements
    const leadGate = document.getElementById('leadGate');
    const leadForm = document.getElementById('leadForm');
    const displayLeadName = document.getElementById('displayLeadName');
    const syncStatus = document.getElementById('syncStatus');
    const connectionStatusText = document.getElementById('connectionStatusText');

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
            leadGate.style.display = 'flex'; // Ensure visible flex
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
            // Save to Sheet via Bridge (Fire and Forget)
            if (BRIDGE_URL) {
                const res = await fetch(BRIDGE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ cmd: 'save_lead', lead: lead })
                });
            }
        } catch (error) {
            console.warn("Lead Save Skipped/Failed:", error);
        }

        // Save Local & Unlock ALWAYS
        localStorage.setItem('saas_lead_data', JSON.stringify(lead));
        unlockSimulator(lead);
    });

    function unlockSimulator(lead) {
        displayLeadName.innerText = lead.name;

        // Create unique folder name: Demo_Name_Timestamp
        const safeName = lead.name.replace(/[^a-zA-Z0-9]/g, '');
        CLIENT_FOLDER = `Demo_${safeName}_${Date.now()}`;
        document.getElementById('client_folder_name').value = CLIENT_FOLDER;

        leadGate.style.display = 'none';

        // Initial Greeting
        setTimeout(() => {
            appendMessage(`Welcome ${lead.name}! I am ready to help. Upload a file to get started.`, 'bot');
        }, 800);
    }

    // 3. Backend Connection
    async function fetchBackendConfig() {
        try {
            syncStatus.className = "fa-solid fa-circle-notch fa-spin text-blue-500";
            connectionStatusText.innerText = "Connecting...";
            connectionStatusText.className = "text-xs text-blue-500";

            const res = await fetch('/api/dashboard-config');
            const data = await res.json();

            if (data.context_url) {
                BRIDGE_URL = data.context_url.split('?')[0];
                syncStatus.className = "fa-solid fa-circle-check text-green-500";
                connectionStatusText.innerText = "Brain Connected";
                connectionStatusText.className = "text-xs text-green-600 font-medium";
            }
        } catch (e) {
            console.error("Config fetch error", e);
            syncStatus.className = "fa-solid fa-triangle-exclamation text-red-500";
            connectionStatusText.innerText = "Connection Failed";
            connectionStatusText.className = "text-xs text-red-500 font-bold";
        }
    }

    // 4. File Upload Logic (Limit 5MB, 3 Files)
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-green-500'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-green-500'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-green-500');
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    async function handleFiles(files) {
        if (!BRIDGE_URL) { alert("Connecting to server... please wait."); return; }

        // Limit Check
        const currentFiles = document.getElementById('uploadList').children.length;
        if (currentFiles + files.length > 3) {
            alert("Demo Limit: Max 3 files allowed.");
            return;
        }

        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert(`Skipped ${file.name}: Too large (>5MB)`);
                continue;
            }
            uploadFile(file);
        }
    }

    function uploadFile(file) {
        const reader = new FileReader();

        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-2 bg-white border rounded text-xs";
        item.innerHTML = `<span class="truncate w-32">${file.name}</span> <span class="text-gray-400"><i class="fa-solid fa-spinner fa-spin"></i></span>`;
        document.getElementById('uploadList').appendChild(item);

        reader.onload = async function () {
            const base64 = reader.result.split(',')[1];
            try {
                const res = await fetch(BRIDGE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        cmd: 'upload_file',
                        folder: CLIENT_FOLDER,
                        filename: file.name,
                        mimeType: file.type,
                        base64: base64
                    })
                });

                const result = await res.json();
                if (result.status === 'success') {
                    item.innerHTML = `<span class="truncate w-32">${file.name}</span> <span class="text-green-600"><i class="fa-solid fa-check"></i></span>`;
                    appendMessage(`📂 I have read <b>${file.name}</b>. You can now ask me questions about it.`, 'bot');
                } else {
                    item.innerHTML = `<span class="truncate w-32">${file.name}</span> <span class="text-red-500">Error</span>`;
                }
            } catch (e) {
                item.innerHTML = `<span class="truncate w-32">${file.name}</span> <span class="text-red-500">Net Err</span>`;
            }
        };
        reader.readAsDataURL(file);
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

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    userId: "demo_" + CLIENT_FOLDER,
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
