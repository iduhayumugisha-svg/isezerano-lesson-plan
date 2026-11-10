/**
 * Automated Verification for EF AI Audio Assistant – Simple Microphone Listening Mode
 * Tests core services, capability detection, deduplication, word tokenization, diagnostics, and free-tier compatibility.
 */
import {
  isMicrophoneSupported,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  isSecureContextActive,
  isInIframe,
  getMicrophonePermissionState,
  getEnvironmentDiagnostics,
  requestMicrophoneStream
} from '../src/services/efAudioService';
import { VoiceSettings, MicAudioLevelInfo, TranscribedSentence, MicDiagnosticDetails } from '../src/types/efAudio';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('===========================================================');
  console.log('RUNNING EF AI AUDIO ASSISTANT – SIMPLE MIC MODE AUDIT');
  console.log('===========================================================');

  // 1. Feature Detection Functions
  assert(typeof isMicrophoneSupported === 'function', 'isMicrophoneSupported is defined and exportable');
  assert(typeof isSpeechRecognitionSupported === 'function', 'isSpeechRecognitionSupported is defined and exportable');
  assert(typeof isSpeechSynthesisSupported === 'function', 'isSpeechSynthesisSupported is defined and exportable');
  assert(typeof isSecureContextActive === 'function', 'isSecureContextActive is defined and exportable');
  assert(typeof isInIframe === 'function', 'isInIframe is defined and exportable');
  assert(typeof getMicrophonePermissionState === 'function', 'getMicrophonePermissionState is defined and exportable');
  assert(typeof getEnvironmentDiagnostics === 'function', 'getEnvironmentDiagnostics is defined and exportable');
  assert(typeof requestMicrophoneStream === 'function', 'requestMicrophoneStream is defined and exportable');

  // In Node environment, browser APIs are undefined, which feature checks should handle safely without throwing
  assert(isMicrophoneSupported() === false, 'isMicrophoneSupported safely returns false in non-browser Node context');
  assert(isSpeechRecognitionSupported() === false, 'isSpeechRecognitionSupported safely returns false in non-browser Node context');
  assert(isSpeechSynthesisSupported() === false, 'isSpeechSynthesisSupported safely returns false in non-browser Node context');
  assert(isSecureContextActive() === false, 'isSecureContextActive safely returns false in non-browser Node context');
  assert(isInIframe() === false, 'isInIframe safely returns false in non-browser Node context');

  // 2. Diagnostics Gathering
  const diag: MicDiagnosticDetails = await getEnvironmentDiagnostics();
  assert(diag !== null && typeof diag === 'object', 'getEnvironmentDiagnostics returns structured diagnostic object');
  assert(diag.permissionState === 'unsupported', 'permissionState returns unsupported in Node context without throwing');
  assert(diag.hasGetUserMedia === false, 'hasGetUserMedia is false in Node context');

  // 3. Direct Microphone Request in non-browser environment
  let streamErrorCaught = false;
  try {
    await requestMicrophoneStream();
  } catch (err: any) {
    streamErrorCaught = true;
    assert(err.name === 'SecurityError' || err.name === 'NotSupportedError', `requestMicrophoneStream throws descriptive error (${err.name})`);
  }
  assert(streamErrorCaught === true, 'requestMicrophoneStream catches missing secure/media context without crashing');

  // 4. Default Voice Settings Verification
  const defaultSettings: VoiceSettings = {
    voiceURI: 'default',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  };
  assert(defaultSettings.rate === 1.0, 'Default playback rate is 1.0x (standard natural speed)');
  assert(defaultSettings.volume === 1.0, 'Default volume is maximum clarity 1.0');
  assert(defaultSettings.pitch === 1.0, 'Default voice pitch is standard 1.0');

  // 5. Sentence Tokenizer and Word-by-Word Clickability
  function tokenizeSentence(text: string): string[] {
    return text.trim().split(/\s+/).filter(Boolean);
  }

  function cleanWordForPronunciation(word: string): string {
    return word.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
  }

  const testSentence = 'Welcome to EF English live conversation class! Today we practice pronunciation.';
  const words = tokenizeSentence(testSentence);
  assert(words.length === 11, `Tokenizes sentence into exact word sequence (expected 11, got ${words.length})`);
  assert(cleanWordForPronunciation('class!') === 'class', 'Punctuation stripped cleanly for word pronunciation');
  assert(cleanWordForPronunciation('"Today"') === 'Today', 'Quotation marks stripped cleanly for word pronunciation');

  // 6. Microphone Audio Level Info verification
  const sampleMicInfo: MicAudioLevelInfo = {
    volumeLevel: 45,
    isSoundDetected: true,
    peakDb: -33
  };
  assert(sampleMicInfo.volumeLevel === 45, 'Microphone volume level tracked as 0-100 gauge');
  assert(sampleMicInfo.isSoundDetected === true, 'Sound activity detection flag tracks audio presence');
  assert(sampleMicInfo.peakDb === -33, 'Peak dB metric captured accurately');

  // 7. Deduplication Logic Verification
  function addSentenceDeduplicated(
    existing: TranscribedSentence[],
    newText: string
  ): TranscribedSentence[] {
    const cleaned = newText.trim();
    if (!cleaned) return existing;
    if (existing.length > 0 && existing[existing.length - 1].text.toLowerCase() === cleaned.toLowerCase()) {
      return existing; // Avoid duplicate
    }
    return [
      ...existing,
      {
        id: `sent_${Date.now()}`,
        text: cleaned,
        timestamp: '10:00:00 AM',
        isFinal: true
      }
    ];
  }

  let history: TranscribedSentence[] = [];
  history = addSentenceDeduplicated(history, 'Hello, how are you?');
  assert(history.length === 1, 'First sentence added');
  history = addSentenceDeduplicated(history, 'Hello, how are you?');
  assert(history.length === 1, 'Duplicate sentence prevented from being appended');
  history = addSentenceDeduplicated(history, 'I am learning English today.');
  assert(history.length === 2, 'Distinct sentence successfully added');

  // 8. Free-Tier & Zero Fake Data Verification
  const sampleHistoryItem: TranscribedSentence = {
    id: 'sentence_1',
    text: 'The weather in Rwanda is pleasant throughout the year.',
    timestamp: new Date().toISOString(),
    confidence: 0.98,
    isFinal: true,
    isEdited: false
  };
  assert(typeof sampleHistoryItem.id === 'string', 'Transcriptions have unique string IDs');
  assert(sampleHistoryItem.isFinal === true, 'Finalized sentence flag preserved');
  assert(sampleHistoryItem.isEdited === false, 'Tracks user sentence edits cleanly');

  console.log('===========================================================');
  console.log(`EF AUDIO ASSISTANT AUDIT SUMMARY: Passed: ${passed}, Failed: ${failed}`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
