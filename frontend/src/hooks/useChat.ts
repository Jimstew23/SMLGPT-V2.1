// frontend/src/hooks/useChat.ts
import { useState, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';
import { Message } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useNotifications } from './useNotifications';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useChat(socket: Socket | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [fileStatuses, setFileStatuses] = useState<{ [key: string]: 'uploading' | 'processing' | 'completed' | 'error' }>({});
  const { 
    addCriticalHazardAlert, 
    addFileProcessedAlert, 
    addSuccessAlert, 
    addErrorAlert,
    notifications,
    dismissNotification,
    clearAllNotifications
  } = useNotifications();

  // Join session when socket connects
  useEffect(() => {
    if (socket) {
      socket.emit('join-session', sessionId);
      
      // Listen for real-time responses
      socket.on('chat-response', (response) => {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
          metadata: response.metadata
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      });

      socket.on('critical-hazard-detected', (data) => {
        // Show notification for critical hazards
        console.error('Critical hazard detected:', data);
        addCriticalHazardAlert({
          ...data,
          messageId: data.messageId || messages[messages.length - 1]?.id
        });
      });

      socket.on('file-processed', (data) => {
        console.log('File processed:', data);
        // Update file status in state
        setFileStatuses(prev => ({
          ...prev,
          [data.fileId]: data.status === 'success' ? 'completed' : 'error'
        }));
        
        // Show notification
        addFileProcessedAlert({
          fileName: data.fileName,
          fileId: data.fileId,
          status: data.status === 'success' ? 'processed' : 'error',
          error: data.error
        });
      });

      return () => {
        socket.off('chat-response');
        socket.off('critical-hazard-detected');
        socket.off('file-processed');
      };
    }
  }, [socket, sessionId]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async (content: string, documentReferences: string[] = []) => {
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: content,
        documentReferences,
        sessionId
      });

      if (!socket) {
        // If no socket connection, add response directly
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response.data.response.content,
          timestamp: new Date().toISOString(),
          metadata: response.data.response.metadata
        };
        addMessage(assistantMessage);
        setIsLoading(false);
        return assistantMessage;
      }

      return response.data.response;
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send message');
      setIsLoading(false);
      throw err;
    }
  }, [addMessage, sessionId, socket]);

  const uploadFile = async (file: File): Promise<string> => {
    const fileId = Date.now().toString();
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
    setFileStatuses(prev => ({ ...prev, [fileId]: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      setFileStatuses(prev => ({ ...prev, [fileId]: 'processing' }));
      
      addSuccessAlert('File Uploaded', `${file.name} uploaded successfully and is being processed.`);
      
      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const { [fileId]: removed, ...rest } = prev;
          return rest;
        });
      }, 2000);

      return data.fileUrl;
    } catch (err: any) {
      setFileStatuses(prev => ({ ...prev, [fileId]: 'error' }));
      addErrorAlert('Upload Failed', `Failed to upload ${file.name}: ${err.message}`);
      throw err;
    }
  };

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    uploadProgress,
    fileStatuses,
    notifications,
    sendMessage,
    addMessage,
    uploadFile,
    clearMessages,
    sessionId,
    dismissNotification,
    clearAllNotifications
  };
}