// backend/src/routes/upload.ts
import express from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import { logger } from '../utils/logger';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler';
import { trackEvent, trackDependency } from '../services/monitoring';
import { storeDocument } from './chat';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow documents and images
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`File type ${file.mimetype} not supported`));
    }
  }
});

// Azure services setup
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({
    inHeader: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY!
    }
  }),
  process.env.AZURE_COMPUTER_VISION_ENDPOINT!
);

// File upload endpoint
router.post('/upload', upload.single('file'), async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      throw new ValidationError('No file provided');
    }

    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

    // Track upload attempt
    trackEvent('file_upload_started', {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    // Upload to Azure Blob Storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype
      },
      metadata: {
        originalName: file.originalname,
        uploadTime: new Date().toISOString(),
        fileSize: file.size.toString()
      }
    });

    logger.info(`File uploaded to blob storage: ${fileName}`);

    // Process based on file type
    let analysisResult: any = {};
    const isImage = file.mimetype.startsWith('image/');
    
    if (isImage) {
      // Process image with Computer Vision
      try {
        // Use direct REST API for Computer Vision to avoid URL accessibility issues
        const visionStartTime = Date.now();
        
        const response = await fetch(
          `${process.env.AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/analyze?visualFeatures=Categories,Description,Objects,Tags&details=Landmarks`,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY!,
              'Content-Type': 'application/octet-stream'
            },
            body: file.buffer
          }
        );

        if (!response.ok) {
          throw new Error(`Computer Vision API error: ${response.status} ${response.statusText}`);
        }

        const visionData: any = await response.json();
        const visionDuration = Date.now() - visionStartTime;
        
        trackDependency('azure_computer_vision', fileName, visionDuration, true);
        
        analysisResult = {
          type: 'image_analysis',
          description: visionData.description?.captions?.[0]?.text || 'No description available',
          objects: visionData.objects || [],
          tags: visionData.tags || [],
          categories: visionData.categories || []
        };

        logger.info(`Image analysis completed for: ${fileName}`);
        
      } catch (error) {
        logger.error('Computer Vision analysis failed:', error);
        analysisResult.error = 'Image analysis failed';
        trackDependency('azure_computer_vision', fileName, Date.now() - startTime, false);
      }
    } else {
      // For documents, we'll add Document Intelligence processing here
      analysisResult = {
        type: 'document',
        status: 'uploaded',
        message: 'Document ready for processing'
      };
    }

    // Store document for chat context
    const documentId = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    storeDocument(documentId, {
      id: documentId,
      name: file.originalname,
      fileName: fileName,
      mimeType: file.mimetype,
      size: file.size,
      blobUrl: blockBlobClient.url,
      uploadTime: new Date().toISOString(),
      analysis: analysisResult
    });

    const duration = Date.now() - startTime;
    trackEvent('file_upload_completed', {
      fileName: file.originalname,
      fileSize: file.size,
      duration,
      analysisType: analysisResult.type
    });

    res.json({
      success: true,
      data: {
        id: documentId,
        fileName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        blobUrl: blockBlobClient.url,
        uploadTime: new Date().toISOString(),
        analysis: analysisResult
      }
    });

    logger.info(`File upload completed successfully: ${fileName}`, { duration });

  } catch (error) {
    const duration = Date.now() - startTime;
    trackEvent('file_upload_failed', {
      fileName: req.file?.originalname || 'unknown',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    logger.error('File upload failed:', error);
    next(error);
  }
});

// Get uploaded files
router.get('/files', async (req, res, next) => {
  try {
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const files = [];
    for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
      files.push({
        name: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        metadata: blob.metadata
      });
    }

    res.json({
      success: true,
      data: { files }
    });

  } catch (error) {
    logger.error('Failed to list files:', error);
    next(error);
  }
});

export default router;
