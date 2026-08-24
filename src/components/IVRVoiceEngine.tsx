import { useEffect, useState, useRef } from 'react';
import { LANGUAGES, Language } from '../types';
import { Phone, PhoneOff, Volume2, VolumeX, Mic } from 'lucide-react';

interface IVRVoiceEngineProps {
  script: string;
  lang: Language;
  onDtmfKey: (key: string) => void;
  callActive: boolean;
  onEndCall: () => void;
  onStartCall: () => void;
}

// DTMF standard telephone frequencies
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

const IVRVoiceEngine: React.FC<IVRVoiceEngineProps> = ({
  script,
  lang,
  onDtmfKey,
  callActive,
  onEndCall,
  onStartCall,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play realistic DTMF Dual-Tone audio beep
  const playDtmfTone = (key: string) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const freqs = DTMF_FREQS[key];
      if (!freqs) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio tone error', e);
    }
  };

  // Text-To-Speech synthesis using Web Speech API
  useEffect(() => {
    if (!callActive || voiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    if (script) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95; // Slightly measured rate for clear rural comprehension

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [script, lang, callActive, voiceMuted]);

  const handleKeyPress = (key: string) => {
    playDtmfTone(key);
    onDtmfKey(key);
  };

  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-850 to-black text-white rounded-3xl p-6 shadow-2xl border-4 border-gray-700 max-w-sm mx-auto flex flex-col items-center">
      
      {/* Phone Screen Speaker & Call Status */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${callActive ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`}></span>
          <span className="font-mono uppercase text-gray-400">
            {callActive ? 'Live Call (Active)' : 'Line Idle'}
          </span>
        </div>

        <button
          onClick={() => setVoiceMuted(prev => !prev)}
          className="text-gray-400 hover:text-white p-1"
          title={voiceMuted ? 'Unmute voice audio' : 'Mute voice audio'}
        >
          {voiceMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Spoken Voice Subtitles & Visual Prompt */}
      <div className="my-4 w-full bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 border border-gray-700 min-h-[110px] flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1 border-b border-gray-700/60">
          <span className="flex items-center gap-1">
            <Mic className={`w-3 h-3 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
            {isSpeaking ? 'KISAN-DWAAR Voice Engine Speaking...' : 'Awaiting Input'}
          </span>
          <span className="font-semibold text-gov-gold">{LANGUAGES[lang].name}</span>
        </div>

        <p className="text-xs text-gray-200 mt-2 leading-relaxed font-sans">
          {callActive ? script : 'Press the Call button to simulate an automated inbound phone call.'}
        </p>

        {isSpeaking && (
          <div className="flex gap-1 justify-center pt-2">
            <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce"></span>
            <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
            <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          </div>
        )}
      </div>

      {/* DTMF Physical Keypad Grid */}
      <div className="grid grid-cols-3 gap-3 w-full my-2">
        {keypadKeys.map((k) => (
          <button
            key={k}
            onClick={() => handleKeyPress(k)}
            disabled={!callActive}
            className="h-14 rounded-2xl bg-gray-800/90 hover:bg-gray-700 active:bg-gov-primary active:scale-95 text-white font-bold text-xl flex flex-col items-center justify-center border border-gray-700 shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>{k}</span>
            <span className="text-[9px] text-gray-400 font-normal tracking-widest -mt-1">
              {k === '1' ? ' ' : k === '2' ? 'ABC' : k === '3' ? 'DEF' : k === '4' ? 'GHI' : k === '5' ? 'JKL' : k === '6' ? 'MNO' : k === '7' ? 'PQRS' : k === '8' ? 'TUV' : k === '9' ? 'WXYZ' : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Call Action Bar (Dial / Hangup) */}
      <div className="w-full flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-800">
        {!callActive ? (
          <button
            onClick={onStartCall}
            className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-all"
            title="Start Simulated Phone Call"
          >
            <Phone className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-all"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        )}
      </div>

    </div>
  );
};

export default IVRVoiceEngine;
