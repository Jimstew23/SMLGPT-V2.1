// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 30000,
};

// backend/src/test/setup.ts
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Mock Redis
jest.mock('ioredis', () => require('ioredis-mock'));

// Mock Azure services
jest.mock('../services/azureServices', () => ({
  analyzeImageWithGPT4Vision: jest.fn().mockResolvedValue({
    content: 'Test analysis result',
  }),
  generateEmbeddings: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  analyzeDocument: jest.fn().mockResolvedValue({
    content: 'Test document content',
  }),
  uploadToBlob: jest.fn().mockResolvedValue('https://test-blob-url.com/file'),
  searchDocuments: jest.fn().mockResolvedValue({
    documents: [],
    count: 0,
  }),
}));

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// backend/src/__tests__/routes/chat.test.ts
import request from 'supertest';
import { app } from '../../server';
import { io } from '../../server';

describe('Chat Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/chat', () => {
    it('should process a chat message successfully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'What safety hazards do you see?',
          sessionId: 'test-session-123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toHaveProperty('content');
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          sessionId: 'test-session-123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});

// backend/src/__tests__/services/azureServices.test.ts
import { generateEmbeddings, uploadToBlob } from '../../services/azureServices';

describe('Azure Services', () => {
  describe('generateEmbeddings', () => {
    it('should generate embeddings for text', async () => {
      const text = 'Test safety analysis';
      const embeddings = await generateEmbeddings(text);
      
      expect(embeddings).toBeInstanceOf(Array);
      expect(embeddings).toHaveLength(3);
      expect(embeddings[0]).toBe(0.1);
    });
  });

  describe('uploadToBlob', () => {
    it('should upload file to blob storage', async () => {
      const fileName = 'test.jpg';
      const buffer = Buffer.from('test data');
      const contentType = 'image/jpeg';
      
      const url = await uploadToBlob(fileName, buffer, contentType);
      
      expect(url).toBe('https://test-blob-url.com/file');
    });
  });
});

// frontend/vite.config.ts (updated with test config)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});

// frontend/src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// frontend/src/__tests__/components/ChatInterface.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChatInterface from '../../components/ChatInterface';
import { Message } from '../../types';

describe('ChatInterface', () => {
  it('renders welcome state when no messages', () => {
    render(<ChatInterface messages={[]} isLoading={false} />);
    
    expect(screen.getByText('Welcome to SMLGPT V2.0')).toBeInTheDocument();
    expect(screen.getByText(/Upload images, documents/)).toBeInTheDocument();
  });

  it('renders messages when provided', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Test response',
        timestamp: new Date().toISOString(),
      },
    ];

    render(<ChatInterface messages={messages} isLoading={false} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('Test response')).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    const messages: Message[] = [];
    render(<ChatInterface messages={messages} isLoading={true} />);
    
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});