// frontend/src/components/FileUpload.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, FileText, Film } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  uploadProgress?: { [key: string]: number };
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, uploadProgress = {} }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
      'audio/*': ['.mp3', '.wav', '.m4a']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage size={20} />;
    if (fileType.startsWith('video/')) return <Film size={20} />;
    return <FileText size={20} />;
  };

  return (
    <div className="file-upload-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload size={24} />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <p>Upload files</p>
        )}
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="upload-progress-list">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="upload-progress-item">
              <span className="file-name">{fileName}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

// frontend/src/components/StatusBar.tsx
import React from 'react';
import { ServiceStatus } from '../types';

interface StatusBarProps {
  status: ServiceStatus;
}

const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  return (
    <div className="status-bar">
      <div className="status-indicator">
        <div className={`status-dot ${status.backend ? 'connected' : ''}`} />
        <span>Backend</span>
      </div>
      <div className="status-indicator">
        <div className={`status-dot ${status.vision ? 'connected' : ''}`} />
        <span>Vision AI</span>
      </div>
      <div className="status-indicator">
        <div className={`status-dot ${status.speech ? 'connected' : ''}`} />
        <span>Speech</span>
      </div>
      <div className="status-indicator">
        <div className={`status-dot ${status.documents ? 'connected' : ''}`} />
        <span>Documents</span>
      </div>
    </div>
  );
};

export default StatusBar;

// frontend/src/components/VoiceSelector.tsx
import React from 'react';
import { Volume2 } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

const voices = [
  { id: 'en-US-JennyNeural', name: 'Jenny (US)' },
  { id: 'en-US-GuyNeural', name: 'Guy (US)' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (UK)' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (UK)' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (AU)' },
  { id: 'en-AU-WilliamNeural', name: 'William (AU)' }
];

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onVoiceChange }) => {
  return (
    <div className="voice-selector">
      <Volume2 size={20} />
      <select 
        value={selectedVoice} 
        onChange={(e) => onVoiceChange(e.target.value)}
        className="voice-select"
      >
        {voices.map(voice => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VoiceSelector;

// frontend/src/components/DocumentSelector.tsx
import React from 'react';
import { FileText } from 'lucide-react';
import { UploadedFile } from '../types';

interface DocumentSelectorProps {
  documents: UploadedFile[];
  selectedDocuments: string[];
  onSelectionChange: (selected: string[]) => void;
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({ 
  documents, 
  selectedDocuments, 
  onSelectionChange 
}) => {
  if (documents.length === 0) return null;

  return (
    <div className="document-selector">
      <FileText size={20} />
      <select
        multiple
        value={selectedDocuments}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions, option => option.value);
          onSelectionChange(selected);
        }}
        className="document-select"
      >
        {documents.map(doc => (
          <option key={doc.id} value={doc.id}>
            {doc.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DocumentSelector;