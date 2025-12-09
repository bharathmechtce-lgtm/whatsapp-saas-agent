// Simple CSV Parser for Horizontal Format (Row 1 = Headers, Row 2 = Data)
const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return {};

    const headers = lines[0].split(',').map(h => h.trim());
    const values = lines[1].split(',').map(v => v.trim()); // Only take first data row

    const config = {};
    headers.forEach((header, index) => {
        if (index < values.length) {
            let value = values[index];
            // Remove wrapping quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            config[header] = value;
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
