import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Square,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Edit3,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Plus,
  BookOpen,
  Info
} from 'lucide-react';
import {
  speakSentence,
  pauseSpeaking,
  resumeSpeaking,
  stopSpeaking,
  isSpeechPaused,
  getAvailableVoices,
  isSpeechSynthesisSupported
} from '../services/efAudioService';
import {
  VoicePlaybackState,
  TranscribedSentence
} from '../types/efAudio';

interface EfAudioAssistantViewProps {
  initialCompact?: boolean;
  onNavigateHome?: () => void;
}

const INITIAL_EF_SENTENCES: TranscribedSentence[] = [
  {
    id: 'ef_sample_1',
    text: 'Welcome to the EF English pronunciation and listening studio.',
    timestamp: 'Lesson Intro',
    isFinal: true
  },
  {
    id: 'ef_sample_2',
    text: 'Good pronunciation requires regular listening and speaking practice.',
    timestamp: 'EF Practice',
    isFinal: true
  },
  {
    id: 'ef_sample_3',
    text: 'Click any word to hear its pronunciation aloud.',
    timestamp: 'Interactive Tip',
    isFinal: true
  }
];

export const EfAudioAssistantView: React.FC<EfAudioAssistantViewProps> = ({
  initialCompact = false,
  onNavigateHome
}) => {
  // Mode: Full view vs Compact split-screen companion
  const [isCompact, setIsCompact] = useState<boolean>(initialCompact);

  // Practice Sentences & Transcript
  const [sentences, setSentences] = useState<TranscribedSentence[]>(INITIAL_EF_SENTENCES);
  const [newSentenceInput, setNewSentenceInput] = useState<string>('');
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

  // Filter and prioritize English voices (highlighting Microsoft David, Mark, Zira)
  const englishVoices = useMemo(() => {
    const en = voices.filter((v) => v.lang.startsWith('en'));
    return en.sort((a, b) => {
      const isPriorityA = /David|Mark|Zira/i.test(a.name);
      const isPriorityB = /David|Mark|Zira/i.test(b.name);
      if (isPriorityA && !isPriorityB) return -1;
      if (!isPriorityA && isPriorityB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [voices]);

  // Load available speech synthesis voices on mount
  useEffect(() => {
    getAvailableVoices().then((loadedVoices) => {
      setVoices(loadedVoices);

      // Prefer Microsoft David, Mark, or Zira if available, or standard English voice
      const preferredVoice =
        loadedVoices.find((v) => /David/i.test(v.name) && v.lang.startsWith('en')) ||
        loadedVoices.find((v) => /Mark/i.test(v.name) && v.lang.startsWith('en')) ||
        loadedVoices.find((v) => /Zira/i.test(v.name) && v.lang.startsWith('en')) ||
        loadedVoices.find(
          (v) =>
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Jenny') ||
              v.name.includes('Guy')) &&
            v.lang.startsWith('en')
        ) ||
        loadedVoices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        setSelectedVoiceURI(preferredVoice.voiceURI);
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

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  /**
   * Add new sentence from input bar
   */
  const handleAddSentence = () => {
    const trimmed = newSentenceInput.trim();
    if (!trimmed) return;

    const newEntry: TranscribedSentence = {
      id: `sent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isFinal: true
    };

    setSentences((prev) => [...prev, newEntry]);
    setNewSentenceInput('');
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
        console.warn('[AI Voice] Speech synthesis notice:', err);
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
      rate: Math.min(playbackSpeed, 0.85),
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
    if (sentences.length === 0) return;
    if (window.confirm('Are you sure you want to clear the entire practice transcript?')) {
      setSentences([]);
      setSelectedSentenceId(null);
      stopSpeaking();
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
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                EF AI Audio Assistant
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Free
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                AI Voice & Pronunciation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personal English listening and pronunciation companion for EF English lessons.
            </p>
          </div>
        </div>

        {/* Top Actions: Companion Mode, Pop-out Window, Home */}
        <div className="flex items-center space-x-2 shrink-0">
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
            <a
              href="/?page=ef-audio&compact=true"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
              title="Open floating companion window to place beside EF English"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">Pop-out Window</span>
            </a>
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

      {/* 2. Status & Maintenance Notice */}
      <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center space-x-2">
              <span>AI Voice & Speech Synthesis Active</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                Microphone listening paused
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Live microphone recording is temporarily disabled for maintenance. You can type, paste, and practice pronunciation using Microsoft David, Mark, Zira, and AI voice playback below.
            </p>
          </div>
        </div>
      </div>

      {/* 3. AI VOICE CONTROLS TOOLBAR */}
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

            {/* Voice Dropdown (Highlighting Microsoft David, Mark, Zira) */}
            {englishVoices.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">Voice:</span>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-teal-500 max-w-[240px] truncate"
                  title="Select AI Voice Accent"
                >
                  {englishVoices.map((v) => {
                    const isMicrosoft = /David|Mark|Zira/i.test(v.name);
                    return (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {isMicrosoft ? '★ ' : ''}{v.name} ({v.lang})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. PRACTICE SENTENCE INPUT & TRANSCRIPT SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl mb-6">
        {/* Section Header with Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <span>Practice Sentences & Phrases</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-teal-300 border border-slate-700">
                {sentences.length} {sentences.length === 1 ? 'sentence' : 'sentences'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Type or paste English phrases below. Click any word to hear individual phonetic pronunciation.
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
              title="Edit or paste multi-line text directly"
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

        {/* Quick Add Sentence Input Bar */}
        {!isEditingTranscript && (
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-5">
            <input
              type="text"
              value={newSentenceInput}
              onChange={(e) => setNewSentenceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSentence();
              }}
              placeholder="Type or paste an EF English sentence here (press Enter to add)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleAddSentence}
              disabled={!newSentenceInput.trim()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs inline-flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sentence</span>
            </button>
          </div>
        )}

        {/* Edit Mode View */}
        {isEditingTranscript ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Edit your practice transcript below (one sentence per line):</span>
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
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-300">No practice sentences yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Type or paste an EF English sentence above, or click <strong>Edit Transcript</strong> to paste whole lessons.
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

      {/* 5. TRANSPARENCY, VOICE SPEED & PRACTICE GUIDELINES */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-400 space-y-2.5">
        <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Speech Synthesis & Pronunciation Practice</span>
        </div>
        <ul className="space-y-1.5 list-disc list-inside leading-relaxed text-slate-400">
          <li>
            <strong>100% Free & Built-In</strong>: Uses native browser speech synthesis. No paid APIs, external subscriptions, or billing required.
          </li>
          <li>
            <strong>Natural Voice Accents</strong>: Supports Microsoft David, Microsoft Mark, Microsoft Zira, and standard English browser voices.
          </li>
          <li>
            <strong>Phonetic Word Practice</strong>: Click any individual word to hear it pronounced slowly and clearly.
          </li>
          <li>
            <strong>Microphone Listening</strong>: Temporarily paused for maintenance; speech practice and AI voice playback operate completely independently.
          </li>
        </ul>
      </div>
    </div>
  );
};
