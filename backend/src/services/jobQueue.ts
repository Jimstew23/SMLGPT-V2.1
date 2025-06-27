// backend/src/services/jobQueue.ts
import { Queue, Worker, Job } from 'bullmq';
import { 
  analyzeImageWithGPT4Vision, 
  analyzeDocument, 
  analyzeImageWithComputerVision,
  generateEmbeddings, 
  indexDocument 
} from './azureServices';
import { io } from '../server';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_QUEUE_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true
});

// Create queue
export const fileProcessingQueue = new Queue('file-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 24 * 3600 // 24 hours
    },
    removeOnFail: {
      age: 24 * 3600 // 24 hours
    }
  }
});

// Create worker
const worker = new Worker(
  'file-processing',
  async (job: Job) => {
    const { fileId, fileName, fileUrl, fileType, sessionId } = job.data;
    
    logger.info(`Processing file: ${fileName} (${fileId})`);
    
    try {
      let analysisResult: any = {};
      
      // Process based on file type
      if (fileType.startsWith('image/')) {
        // Parallel image analysis
        const [gptVisionResult, computerVisionResult] = await Promise.all([
          analyzeImageWithGPT4Vision(
            fileUrl,
            SAFETY_ANALYSIS_PROMPT,
            'Analyze this image for workplace safety hazards, compliance issues, and provide detailed recommendations.'
          ),
          analyzeImageWithComputerVision(fileUrl)
        ]);
        
        analysisResult = {
          gptVision: gptVisionResult,
          computerVision: computerVisionResult,
          type: 'image'
        };
        
        // Extract hazards from GPT-4 response
        const hazards = extractHazardsFromResponse(gptVisionResult.content);
        
        // Notify client of hazards if critical
        if (hazards.some(h => h.severity === 'critical')) {
          io.to(sessionId).emit('critical-hazard-detected', {
            fileId,
            fileName,
            hazards: hazards.filter(h => h.severity === 'critical')
          });
        }
        
      } else if (fileType === 'application/pdf' || fileType.includes('document')) {
        // Document analysis
        const documentResult = await analyzeDocument(fileUrl);
        
        analysisResult = {
          documentIntelligence: documentResult,
          type: 'document'
        };
      }
      
      // Generate embeddings for the analysis
      const contentForEmbedding = JSON.stringify({
        fileName,
        analysis: analysisResult.gptVision?.content || analysisResult.documentIntelligence?.content || '',
        timestamp: new Date().toISOString()
      });
      
      const embeddings = await generateEmbeddings(contentForEmbedding);
      
      // Index in Azure Search
      await indexDocument({
        id: fileId,
        fileName,
        fileType,
        fileUrl,
        content: contentForEmbedding,
        contentVector: embeddings,
        analysis: analysisResult,
        timestamp: new Date().toISOString(),
        sessionId
      });
      
      // Update job progress
      await job.updateProgress(100);
      
      // Notify client of completion
      io.to(sessionId).emit('file-processed', {
        fileId,
        fileName,
        analysis: analysisResult
      });
      
      logger.info(`Successfully processed file: ${fileName}`);
      
      return {
        success: true,
        fileId,
        analysis: analysisResult
      };
      
    } catch (error) {
      logger.error(`Error processing file ${fileName}:`, error);
      
      // Notify client of error
      io.to(sessionId).emit('file-processing-error', {
        fileId,
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      throw error;
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.JOB_QUEUE_CONCURRENCY || '3')
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Helper functions
const SAFETY_ANALYSIS_PROMPT = `As a workplace safety expert, analyze this image for:

1. **Hazards**: Identify all safety hazards with severity levels:
   - CRITICAL: Immediate danger to life (stop work required)
   - HIGH: Serious injury risk
   - MEDIUM: Moderate injury risk
   - LOW: Minor injury risk

2. **PPE Compliance**: Check for required personal protective equipment
   - Hard hats, safety glasses, gloves, steel-toed boots, high-vis vests
   - Note any missing or improperly worn PPE

3. **Environmental Hazards**:
   - Fall hazards, electrical hazards, chemical exposure
   - Confined spaces, equipment operation
   - Housekeeping issues

4. **OSHA Compliance**: Note any potential OSHA violations

5. **Recommendations**: Provide specific action items to address each hazard

Format your response with clear sections and bullet points.`;

interface Hazard {
  severity: string;
  description: string;
  type: string;
}

function extractHazardsFromResponse(content: string): Hazard[] {
  const hazards: Hazard[] = [];
  
  // Extract critical hazards
  const criticalMatch = content.match(/CRITICAL[:\s]+([^\n]+)/gi);
  if (criticalMatch) {
    criticalMatch.forEach(match => {
      hazards.push({
        severity: 'critical',
        description: match.replace(/CRITICAL[:\s]+/i, '').trim(),
        type: 'general'
      });
    });
  }
  
  // Extract high severity hazards
  const highMatch = content.match(/HIGH[:\s]+([^\n]+)/gi);
  if (highMatch) {
    highMatch.forEach(match => {
      hazards.push({
        severity: 'high',
        description: match.replace(/HIGH[:\s]+/i, '').trim(),
        type: 'general'
      });
    });
  }
  
  return hazards;
}

export async function addJobToQueue(jobName: string, data: any) {
  return await fileProcessingQueue.add(jobName, data);
}

export async function initializeJobQueue() {
  logger.info('Job queue initialized');
}