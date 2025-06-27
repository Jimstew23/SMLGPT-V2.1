// frontend/src/types/index.ts

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'file' | 'error' | 'system';
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  processingStatus?: 'uploading' | 'processing' | 'completed' | 'error';
  hazardLevel?: 'low' | 'medium' | 'high' | 'critical';
  stopWorkRequired?: boolean;
}

export interface FileStatus {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  url?: string;
  thumbnailUrl?: string;
  analysisResult?: any;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  dismissed?: boolean;
  autoHide?: boolean;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ChatResponse {
  response: string;
  session_id: string;
  timestamp: string;
  search_results?: any[];
  hazard_analysis?: HazardAnalysis;
  stop_work_required?: boolean;
}

export interface HazardAnalysis {
  hazards: Hazard[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  controls_required: string[];
  stop_work_conditions?: string[];
}

export interface Hazard {
  type: string;
  description: string;
  severity: number;
  probability: number;
  risk_score: number;
  controls: string[];
}

export interface VoiceOption {
  id: string;
  name: string;
  displayName: string;
  language: string;
  gender: 'Male' | 'Female';
  style?: string;
  description?: string;
}

export interface SpeechState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  isProcessing: boolean;
}

export interface DocumentReference {
  id: string;
  name: string;
  type: string;
  uploadDate: Date;
  size: number;
  status: 'processed' | 'processing' | 'error';
}

export interface ApiError {
  message: string;
  code?: string | number;
  details?: any;
}
