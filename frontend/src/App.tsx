import React, { useState, useEffect, useRef } from 'react';
// Step 3: Test SpeechToSpeechInterface component import
import SpeechToSpeechInterface from './components/SpeechToSpeechInterface';
import { sendChatMessage } from './services/api';
import { Message } from './types';
import { v4 as uuidv4 } from 'uuid';

interface Attachment {
  id: string;
  name: string;
  thumbnail: string;
  file: File;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/health');
        setIsConnected(response.ok);
      } catch (error) {
        setIsConnected(false);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Enhanced message processing for speech-to-speech
  const processMessage = async (message: string): Promise<string> => {
    if (!message.trim()) return '';
    
    setIsProcessing(true);
    
    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Send to backend for AI processing  
      const sessionId = 'test-session-' + Date.now();
      const response = await sendChatMessage(message, sessionId);
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: uuidv4(),
        content: response.response || 'No response generated',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
        hazardLevel: response.hazard_analysis?.risk_level,
        stopWorkRequired: response.stop_work_required
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      return response.response || 'No response generated';
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: Message = {
        id: uuidv4(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      return 'Sorry, I encountered an error processing your request. Please try again.';
    } finally {
      setIsProcessing(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Create thumbnail for images
      let thumbnail = '';
      if (file.type.startsWith('image/')) {
        thumbnail = URL.createObjectURL(file);
      } else {
        thumbnail = '/icons/file-icon.png'; // Default file icon
      }

      const newAttachment: Attachment = {
        id: uuidv4(),
        name: file.name,
        thumbnail,
        file
      };

      setAttachments(prev => [...prev, newAttachment]);
    }

    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && attachments.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const sessionId = 'session-' + Date.now();
      const response = await sendChatMessage(inputText, sessionId);
      
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        content: inputText || `Uploaded ${attachments.length} file(s)`,
        sender: 'user',
        timestamp: new Date(),
        type: attachments.length > 0 ? 'file' : 'text'
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Add AI response
      if (response.response) {
        const aiMessage: Message = {
          id: uuidv4(),
          content: response.response,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text',
          hazardLevel: response.hazard_analysis?.risk_level || 'low',
          stopWorkRequired: response.stop_work_required || false
        };
        
        setMessages(prev => [...prev, aiMessage]);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: uuidv4(),
        content: 'Error: Failed to send message. Please check your connection.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setInputText('');
      setAttachments([]);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div className="status-bar">
        <span>
          <i className={`fas fa-circle status-indicator ${isConnected ? 'text-green-400' : ''}`}></i> 
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        <span>
          Auto-Speak: 
          <i 
            className={`fas ${autoSpeak ? 'fa-toggle-on' : 'fa-toggle-off'}`}
            onClick={() => setAutoSpeak(!autoSpeak)}
            style={{ cursor: 'pointer', marginLeft: '4px' }}
          ></i>
        </span>
        <span>
          Speech Engine:
          <select><option>Azure Neural Voices</option></select>
        </span>
        <button className="icon-btn"><i className="fas fa-microphone"></i></button>
        <button className="icon-btn"><i className="fas fa-cog"></i></button>
        <button className="icon-btn"><i className="fas fa-question-circle"></i></button>
      </div>

      <div className="header">
        <div className="logo-container">
          <img src="/assets/logos/main/SML.svg.png" alt="SML Logo" className="logo" />
        </div>
        <h1 className="main-title">SMLGPT V2.0</h1>
        <p className="subtitle">AI Safety Assistant with Azure Speech</p>
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.sender} ${message.type || ''}`}>
              <div className="message-content">
                {message.content}
                {message.stopWorkRequired && (
                  <div className="stop-work-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    <strong>STOP WORK REQUIRED</strong>
                  </div>
                )}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="message ai processing">
              <div className="message-content">
                <i className="fas fa-spinner fa-spin"></i> Processing...
              </div>
            </div>
          )}
        </div>

        {/* Speech to Speech Interface */}
        <div className="speech-interface-container">
          <SpeechToSpeechInterface
            onProcessMessage={processMessage}
            disabled={!isConnected || isProcessing}
          />
        </div>
      </div>

      {/* File Attachments Preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map(attachment => (
            <div key={attachment.id} className="attachment-preview">
              <img src={attachment.thumbnail} alt={attachment.name} />
              <span>{attachment.name}</span>
              <button className="remove" onClick={() => removeAttachment(attachment.id)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="input-bar">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          multiple
          accept="image/*,application/pdf,.doc,.docx"
        />
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
          <i className="fas fa-paperclip"></i>
        </button>
        <button className="icon-btn"><i className="fas fa-microphone"></i></button>
        <input 
          type="text" 
          placeholder="Type your message here…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button className="icon-btn" onClick={handleSendMessage}>
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </>
  );
}

export default App;