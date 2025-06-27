// Comprehensive SMLGPT V2.0 API Testing Script
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testHealthCheck() {
  console.log('🔍 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testChatAPI() {
  console.log('🔍 Testing Chat API (GPT-4.1)...');
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message: 'Test safety analysis: What are the main safety concerns when working at heights?',
      sessionId: 'test-session-001'
    });
    console.log('✅ Chat API Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Chat API Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSpeechAPI() {
  console.log('🔍 Testing Speech API...');
  try {
    const response = await axios.post(`${BASE_URL}/api/speech/text-to-speech`, {
      text: 'Safety first! Always wear proper PPE.',
      voiceName: 'en-US-JennyNeural'
    });
    console.log('✅ Speech API Response Length:', response.data.length || 'OK');
    return true;
  } catch (error) {
    console.log('❌ Speech API Failed:', error.response?.data || error.message);
    return false;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 COMPREHENSIVE SMLGPT V2.0 FUNCTION SIMULATION\n');
  
  const results = {
    healthCheck: await testHealthCheck(),
    chatAPI: await testChatAPI(),
    speechAPI: await testSpeechAPI()
  };
  
  console.log('\n📊 SIMULATION RESULTS:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed`);
}

runComprehensiveTest();
