// backend/src/routes/document.ts
import express from 'express';
import { logger } from '../utils/logger';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler';
import { trackEvent, trackDependency } from '../services/monitoring';
import { getStoredDocument } from './chat';

const router = express.Router();

// Get document analysis results
router.get('/analysis/:documentId', async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId) {
      throw new ValidationError('Document ID is required');
    }

    // Retrieve document from storage
    const document = getStoredDocument(documentId);
    
    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        }
      });
      return;
    }

    trackEvent('document_analysis_retrieved', {
      documentId,
      documentName: document.name,
      analysisType: document.analysis?.type
    });

    res.json({
      success: true,
      data: {
        id: documentId,
        name: document.name,
        analysis: document.analysis,
        uploadTime: document.uploadTime,
        size: document.size,
        mimeType: document.mimeType
      }
    });

    logger.info(`Document analysis retrieved: ${documentId}`);

  } catch (error) {
    logger.error('Failed to retrieve document analysis:', error);
    next(error);
  }
});

// Enhanced document processing with Azure Document Intelligence
router.post('/process/:documentId', async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { documentId } = req.params;
    
    if (!documentId) {
      throw new ValidationError('Document ID is required');
    }

    const document = getStoredDocument(documentId);
    
    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        }
      });
      return;
    }

    // Skip processing if not a document
    if (document.mimeType.startsWith('image/')) {
      res.json({
        success: true,
        data: {
          message: 'Image files are processed during upload',
          analysis: document.analysis
        }
      });
      return;
    }

    trackEvent('document_processing_started', {
      documentId,
      documentName: document.name,
      mimeType: document.mimeType
    });

    // Azure Document Intelligence processing
    let processingResult: any = {};

    try {
      // For now, return basic document info
      // In production, this would call Azure Document Intelligence
      processingResult = {
        type: 'document_intelligence',
        status: 'processed',
        extractedText: 'Document text extraction would be implemented here',
        entities: [],
        keyValuePairs: [],
        tables: [],
        confidence: 0.85
      };

      const duration = Date.now() - startTime;
      trackDependency('azure_document_intelligence', documentId, duration, true);
      
      // Update document with processing results
      document.analysis = {
        ...document.analysis,
        ...processingResult,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Document Intelligence processing failed:', error);
      processingResult = {
        type: 'document_intelligence',
        status: 'failed',
        error: 'Document processing failed'
      };
      trackDependency('azure_document_intelligence', documentId, Date.now() - startTime, false);
    }

    const duration = Date.now() - startTime;
    trackEvent('document_processing_completed', {
      documentId,
      documentName: document.name,
      duration,
      success: processingResult.status === 'processed'
    });

    res.json({
      success: true,
      data: {
        id: documentId,
        name: document.name,
        processing: processingResult,
        processedAt: new Date().toISOString()
      }
    });

    logger.info(`Document processing completed: ${documentId}`, { duration });

  } catch (error) {
    const duration = Date.now() - startTime;
    trackEvent('document_processing_failed', {
      documentId: req.params.documentId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    logger.error('Document processing failed:', error);
    next(error);
  }
});

// Search documents (integration with Azure Cognitive Search)
router.get('/search', async (req, res, next) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required');
    }

    trackEvent('document_search_started', {
      query: query.substring(0, 100),
      limit
    });

    // Basic search implementation
    // In production, this would integrate with Azure Cognitive Search
    const searchResults = {
      query,
      results: [],
      totalCount: 0,
      searchTime: 0
    };

    res.json({
      success: true,
      data: searchResults
    });

    logger.info(`Document search completed: ${query}`);

  } catch (error) {
    logger.error('Document search failed:', error);
    next(error);
  }
});

// Health check for document services
router.get('/health', async (req, res) => {
  try {
    const health = {
      document_store: 'healthy',
      azure_document_intelligence: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ? 'configured' : 'not_configured',
      azure_cognitive_search: process.env.AZURE_SEARCH_ENDPOINT ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Document health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Health check failed',
        code: 'HEALTH_CHECK_FAILED'
      }
    });
  }
});

export default router;
