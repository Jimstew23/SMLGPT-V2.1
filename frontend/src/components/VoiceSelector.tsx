// frontend/src/components/VoiceSelector.tsx
import React, { useState } from 'react';
import { Volume2, Play, Pause, ChevronDown } from 'lucide-react';
import { AZURE_VOICES } from '../hooks/useAzureSpeech';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  onPreviewVoice: (voiceId: string) => Promise<void>;
  isPlaying: boolean;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  onPreviewVoice,
  isPlaying,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const selectedVoiceData = AZURE_VOICES.find(voice => voice.id === selectedVoice);

  const handleVoiceSelect = (voiceId: string) => {
    onVoiceChange(voiceId);
    setIsOpen(false);
  };

  const handlePreview = async (voiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (previewingVoice === voiceId) {
      return; // Already previewing this voice
    }

    setPreviewingVoice(voiceId);
    
    try {
      await onPreviewVoice(voiceId);
    } finally {
      setPreviewingVoice(null);
    }
  };

  // Group voices by language
  const groupedVoices = AZURE_VOICES.reduce((acc, voice) => {
    if (!acc[voice.language]) {
      acc[voice.language] = [];
    }
    acc[voice.language].push(voice);
    return acc;
  }, {} as Record<string, typeof AZURE_VOICES>);

  return (
    <div className="voice-selector">
      {/* Voice Selection Button */}
      <button
        className={`voice-selector-button ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        title="Select AI Voice"
      >
        <Volume2 size={16} />
        <span className="voice-name">
          {selectedVoiceData?.name || 'Select Voice'}
        </span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Voice Dropdown */}
      {isOpen && (
        <>
          <div className="voice-dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="voice-dropdown">
            <div className="voice-dropdown-header">
              <h4>Choose AI Voice</h4>
              <p>Select a voice for SMLGPT responses</p>
            </div>
            
            {Object.entries(groupedVoices).map(([language, voices]) => (
              <div key={language} className="voice-group">
                <div className="voice-group-header">
                  {language === 'en-US' ? 'English (US)' :
                   language === 'en-GB' ? 'English (UK)' :
                   language === 'en-AU' ? 'English (AU)' : language}
                </div>
                
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className={`voice-option ${selectedVoice === voice.id ? 'selected' : ''}`}
                    onClick={() => handleVoiceSelect(voice.id)}
                  >
                    <div className="voice-info">
                      <div className="voice-name">{voice.name}</div>
                      <div className="voice-details">
                        {voice.gender} • {voice.style}
                      </div>
                    </div>
                    
                    <button
                      className={`preview-button ${previewingVoice === voice.id ? 'playing' : ''}`}
                      onClick={(e) => handlePreview(voice.id, e)}
                      disabled={previewingVoice === voice.id}
                      title="Preview Voice"
                    >
                      {previewingVoice === voice.id ? (
                        <Pause size={12} />
                      ) : (
                        <Play size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ))}
            
            <div className="voice-dropdown-footer">
              <small>Powered by Azure Neural Voices</small>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceSelector;
