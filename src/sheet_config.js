// Robust CSV Parser (Handles quoted values with commas)
const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values.map(v => v.replace(/^"|"$/g, '')); // Strip optional wrapping quotes
};

const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return {};

    const headers = parseCSVLine(lines[0]);
    const values = parseCSVLine(lines[1]);

    const config = {};
    headers.forEach((header, index) => {
        if (index < values.length) {
            config[header] = values[index];
        }
    });

    return config;
};

export const fetchConfigFromSheet = async (sheetUrl) => {
    try {
        const cacheBusterUrl = `${sheetUrl}&t=${Date.now()}`;
        console.log(`fetching config from: ${cacheBusterUrl}`);
        const response = await fetch(cacheBusterUrl);
        if (!response.ok) throw new Error(`Failed to fetch config: ${response.statusText}`);

        const csvText = await response.text();
        const config = parseCSV(csvText);

        console.log("Config loaded:", config);
        return config;
    } catch (error) {
        console.error("Error loading config from sheet:", error);
        return null; // Fallback or throw
    }
};
