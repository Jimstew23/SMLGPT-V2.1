// SMLGPT V2.0 End-to-End Simulation & Deep API Testing
// Comprehensive workflow testing: Upload → Analysis → Search → Answer Generation

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const TEST_CONFIG = {
  backend_url: process.env.BACKEND_URL || 'http://localhost:5000',
  session_id: uuidv4(),
  test_timeout: 120000, // 2 minutes per test
  test_files: {
    document: './test-files/safety-document.pdf',
    image: './test-files/safety-hazard.jpg',
    text_file: './test-files/safety-procedures.txt'
  }
};

// Test results tracker
const testResults = {
  timestamp: new Date().toISOString(),
  sessionId: TEST_CONFIG.session_id,
  tests: {},
  apiKeys: {},
  endpoints: {},
  errors: [],
  warnings: [],
  summary: {}
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const color = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
    TEST: colors.magenta
  }[level] || colors.reset;
  
  console.log(`${color}[${level}] ${timestamp} - ${message}${colors.reset}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// 1. Environment and API Key Validation
async function validateEnvironment() {
  log('TEST', '🔧 Step 1: Validating Environment and API Keys');
  
  const requiredEnvVars = [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT', 
    'AZURE_COMPUTER_VISION_KEY',
    'AZURE_COMPUTER_VISION_ENDPOINT',
    'AZURE_DOCUMENT_INTELLIGENCE_KEY',
    'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT',
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_STORAGE_CONTAINER_NAME',
    'AZURE_SEARCH_ENDPOINT',
    'AZURE_SEARCH_ADMIN_KEY',
    'AZURE_SEARCH_INDEX_NAME'
  ];

  let allValid = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log('SUCCESS', `✅ ${envVar}: Present`);
      testResults.apiKeys[envVar] = 'PRESENT';
    } else {
      log('ERROR', `❌ ${envVar}: Missing`);
      testResults.apiKeys[envVar] = 'MISSING';
      allValid = false;
    }
  }

  testResults.tests.environmentValidation = {
    passed: allValid,
    timestamp: new Date().toISOString()
  };

  return allValid;
}

// 2. Backend Health Check
async function testBackendHealth() {
  log('TEST', '🏥 Step 2: Backend Health Check');
  
  try {
    const response = await axios.get(`${TEST_CONFIG.backend_url}/api/status/health`, {
      timeout: 10000
    });
    
    log('SUCCESS', '✅ Backend Health Check: PASSED', response.data);
    testResults.tests.backendHealth = {
      passed: true,
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString()
    };
    return true;
  } catch (error) {
    log('ERROR', '❌ Backend Health Check: FAILED', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    testResults.tests.backendHealth = {
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    return false;
  }
}

// 3. Azure Services Connectivity Test
async function testAzureServices() {
  log('TEST', '☁️ Step 3: Azure Services Connectivity');
  
  try {
    const response = await axios.get(`${TEST_CONFIG.backend_url}/api/status/azure`, {
      timeout: 30000
    });
    
    log('SUCCESS', '✅ Azure Services: CONNECTED', response.data);
    testResults.tests.azureServices = {
      passed: true,
      services: response.data,
      timestamp: new Date().toISOString()
    };
    return true;
  } catch (error) {
    log('ERROR', '❌ Azure Services: CONNECTION FAILED', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    testResults.tests.azureServices = {
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    return false;
  }
}

// 4. Create Test Files
async function createTestFiles() {
  log('TEST', '📁 Step 4: Creating Test Files');
  
  const testDir = './test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create test document content
  const safetyDocument = `
SAFETY PROCEDURES DOCUMENT

1. WORKPLACE SAFETY REQUIREMENTS
- All personnel must wear appropriate PPE
- Hard hats required in construction zones
- Safety glasses mandatory when operating machinery
- Steel-toed boots required in industrial areas

2. HAZARD IDENTIFICATION
- Electrical hazards: Exposed wires, wet conditions
- Chemical hazards: Improper storage, mixing incompatible substances
- Physical hazards: Moving machinery, falling objects
- Fire hazards: Combustible materials, heat sources

3. EMERGENCY PROCEDURES
- In case of fire: Evacuate immediately, call 911
- Chemical spill: Contain if safe, evacuate area, notify supervisor
- Injury: Provide first aid, call emergency services if serious
- Equipment malfunction: Stop work, tag out equipment, report incident

4. COMPLIANCE REQUIREMENTS
- OSHA 29 CFR 1926 compliance mandatory
- Georgia-Pacific 2025 SML standards apply
- Regular safety inspections required
- Training certifications must be current

CRITICAL SAFETY NOTICE: Stop work immediately if any life-threatening hazards are identified.
  `;

  // Write test files
  fs.writeFileSync(path.join(testDir, 'safety-procedures.txt'), safetyDocument);
  
  // Create a simple test image (1x1 pixel PNG for testing)
  const testImageBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x35, 0x5C, 0xF0, 0x16, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  fs.writeFileSync(path.join(testDir, 'test-image.png'), testImageBuffer);

  log('SUCCESS', '✅ Test files created successfully');
  testResults.tests.testFilesCreation = {
    passed: true,
    files: ['safety-procedures.txt', 'test-image.png'],
    timestamp: new Date().toISOString()
  };
  
  return true;
}

// 5. Test File Upload
async function testFileUpload() {
  log('TEST', '📤 Step 5: Testing File Upload');
  
  const uploadResults = [];
  const testFiles = [
    { name: 'safety-procedures.txt', type: 'text/plain' },
    { name: 'test-image.png', type: 'image/png' }
  ];

  for (const file of testFiles) {
    try {
      const filePath = `./test-files/${file.name}`;
      if (!fs.existsSync(filePath)) {
        throw new Error(`Test file not found: ${filePath}`);
      }

      const formData = new FormData();
      formData.append('files', fs.createReadStream(filePath));
      formData.append('sessionId', TEST_CONFIG.session_id);

      log('INFO', `📁 Uploading ${file.name}...`);
      
      const response = await axios.post(
        `${TEST_CONFIG.backend_url}/api/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${TEST_CONFIG.session_id}`
          },
          timeout: TEST_CONFIG.test_timeout
        }
      );

      log('SUCCESS', `✅ ${file.name} uploaded successfully`, response.data);
      uploadResults.push({
        file: file.name,
        success: true,
        response: response.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log('ERROR', `❌ Failed to upload ${file.name}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      uploadResults.push({
        file: file.name,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  const allUploadsSuccessful = uploadResults.every(result => result.success);
  testResults.tests.fileUpload = {
    passed: allUploadsSuccessful,
    results: uploadResults,
    timestamp: new Date().toISOString()
  };

  return { success: allUploadsSuccessful, results: uploadResults };
}

// 6. Test Chat with Document Reference
async function testChatWithDocuments(uploadResults) {
  log('TEST', '💬 Step 6: Testing Chat with Document References');
  
  const successfulUploads = uploadResults.results.filter(r => r.success);
  if (successfulUploads.length === 0) {
    log('ERROR', '❌ No successful uploads to test chat with');
    return false;
  }

  const testQueries = [
    {
      message: "What are the main safety hazards mentioned in the uploaded document?",
      description: "Safety hazard identification query"
    },
    {
      message: "Are there any STOP WORK conditions mentioned in the safety procedures?",
      description: "Critical hazard detection query"
    },
    {
      message: "What PPE requirements are specified in the document?",
      description: "PPE compliance query"
    }
  ];

  const chatResults = [];

  for (const query of testQueries) {
    try {
      log('INFO', `🤖 Testing query: ${query.message}`);
      
      const requestBody = {
        message: query.message,
        sessionId: TEST_CONFIG.session_id,
        documentReferences: successfulUploads.map(upload => upload.response.files[0]?.id).filter(Boolean),
        includeSearch: true
      };

      const response = await axios.post(
        `${TEST_CONFIG.backend_url}/api/chat`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_CONFIG.session_id}`
          },
          timeout: TEST_CONFIG.test_timeout
        }
      );

      log('SUCCESS', `✅ Chat query successful: ${query.description}`, {
        query: query.message,
        response: response.data.response?.content?.substring(0, 200) + '...'
      });

      chatResults.push({
        query: query.message,
        description: query.description,
        success: true,
        response: response.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log('ERROR', `❌ Chat query failed: ${query.description}`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      chatResults.push({
        query: query.message,
        description: query.description,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  const allChatTestsSuccessful = chatResults.every(result => result.success);
  testResults.tests.chatWithDocuments = {
    passed: allChatTestsSuccessful,
    results: chatResults,
    timestamp: new Date().toISOString()
  };

  return allChatTestsSuccessful;
}

// 7. Test Search Functionality
async function testSearchFunctionality() {
  log('TEST', '🔍 Step 7: Testing Search Functionality');
  
  const searchQueries = [
    'safety hazards',
    'PPE requirements', 
    'emergency procedures',
    'OSHA compliance'
  ];

  const searchResults = [];

  for (const query of searchQueries) {
    try {
      log('INFO', `🔎 Testing search: ${query}`);
      
      const response = await axios.get(
        `${TEST_CONFIG.backend_url}/api/status/search`,
        {
          params: { q: query },
          timeout: 30000
        }
      );

      log('SUCCESS', `✅ Search successful: ${query}`, {
        query,
        resultsCount: response.data.results?.length || 0
      });

      searchResults.push({
        query,
        success: true,
        results: response.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log('ERROR', `❌ Search failed: ${query}`, {
        message: error.message,
        status: error.response?.status
      });

      searchResults.push({
        query,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  const allSearchTestsSuccessful = searchResults.every(result => result.success);
  testResults.tests.searchFunctionality = {
    passed: allSearchTestsSuccessful,
    results: searchResults,
    timestamp: new Date().toISOString()
  };

  return allSearchTestsSuccessful;
}

// Generate Final Report
function generateReport() {
  log('TEST', '📊 Generating Final Test Report');
  
  const totalTests = Object.keys(testResults.tests).length;
  const passedTests = Object.values(testResults.tests).filter(test => test.passed).length;
  const failedTests = totalTests - passedTests;

  testResults.summary = {
    totalTests,
    passedTests,
    failedTests,
    successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
    overallStatus: failedTests === 0 ? 'PASSED' : 'FAILED'
  };

  // Save detailed report
  const reportPath = `./test-results-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}📋 SMLGPT V2.0 END-TO-END TEST RESULTS${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`🕐 Test Duration: ${new Date().toISOString()}`);
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`${colors.green}✅ Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failedTests}${colors.reset}`);
  console.log(`📈 Success Rate: ${testResults.summary.successRate}`);
  console.log(`🎯 Overall Status: ${testResults.summary.overallStatus === 'PASSED' ? colors.green : colors.red}${testResults.summary.overallStatus}${colors.reset}`);
  console.log('\n📄 Detailed report saved to:', reportPath);
  
  if (failedTests > 0) {
    console.log('\n🔧 ISSUES FOUND:');
    Object.entries(testResults.tests).forEach(([testName, result]) => {
      if (!result.passed) {
        console.log(`${colors.red}❌ ${testName}: ${result.error || 'Failed'}${colors.reset}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  
  return testResults.summary.overallStatus === 'PASSED';
}

// Main Test Runner
async function runE2ESimulation() {
  console.log(`${colors.bright}🚀 SMLGPT V2.0 END-TO-END SIMULATION STARTING${colors.reset}\n`);
  
  try {
    // Step 1: Environment validation
    const envValid = await validateEnvironment();
    if (!envValid) {
      log('ERROR', '❌ Environment validation failed. Cannot proceed.');
      return false;
    }

    // Step 2: Backend health
    const backendHealthy = await testBackendHealth();
    if (!backendHealthy) {
      log('ERROR', '❌ Backend health check failed. Cannot proceed.');
      return false;
    }

    // Step 3: Azure services
    await testAzureServices();

    // Step 4: Create test files
    await createTestFiles();

    // Step 5: Test file upload
    const uploadResults = await testFileUpload();

    // Step 6: Test chat with documents
    if (uploadResults.success) {
      await testChatWithDocuments(uploadResults);
    }

    // Step 7: Test search functionality
    await testSearchFunctionality();

    // Generate final report
    return generateReport();

  } catch (error) {
    log('ERROR', '❌ Simulation failed with unexpected error', {
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Export for external use
module.exports = {
  runE2ESimulation,
  testResults,
  TEST_CONFIG
};

// Run if called directly
if (require.main === module) {
  runE2ESimulation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Simulation error:', error);
      process.exit(1);
    });
}
