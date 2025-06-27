import React from 'react';
import { Upload, Clock, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';

interface FileStatusIndicatorProps {
  fileId: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

const FileStatusIndicator: React.FC<FileStatusIndicatorProps> = ({
  fileId,
  fileName,
  status,
  progress = 0,
  error,
  onRetry,
  className = ''
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'processing':
        return 'Processing file...';
      case 'completed':
        return 'Analysis complete';
      case 'error':
        return error || 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      case 'processing':
        return 'border-yellow-200 bg-yellow-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div 
      className={`
        inline-flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm
        ${getStatusColor()} ${className}
      `}
      data-file-id={fileId}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate" title={fileName}>
          {fileName}
        </div>
        <div className="text-xs text-gray-600">
          {getStatusText()}
        </div>
      </div>

      {/* Progress Bar for Upload */}
      {status === 'uploading' && (
        <div className="w-16">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing Animation */}
      {status === 'processing' && (
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse"></div>
          <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )}

      {/* Retry Button for Errors */}
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
          title="Retry processing"
        >
          Retry
        </button>
      )}

      {/* Success Checkmark Animation */}
      {status === 'completed' && (
        <div className="text-green-500">
          <CheckCircle className="w-4 h-4 animate-bounce" style={{ animationDuration: '1s', animationIterationCount: '3' }} />
        </div>
      )}
    </div>
  );
};

export default FileStatusIndicator;
