
const runTest = async () => {
    try {
        const response = await fetch('http://localhost:3000/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                'Body': 'What is the price of wash and fold?',
                'From': 'whatsapp:+1234567890'
            })
        });
        console.log('Response Status:', response.status);
    } catch (error) {
        console.error('Test Failed:', error);
    }
};

runTest();
