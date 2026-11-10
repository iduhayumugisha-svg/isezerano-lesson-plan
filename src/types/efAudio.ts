/**
 * Types and interfaces for EF AI Audio Assistant
 * Simple Microphone Listening Mode
 * ISEZERANO ONLINE – GS GITUMBA
 */

export type ListeningStatus = 'idle' | 'listening' | 'paused' | 'error';
export type VoicePlaybackState = 'idle' | 'playing' | 'paused';
export type BrowserPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

export interface TranscribedSentence {
  id: string;
  text: string;
  timestamp: string;
  confidence?: number;
  isFinal: boolean;
  isEdited?: boolean;
}

export interface MicAudioLevelInfo {
  volumeLevel: number; // 0 to 100
  isSoundDetected: boolean;
  peakDb?: number;
}

export interface VoiceSettings {
  voiceURI: string;
  rate: number;   // 0.75 to 1.5 (default 1.0, slow 0.75)
  pitch: number;  // 0.8 to 1.2 (default 1.0)
  volume: number; // 0 to 1.0 (default 1.0)
}

export interface MicDiagnosticDetails {
  errorName?: string;
  errorMessage?: string;
  permissionState?: BrowserPermissionState;
  isSecureContext: boolean;
  isInIframe: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasSpeechRecognition: boolean;
  technicalDetails?: string;
}
