// frontend/src/hooks/useAzureSpeech.ts
import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';

// Azure Neural Voice options for SMLGPT V2.0
export const AZURE_VOICES = [
  // English (US) - Professional voices
  { id: 'en-US-JennyNeural', name: 'Jenny (US Female)', language: 'en-US', gender: 'Female', style: 'Professional' },
  { id: 'en-US-GuyNeural', name: 'Guy (US Male)', language: 'en-US', gender: 'Male', style: 'Professional' },
  { id: 'en-US-AriaNeural', name: 'Aria (US Female)', language: 'en-US', gender: 'Female', style: 'Friendly' },
  { id: 'en-US-DavisNeural', name: 'Davis (US Male)', language: 'en-US', gender: 'Male', style: 'Friendly' },
  { id: 'en-US-JaneNeural', name: 'Jane (US Female)', language: 'en-US', gender: 'Female', style: 'Calm' },
  { id: 'en-US-JasonNeural', name: 'Jason (US Male)', language: 'en-US', gender: 'Male', style: 'Energetic' },
  
  // English (UK) - British accent
  { id: 'en-GB-SoniaNeural', name: 'Sonia (UK Female)', language: 'en-GB', gender: 'Female', style: 'Professional' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (UK Male)', language: 'en-GB', gender: 'Male', style: 'Professional' },
  
  // English (AU) - Australian accent
  { id: 'en-AU-NatashaNeural', name: 'Natasha (AU Female)', language: 'en-AU', gender: 'Female', style: 'Professional' },
  { id: 'en-AU-WilliamNeural', name: 'William (AU Male)', language: 'en-AU', gender: 'Male', style: 'Professional' },
];

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  duration_ms: number;
  recognition_status: string;
}

interface UseAzureSpeechReturn {
  // Speech Recognition (STT)
  isListening: boolean;
  transcript: string;
  recognitionError: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  clearTranscript: () => void;
  
  // Text-to-Speech (TTS)
  isSpeaking: boolean;
  selectedVoice: string;
  setSelectedVoice: (voiceId: string) => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  
  // Speech-to-Speech workflow
  startSpeechToSpeech: (onTranscriptReady: (text: string) => Promise<string>) => Promise<void>;
  isSpeechToSpeechActive: boolean;
  
  // Voice management
  availableVoices: typeof AZURE_VOICES;
  previewVoice: (voiceId: string) => Promise<void>;
}

export const useAzureSpeech = (): UseAzureSpeechReturn => {
  // STT State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  
  // Speech-to-Speech State
  const [isSpeechToSpeechActive, setIsSpeechToSpeechActive] = useState(false);
  
  // Audio management
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start listening for speech input
  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      setRecognitionError(null);
      setTranscript('');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder for audio capture
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Send to Azure Speech Services via backend
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await api.post('/speech/speech-to-text', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data.success) {
            const result: SpeechRecognitionResult = response.data.data;
            setTranscript(result.transcript);
            console.log('Speech recognition result:', result);
          } else {
            setRecognitionError('Failed to process speech');
          }
        } catch (error) {
          console.error('Speech recognition error:', error);
          setRecognitionError('Speech recognition failed');
        } finally {
          setIsListening(false);
          cleanup();
        }
      };

      mediaRecorder.start();
      console.log('Started recording audio for Azure Speech Services');

    } catch (error) {
      console.error('Failed to start listening:', error);
      setRecognitionError('Microphone access denied');
      setIsListening(false);
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
  }, [isListening]);

  // Cleanup audio resources
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setRecognitionError(null);
  }, []);

  // Text-to-Speech with Azure Neural Voices
  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Send text to Azure TTS via backend
      const response = await api.post('/speech/text-to-speech', {
        text,
        voice: selectedVoice
      }, {
        responseType: 'blob'
      });

      // Create audio element and play
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        console.error('Audio playback error');
      };

      await audio.play();
      console.log(`Speaking with voice: ${selectedVoice}`);

    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsSpeaking(false);
    }
  }, [selectedVoice]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  // Preview voice with sample text
  const previewVoice = useCallback(async (voiceId: string) => {
    const previousVoice = selectedVoice;
    setSelectedVoice(voiceId);
    
    const sampleText = "Hi, I'm your AI safety assistant. I'm here to help analyze workplace hazards and ensure your safety.";
    
    try {
      await speak(sampleText);
    } finally {
      // Restore previous voice if this was just a preview
      if (voiceId !== selectedVoice) {
        setSelectedVoice(previousVoice);
      }
    }
  }, [selectedVoice, speak]);

  // Speech-to-Speech workflow
  const startSpeechToSpeech = useCallback(async (
    onTranscriptReady: (text: string) => Promise<string>
  ) => {
    try {
      setIsSpeechToSpeechActive(true);
      
      // Step 1: Listen for user speech
      await startListening();
      
      // Wait for recording to complete and transcript to be ready
      // This will be handled by the mediaRecorder.onstop callback
      // For now, we'll set up a listener for transcript changes
      
    } catch (error) {
      console.error('Speech-to-speech error:', error);
      setIsSpeechToSpeechActive(false);
    }
  }, [startListening]);

  // Handle transcript completion for speech-to-speech
  const handleTranscriptComplete = useCallback(async (
    transcriptText: string,
    onTranscriptReady: (text: string) => Promise<string>
  ) => {
    if (!isSpeechToSpeechActive || !transcriptText.trim()) return;

    try {
      // Step 2: Process transcript through AI
      const aiResponse = await onTranscriptReady(transcriptText);
      
      // Step 3: Convert AI response to speech
      if (aiResponse.trim()) {
        await speak(aiResponse);
      }
    } catch (error) {
      console.error('Speech-to-speech processing error:', error);
    } finally {
      setIsSpeechToSpeechActive(false);
    }
  }, [isSpeechToSpeechActive, speak]);

  return {
    // STT
    isListening,
    transcript,
    recognitionError,
    startListening,
    stopListening,
    clearTranscript,
    
    // TTS
    isSpeaking,
    selectedVoice,
    setSelectedVoice,
    speak,
    stopSpeaking,
    
    // Speech-to-Speech
    startSpeechToSpeech,
    isSpeechToSpeechActive,
    
    // Voice management
    availableVoices: AZURE_VOICES,
    previewVoice,
  };
};

export default useAzureSpeech;
