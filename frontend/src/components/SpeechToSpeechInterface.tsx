// frontend/src/components/SpeechToSpeechInterface.tsx
import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Zap } from 'lucide-react';
import { useAzureSpeech } from '../hooks/useAzureSpeech';
import VoiceSelector from './VoiceSelector';

interface SpeechToSpeechInterfaceProps {
  onProcessMessage: (message: string) => Promise<string>;
  disabled?: boolean;
}

const SpeechToSpeechInterface: React.FC<SpeechToSpeechInterfaceProps> = ({
  onProcessMessage,
  disabled = false
}) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>('Ready for voice interaction');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');

  const {
    isListening,
    transcript,
    recognitionError,
    startListening,
    stopListening,
    clearTranscript,
    isSpeaking,
    selectedVoice,
    setSelectedVoice,
    speak,
    stopSpeaking,
    availableVoices,
    previewVoice,
    isSpeechToSpeechActive
  } = useAzureSpeech();

  // Handle speech-to-speech workflow
  const startSpeechToSpeech = useCallback(async () => {
    if (disabled) return;

    try {
      setIsActive(true);
      setStatus('🎙️ Listening... Speak your safety question');
      clearTranscript();

      // Start listening
      await startListening();

    } catch (error) {
      console.error('Failed to start speech-to-speech:', error);
      setStatus('❌ Failed to start voice interaction');
      setIsActive(false);
    }
  }, [disabled, startListening, clearTranscript]);

  // Handle when transcript is ready
  React.useEffect(() => {
    if (transcript && transcript.trim() && !isListening && isActive) {
      handleTranscriptReady(transcript);
    }
  }, [transcript, isListening, isActive]);

  const handleTranscriptReady = useCallback(async (transcriptText: string) => {
    if (!transcriptText.trim()) return;

    try {
      setLastTranscript(transcriptText);
      setStatus('🤖 Processing your question...');

      // Send to AI for processing
      const aiResponse = await onProcessMessage(transcriptText);
      
      if (aiResponse && aiResponse.trim()) {
        setLastResponse(aiResponse);
        setStatus('🔊 Speaking response...');

        // Convert response to speech
        await speak(aiResponse);
        
        setStatus('✅ Voice interaction complete');
      } else {
        setStatus('❌ No response generated');
      }

    } catch (error) {
      console.error('Speech-to-speech processing error:', error);
      setStatus('❌ Error processing your question');
    } finally {
      setIsActive(false);
    }
  }, [onProcessMessage, speak]);

  const handleStop = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    if (isSpeaking) {
      stopSpeaking();
    }
    setIsActive(false);
    setStatus('🛑 Voice interaction stopped');
  }, [isListening, isSpeaking, stopListening, stopSpeaking]);

  const handleManualSpeak = useCallback(async () => {
    if (lastResponse) {
      setStatus('🔊 Repeating last response...');
      await speak(lastResponse);
      setStatus('✅ Playback complete');
    }
  }, [lastResponse, speak]);

  return (
    <div className="speech-to-speech-interface">
      {/* Header */}
      <div className="speech-header">
        <div className="speech-title">
          <Zap className="speech-icon" size={20} />
          <h3>Voice Assistant</h3>
        </div>
        <VoiceSelector
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
          onPreviewVoice={previewVoice}
          isPlaying={isSpeaking}
          disabled={disabled || isActive}
        />
      </div>

      {/* Status Display */}
      <div className="speech-status">
        <div className={`status-indicator ${isActive ? 'active' : ''} ${recognitionError ? 'error' : ''}`}>
          <div className="status-text">{status}</div>
          {recognitionError && (
            <div className="error-text">Error: {recognitionError}</div>
          )}
        </div>
      </div>

      {/* Conversation Display */}
      {(lastTranscript || lastResponse) && (
        <div className="speech-conversation">
          {lastTranscript && (
            <div className="speech-message user-message">
              <MessageCircle size={16} />
              <div className="message-content">
                <strong>You said:</strong> {lastTranscript}
              </div>
            </div>
          )}
          
          {lastResponse && (
            <div className="speech-message ai-message">
              <Volume2 size={16} />
              <div className="message-content">
                <strong>AI Response:</strong> {lastResponse}
              </div>
              <button
                className="replay-button"
                onClick={handleManualSpeak}
                disabled={isSpeaking}
                title="Replay Response"
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="speech-controls">
        {!isActive ? (
          <button
            className="speech-button primary"
            onClick={startSpeechToSpeech}
            disabled={disabled}
            title="Start Voice Interaction"
          >
            <Mic size={20} />
            <span>Start Voice Chat</span>
          </button>
        ) : (
          <button
            className="speech-button danger"
            onClick={handleStop}
            title="Stop Voice Interaction"
          >
            <MicOff size={20} />
            <span>Stop</span>
          </button>
        )}

        {/* Voice Activity Indicators */}
        <div className="voice-indicators">
          {isListening && (
            <div className="voice-indicator listening">
              <div className="pulse-dot"></div>
              <span>Listening</span>
            </div>
          )}
          
          {isSpeaking && (
            <div className="voice-indicator speaking">
              <div className="wave-animation">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
              <span>Speaking</span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="speech-instructions">
        <p>💡 <strong>How to use Voice Assistant:</strong></p>
        <ul>
          <li>Click "Start Voice Chat" and speak your safety question</li>
          <li>The AI will analyze and respond with voice</li>
          <li>Ask about hazards, safety procedures, or compliance</li>
          <li>Select different AI voices from the dropdown</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechToSpeechInterface;
