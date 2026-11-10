/**
 * EF AI Audio Assistant Service – Simple Microphone Listening Mode
 * 
 * Captures audio directly from the computer's microphone to listen to EF English
 * lessons playing through nearby speakers. Provides continuous live speech-to-text
 * transcription and native client-side AI voice playback (SpeechSynthesis).
 * 
 * 100% Free & Spark-compatible: Zero paid subscriptions, zero API keys, zero billing.
 */

import { MicAudioLevelInfo, VoiceSettings, BrowserPermissionState, MicDiagnosticDetails } from '../types/efAudio';

export interface MicAudioMonitorSession {
  stream: MediaStream;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  stop: () => void;
}

export interface SpeechRecognitionSession {
  stop: () => void;
  isRunning: () => boolean;
}

export interface SpeechRecognitionErrorDetails {
  name: string;
  message: string;
  rawError: string;
  isFatal: boolean;
}

// Capability & Environment checks
export const isSecureContextActive = (): boolean => {
  return typeof window !== 'undefined' && !!window.isSecureContext;
};

export const isInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const isMicrophoneSupported = (): boolean => {
  return typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
};

export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export const isSpeechSynthesisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

/**
 * Inspect browser microphone permission state via the Permissions API
 */
export const getMicrophonePermissionState = async (): Promise<BrowserPermissionState> => {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return 'unsupported';
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state as BrowserPermissionState;
  } catch {
    return 'unsupported';
  }
};

/**
 * Gather full environment diagnostics for microphone and speech APIs
 */
export const getEnvironmentDiagnostics = async (): Promise<MicDiagnosticDetails> => {
  const perm = await getMicrophonePermissionState();
  const secure = isSecureContextActive();
  const iframe = isInIframe();
  const mediaDevs = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const gum = isMicrophoneSupported();
  const sr = isSpeechRecognitionSupported();

  return {
    permissionState: perm,
    isSecureContext: secure,
    isInIframe: iframe,
    hasMediaDevices: mediaDevs,
    hasGetUserMedia: gum,
    hasSpeechRecognition: sr
  };
};

/**
 * Request microphone stream directly from user click.
 * Never masks or swallows browser error details.
 */
export const requestMicrophoneStream = async (): Promise<MediaStream> => {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    const secErr = new Error('Microphone access requires a secure context (HTTPS or localhost).');
    secErr.name = 'SecurityError';
    throw secErr;
  }

  if (!isMicrophoneSupported()) {
    const suppErr = new Error('navigator.mediaDevices.getUserMedia is not supported in this browser.');
    suppErr.name = 'NotSupportedError';
    throw suppErr;
  }

  // Request standard audio input with clean constraints
  return await navigator.mediaDevices.getUserMedia({ audio: true });
};

/**
 * Start listening to an existing microphone stream for real-time volume / audio level feedback.
 */
export const startMicrophoneAudioMonitor = (
  stream: MediaStream,
  onLevel: (info: MicAudioLevelInfo) => void
): MicAudioMonitorSession => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass();
  const sourceNode = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.6;
  sourceNode.connect(analyser);

  let animationFrameId: number | null = null;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const monitorLoop = () => {
    if (audioContext.state === 'closed') return;
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    // Map average (0-128) to 0-100 percentage
    const normalizedLevel = Math.min(100, Math.round((average / 110) * 100));
    const isDetected = normalizedLevel > 3;

    onLevel({
      volumeLevel: normalizedLevel,
      isSoundDetected: isDetected,
      peakDb: isDetected ? Math.round(-60 + (normalizedLevel * 0.6)) : -80
    });

    animationFrameId = requestAnimationFrame(monitorLoop);
  };

  monitorLoop();

  const stop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    try {
      sourceNode.disconnect();
      analyser.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    } catch {}
    // Stop all audio tracks
    stream.getTracks().forEach((track) => track.stop());
  };

  return {
    stream,
    audioContext,
    analyser,
    stop
  };
};

/**
 * Start continuous Speech Recognition via Web Speech API
 * Directly listens to English audio received by the microphone.
 */
export const startMicrophoneSpeechRecognition = (callbacks: {
  onInterimText: (partial: string) => void;
  onFinalSentence: (sentence: string, confidence?: number) => void;
  onError?: (details: SpeechRecognitionErrorDetails) => void;
  onListeningStateChange?: (isListening: boolean) => void;
}): SpeechRecognitionSession => {
  if (!isSpeechRecognitionSupported()) {
    const err = 'Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.';
    callbacks.onError?.({
      name: 'NotSupportedError',
      message: err,
      rawError: 'unsupported_browser',
      isFatal: true
    });
    throw new Error(err);
  }

  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  let recognition: any = null;
  let isManualStopped = false;
  let activeRunning = false;

  const initRecognition = () => {
    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        activeRunning = true;
        callbacks.onListeningStateChange?.(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        let confidence: number | undefined;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result.isFinal) {
            final += transcript;
            confidence = result[0].confidence;
          } else {
            interim += transcript;
          }
        }

        if (interim.trim()) {
          callbacks.onInterimText(interim.trim());
        }

        if (final.trim()) {
          callbacks.onFinalSentence(final.trim(), confidence);
        }
      };

      recognition.onerror = (event: any) => {
        const errorType = event.error || 'unknown_error';
        const rawMessage = event.message || '';

        if (errorType === 'no-speech') {
          // Normal pause in speaking, keep listening
          return;
        }

        if (errorType === 'not-allowed') {
          isManualStopped = true;
          activeRunning = false;
          callbacks.onListeningStateChange?.(false);
          callbacks.onError?.({
            name: 'NotAllowedError',
            message: rawMessage || 'Speech recognition reported "not-allowed". In Chromium browsers, this occurs if microphone permission is blocked by permissions policy (such as in an embedded iframe) or if site permission was blocked.',
            rawError: errorType,
            isFatal: true
          });
          return;
        }

        if (errorType === 'audio-capture') {
          isManualStopped = true;
          activeRunning = false;
          callbacks.onListeningStateChange?.(false);
          callbacks.onError?.({
            name: 'AudioCaptureError',
            message: 'No microphone was found or the microphone device is currently in use by another application.',
            rawError: errorType,
            isFatal: true
          });
          return;
        }

        if (errorType === 'network') {
          callbacks.onError?.({
            name: 'NetworkError',
            message: 'Browser speech recognition requires an active internet connection to transcribe audio.',
            rawError: errorType,
            isFatal: false
          });
          return;
        }

        callbacks.onError?.({
          name: `SpeechRecognition_${errorType}`,
          message: rawMessage || `Speech recognition event: ${errorType}`,
          rawError: errorType,
          isFatal: false
        });
      };

      recognition.onend = () => {
        activeRunning = false;
        if (!isManualStopped) {
          // Auto restart to maintain continuous listening without interruption
          try {
            recognition.start();
          } catch {
            setTimeout(() => {
              if (!isManualStopped) {
                try {
                  recognition.start();
                } catch {
                  callbacks.onListeningStateChange?.(false);
                }
              }
            }, 300);
          }
        } else {
          callbacks.onListeningStateChange?.(false);
        }
      };

      recognition.start();
    } catch (err: any) {
      activeRunning = false;
      callbacks.onListeningStateChange?.(false);
      callbacks.onError?.({
        name: err.name || 'SpeechRecognitionStartError',
        message: err.message || 'Failed to start speech recognition',
        rawError: err.message || '',
        isFatal: true
      });
      throw err;
    }
  };

  initRecognition();

  const stop = () => {
    isManualStopped = true;
    activeRunning = false;
    callbacks.onListeningStateChange?.(false);
    if (recognition) {
      try {
        recognition.stop();
      } catch {}
      try {
        recognition.abort();
      } catch {}
    }
  };

  return {
    stop,
    isRunning: () => activeRunning
  };
};

/**
 * Text-to-Speech (AI Voice Playback Engine)
 */
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };

    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 400);
  });
};

export const speakSentence = async (
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceURI?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<void> => {
  if (!isSpeechSynthesisSupported()) {
    throw new Error('Speech Synthesis is not supported in this browser.');
  }

  if (!text || !text.trim()) {
    return;
  }

  // Cancel any currently playing speech before starting new sentence
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = 'en-US';
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;
  utterance.volume = options?.volume !== undefined ? options.volume : 1.0;

  const voices = await getAvailableVoices();
  if (options?.voiceURI) {
    const selectedVoice = voices.find((v) => v.voiceURI === options.voiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  } else {
    // Pick natural sounding English voice by default
    const naturalVoice = voices.find(
      (v) =>
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Jenny') ||
          v.name.includes('Guy') ||
          v.name.includes('David')) &&
        v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
  }

  utterance.onstart = () => {
    options?.onStart?.();
  };

  utterance.onend = () => {
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      options?.onError?.(e);
    } else {
      options?.onEnd?.();
    }
  };

  window.speechSynthesis.speak(utterance);
};

export const pauseSpeaking = (): void => {
  if (isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
};

export const resumeSpeaking = (): void => {
  if (isSpeechSynthesisSupported() && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};

export const stopSpeaking = (): void => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
};

export const isSpeaking = (): boolean => {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
};

export const isSpeechPaused = (): boolean => {
  return isSpeechSynthesisSupported() && window.speechSynthesis.paused;
};
