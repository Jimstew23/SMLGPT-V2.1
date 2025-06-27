// shared/types/index.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  hazards?: Hazard[];
  compliance?: ComplianceStatus;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  analysisType?: 'image' | 'document' | 'video';
}

export interface Hazard {
  id: string;
  type: HazardType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  recommendation?: string;
  regulation?: string;
  imageCoordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type HazardType = 
  | 'fall_hazard'
  | 'electrical'
  | 'chemical'
  | 'mechanical'
  | 'ergonomic'
  | 'fire'
  | 'confined_space'
  | 'ppe_violation'
  | 'housekeeping'
  | 'other';

export interface ComplianceStatus {
  status: 'compliant' | 'non_compliant' | 'partially_compliant';
  violations?: string[];
  recommendations?: string[];
  references?: ComplianceReference[];
}

export interface ComplianceReference {
  standard: string;
  section: string;
  description: string;
  url?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';
  analysis?: any;
  uploadedAt: string;
  processedAt?: string;
}

export interface ServiceStatus {
  backend: boolean;
  vision: boolean;
  speech: boolean;
  documents: boolean;
}

export interface AnalysisResult {
  id: string;
  fileId: string;
  fileName: string;
  fileType: string;
  timestamp: string;
  gptVision?: {
    content: string;
    hazards: Hazard[];
    compliance: ComplianceStatus;
    confidence: number;
  };
  computerVision?: {
    objects: DetectedObject[];
    text: string[];
    tags: Tag[];
    description: string;
  };
  documentIntelligence?: {
    content: string;
    tables: Table[];
    keyValuePairs: KeyValuePair[];
    entities: Entity[];
  };
  embeddings?: number[];
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Tag {
  name: string;
  confidence: number;
}

export interface Table {
  rowCount: number;
  columnCount: number;
  cells: TableCell[];
}

export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  text: string;
  isHeader: boolean;
}

export interface KeyValuePair {
  key: string;
  value: string;
  confidence: number;
}

export interface Entity {
  text: string;
  category: string;
  subCategory?: string;
  confidence: number;
}

export interface JobStatus {
  id: string;
  name: string;
  data: any;
  progress: number;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  failedReason?: string;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: any;
  highlights?: string[];
}

export interface SafetyReport {
  id: string;
  projectName: string;
  siteName: string;
  inspectionDate: string;
  inspector: string;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  hazardSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  hazards: Hazard[];
  complianceStatus: ComplianceStatus;
  recommendations: string[];
  images: AnalysisResult[];
  documents: AnalysisResult[];
  generatedAt: string;
}

// frontend/src/types/index.ts
export * from '../../shared/types';

// Additional frontend-specific types
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface UploadState {
  files: UploadedFile[];
  uploadProgress: { [key: string]: number };
  isUploading: boolean;
  error: string | null;
}

export interface AppSettings {
  autoSpeak: boolean;
  selectedVoice: string;
  theme: 'light' | 'dark';
  notifications: {
    critical: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
  };
}