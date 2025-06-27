// Azure Search Index and Indexer Setup Script
// This script creates the necessary Azure Search infrastructure for SMLGPT V2.0

require('dotenv').config();
const { SearchIndexClient, SearchIndexerClient } = require('@azure/search-documents');
const { AzureKeyCredential } = require('@azure/core-auth');

// Initialize clients
const searchIndexClient = new SearchIndexClient(
  process.env.AZURE_SEARCH_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
);

const searchIndexerClient = new SearchIndexerClient(
  process.env.AZURE_SEARCH_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY)
);

// Index schema for SMLGPT safety documents
const indexSchema = {
  name: process.env.AZURE_SEARCH_INDEX_NAME || 'smlgpt-safety-index',
  fields: [
    {
      name: 'id',
      type: 'Edm.String',
      key: true,
      searchable: false,
      filterable: true,
      retrievable: true
    },
    {
      name: 'title',
      type: 'Edm.String',
      searchable: true,
      filterable: true,
      retrievable: true,
      analyzer: 'en.microsoft'
    },
    {
      name: 'content',
      type: 'Edm.String',
      searchable: true,
      retrievable: true,
      analyzer: 'en.microsoft'
    },
    {
      name: 'contentVector',
      type: 'Collection(Edm.Single)',
      searchable: true,
      retrievable: false,
      dimensions: 1536, // text-embedding-ada-002 dimensions
      vectorSearchProfile: 'vectorProfile'
    },
    {
      name: 'metadata',
      type: 'Edm.ComplexType',
      fields: [
        { name: 'fileName', type: 'Edm.String', searchable: true, filterable: true },
        { name: 'fileType', type: 'Edm.String', filterable: true },
        { name: 'uploadDate', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
        { name: 'fileSize', type: 'Edm.Int32', filterable: true },
        { name: 'userId', type: 'Edm.String', filterable: true },
        { name: 'sessionId', type: 'Edm.String', filterable: true },
        { name: 'analysisType', type: 'Edm.String', filterable: true },
        { name: 'hazardLevel', type: 'Edm.String', filterable: true },
        { name: 'workCategory', type: 'Edm.String', filterable: true }
      ]
    },
    {
      name: 'analysisResults',
      type: 'Edm.ComplexType',
      fields: [
        { name: 'hazards', type: 'Collection(Edm.String)', searchable: true },
        { name: 'riskLevel', type: 'Edm.String', filterable: true },
        { name: 'compliance', type: 'Edm.String', filterable: true },
        { name: 'recommendations', type: 'Collection(Edm.String)', searchable: true },
        { name: 'stopWork', type: 'Edm.Boolean', filterable: true }
      ]
    },
    {
      name: 'timestamp',
      type: 'Edm.DateTimeOffset',
      filterable: true,
      sortable: true,
      retrievable: true
    },
    {
      name: 'url',
      type: 'Edm.String',
      retrievable: true,
      searchable: false
    }
  ],
  vectorSearch: {
    profiles: [
      {
        name: 'vectorProfile',
        algorithm: 'vectorAlgorithm'
      }
    ],
    algorithms: [
      {
        name: 'vectorAlgorithm',
        kind: 'hnsw',
        hnswParameters: {
          metric: 'cosine',
          m: 4,
          efConstruction: 400,
          efSearch: 500
        }
      }
    ]
  },
  semantic: {
    configurations: [
      {
        name: 'semanticConfig',
        prioritizedFields: {
          titleField: {
            fieldName: 'title'
          },
          prioritizedContentFields: [
            {
              fieldName: 'content'
            }
          ],
          prioritizedKeywordsFields: [
            {
              fieldName: 'metadata/fileName'
            }
          ]
        }
      }
    ]
  }
};

// Data source configuration for Blob Storage
const dataSourceSchema = {
  name: 'smlgpt-blob-datasource',
  type: 'azureblob',
  credentials: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING
  },
  container: {
    name: process.env.AZURE_STORAGE_CONTAINER_NAME || 'smlgpt-uploads'
  },
  description: 'SMLGPT V2.0 blob storage data source for safety documents'
};

// Indexer configuration
const indexerSchema = {
  name: 'smlgpt-blob-indexer',
  dataSourceName: 'smlgpt-blob-datasource',
  targetIndexName: process.env.AZURE_SEARCH_INDEX_NAME || 'smlgpt-safety-index',
  schedule: {
    interval: 'PT15M' // Run every 15 minutes
  },
  parameters: {
    batchSize: 10,
    maxFailedItems: 3,
    maxFailedItemsPerBatch: 3,
    configuration: {
      dataToExtract: 'contentAndMetadata',
      parsingMode: 'default',
      indexedFileNameExtensions: '.pdf,.docx,.txt,.md,.json',
      excludedFileNameExtensions: '.png,.jpg,.jpeg,.gif,.bmp'
    }
  },
  fieldMappings: [
    {
      sourceFieldName: 'metadata_storage_path',
      targetFieldName: 'id',
      mappingFunction: {
        name: 'base64Encode'
      }
    },
    {
      sourceFieldName: 'metadata_storage_name',
      targetFieldName: 'title'
    },
    {
      sourceFieldName: 'content',
      targetFieldName: 'content'
    },
    {
      sourceFieldName: 'metadata_storage_last_modified',
      targetFieldName: 'timestamp'
    },
    {
      sourceFieldName: 'metadata_storage_path',
      targetFieldName: 'url'
    }
  ]
};

// Setup functions
async function createIndex() {
  try {
    console.log('🔍 Creating Azure Search Index...');
    const result = await searchIndexClient.createIndex(indexSchema);
    console.log('✅ Index created successfully:', result.name);
    return true;
  } catch (error) {
    if (error.statusCode === 409) {
      console.log('ℹ️  Index already exists, updating...');
      try {
        await searchIndexClient.createOrUpdateIndex(indexSchema);
        console.log('✅ Index updated successfully');
        return true;
      } catch (updateError) {
        console.error('❌ Error updating index:', updateError.message);
        return false;
      }
    } else {
      console.error('❌ Error creating index:', error.message);
      return false;
    }
  }
}

async function createDataSource() {
  try {
    console.log('📂 Creating Blob Storage Data Source...');
    const result = await searchIndexerClient.createDataSource(dataSourceSchema);
    console.log('✅ Data source created successfully:', result.name);
    return true;
  } catch (error) {
    if (error.statusCode === 409) {
      console.log('ℹ️  Data source already exists, updating...');
      try {
        await searchIndexerClient.createOrUpdateDataSource(dataSourceSchema);
        console.log('✅ Data source updated successfully');
        return true;
      } catch (updateError) {
        console.error('❌ Error updating data source:', updateError.message);
        return false;
      }
    } else {
      console.error('❌ Error creating data source:', error.message);
      return false;
    }
  }
}

async function createIndexer() {
  try {
    console.log('⚙️  Creating Search Indexer...');
    const result = await searchIndexerClient.createIndexer(indexerSchema);
    console.log('✅ Indexer created successfully:', result.name);
    return true;
  } catch (error) {
    if (error.statusCode === 409) {
      console.log('ℹ️  Indexer already exists, updating...');
      try {
        await searchIndexerClient.createOrUpdateIndexer(indexerSchema);
        console.log('✅ Indexer updated successfully');
        return true;
      } catch (updateError) {
        console.error('❌ Error updating indexer:', updateError.message);
        return false;
      }
    } else {
      console.error('❌ Error creating indexer:', error.message);
      return false;
    }
  }
}

async function runIndexer() {
  try {
    console.log('🚀 Running Indexer...');
    await searchIndexerClient.runIndexer('smlgpt-blob-indexer');
    console.log('✅ Indexer started successfully');
    return true;
  } catch (error) {
    console.error('❌ Error running indexer:', error.message);
    return false;
  }
}

async function checkIndexerStatus() {
  try {
    console.log('📊 Checking Indexer Status...');
    const status = await searchIndexerClient.getIndexerStatus('smlgpt-blob-indexer');
    console.log('📈 Indexer Status:', status.status);
    console.log('📈 Last Result:', status.lastResult?.status);
    if (status.lastResult?.itemCount) {
      console.log('📈 Items Processed:', status.lastResult.itemCount);
    }
    return status;
  } catch (error) {
    console.error('❌ Error checking indexer status:', error.message);
    return null;
  }
}

// Main setup function
async function setupAzureSearch() {
  console.log('🎯 SMLGPT V2.0 Azure Search Setup Starting...\n');

  // Validate environment variables
  const requiredEnvVars = [
    'AZURE_SEARCH_ENDPOINT',
    'AZURE_SEARCH_ADMIN_KEY',
    'AZURE_SEARCH_INDEX_NAME',
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_STORAGE_CONTAINER_NAME'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  let success = true;

  // Step 1: Create Index
  success &= await createIndex();
  console.log('');

  // Step 2: Create Data Source
  success &= await createDataSource();
  console.log('');

  // Step 3: Create Indexer
  success &= await createIndexer();
  console.log('');

  // Step 4: Run Indexer
  success &= await runIndexer();
  console.log('');

  // Step 5: Check Status
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  await checkIndexerStatus();

  if (success) {
    console.log('\n🎉 Azure Search setup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Upload files to blob storage container');
    console.log('2. Monitor indexer status for automatic processing');
    console.log('3. Test search functionality via API endpoints');
    console.log('\n🔍 Test search with:');
    console.log('curl -X GET "http://localhost:5000/api/status/search?q=safety%20hazard"');
  } else {
    console.log('\n❌ Azure Search setup encountered errors');
    console.log('Please review the error messages above and retry');
  }
}

// Run setup if called directly
if (require.main === module) {
  setupAzureSearch().catch(console.error);
}

module.exports = {
  setupAzureSearch,
  createIndex,
  createDataSource,
  createIndexer,
  runIndexer,
  checkIndexerStatus
};
