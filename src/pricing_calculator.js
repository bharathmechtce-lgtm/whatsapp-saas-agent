/**
 * Calculates the estimated cost of a message exchange.
 * 
 * Assumptions:
 * - 1 Token ~= 4 Characters (English/Code)
 * - Estimated Response Length: 50 Words (~66 Tokens)
 */

export const calculateEstimatedCost = (inputText, config) => {
    // Default to 0 if not provided in sheet
    const inputPricePer1M = parseFloat(config.input_price_per_1m || 0);
    const outputPricePer1M = parseFloat(config.output_price_per_1m || 0);

    // 1. Estimate Input Tokens
    const inputChars = inputText.length;
    const inputTokens = Math.ceil(inputChars / 4);

    // 2. Estimate Output Tokens (50 Words)
    // Average 1 word = 1.33 tokens
    const estOutputWords = 50;
    const estOutputTokens = Math.ceil(estOutputWords * 1.33);

    // 3. Calculate Cost
    const inputCost = (inputTokens / 1000000) * inputPricePer1M;
    const outputCost = (estOutputTokens / 1000000) * outputPricePer1M;
    const totalCost = inputCost + outputCost;

    return {
        inputTokens,
        estOutputTokens,
        inputCost,
        outputCost,
        totalCost: totalCost.toFixed(6), // 6 decimal places for micro-cents
        currency: "USD"
    };
};
