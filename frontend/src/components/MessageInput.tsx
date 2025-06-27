// frontend/src/components/MessageInput.tsx
import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  const handleSubmit = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleStartRecording = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    resetTranscript();
    startListening({
      language: 'en-US',
      continuous: true,
      interimResults: true
    });
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    stopListening();
    setIsRecording(false);
    
    // Add transcript to input value
    if (transcript) {
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
      resetTranscript();
    }
  };

  useEffect(() => {
    if (isListening && transcript) {
      setMessage(prev => {
        const baseText = prev.replace(/ \[Speaking...\]$/, '');
        return baseText + (baseText ? ' ' : '') + transcript + (interimTranscript ? ` [Speaking...]` : '');
      });
    }
  }, [transcript, interimTranscript, isListening]);

  return (
    <div className="message-input-container">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask about safety hazards, compliance, or describe what you see..."
        className="message-input"
        disabled={isLoading || disabled}
        rows={1}
      />
      
      <div className="input-actions">
        {speechSupported && (
          <button
            type="button"
            onClick={isListening ? handleStopRecording : handleStartRecording}
            className={`
              p-2 rounded-lg transition-all duration-200 flex items-center justify-center
              ${isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }
              ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={!speechSupported}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}
        
        {speechError && (
          <div className="absolute top-12 left-0 right-0 bg-red-100 border border-red-300 rounded-lg p-2 text-sm text-red-700">
            {speechError}
          </div>
        )}
        
        {isListening && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-xs animate-pulse">
            🎤 Recording... Click microphone to stop
          </div>
        )}
        
        <button
          onClick={handleSubmit}
          className="action-button send"
          disabled={!message.trim() || isLoading || disabled}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;