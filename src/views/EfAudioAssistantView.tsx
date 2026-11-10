import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  RotateCcw,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Edit3,
  Globe,
  Radio,
  Sliders,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Volume1,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  Laptop
} from 'lucide-react';
import {
  requestMicrophoneStream,
  startMicrophoneAudioMonitor,
  startMicrophoneSpeechRecognition,
  speakSentence,
  pauseSpeaking,
  resumeSpeaking,
  stopSpeaking,
  isSpeaking,
  isSpeechPaused,
  getAvailableVoices,
  isMicrophoneSupported,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  isSecureContextActive,
  isInIframe,
  getMicrophonePermissionState,
  getEnvironmentDiagnostics,
  MicAudioMonitorSession,
  SpeechRecognitionSession
} from '../services/efAudioService';
import {
  ListeningStatus,
  VoicePlaybackState,
  TranscribedSentence,
  MicAudioLevelInfo,
  BrowserPermissionState,
  MicDiagnosticDetails
} from '../types/efAudio';

interface EfAudioAssistantViewProps {
  initialCompact?: boolean;
  onNavigateHome?: () => void;
}

interface DetailedErrorState {
  title: string;
  name: string;
  message: string;
  isIframeRestriction: boolean;
  permissionState?: BrowserPermissionState;
  isSecureContext: boolean;
  technicalDetails?: string;
}

export const EfAudioAssistantView: React.FC<EfAudioAssistantViewProps> = ({
  initialCompact = false,
  onNavigateHome
}) => {
  // Mode: Full view vs Compact split-screen companion
  const [isCompact, setIsCompact] = useState<boolean>(initialCompact);

  // Microphone Audio & Speech Recognition states
  const [listeningStatus, setListeningStatus] = useState<ListeningStatus>('idle');
  const [micAudioInfo, setMicAudioInfo] = useState<MicAudioLevelInfo>({
    volumeLevel: 0,
    isSoundDetected: false,
    peakDb: -80
  });
  const [detailedError, setDetailedError] = useState<DetailedErrorState | null>(null);

  // Environment Diagnostics
  const [diagnostics, setDiagnostics] = useState<MicDiagnosticDetails>({
    isSecureContext: true,
    isInIframe: false,
    hasMediaDevices: true,
    hasGetUserMedia: true,
    hasSpeechRecognition: true,
    permissionState: 'prompt'
  });

  // Active Sessions
  const audioMonitorRef = useRef<MicAudioMonitorSession | null>(null);
  const recognitionRef = useRef<SpeechRecognitionSession | null>(null);

  // Live Transcriptions
  const [interimText, setInterimText] = useState<string>('');
  const [sentences, setSentences] = useState<TranscribedSentence[]>([]);
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [manualTranscriptInput, setManualTranscriptInput] = useState<string>('');
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasCopiedAll, setHasCopiedAll] = useState<boolean>(false);

  // AI Voice Playback state
  const [playbackState, setPlaybackState] = useState<VoicePlaybackState>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentlySpeakingWord, setCurrentlySpeakingWord] = useState<string | null>(null);
  const [activeSpeakingSentenceId, setActiveSpeakingSentenceId] = useState<string | null>(null);

  // Capability checks
  const hasRecognitionSupport = useMemo(() => isSpeechRecognitionSupported(), []);
  const inIframe = useMemo(() => isInIframe(), []);

  // Filter English voices
  const englishVoices = useMemo(() => {
    return voices.filter((v) => v.lang.startsWith('en'));
  }, [voices]);

  // Load diagnostics & available voices on mount
  useEffect(() => {
    getEnvironmentDiagnostics().then((diag) => {
      setDiagnostics(diag);
    });

    getAvailableVoices().then((loadedVoices) => {
      setVoices(loadedVoices);
      const defaultEn =
        loadedVoices.find(
          (v) =>
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Jenny') ||
              v.name.includes('Guy')) &&
            v.lang.startsWith('en')
        ) || loadedVoices.find((v) => v.lang.startsWith('en'));

      if (defaultEn) {
        setSelectedVoiceURI(defaultEn.voiceURI);
      }
    });
  }, []);

  // Sync manual transcript text when editing begins
  useEffect(() => {
    if (isEditingTranscript) {
      setManualTranscriptInput(sentences.map((s) => s.text).join('\n'));
    }
  }, [isEditingTranscript]);

  // Check URL query parameters for compact mode (?compact=true)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('compact') === 'true') {
        setIsCompact(true);
      }
    }
  }, []);

  // Cleanup active audio sessions on unmount
  useEffect(() => {
    return () => {
      stopAllListening();
      stopSpeaking();
    };
  }, []);

  /**
   * Stop both microphone monitor and speech recognition
   */
  const stopAllListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (audioMonitorRef.current) {
      try {
        audioMonitorRef.current.stop();
      } catch {}
      audioMonitorRef.current = null;
    }
    setListeningStatus('idle');
    setMicAudioInfo({
      volumeLevel: 0,
      isSoundDetected: false,
      peakDb: -80
    });
    setInterimText('');
  };

  /**
   * Start listening: requests microphone permission directly from user click
   */
  const handleStartListening = async () => {
    // 1. Immediately reset stale error states
    setDetailedError(null);

    // 2. Refresh permissions and diagnostics
    const currentDiag = await getEnvironmentDiagnostics();
    setDiagnostics(currentDiag);

    // 3. Check browser speech recognition support
    if (!hasRecognitionSupport) {
      setDetailedError({
        title: 'Speech Recognition Not Supported',
        name: 'BrowserUnsupported',
        message:
          'Speech Recognition is not supported by your current browser. Please open this page in Google Chrome or Microsoft Edge.',
        isIframeRestriction: false,
        isSecureContext: currentDiag.isSecureContext,
        permissionState: currentDiag.permissionState
      });
      setListeningStatus('error');
      return;
    }

    // 4. Check Secure Context
    if (!currentDiag.isSecureContext) {
      setDetailedError({
        title: 'Insecure Context (HTTPS Required)',
        name: 'SecurityError',
        message:
          'Browser microphone access strictly requires a secure context (HTTPS or localhost). Please access this site over HTTPS.',
        isIframeRestriction: currentDiag.isInIframe,
        isSecureContext: false,
        permissionState: currentDiag.permissionState
      });
      setListeningStatus('error');
      return;
    }

    setListeningStatus('listening');

    // 5. DIRECT MICROPHONE ACCESS (getUserMedia)
    // Synchronously request stream to ensure user-activation gesture is maintained
    let micStream: MediaStream | null = null;
    try {
      micStream = await requestMicrophoneStream();
    } catch (err: any) {
      const errName = err?.name || 'UnknownError';
      const errMsg = err?.message || String(err);
      const isIframeBlocked =
        currentDiag.isInIframe &&
        (errName === 'NotAllowedError' || errMsg.toLowerCase().includes('permissions policy'));

      console.error('[EF Assistant] Direct microphone access failed:', errName, errMsg);

      let helpfulTitle = 'Microphone Access Failed';
      let userGuidance = errMsg;

      if (isIframeBlocked) {
        helpfulTitle = 'Microphone Blocked by Preview Frame';
        userGuidance =
          'You are viewing this app inside an embedded preview iframe. Web browsers block microphone access inside iframes by default. Click "Open in Direct Tab / Window" below to run with full microphone permissions.';
      } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        helpfulTitle = 'Microphone Permission Required';
        userGuidance =
          'The browser did not grant microphone permission. If you already set permission to Allow, please check if another tab or site is overriding it, or click Retry below.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        helpfulTitle = 'No Microphone Detected';
        userGuidance =
          'The browser could not detect any audio input hardware. Please connect a microphone or headset and click Retry.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        helpfulTitle = 'Microphone Busy';
        userGuidance =
          'Your microphone is currently in exclusive use by another application or call (e.g. Zoom, Teams, or another browser tab). Please close other apps and click Retry.';
      }

      setDetailedError({
        title: helpfulTitle,
        name: errName,
        message: userGuidance,
        isIframeRestriction: isIframeBlocked,
        isSecureContext: currentDiag.isSecureContext,
        permissionState: currentDiag.permissionState,
        technicalDetails: `Raw Error: ${errName} - ${errMsg} | inIframe: ${currentDiag.isInIframe} | isSecureContext: ${currentDiag.isSecureContext}`
      });

      setListeningStatus('error');
      stopAllListening();
      return;
    }

    // 6. Connect Audio Level Visualizer (if stream acquired)
    if (micStream) {
      try {
        const monitorSession = startMicrophoneAudioMonitor(micStream, (info) => {
          setMicAudioInfo(info);
        });
        audioMonitorRef.current = monitorSession;
      } catch (vizErr: any) {
        console.warn('[EF Assistant] Visualizer AudioContext warning (non-fatal):', vizErr);
        // Do not abort speech recognition if only the visualizer audio context failed
      }
    }

    // 7. Start continuous Speech Recognition
    try {
      const recSession = startMicrophoneSpeechRecognition({
        onInterimText: (partial) => {
          setInterimText(partial);
        },
        onFinalSentence: (sentenceText, confidence) => {
          const cleaned = sentenceText.trim();
          if (!cleaned) return;

          // Clear interim words once finalized
          setInterimText('');

          // Deduplication: prevent duplicate sentence if identical to most recent entry
          setSentences((prev) => {
            if (prev.length > 0 && prev[prev.length - 1].text.toLowerCase() === cleaned.toLowerCase()) {
              return prev;
            }

            const newSentence: TranscribedSentence = {
              id: `sent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              text: cleaned,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              confidence: confidence,
              isFinal: true
            };

            return [...prev, newSentence];
          });
        },
        onError: (details) => {
          console.warn('[EF Assistant] Speech recognition event:', details);

          if (details.isFatal) {
            const isIframeBlocked =
              currentDiag.isInIframe &&
              (details.name === 'NotAllowedError' || details.rawError === 'not-allowed');

            setDetailedError({
              title: isIframeBlocked
                ? 'Speech Recognition Blocked by Preview Frame'
                : `Speech Recognition Notice (${details.name})`,
              name: details.name,
              message: isIframeBlocked
                ? 'Speech recognition was disallowed inside this preview frame. Please open in a direct browser tab.'
                : details.message,
              isIframeRestriction: isIframeBlocked,
              isSecureContext: currentDiag.isSecureContext,
              permissionState: currentDiag.permissionState,
              technicalDetails: `SpeechRecognition error: ${details.rawError} | ${details.message}`
            });

            setListeningStatus('error');
            stopAllListening();
          }
        },
        onListeningStateChange: (active) => {
          if (active) {
            setListeningStatus('listening');
          }
        }
      });

      recognitionRef.current = recSession;
    } catch (recErr: any) {
      console.error('[EF Assistant] Failed to launch speech recognition:', recErr);
      setDetailedError({
        title: 'Speech Recognition Launch Error',
        name: recErr.name || 'SpeechRecognitionError',
        message: recErr.message || 'Could not initialize browser speech recognition engine.',
        isIframeRestriction: currentDiag.isInIframe,
        isSecureContext: currentDiag.isSecureContext,
        permissionState: currentDiag.permissionState
      });
      setListeningStatus('error');
      stopAllListening();
    }
  };

  /**
   * Stop listening
   */
  const handleStopListening = () => {
    stopAllListening();
    setListeningStatus('idle');
    setInterimText('');
  };

  /**
   * AI Voice Playback - Play full transcript or selected sentence
   */
  const handlePlayVoice = (textToSpeak?: string, sentenceId?: string) => {
    const text =
      textToSpeak ||
      (selectedSentenceId
        ? sentences.find((s) => s.id === selectedSentenceId)?.text
        : sentences.map((s) => s.text).join('. '));

    if (!text || !text.trim()) {
      return;
    }

    if (playbackState === 'paused' && isSpeechPaused()) {
      resumeSpeaking();
      setPlaybackState('playing');
      return;
    }

    setPlaybackState('playing');
    setActiveSpeakingSentenceId(sentenceId || null);

    speakSentence(text, {
      rate: playbackSpeed,
      voiceURI: selectedVoiceURI,
      onStart: () => {
        setPlaybackState('playing');
      },
      onEnd: () => {
        setPlaybackState('idle');
        setActiveSpeakingSentenceId(null);
      },
      onError: (err) => {
        console.warn('[AI Voice] Speech synthesis error:', err);
        setPlaybackState('idle');
        setActiveSpeakingSentenceId(null);
      }
    });
  };

  /**
   * AI Voice Playback - Pause
   */
  const handlePauseVoice = () => {
    pauseSpeaking();
    setPlaybackState('paused');
  };

  /**
   * AI Voice Playback - Stop
   */
  const handleStopVoice = () => {
    stopSpeaking();
    setPlaybackState('idle');
    setActiveSpeakingSentenceId(null);
    setCurrentlySpeakingWord(null);
  };

  /**
   * AI Voice Playback - Repeat last sentence or selected sentence
   */
  const handleRepeatVoice = () => {
    stopSpeaking();
    if (selectedSentenceId) {
      const sentence = sentences.find((s) => s.id === selectedSentenceId);
      if (sentence) {
        handlePlayVoice(sentence.text, sentence.id);
        return;
      }
    }
    if (sentences.length > 0) {
      const lastSentence = sentences[sentences.length - 1];
      handlePlayVoice(lastSentence.text, lastSentence.id);
    }
  };

  /**
   * Pronounce a single clicked word for phonetic practice
   */
  const handlePronounceWord = (word: string) => {
    const cleaned = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
    if (!cleaned) return;

    setCurrentlySpeakingWord(cleaned);
    speakSentence(cleaned, {
      rate: Math.min(playbackSpeed, 0.9),
      voiceURI: selectedVoiceURI,
      onEnd: () => setCurrentlySpeakingWord(null),
      onError: () => setCurrentlySpeakingWord(null)
    });
  };

  /**
   * Save manual edits to transcript
   */
  const handleSaveManualTranscript = () => {
    const lines = manualTranscriptInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const updated: TranscribedSentence[] = lines.map((line, idx) => ({
      id: `edited_${Date.now()}_${idx}`,
      text: line,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFinal: true,
      isEdited: true
    }));

    setSentences(updated);
    setIsEditingTranscript(false);
  };

  /**
   * Copy entire transcript to clipboard
   */
  const handleCopyAll = () => {
    const fullText = sentences.map((s) => s.text).join('\n');
    if (!fullText) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        setHasCopiedAll(true);
        setTimeout(() => setHasCopiedAll(false), 2000);
      });
    }
  };

  /**
   * Copy single sentence
   */
  const handleCopySentence = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  /**
   * Delete single sentence
   */
  const handleDeleteSentence = (id: string) => {
    setSentences((prev) => prev.filter((s) => s.id !== id));
    if (selectedSentenceId === id) {
      setSelectedSentenceId(null);
    }
  };

  /**
   * Clear all transcript
   */
  const handleClearTranscript = () => {
    if (sentences.length === 0 && !interimText) return;
    if (window.confirm('Are you sure you want to clear the entire transcript?')) {
      setSentences([]);
      setInterimText('');
      setSelectedSentenceId(null);
      stopSpeaking();
    }
  };

  /**
   * Open app in a new top-level tab / window
   */
  const handleOpenInDirectWindow = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  return (
    <div
      className={`w-full transition-all ${
        isCompact
          ? 'p-3 bg-slate-950 text-white min-h-screen'
          : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'
      }`}
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                EF AI Audio Assistant
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Free
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Microphone Mode
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Listens via computer microphone as EF English audio plays through speakers or nearby devices.
            </p>
          </div>
        </div>

        {/* Top Actions: Split Mode, Pop-out, Home */}
        <div className="flex items-center space-x-2 shrink-0">
          {inIframe && (
            <button
              type="button"
              onClick={handleOpenInDirectWindow}
              className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition-all text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Open in a direct top-level browser tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCompact(!isCompact)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
            title={isCompact ? 'Expand to Full View' : 'Switch to Compact Companion'}
          >
            {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            <span className="hidden md:inline">{isCompact ? 'Full View' : 'Companion Mode'}</span>
          </button>

          {!isCompact && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open(
                    '/?page=ef-audio&compact=true',
                    'EFAudioAssistant',
                    'width=480,height=740,menubar=no,toolbar=no,location=no,status=no'
                  );
                }
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
              title="Open floating pop-out window to place next to EF English"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">Pop-out Window</span>
            </button>
          )}

          {onNavigateHome && !isCompact && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ahabanza (Home)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Embedded Preview Frame Notice (if in iframe) */}
      {inIframe && (
        <div className="mb-6 bg-slate-900 border border-teal-500/30 rounded-2xl p-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Laptop className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Browser Environment Notice:</span> You are viewing the app
              inside an embedded preview frame. If your browser blocks microphone capture inside iframes, click the button
              to open in a direct tab.
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenInDirectWindow}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-xs inline-flex items-center space-x-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Direct Window</span>
          </button>
        </div>
      )}

      {/* 3. Detailed Error Card with Exact Browser Diagnostic Details and Retry Button */}
      {detailedError && (
        <div className="mb-6 bg-rose-950/80 border border-rose-500/50 rounded-2xl p-5 text-rose-200 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start space-x-3.5 flex-1">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">{detailedError.title}</h3>
                  <p className="text-xs text-rose-200 mt-1 leading-relaxed">{detailedError.message}</p>
                </div>

                {/* Technical Diagnostic Details */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-500/20 text-[11px] font-mono space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Error Name:</span>
                    <span className="font-bold text-rose-300">{detailedError.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Browser Permissions API State:</span>
                    <span className="font-bold text-teal-300 uppercase">
                      {detailedError.permissionState || diagnostics.permissionState || 'unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Secure Context (HTTPS):</span>
                    <span className={detailedError.isSecureContext ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {detailedError.isSecureContext ? 'Yes (HTTPS)' : 'No (Insecure HTTP)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Embedded in Preview Frame:</span>
                    <span className={detailedError.isIframeRestriction ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                      {detailedError.isIframeRestriction ? 'Yes (iFrame)' : 'No (Direct Window)'}
                    </span>
                  </div>
                  {detailedError.technicalDetails && (
                    <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800 break-all">
                      {detailedError.technicalDetails}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons: Retry and Open in Direct Window */}
            <div className="flex sm:flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleStartListening}
                className="w-full px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>

              {detailedError.isIframeRestriction && (
                <button
                  type="button"
                  onClick={handleOpenInDirectWindow}
                  className="w-full px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDetailedError(null)}
                className="px-3 py-1.5 text-xs text-rose-300 hover:text-white underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PRIMARY LISTENING CONTROL CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl mb-6 relative overflow-hidden">
        {/* Ambient background glow when listening */}
        {listeningStatus === 'listening' && (
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Status Indicator & Live Volume Meter */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center space-x-3">
              {listeningStatus === 'listening' ? (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Listening to Microphone...</span>
                </div>
              ) : listeningStatus === 'error' ? (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Microphone Issue Detected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Ready to Listen</span>
                </div>
              )}

              {/* Sound detected indicator */}
              {listeningStatus === 'listening' && micAudioInfo.isSoundDetected && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1 animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Sound detected</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {listeningStatus === 'listening'
                ? 'Listening to EF English Audio'
                : 'Simple Microphone Listening'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
              {listeningStatus === 'listening'
                ? 'Speak or play your EF English lesson through nearby speakers. Recognized sentences appear automatically below.'
                : 'Click the button below to start. Microphone access is requested directly from your click.'}
            </p>

            {/* Live Audio Visualizer Bar */}
            {listeningStatus === 'listening' && (
              <div className="pt-2 space-y-1.5 max-w-md">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Microphone Input Level</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{micAudioInfo.volumeLevel}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      micAudioInfo.volumeLevel > 70
                        ? 'bg-amber-400'
                        : micAudioInfo.volumeLevel > 15
                        ? 'bg-emerald-400'
                        : 'bg-emerald-600/50'
                    }`}
                    style={{ width: `${Math.max(4, micAudioInfo.volumeLevel)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button (Start / Stop Listening) & Retry Button */}
          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            {listeningStatus !== 'listening' ? (
              <button
                type="button"
                onClick={handleStartListening}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/20 transition-all transform active:scale-95 inline-flex items-center justify-center space-x-2.5 cursor-pointer"
              >
                <Mic className="w-5 h-5 text-slate-950" />
                <span>START LISTENING</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopListening}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-rose-600/20 transition-all transform active:scale-95 inline-flex items-center justify-center space-x-2.5 cursor-pointer"
              >
                <Square className="w-5 h-5 fill-white text-white" />
                <span>STOP LISTENING</span>
              </button>
            )}

            {detailedError && listeningStatus !== 'listening' && (
              <button
                type="button"
                onClick={handleStartListening}
                className="px-4 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm inline-flex items-center space-x-1.5 cursor-pointer"
                title="Retry microphone initialization"
              >
                <RefreshCw className="w-4 h-4 text-teal-400" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Ongoing Interim Words Box (Speech in progress) */}
        {listeningStatus === 'listening' && (
          <div className="mt-5 pt-5 border-t border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Live Speech Detection
              </span>
            </div>
            <div className="bg-slate-950/90 rounded-2xl p-4 border border-emerald-500/30 text-white min-h-[58px] flex items-center">
              {interimText ? (
                <p className="text-sm sm:text-base font-serif italic text-emerald-200">
                  “{interimText}”<span className="inline-block w-1.5 h-4 ml-1 bg-emerald-400 animate-pulse" />
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Waiting for speech... Speak or play English audio into your microphone.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. AI VOICE CONTROLS TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Playback action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center space-x-1">
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span>AI Voice:</span>
            </span>

            {/* Play Button */}
            <button
              type="button"
              disabled={sentences.length === 0}
              onClick={() => handlePlayVoice()}
              className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center space-x-1.5 transition-all cursor-pointer ${
                playbackState === 'playing'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title="Read recognized text aloud"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{playbackState === 'playing' ? 'Playing...' : 'Play Voice'}</span>
            </button>

            {/* Pause Button */}
            <button
              type="button"
              disabled={playbackState !== 'playing'}
              onClick={handlePauseVoice}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs inline-flex items-center space-x-1.5 transition-all border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Pause voice playback"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>

            {/* Stop Button */}
            <button
              type="button"
              disabled={playbackState === 'idle'}
              onClick={handleStopVoice}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs inline-flex items-center space-x-1.5 transition-all border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Stop voice playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>

            {/* Repeat Button */}
            <button
              type="button"
              disabled={sentences.length === 0}
              onClick={handleRepeatVoice}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs inline-flex items-center space-x-1.5 transition-all border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Repeat last sentence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repeat</span>
            </button>
          </div>

          {/* Voice Selector & Speed Adjustment */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Speed toggle */}
            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Speed:</span>
              {[
                { label: '0.75x Slow', val: 0.75 },
                { label: '1.0x Normal', val: 1.0 },
                { label: '1.25x Fast', val: 1.25 }
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setPlaybackSpeed(s.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playbackSpeed === s.val
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Voice Dropdown */}
            {englishVoices.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-teal-500 max-w-[200px] truncate"
                  title="Select voice accent"
                >
                  {englishVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. LIVE TRANSCRIPTION DISPLAY SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl mb-6">
        {/* Section Header with Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Live Recognized Sentences
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-teal-300 border border-slate-700">
                {sentences.length} {sentences.length === 1 ? 'sentence' : 'sentences'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click individual words to practice pronunciation. Sentences are deduplicated automatically.
            </p>
          </div>

          {/* Transcript Tools: Edit, Copy All, Clear */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditingTranscript(!isEditingTranscript)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-all border cursor-pointer ${
                isEditingTranscript
                  ? 'bg-teal-500 text-slate-950 border-teal-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Edit or paste text directly"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingTranscript ? 'Done Editing' : 'Edit Transcript'}</span>
            </button>

            <button
              type="button"
              disabled={sentences.length === 0}
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs inline-flex items-center space-x-1.5 transition-all border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Copy entire transcript"
            >
              {hasCopiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopiedAll ? 'Copied!' : 'Copy All'}</span>
            </button>

            <button
              type="button"
              disabled={sentences.length === 0}
              onClick={handleClearTranscript}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 font-semibold text-xs inline-flex items-center space-x-1.5 transition-all border border-slate-700 hover:border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Clear transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Edit Mode View */}
        {isEditingTranscript ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Edit your transcript below (one sentence per line):</span>
              <span>{manualTranscriptInput.split('\n').filter(Boolean).length} lines</span>
            </div>
            <textarea
              rows={8}
              value={manualTranscriptInput}
              onChange={(e) => setManualTranscriptInput(e.target.value)}
              placeholder="Paste or type English sentences here to practice pronunciation..."
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm font-sans text-white focus:outline-hidden focus:border-teal-500 leading-relaxed font-mono"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsEditingTranscript(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualTranscript}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
              >
                Save Transcript
              </button>
            </div>
          </div>
        ) : (
          /* Normal Sentence List View */
          <div>
            {sentences.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3 border border-dashed border-slate-800 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                  <Mic className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-300">No sentences recorded yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Click <strong>START LISTENING</strong> above and play your EF English lesson through your computer
                  speakers. Detected sentences will appear here immediately with zero fake text.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentences.map((sent, index) => {
                  const isCurrentlyPlaying = activeSpeakingSentenceId === sent.id;
                  const isSelected = selectedSentenceId === sent.id;
                  const words = sent.text.split(/\s+/).filter(Boolean);

                  return (
                    <div
                      key={sent.id}
                      className={`group p-4 rounded-2xl border transition-all ${
                        isCurrentlyPlaying
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
                          : isSelected
                          ? 'bg-slate-800/90 border-teal-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Sentence index and text */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <span className="font-mono text-teal-400 font-bold">#{index + 1}</span>
                            <span>•</span>
                            <span>{sent.timestamp}</span>
                            {sent.isEdited && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                                edited
                              </span>
                            )}
                          </div>

                          {/* Word-by-word clickable pronunciation display */}
                          <p className="text-sm sm:text-base text-slate-100 font-serif leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
                            {words.map((w, wIdx) => {
                              const cleanWord = w.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
                              const isThisWordSpeaking = currentlySpeakingWord === cleanWord;

                              return (
                                <button
                                  key={wIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePronounceWord(cleanWord);
                                  }}
                                  className={`rounded px-1 py-0.5 transition-all cursor-pointer text-left ${
                                    isThisWordSpeaking
                                      ? 'bg-teal-400 text-slate-950 font-bold shadow-xs scale-105'
                                      : 'hover:bg-teal-500/20 hover:text-teal-200'
                                  }`}
                                  title={`Click to pronounce "${cleanWord}"`}
                                >
                                  {w}
                                </button>
                              );
                            })}
                          </p>
                        </div>

                        {/* Sentence Actions: Play, Copy, Delete */}
                        <div className="shrink-0 flex items-center space-x-1.5">
                          {/* Play sentence */}
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(sent.text, sent.id)}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              isCurrentlyPlaying
                                ? 'bg-emerald-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 hover:bg-teal-600 text-slate-300 hover:text-white'
                            }`}
                            title="Play this sentence"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Copy sentence */}
                          <button
                            type="button"
                            onClick={() => handleCopySentence(sent.id, sent.text)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Copy sentence"
                          >
                            {copiedId === sent.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete sentence */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSentence(sent.id)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                            title="Delete sentence"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. TRANSPARENCY, INTERNET NOTICE & PRACTICE PURPOSE GUIDELINES */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-400 space-y-2.5">
        <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Technical Notice & Free-Tier Practice Purpose</span>
        </div>
        <ul className="space-y-1.5 list-disc list-inside leading-relaxed text-slate-400">
          <li>
            <strong>100% Free & Built-In</strong>: Uses native browser speech technologies (Web Speech API). No paid
            APIs, API keys, subscriptions, or credit cards required.
          </li>
          <li>
            <strong>Internet Connectivity Requirement</strong>: Browser speech recognition (in Google Chrome and
            Microsoft Edge) relies on the browser's built-in cloud speech service to recognize English phonemes in real
            time; an active internet connection is therefore required. Speech synthesis (AI Voice playback) executes
            locally inside your browser.
          </li>
          <li>
            <strong>Personal Listening Practice</strong>: This assistant is designed to help teachers and students
            capture dialogue and practice pronunciation. It does not automatically submit answers to EF exams.
          </li>
        </ul>
      </div>
    </div>
  );
};
