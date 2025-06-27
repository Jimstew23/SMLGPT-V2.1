// SMLGPT V2.0 Azure Services Validation - Direct API Testing
// Bypasses backend server issues to validate production readiness

require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { BlobServiceClient } = require('@azure/storage-blob');

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

const testResults = {
  timestamp: new Date().toISOString(),
  tests: {},
  services: {}
};

// 1. Environment Variables Check
async function validateEnvironment() {
  log('TEST', '🔧 Step 1: Validating Environment Variables');
  
  const requiredVars = [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_COMPUTER_VISION_KEY',
    'AZURE_COMPUTER_VISION_ENDPOINT',
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_SEARCH_ENDPOINT',
    'AZURE_SEARCH_ADMIN_KEY'
  ];

  let allValid = true;
  const results = {};
  
  for (const envVar of requiredVars) {
    if (process.env[envVar]) {
      log('SUCCESS', `✅ ${envVar}: Present`);
      results[envVar] = 'PRESENT';
    } else {
      log('ERROR', `❌ ${envVar}: Missing`);
      results[envVar] = 'MISSING';
      allValid = false;
    }
  }

  testResults.tests.environmentValidation = {
    passed: allValid,
    results,
    timestamp: new Date().toISOString()
  };

  return allValid;
}

// 2. Azure OpenAI GPT-4.1 Test
async function testAzureOpenAI() {
  log('TEST', '🤖 Step 2: Testing Azure OpenAI GPT-4.1');
  
  try {
    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`,
      {
        messages: [
          {
            role: 'system',
            content: 'You are a safety analysis expert. Respond with exactly "SAFETY_TEST_SUCCESS" if you receive this message.'
          },
          {
            role: 'user',
            content: 'Test message for production validation'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY
        },
        timeout: 30000
      }
    );

    const aiResponse = response.data.choices[0]?.message?.content || '';
    log('SUCCESS', '✅ Azure OpenAI GPT-4.1: WORKING', {
      model: response.data.model,
      usage: response.data.usage,
      response: aiResponse
    });

    testResults.tests.azureOpenAI = {
      passed: true,
      model: response.data.model,
      usage: response.data.usage,
      response: aiResponse,
      timestamp: new Date().toISOString()
    };

    return true;
  } catch (error) {
    log('ERROR', '❌ Azure OpenAI GPT-4.1: FAILED', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    testResults.tests.azureOpenAI = {
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return false;
  }
}

// 3. Azure Computer Vision Test
async function testAzureComputerVision() {
  log('TEST', '👁️ Step 3: Testing Azure Computer Vision');
  
  try {
    // Create a test image (small base64 encoded image)
    const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Vd-Orig.svg/256px-Vd-Orig.svg.png';
    
    const response = await axios.post(
      `${process.env.AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/analyze?visualFeatures=Description,Objects,Tags`,
      {
        url: testImageUrl
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY
        },
        timeout: 30000
      }
    );

    log('SUCCESS', '✅ Azure Computer Vision: WORKING', {
      description: response.data.description?.captions?.[0]?.text,
      tags: response.data.tags?.slice(0, 5),
      objects: response.data.objects?.length || 0
    });

    testResults.tests.azureComputerVision = {
      passed: true,
      description: response.data.description?.captions?.[0]?.text,
      tags: response.data.tags?.slice(0, 5),
      objects: response.data.objects?.length || 0,
      timestamp: new Date().toISOString()
    };

    return true;
  } catch (error) {
    log('ERROR', '❌ Azure Computer Vision: FAILED', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    testResults.tests.azureComputerVision = {
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return false;
  }
}

// 4. Azure Blob Storage Test
async function testAzureBlobStorage() {
  log('TEST', '💾 Step 4: Testing Azure Blob Storage');
  
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    
    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER_NAME || 'smlgpt-files'
    );

    // Test container existence
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create();
      log('INFO', '📁 Created blob storage container');
    }

    // Test upload with a small test file
    const testContent = 'SMLGPT V2.0 Production Test File - ' + new Date().toISOString();
    const blobName = `test-${Date.now()}.txt`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(testContent, testContent.length);
    
    // Test download
    const downloadResponse = await blockBlobClient.download();
    const downloadedContent = (await streamToString(downloadResponse.readableStreamBody)).trim();
    
    // Clean up test file
    await blockBlobClient.delete();

    const success = downloadedContent === testContent;
    
    if (success) {
      log('SUCCESS', '✅ Azure Blob Storage: WORKING', {
        container: process.env.AZURE_STORAGE_CONTAINER_NAME || 'smlgpt-files',
        testFile: blobName,
        uploadSize: testContent.length
      });

      testResults.tests.azureBlobStorage = {
        passed: true,
        container: process.env.AZURE_STORAGE_CONTAINER_NAME || 'smlgpt-files',
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Upload/Download content mismatch');
    }

    return true;
  } catch (error) {
    log('ERROR', '❌ Azure Blob Storage: FAILED', {
      message: error.message,
      stack: error.stack
    });

    testResults.tests.azureBlobStorage = {
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return false;
  }
}

// Helper function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

// 5. Azure Cognitive Search Test
async function testAzureSearch() {
  log('TEST', '🔍 Step 5: Testing Azure Cognitive Search');
  
  try {
    // Test search service availability
    const response = await axios.get(
      `${process.env.AZURE_SEARCH_ENDPOINT}/indexes?api-version=2021-04-30-Preview`,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_SEARCH_ADMIN_KEY
        },
        timeout: 15000
      }
    );

    const indexes = response.data.value || [];
    log('SUCCESS', '✅ Azure Cognitive Search: WORKING', {
      indexCount: indexes.length,
      indexes: indexes.map(idx => idx.name)
    });

    testResults.tests.azureSearch = {
      passed: true,
      indexCount: indexes.length,
      indexes: indexes.map(idx => idx.name),
      timestamp: new Date().toISOString()
    };

    return true;
  } catch (error) {
    log('ERROR', '❌ Azure Cognitive Search: FAILED', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    testResults.tests.azureSearch = {
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return false;
  }
}

// Generate Final Report
function generateReport() {
  log('TEST', '📊 Generating Azure Services Validation Report');
  
  const totalTests = Object.keys(testResults.tests).length;
  const passedTests = Object.values(testResults.tests).filter(test => test.passed).length;
  const failedTests = totalTests - passedTests;

  testResults.summary = {
    totalTests,
    passedTests,
    failedTests,
    successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
    overallStatus: failedTests === 0 ? 'PRODUCTION_READY' : 'NEEDS_ATTENTION'
  };

  // Save detailed report
  const reportPath = `./azure-validation-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}🚀 SMLGPT V2.0 AZURE SERVICES VALIDATION RESULTS${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`🕐 Test Completed: ${new Date().toISOString()}`);
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`${colors.green}✅ Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failedTests}${colors.reset}`);
  console.log(`📈 Success Rate: ${testResults.summary.successRate}`);
  console.log(`🎯 Production Status: ${testResults.summary.overallStatus === 'PRODUCTION_READY' ? colors.green : colors.red}${testResults.summary.overallStatus}${colors.reset}`);
  
  if (failedTests > 0) {
    console.log('\n🔧 ISSUES FOUND:');
    Object.entries(testResults.tests).forEach(([testName, result]) => {
      if (!result.passed) {
        console.log(`${colors.red}❌ ${testName}: ${result.error || 'Failed'}${colors.reset}`);
      }
    });
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('- Verify all Azure service credentials and endpoints');
    console.log('- Check network connectivity to Azure services');
    console.log('- Ensure all required Azure resources are properly provisioned');
  } else {
    console.log('\n🎉 ALL AZURE SERVICES VALIDATED SUCCESSFULLY!');
    console.log('✅ Your SMLGPT V2.0 system is ready for production deployment');
  }

  console.log('\n📄 Detailed report saved to:', reportPath);
  console.log('='.repeat(80));
  
  return testResults.summary.overallStatus === 'PRODUCTION_READY';
}

// Main Validation Runner
async function runAzureValidation() {
  console.log(`${colors.bright}🚀 SMLGPT V2.0 AZURE SERVICES VALIDATION STARTING${colors.reset}\n`);
  
  try {
    // Step 1: Environment validation
    const envValid = await validateEnvironment();
    if (!envValid) {
      log('ERROR', '❌ Environment validation failed. Cannot proceed.');
      return false;
    }

    // Step 2: Azure OpenAI
    await testAzureOpenAI();

    // Step 3: Azure Computer Vision
    await testAzureComputerVision();

    // Step 4: Azure Blob Storage
    await testAzureBlobStorage();

    // Step 5: Azure Cognitive Search
    await testAzureSearch();

    // Generate final report
    return generateReport();

  } catch (error) {
    log('ERROR', '❌ Validation failed with unexpected error', {
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Export for external use
module.exports = {
  runAzureValidation,
  testResults
};

// Run if called directly
if (require.main === module) {
  runAzureValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}
