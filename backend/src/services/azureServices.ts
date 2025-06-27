// backend/src/services/azureServices.ts
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { DocumentAnalysisClient } from '@azure/ai-form-recognizer';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import { SearchClient, SearchIndexClient } from '@azure/search-documents';
import { BlobServiceClient } from '@azure/storage-blob';
import { SpeechConfig, AudioConfig, SpeechSynthesizer, SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';
import { logger } from '../utils/logger';

// GPT-4.1 Vision Client
export const openAIClient = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
);

// Embeddings Client
export const embeddingClient = new OpenAIClient(
  process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_OPENAI_EMBEDDING_API_KEY!)
);

// Document Intelligence Client
export const documentClient = new DocumentAnalysisClient(
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!)
);

// Computer Vision Client - Using direct REST API instead of SDK due to credential issues
// export const visionClient = new ComputerVisionClient(
//   process.env.AZURE_COMPUTER_VISION_ENDPOINT!,
//   new ApiKeyCredentials({
//     inHeader: {
//       'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY!
//     }
//   })
// );

// Computer Vision via REST API (validated and working)
export const visionClient = null; // Using direct REST API calls instead

// Blob Storage Client
export const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);
export const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_STORAGE_CONTAINER_NAME!
);

// Azure AI Search Client
export const searchIndexClient = new SearchIndexClient(
  process.env.AZURE_SEARCH_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY!)
);

export const searchClient = new SearchClient(
  process.env.AZURE_SEARCH_ENDPOINT!,
  process.env.AZURE_SEARCH_INDEX_NAME!,
  new AzureKeyCredential(process.env.AZURE_SEARCH_ADMIN_KEY!)
);

// Speech Configuration
export const speechConfig = SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY!,
  process.env.AZURE_SPEECH_REGION!
);

// Azure Service Functions

/**
 * Analyze image with GPT-4.1 Vision
 */
export async function analyzeImageWithGPT4Vision(
  imageUrl: string, 
  systemPrompt: string, 
  userPrompt: string
): Promise<any> {
  try {
    const messages = [
      { 
        role: "system", 
        content: systemPrompt 
      },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ];

    const result = await openAIClient.getChatCompletions(
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
      messages,
      {
        maxTokens: 4096,
        temperature: 0.3,
        topP: 0.95
      }
    );

    return result.choices[0].message;
  } catch (error) {
    logger.error('GPT-4.1 Vision analysis error:', error);
    throw error;
  }
}

/**
 * Generate embeddings using embed-v-4-0
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const result = await embeddingClient.getEmbeddings(
      process.env.AZURE_OPENAI_EMBEDDING_MODEL!,
      [text]
    );
    
    return result.data[0].embedding;
  } catch (error) {
    logger.error('Embedding generation error:', error);
    throw error;
  }
}

/**
 * Analyze document with Document Intelligence
 */
export async function analyzeDocument(documentUrl: string): Promise<any> {
  try {
    const poller = await documentClient.beginAnalyzeDocumentFromUrl(
      "prebuilt-document",
      documentUrl
    );
    
    const result = await poller.pollUntilDone();
    return result;
  } catch (error) {
    logger.error('Document analysis error:', error);
    throw error;
  }
}

/**
 * Analyze image with Computer Vision (using direct REST API - validated and working)
 */
export async function analyzeImageWithComputerVision(imageUrl: string): Promise<any> {
  try {
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT!;
    const key = process.env.AZURE_COMPUTER_VISION_KEY!;
    
    const features = [
      'Categories',
      'Description', 
      'Objects',
      'Tags',
      'Read'
    ];
    
    const url = `${endpoint}/vision/v3.2/analyze?visualFeatures=${features.join(',')}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: imageUrl
      })
    });
    
    if (!response.ok) {
      throw new Error(`Computer Vision API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    logger.error('Computer Vision analysis error:', error);
    throw error;
  }
}

/**
 * Upload file to Blob Storage
 */
export async function uploadToBlob(
  fileName: string, 
  fileBuffer: Buffer, 
  contentType: string
): Promise<string> {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: { blobContentType: contentType }
    });
    
    // Generate SAS URL
    const sasToken = process.env.AZURE_BLOB_SAS_TOKEN!;
    return `${blockBlobClient.url}?${sasToken}`;
  } catch (error) {
    logger.error('Blob upload error:', error);
    throw error;
  }
}

/**
 * Index document in Azure AI Search
 */
export async function indexDocument(document: any): Promise<void> {
  try {
    await searchClient.uploadDocuments([document]);
  } catch (error) {
    logger.error('Search indexing error:', error);
    throw error;
  }
}

/**
 * Search documents with vector similarity
 */
export async function searchDocuments(
  query: string, 
  vector?: number[], 
  filters?: string
): Promise<any> {
  try {
    const searchOptions: any = {
      includeTotalCount: true,
      top: 10,
      select: ['id', 'content', 'metadata', 'timestamp']
    };
    
    if (vector) {
      searchOptions.vector = {
        value: vector,
        fields: ['contentVector'],
        k: 10
      };
    }
    
    if (filters) {
      searchOptions.filter = filters;
    }
    
    const results = await searchClient.search(query, searchOptions);
    const documents: any[] = [];
    
    for await (const result of results.results) {
      documents.push(result.document);
    }
    
    return {
      documents,
      count: results.count
    };
  } catch (error) {
    logger.error('Search error:', error);
    throw error;
  }
}

/**
 * Convert text to speech
 */
export async function textToSpeech(
  text: string, 
  voiceName: string = 'en-US-JennyNeural'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    speechConfig.speechSynthesisVoiceName = voiceName;
    
    const synthesizer = new SpeechSynthesizer(speechConfig);
    
    synthesizer.speakTextAsync(
      text,
      result => {
        if (result.audioData) {
          resolve(Buffer.from(result.audioData));
        } else {
          reject(new Error('No audio data generated'));
        }
        synthesizer.close();
      },
      error => {
        synthesizer.close();
        reject(error);
      }
    );
  });
}

/**
 * Convert speech to text
 */
export async function speechToText(audioBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const audioConfig = AudioConfig.fromWavFileInput(audioBuffer);
    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    
    recognizer.recognizeOnceAsync(
      result => {
        resolve(result.text);
        recognizer.close();
      },
      error => {
        recognizer.close();
        reject(error);
      }
    );
  });
}