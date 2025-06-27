// frontend/src/services/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout for speech operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Speech-to-text API call
export const speechToText = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await api.post('/speech-to-text', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60 seconds for speech processing
  });

  return response.data.transcript || response.data.text || '';
};

// Text-to-speech API call
export const textToSpeech = async (text: string, voice: string): Promise<ArrayBuffer> => {
  const response = await api.post('/text-to-speech', 
    { text, voice },
    {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 seconds for speech synthesis
    }
  );

  return response.data;
};

// Chat API call
export const sendChatMessage = async (
  message: string, 
  sessionId: string, 
  documentReferences?: string[]
): Promise<any> => {
  const response = await api.post('/api/chat', {
    message,
    session_id: sessionId,
    include_search: true,
    document_references: documentReferences || [],
  });

  return response.data;
};

// File upload API call
export const uploadFile = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
};

// Health check API call
export const healthCheck = async (): Promise<any> => {
  const response = await api.get('/health');
  return response.data;
};

// Status check API call
export const statusCheck = async (): Promise<any> => {
  const response = await api.get('/api/status');
  return response.data;
};

export default api;
