require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('No GEMINI_API_KEY found in .env');
    return;
  }
  
  console.log('Testing with GEMINI_API_KEY:', key.substring(0, 10) + '...');
  console.log('Model:', process.env.GEMINI_MODEL || 'gemini-2.0-flash');
  
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
    
    console.log('Calling generateContent...');
    const result = await model.generateContent('Say hello world.');
    console.log('Response received:');
    console.log(result.response.text());
    console.log('TEST PASSED SUCCESSFULLY');
  } catch (err) {
    console.error('TEST FAILED WITH ERROR:');
    console.error(err);
  }
}

testGemini();
