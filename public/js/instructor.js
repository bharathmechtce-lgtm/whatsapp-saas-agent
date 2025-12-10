
const INSTRUCTOR_ENDPOINT = "/api/instructor/chat";
const SYNC_STATUS_EL = document.getElementById("syncStatus");
const SYNC_TEXT_EL = document.getElementById("syncText");
const CHAT_HISTORY = document.getElementById("instructorChat");
const INPUT_EL = document.getElementById("instructionInput");

function appendMessage(text, type) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${type}`;
    msgDiv.innerText = text;
    CHAT_HISTORY.appendChild(msgDiv);
    CHAT_HISTORY.scrollTop = CHAT_HISTORY.scrollHeight;
}

function setSyncStatus(isSyncing) {
    if (isSyncing) {
        SYNC_STATUS_EL.classList.remove("live");
        SYNC_STATUS_EL.classList.add("syncing");
        SYNC_TEXT_EL.innerText = "Syncing...";
    } else {
        SYNC_STATUS_EL.classList.remove("syncing");
        SYNC_STATUS_EL.classList.add("live");
        SYNC_TEXT_EL.innerText = "Live";
    }
}

async function sendInstruction() {
    const text = INPUT_EL.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    INPUT_EL.value = "";
    setSyncStatus(true);

    try {
        const res = await fetch(INSTRUCTOR_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instruction: text })
        });
        const data = await res.json();

        if (data.success) {
            appendMessage(data.reply, "agent");
            // Refresh simulator to pick up new config
            document.getElementById("simulatorFrame").src = document.getElementById("simulatorFrame").src;
        } else {
            appendMessage("Error: " + data.error, "system");
        }
    } catch (e) {
        appendMessage("Connection Error", "system");
        console.error(e);
    } finally {
        setSyncStatus(false);
    }
}

// Model Selector Logic (Manual Override)
async function updateModel() {
    const model = document.getElementById("modelSelector").value;
    setSyncStatus(true);
    // TODO: Send model update to backend
    // For now, we simulate success
    setTimeout(() => {
        setSyncStatus(false);
        appendMessage(`Model switched to ${model}`, "system");
    }, 1000);
}

// Enter Key Support
INPUT_EL.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendInstruction();
});
