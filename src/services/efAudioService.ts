/**
 * EF AI Audio Assistant Service – Simple Microphone Listening Mode
 * 
 * Captures audio directly from the computer's microphone to listen to EF English
 * lessons playing through nearby speakers. Provides continuous live speech-to-text
 * transcription, real-time frequency analysis visualizer, multi-stage fallback
 * device selection, and native client-side AI voice playback (SpeechSynthesis).
 * 
 * 100% Free & Spark-compatible: Zero paid subscriptions, zero API keys, zero billing.
 */

import {
  MicAudioLevelInfo,
  VoiceSettings,
  BrowserPermissionState,
  MicDiagnosticDetails,
  DiscoveredAudioDevice
} from '../types/efAudio';

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

export interface MicStreamResult {
  stream: MediaStream;
  deviceUsed: string;
  methodUsed: string;
  sampleRate?: number;
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
 * Enumerate all available audio input devices (microphones)
 */
export const getAudioInputDevices = async (): Promise<DiscoveredAudioDevice[]> => {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.enumerateDevices !== 'function'
  ) {
    return [];
  }

  try {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');

    return audioInputs.map((d, index) => {
      let friendlyLabel = d.label;
      if (!friendlyLabel) {
        if (d.deviceId === 'default') {
          friendlyLabel = 'System Default Microphone';
        } else if (d.deviceId === 'communications') {
          friendlyLabel = 'Communications Microphone';
        } else {
          friendlyLabel = `Microphone ${index + 1} (${d.deviceId ? d.deviceId.slice(0, 8) + '...' : 'Unknown'})`;
        }
      }

      return {
        deviceId: d.deviceId,
        label: friendlyLabel,
        groupId: d.groupId || '',
        isDefault: d.deviceId === 'default' || index === 0
      };
    });
  } catch (err) {
    console.warn('[EF Assistant] enumerateDevices warning:', err);
    return [];
  }
};

/**
 * Gather full environment diagnostics for microphone and speech APIs
 */
export const getEnvironmentDiagnostics = async (selectedId?: string): Promise<MicDiagnosticDetails> => {
  const perm = await getMicrophonePermissionState();
  const secure = isSecureContextActive();
  const iframe = isInIframe();
  const mediaDevs = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const gum = isMicrophoneSupported();
  const sr = isSpeechRecognitionSupported();
  const devices = await getAudioInputDevices();

  return {
    permissionState: perm,
    isSecureContext: secure,
    isInIframe: iframe,
    hasMediaDevices: mediaDevs,
    hasGetUserMedia: gum,
    hasSpeechRecognition: sr,
    devices: devices,
    audioInputCount: devices.length,
    selectedDeviceId: selectedId || 'default'
  };
};

/**
 * Request real microphone MediaStream directly from user click with multi-tier fallback.
 * Uses navigator.mediaDevices.getUserMedia({ audio: true }) as the primary standard.
 */
export const requestMicrophoneStream = async (preferredDeviceId?: string): Promise<MicStreamResult> => {
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

  const inIframe = isInIframe();

  // Helper: Detect permission denial or permissions policy restriction
  const isPermissionDeniedError = (err: any): boolean => {
    return (
      err?.name === 'NotAllowedError' ||
      err?.name === 'PermissionDeniedError' ||
      err?.name === 'SecurityError' ||
      (typeof err?.message === 'string' &&
        (err.message.toLowerCase().includes('permissions policy') ||
          err.message.toLowerCase().includes('permission denied') ||
          err.message.toLowerCase().includes('permission dismissed')))
    );
  };

  const throwPermissionError = (err: any): never => {
    const msg = inIframe
      ? 'Microphone access is blocked by the browser preview frame permissions policy. Click "Open in New Tab" to use your microphone in a standalone window.'
      : 'Microphone permission was denied. Please allow microphone access in your browser settings (click the lock or camera icon in the URL bar) and retry.';
    const deniedErr: any = new Error(msg);
    deniedErr.name = 'NotAllowedError';
    deniedErr.isIframeBlocked = inIframe;
    deniedErr.rawMessage = err?.message || '';
    throw deniedErr;
  };

  // Stage 1: If user explicitly picked a specific device, try that first
  if (preferredDeviceId && preferredDeviceId !== 'default') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: preferredDeviceId } }
      });
      const track = stream.getAudioTracks()[0];
      return {
        stream,
        deviceUsed: track?.label || preferredDeviceId,
        methodUsed: 'selected_exact_device',
        sampleRate: track?.getSettings?.()?.sampleRate
      };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        throwPermissionError(err);
      }

      // Try with ideal deviceId
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: preferredDeviceId }
        });
        const track = stream.getAudioTracks()[0];
        return {
          stream,
          deviceUsed: track?.label || preferredDeviceId,
          methodUsed: 'selected_ideal_device',
          sampleRate: track?.getSettings?.()?.sampleRate
        };
      } catch (err2: any) {
        if (isPermissionDeniedError(err2)) {
          throwPermissionError(err2);
        }
      }
    }
  }

  // Stage 2: Standard getUserMedia({ audio: true })
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const activeTrack = stream.getAudioTracks()[0];
    return {
      stream,
      deviceUsed: activeTrack?.label || 'Default Microphone',
      methodUsed: 'standard_audio_true',
      sampleRate: activeTrack?.getSettings?.()?.sampleRate
    };
  } catch (err: any) {
    if (isPermissionDeniedError(err)) {
      throwPermissionError(err);
    }
  }

  // Stage 3: If standard failed due to device routing issue (e.g. Windows default disconnected),
  // probe enumerated physical devices
  try {
    const availableDevices = await getAudioInputDevices();
    const candidateDevices = availableDevices.filter(
      (d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications'
    );

    for (const candidate of candidateDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: candidate.deviceId } }
        });
        const activeTrack = stream.getAudioTracks()[0];
        return {
          stream,
          deviceUsed: activeTrack?.label || candidate.label || candidate.deviceId,
          methodUsed: `fallback_enumerated_device(${candidate.deviceId.slice(0, 8)})`,
          sampleRate: activeTrack?.getSettings?.()?.sampleRate
        };
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          throwPermissionError(err);
        }
      }
    }
  } catch (enumErr: any) {
    if (isPermissionDeniedError(enumErr)) {
      throwPermissionError(enumErr);
    }
  }

  // Stage 4: Try with relaxed audio constraint object
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true
      }
    });
    const activeTrack = stream.getAudioTracks()[0];
    return {
      stream,
      deviceUsed: activeTrack?.label || 'Basic Microphone Input',
      methodUsed: 'relaxed_audio_constraints',
      sampleRate: activeTrack?.getSettings?.()?.sampleRate
    };
  } catch (err: any) {
    if (isPermissionDeniedError(err)) {
      throwPermissionError(err);
    }
  }

  // If all attempts failed with device routing errors
  const notFoundErr: any = new Error(
    'No audio input device found. Please verify that your microphone is plugged in, enabled in Windows sound settings, and unmuted.'
  );
  notFoundErr.name = 'NotFoundError';
  throw notFoundErr;
};

/**
 * Start listening to an existing microphone stream for real-time volume / audio level feedback.
 * Provides normalized overall level, dB calculation, and 8 animated frequency bands.
 */
export const startMicrophoneAudioMonitor = (
  stream: MediaStream,
  onLevel: (info: MicAudioLevelInfo) => void,
  onTrackInterrupted?: (reason: string) => void
): MicAudioMonitorSession => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass();

  // Resume AudioContext if browser created it in suspended state
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  const sourceNode = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64; // Gives 32 frequency bins, ideal for fast 8-band visualizer
  analyser.smoothingTimeConstant = 0.5;
  sourceNode.connect(analyser);

  let animationFrameId: number | null = null;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  // Monitor hardware track state changes (e.g. mute switch or unplug)
  const tracks = stream.getAudioTracks();
  if (tracks.length > 0) {
    const track = tracks[0];
    track.onended = () => {
      onTrackInterrupted?.('Microphone track was stopped or disconnected.');
    };
    track.onmute = () => {
      onTrackInterrupted?.('Microphone was muted by the operating system.');
    };
    track.onunmute = () => {
      // Hardware unmuted
    };
  }

  const monitorLoop = () => {
    if (audioContext.state === 'closed') return;
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    const bandSize = Math.max(1, Math.floor(dataArray.length / 8));
    const frequencyBands: number[] = [];

    for (let i = 0; i < 8; i++) {
      let bandSum = 0;
      const start = i * bandSize;
      const end = Math.min(dataArray.length, start + bandSize);
      for (let j = start; j < end; j++) {
        bandSum += dataArray[j];
      }
      const bandAvg = bandSum / (end - start || 1);
      frequencyBands.push(Math.min(100, Math.round((bandAvg / 128) * 100)));
    }

    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    // Map average (0-128) to 0-100 percentage
    const normalizedLevel = Math.min(100, Math.round((average / 110) * 100));
    const isDetected = normalizedLevel > 2;

    onLevel({
      volumeLevel: normalizedLevel,
      isSoundDetected: isDetected,
      peakDb: isDetected ? Math.round(-60 + (normalizedLevel * 0.6)) : -80,
      frequencyData: frequencyBands
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
 * Automatically manages continuous recognition, session recycling on pauses,
 * and reliable interim-to-final sentence processing.
 */
export const startMicrophoneSpeechRecognition = (callbacks: {
  onInterimText: (partial: string) => void;
  onFinalSentence: (sentence: string, confidence?: number) => void;
  onError?: (details: SpeechRecognitionErrorDetails) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  onSpeechEvent?: (eventName: string) => void;
}): SpeechRecognitionSession => {
  if (!isSpeechRecognitionSupported()) {
    const err = 'Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.';
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
  let restartTimeoutId: any = null;

  const createAndStartRecognitionInstance = () => {
    if (isManualStopped) return;

    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        activeRunning = true;
        callbacks.onListeningStateChange?.(true);
        callbacks.onSpeechEvent?.('Recognition Started (Listening)');
      };

      recognition.onaudiostart = () => {
        callbacks.onSpeechEvent?.('Microphone Audio Capturing');
      };

      recognition.onsoundstart = () => {
        callbacks.onSpeechEvent?.('Audio Sound Detected');
      };

      recognition.onspeechstart = () => {
        callbacks.onSpeechEvent?.('Speech Active');
      };

      recognition.onspeechend = () => {
        callbacks.onSpeechEvent?.('Speech Concluded (Processing)');
      };

      recognition.onresult = (event: any) => {
        callbacks.onSpeechEvent?.('Speech Results Received');

        let interim = '';
        let final = '';
        let highestConfidence: number | undefined;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (!res || !res[0]) continue;

          const transcript = res[0].transcript || '';
          if (res.isFinal) {
            final += transcript;
            if (typeof res[0].confidence === 'number' && res[0].confidence > 0) {
              highestConfidence = res[0].confidence;
            }
          } else {
            interim += transcript;
          }
        }

        if (interim.trim()) {
          callbacks.onInterimText(interim.trim());
        }

        if (final.trim()) {
          callbacks.onFinalSentence(final.trim(), highestConfidence);
        }
      };

      recognition.onerror = (event: any) => {
        const errorType = event.error || 'unknown_error';
        const rawMessage = event.message || '';

        callbacks.onSpeechEvent?.(`Notice: ${errorType}`);

        if (errorType === 'no-speech') {
          // Normal pause in speaking, ignore and keep listening
          return;
        }

        if (errorType === 'not-allowed') {
          isManualStopped = true;
          activeRunning = false;
          callbacks.onListeningStateChange?.(false);
          callbacks.onError?.({
            name: 'NotAllowedError',
            message:
              rawMessage ||
              'Speech recognition reported "not-allowed". In Chromium browsers, this occurs if microphone permission is blocked by permissions policy (such as in an embedded iframe) or if site permission was blocked.',
            rawError: errorType,
            isFatal: true
          });
          return;
        }

        if (errorType === 'audio-capture') {
          // Non-fatal transient lock: wait 600ms and re-attempt
          callbacks.onSpeechEvent?.('Audio capture busy, cycling recognition...');
          return;
        }

        if (errorType === 'network') {
          callbacks.onError?.({
            name: 'NetworkError',
            message: 'Browser speech recognition requires an active internet connection to transcribe audio in real time.',
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
        callbacks.onSpeechEvent?.('Recognition Session Cycled');

        // Automatic seamless restart if user has not clicked Stop Listening
        if (!isManualStopped) {
          if (restartTimeoutId) clearTimeout(restartTimeoutId);
          restartTimeoutId = setTimeout(() => {
            if (!isManualStopped) {
              createAndStartRecognitionInstance();
            }
          }, 350);
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
    }
  };

  createAndStartRecognitionInstance();

  const stop = () => {
    isManualStopped = true;
    activeRunning = false;
    if (restartTimeoutId) {
      clearTimeout(restartTimeoutId);
      restartTimeoutId = null;
    }
    callbacks.onListeningStateChange?.(false);
    callbacks.onSpeechEvent?.('Recognition Stopped');

    if (recognition) {
      try {
        recognition.stop();
      } catch {}
      try {
        recognition.abort();
      } catch {}
      recognition = null;
    }
  };

  return {
    stop,
    isRunning: () => activeRunning
  };
};

/**
 * Test real microphone audio input without simulation.
 * Verifies that the MediaStream has active audio tracks and detects actual volume.
 */
export const testRealMicrophoneInput = async (
  stream: MediaStream,
  durationMs: number = 800
): Promise<{
  hasInputSignal: boolean;
  peakLevel: number;
  trackLabel: string;
  trackReadyState: string;
  isMuted: boolean;
}> => {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    return {
      hasInputSignal: false,
      peakLevel: 0,
      trackLabel: 'None',
      trackReadyState: 'ended',
      isMuted: true
    };
  }

  const track = audioTracks[0];
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }

  const sourceNode = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  sourceNode.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let maxVolume = 0;

  const startTime = Date.now();
  await new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(100, Math.round((avg / 110) * 100));
      if (normalized > maxVolume) {
        maxVolume = normalized;
      }

      if (Date.now() - startTime >= durationMs) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 40);
  });

  try {
    sourceNode.disconnect();
    analyser.disconnect();
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  } catch {}

  return {
    hasInputSignal: maxVolume > 2,
    peakLevel: maxVolume,
    trackLabel: track.label || 'Audio Input',
    trackReadyState: track.readyState,
    isMuted: track.muted
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
