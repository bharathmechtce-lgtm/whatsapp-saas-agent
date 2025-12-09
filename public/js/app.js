const SHEET_ID = "1pd1FHHTf_gRt_QtE0yqr8GwWHf8BBf1O4sL1WDZlm-0";
// Note: We need a way to get the Bridge URL dynamically. 
// For now, we will ask the user to enter it or fetch it from the backend if possible.
// But since this is a static file served by Node, we can fetch it from a new /api/config endpoint on our Node server!

document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    const folderInput = document.getElementById('client_folder_name');
    const bridgeInput = document.getElementById('context_url');

    // 1. Fetch Environment Config from our Node Backend
    try {
        const res = await fetch('/api/dashboard-config');
        const env = await res.json();

        if (env.context_url) {
            bridgeInput.value = env.context_url;
            // Extract Client Folder from URL if present
            const urlParams = new URLSearchParams(new URL(env.context_url).search);
            const folder = urlParams.get('folder');
            if (folder) folderInput.value = folder;

            statusEl.innerText = "Connected";
            statusEl.classList.remove("bg-gray-200", "text-gray-600");
            statusEl.classList.add("bg-green-200", "text-green-800");

            // Load Config from Sheet via Bridge
            loadConfig(env.context_url);
        } else {
            statusEl.innerText = "Missing Config";
            statusEl.classList.add("bg-red-200", "text-red-800");
        }
    } catch (e) {
        console.error("Failed to connect to backend", e);
        statusEl.innerText = "Backend Error";
    }

    // 2. Load Config Function
    async function loadConfig(bridgeUrl) {
        // We need the BASE URL of the script (remove query params)
        const baseUrl = bridgeUrl.split('?')[0];

        try {
            const res = await fetch(`${baseUrl}?cmd=fetch_config`);
            const data = await res.json();

            if (data.config) {
                // Populate Form
                document.getElementById('model_name').value = data.config.model_name || 'gemini-flash-latest';
                document.getElementById('target_language').value = data.config.target_language || '';
                document.getElementById('input_price_per_1m').value = data.config.input_price_per_1m || '';
                document.getElementById('output_price_per_1m').value = data.config.output_price_per_1m || '';

                if (data.config.client_folder_name) {
                    folderInput.value = data.config.client_folder_name;
                }
            }
        } catch (e) {
            console.error("Failed to load sheet config", e);
            alert("Error loading configuration from Google Sheet.");
        }
    }

    // 3. Save Config
    document.getElementById('configForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bridgeUrl = bridgeInput.value.split('?')[0];

        const newConfig = {
            model_name: document.getElementById('model_name').value,
            target_language: document.getElementById('target_language').value,
            input_price_per_1m: document.getElementById('input_price_per_1m').value,
            output_price_per_1m: document.getElementById('output_price_per_1m').value
        };

        try {
            // Using navigator.sendBeacon or fetch with 'no-cors' might be needed if CORS is strict, 
            // BUT Apps Script Web Apps allow CORS if deployed as "Anyone".

            const res = await fetch(bridgeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script quirk: use text/plain
                body: JSON.stringify({
                    cmd: 'update_config',
                    config: newConfig
                })
            });

            const result = await res.json();
            if (result.status === 'success') {
                alert("Configuration Saved!");
            } else {
                alert("Error saving: " + JSON.stringify(result));
            }
        } catch (e) {
            console.error(e);
            alert("Failed to save. Check console.");
        }
    });

    // 4. File Upload Logic
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-indigo-500'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-indigo-500'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500');
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    async function handleFiles(files) {
        const bridgeUrl = bridgeInput.value.split('?')[0];
        const folderName = folderInput.value;

        if (!folderName) {
            alert("Client Folder Name is missing!");
            return;
        }

        for (const file of files) {
            uploadFile(file, bridgeUrl, folderName);
        }
    }

    function uploadFile(file, bridgeUrl, folderName) {
        const reader = new FileReader();

        // Add item to UI
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 bg-white border rounded shadow-sm";
        item.innerHTML = `<span>${file.name}</span> <span class="text-blue-600 text-sm"><i class="fa-solid fa-spinner fa-spin"></i> Uploading...</span>`;
        document.getElementById('uploadList').appendChild(item);

        reader.onload = async function () {
            const base64 = reader.result.split(',')[1];

            try {
                const res = await fetch(bridgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        cmd: 'upload_file',
                        folder: folderName,
                        filename: file.name,
                        mimeType: file.type,
                        base64: base64
                    })
                });

                const result = await res.json();
                if (result.status === 'success') {
                    item.innerHTML = `<span>${file.name}</span> <span class="text-green-600 text-sm"><i class="fa-solid fa-check"></i> Done</span>`;
                } else {
                    item.innerHTML = `<span>${file.name}</span> <span class="text-red-600 text-sm">Error: ${result.error}</span>`;
                }
            } catch (e) {
                item.innerHTML = `<span>${file.name}</span> <span class="text-red-600 text-sm">Network Error</span>`;
            }
        };

        reader.readAsDataURL(file);
    }

});
