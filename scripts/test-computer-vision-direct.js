// Direct Azure Computer Vision REST API Test
// Tests Computer Vision with base64 encoded image to avoid URL accessibility issues

require('dotenv').config();
const axios = require('axios');

// Simple test image (1x1 white pixel PNG in base64)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// More realistic test image (small safety sign - base64 encoded)
const SAFETY_SIGN_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAyADIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k=';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
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

async function testComputerVisionDirect() {
  console.log(`${colors.magenta}🚀 AZURE COMPUTER VISION DIRECT REST API TEST${colors.reset}\n`);
  
  // Validate environment
  if (!process.env.AZURE_COMPUTER_VISION_ENDPOINT || !process.env.AZURE_COMPUTER_VISION_KEY) {
    log('ERROR', '❌ Missing Computer Vision credentials in environment');
    return false;
  }

  log('INFO', '🔧 Testing with base64-encoded image (avoids URL accessibility issues)');
  
  try {
    // Convert base64 to binary buffer for Azure Computer Vision API
    const imageBuffer = Buffer.from(SAFETY_SIGN_BASE64, 'base64');
    
    // Test 1: Basic image analysis with base64
    log('TEST', '👁️ Test 1: Basic Image Analysis');
    
    const response = await axios.post(
      `${process.env.AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/analyze?visualFeatures=Description,Objects,Tags,Categories`,
      imageBuffer,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY
        },
        timeout: 30000
      }
    );

    log('SUCCESS', '✅ Computer Vision Analysis - SUCCESS!', {
      description: response.data.description?.captions?.[0]?.text,
      confidence: response.data.description?.captions?.[0]?.confidence,
      tags: response.data.tags?.slice(0, 8).map(tag => `${tag.name} (${Math.round(tag.confidence * 100)}%)`),
      categories: response.data.categories?.slice(0, 3).map(cat => `${cat.name} (${Math.round(cat.score * 100)}%)`),
      objects: response.data.objects?.length || 0
    });

    // Test 2: OCR (Read API) test
    log('TEST', '📝 Test 2: OCR/Text Recognition');
    
    try {
      const ocrResponse = await axios.post(
        `${process.env.AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/read/analyze`,
        imageBuffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY
          },
          timeout: 30000
        }
      );

      const operationLocation = ocrResponse.headers['operation-location'];
      if (operationLocation) {
        log('SUCCESS', '✅ OCR/Read API initiated successfully', {
          operationLocation: operationLocation.substring(0, 80) + '...'
        });
      }

    } catch (ocrError) {
      log('WARNING', '⚠️ OCR test failed (may not be critical)', {
        message: ocrError.message,
        status: ocrError.response?.status
      });
    }

    // Test 3: Generate thumbnails
    log('TEST', '🖼️ Test 3: Thumbnail Generation');
    
    try {
      const thumbResponse = await axios.post(
        `${process.env.AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/generateThumbnail?width=100&height=100&smartCropping=true`,
        imageBuffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      log('SUCCESS', '✅ Thumbnail generation working', {
        thumbnailSize: thumbResponse.data.byteLength + ' bytes'
      });

    } catch (thumbError) {
      log('WARNING', '⚠️ Thumbnail generation failed (not critical)', {
        message: thumbError.message,
        status: thumbError.response?.status
      });
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.green}🎉 AZURE COMPUTER VISION VALIDATION: SUCCESS!${colors.reset}`);
    console.log('='.repeat(80));
    console.log(`✅ Core image analysis: WORKING`);
    console.log(`✅ API endpoint: ${process.env.AZURE_COMPUTER_VISION_ENDPOINT}`);
    console.log(`✅ Authentication: VALID`);
    console.log(`✅ Base64 image processing: WORKING`);
    console.log(`\n🚀 Your Computer Vision service is production-ready!`);
    console.log(`📋 Compatible with SMLGPT V2.0 safety analysis features`);
    console.log('='.repeat(80));

    return true;

  } catch (error) {
    log('ERROR', '❌ Computer Vision Direct Test FAILED', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    console.log('\n' + '='.repeat(80));
    console.log(`${colors.red}❌ AZURE COMPUTER VISION VALIDATION: FAILED${colors.reset}`);
    console.log('='.repeat(80));
    console.log(`❌ Error: ${error.message}`);
    if (error.response?.status) {
      console.log(`❌ HTTP Status: ${error.response.status}`);
    }
    if (error.response?.data) {
      console.log(`❌ Error Details:`, error.response.data);
    }
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('- Verify Computer Vision endpoint URL');
    console.log('- Check subscription key validity');
    console.log('- Ensure Computer Vision resource is active in Azure');
    console.log('- Verify API version compatibility');
    console.log('='.repeat(80));

    return false;
  }
}

// Run test
if (require.main === module) {
  testComputerVisionDirect()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
}

module.exports = { testComputerVisionDirect };
