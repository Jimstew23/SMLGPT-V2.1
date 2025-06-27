// frontend/src/components/ChatInterface.tsx
import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import MessageBubble from './MessageBubble';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="chat-interface">
        <div className="welcome-state">
          <h2>Welcome to SMLGPT V2.0</h2>
          <p>Upload images, documents, or start a conversation about workplace safety.</p>
          <p>I'm here to help identify hazards, ensure compliance, and keep your worksite safe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="message-list">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="message-bubble loading">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;

// frontend/src/components/MessageBubble.tsx
import React from 'react';
import { Message } from '../types';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  const renderContent = () => {
    if (message.attachments && message.attachments.length > 0) {
      return (
        <>
          <div className="message-text">{message.content}</div>
          <div className="message-attachments">
            {message.attachments.map((attachment, index) => (
              <div key={index} className="message-attachment">
                {attachment.type.startsWith('image/') ? (
                  <img src={attachment.url} alt={attachment.name} />
                ) : (
                  <div className="file-attachment">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{attachment.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }

    if (message.metadata?.hazards) {
      return (
        <div className="safety-analysis">
          <div className="message-text">{message.content}</div>
          
          {message.metadata.hazards.length > 0 && (
            <div className="hazard-list">
              <h4>Identified Hazards:</h4>
              {message.metadata.hazards.map((hazard: any, index: number) => (
                <div key={index} className={`hazard-item ${hazard.severity}`}>
                  <span className="hazard-icon">⚠️</span>
                  <div className="hazard-details">
                    <strong>{hazard.type}</strong>
                    <p>{hazard.description}</p>
                    {hazard.recommendation && (
                      <p className="recommendation">
                        <strong>Recommendation:</strong> {hazard.recommendation}
                      </p>
                    )}
                  </div>
                  <span className={`severity-badge ${hazard.severity}`}>
                    {hazard.severity.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {message.metadata.compliance && (
            <div className="compliance-status">
              <h4>Compliance Status:</h4>
              <div className={`compliance-badge ${message.metadata.compliance.status}`}>
                {message.metadata.compliance.status === 'compliant' ? '✓' : '✗'} 
                {message.metadata.compliance.status.toUpperCase()}
              </div>
              {message.metadata.compliance.violations && (
                <ul className="violation-list">
                  {message.metadata.compliance.violations.map((violation: string, index: number) => (
                    <li key={index}>{violation}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      );
    }

    return <div className="message-text">{message.content}</div>;
  };

  return (
    <div className={`message-bubble ${message.role}`}>
      {renderContent()}
      <div className="message-timestamp">
        {formatTimestamp(message.timestamp)}
      </div>
    </div>
  );
};

export default MessageBubble;