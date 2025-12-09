import dotenv from 'dotenv';
dotenv.config();

async function checkAPI() {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
        console.error("❌ No GOOGLE_API_KEY found in .env");
        return;
    }

    console.log(`Checking API with Key: ${key.substring(0, 8)}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            data.models.forEach(m => {
                if (m.name.includes("flash") || m.name.includes("pro")) {
                    console.log(` - ${m.name}`);
                }
            });
        } else {
            const text = await response.text();
            console.error("❌ Error Body:", text);
        }
    } catch (error) {
        console.error("Network Error:", error);
    }
}

checkAPI();
