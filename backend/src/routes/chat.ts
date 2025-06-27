// backend/src/routes/chat.ts
import express from 'express';
import { logger } from '../utils/logger';
import { ValidationError, ExternalServiceError } from '../middleware/errorHandler';
import { trackEvent, trackDependency } from '../services/monitoring';

const router = express.Router();

// Azure OpenAI client setup
import { AzureOpenAI } from 'openai';

const openaiClient = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`
});

// Document store for chat integration
const documentStore = new Map<string, any>();

// Chat endpoint with GPT-4.1 and safety analysis
router.post('/chat', async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { message, context, document_references, session_id } = req.body;

    if (!message || typeof message !== 'string') {
      throw new ValidationError('Message is required and must be a string');
    }

    // Track chat request
    trackEvent('chat_request', { 
      session_id, 
      has_document_references: !!document_references?.length,
      context_length: context?.length || 0
    });

    // Build system prompt with Georgia-Pacific 2025 SML compliance
    const systemPrompt = `You are SMLGPT V2.0, an advanced AI safety analysis assistant for Georgia-Pacific 2025 SML (Sustainable Manufacturing & Logistics) compliance.

CORE CAPABILITIES:
- Advanced safety hazard identification and risk assessment
- Georgia-Pacific 2025 SML compliance analysis
- Multi-modal document and image analysis
- Context-aware memory and reasoning
- Critical hazard "STOP" functionality

SAFETY ANALYSIS PROTOCOL:
1. Analyze all inputs for potential safety hazards
2. Apply Georgia-Pacific 2025 SML standards
3. Provide risk assessment with severity levels
4. Issue immediate "STOP" warnings for critical hazards
5. Recommend specific corrective actions

RESPONSE FORMAT:
- Clear, actionable safety recommendations
- Specific compliance references when applicable  
- Risk severity: LOW, MEDIUM, HIGH, CRITICAL
- For CRITICAL risks: Lead with "⚠️ STOP - CRITICAL HAZARD IDENTIFIED"

Maintain professional, safety-focused communication while being helpful and thorough.`;

    // Build context from documents if provided
    let documentContext = '';
    if (document_references && document_references.length > 0) {
      const documents = document_references
        .map((ref: string) => documentStore.get(ref))
        .filter(Boolean);
      
      if (documents.length > 0) {
        documentContext = '\n\nDOCUMENT CONTEXT:\n' + 
          documents.map((doc: any) => `Document: ${doc.name}\n${doc.content}`).join('\n\n');
      }
    }

    // Prepare messages for GPT-4.1
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context || []),
      { role: 'user', content: message + documentContext }
    ];

    // Call GPT-4.1 for analysis
    const response = await openaiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
      messages: messages as any,
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new ExternalServiceError('Azure OpenAI', 'No response generated');
    }

    // Track successful response
    const duration = Date.now() - startTime;
    trackDependency('azure_openai_chat', message.substring(0, 100), duration, true);
    trackEvent('chat_response', { 
      session_id, 
      response_length: aiResponse.length,
      duration,
      is_critical_hazard: aiResponse.includes('STOP - CRITICAL HAZARD')
    });

    res.json({
      success: true,
      data: {
        response: aiResponse,
        session_id,
        timestamp: new Date().toISOString(),
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        has_critical_hazard: aiResponse.includes('STOP - CRITICAL HAZARD')
      }
    });

    logger.info('Chat response generated successfully', { 
      session_id, 
      duration,
      response_length: aiResponse.length 
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    trackDependency('azure_openai_chat', req.body.message?.substring(0, 100) || 'unknown', duration, false);
    
    logger.error('Chat request failed:', error);
    next(error);
  }
});

// Store document for chat context
export const storeDocument = (id: string, document: any) => {
  documentStore.set(id, document);
  logger.info(`Document stored for chat context: ${id}`);
};

// Get stored document
export const getStoredDocument = (id: string) => {
  return documentStore.get(id);
};

export default router;
