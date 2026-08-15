import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bot, Play, Star, Circle, Square, Triangle, Check, X, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type GamePhase = "intro" | "game" | "summary" | "quiz" | "finished";

type GameProps = {
  onBack: () => void;
};

// --- AUDIO UTILS ---
const playSound = (type: "chime" | "buzz" | "pop") => {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "chime") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === "buzz") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.1);
    }
    setTimeout(() => { if (audioCtx.state !== 'closed') audioCtx.close(); }, 1000);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const speakText = (text: string, onEnd?: () => void) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // slightly slower for kids
    utterance.pitch = 1.2; // friendly pitch
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  } else {
    if (onEnd) onEnd();
  }
};

export default function ThinkingPatternsGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStart = () => {
    playSound("pop");
    setPhase("game");
  };

  const handleGameAnswer = (correct: boolean) => {
    if (correct) {
      playSound("chime");
      setFeedback("correct");
      setTimeout(() => {
        setFeedback(null);
        setPhase("summary");
      }, 1500);
    } else {
      playSound("buzz");
      setFeedback("incorrect");
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const handleStartQuiz = () => {
    playSound("pop");
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setPhase("quiz");
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (correct) {
      playSound("chime");
      setScore(s => s + 1);
      setFeedback("correct");
    } else {
      playSound("buzz");
      setFeedback("incorrect");
    }
    
    setTimeout(() => {
      setFeedback(null);
      if (quizIndex < 2) {
        setQuizIndex(i => i + 1);
      } else {
        setPhase("finished");
      }
    }, 1500);
  };

  const playSummaryAudio = () => {
    setIsSpeaking(true);
    speakText(
      "Great job! A pattern is when things repeat in a rule. Like Red, Blue, Red, Blue. Finding patterns helps us solve big puzzles! Are you ready for a quick quiz?",
      () => setIsSpeaking(false)
    );
  };

  useEffect(() => {
    if (phase === "summary") {
      playSummaryAudio();
    }
  }, [phase]);

  // Quiz Data
  const quizzes = [
    {
      sequence: [<Circle key={1} className="text-red-500 w-16 h-16 fill-current"/>, <Square key={2} className="text-blue-500 w-16 h-16 fill-current"/>, <Circle key={3} className="text-red-500 w-16 h-16 fill-current"/>],
      options: [
        { icon: <Square className="text-blue-500 w-12 h-12 fill-current"/>, correct: true },
        { icon: <Circle className="text-red-500 w-12 h-12 fill-current"/>, correct: false },
        { icon: <Triangle className="text-green-500 w-12 h-12 fill-current"/>, correct: false },
      ]
    },
    {
      sequence: [<Star key={1} className="text-yellow-500 w-16 h-16 fill-current"/>, <Star key={2} className="text-yellow-500 w-16 h-16 fill-current"/>, <Triangle key={3} className="text-green-500 w-16 h-16 fill-current"/>, <Star key={4} className="text-yellow-500 w-16 h-16 fill-current"/>],
      options: [
        { icon: <Triangle className="text-green-500 w-12 h-12 fill-current"/>, correct: false },
        { icon: <Square className="text-blue-500 w-12 h-12 fill-current"/>, correct: false },
        { icon: <Star className="text-yellow-500 w-12 h-12 fill-current"/>, correct: true },
      ]
    },
    {
      sequence: [<Square key={1} className="text-blue-500 w-16 h-16 fill-current"/>, <Triangle key={2} className="text-green-500 w-16 h-16 fill-current"/>, <Circle key={3} className="text-red-500 w-16 h-16 fill-current"/>, <Square key={4} className="text-blue-500 w-16 h-16 fill-current"/>],
      options: [
        { icon: <Triangle className="text-green-500 w-12 h-12 fill-current"/>, correct: true },
        { icon: <Circle className="text-red-500 w-12 h-12 fill-current"/>, correct: false },
        { icon: <Square className="text-blue-500 w-12 h-12 fill-current"/>, correct: false },
      ]
    }
  ];

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-slate-950 text-white overflow-hidden">
      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-[spin_120s_linear_infinite]" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 to-purple-900/30 mix-blend-overlay" />
        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute rounded-full bg-cyan-400/50 animate-pulse"
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDuration: Math.random() * 3 + 2 + 's',
            }}
          />
        ))}
      </div>

      {/* Top Bar with Progress */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
        <Button variant="ghost" onClick={onBack} className="text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/40">
          <ArrowLeft className="mr-2 h-4 w-4" /> ABORT
        </Button>
        <div className="flex-1 max-w-md mx-8 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000" 
            style={{ 
              width: phase === 'intro' ? '0%' : 
                     phase === 'game' ? '25%' : 
                     phase === 'summary' ? '50%' : 
                     phase === 'quiz' ? `${50 + ((quizIndex) / 3) * 50}%` : '100%' 
            }} 
          />
        </div>
        <div className="text-cyan-400 font-mono text-sm">
          {phase === 'quiz' ? `QUIZ ${quizIndex + 1}/3` : phase.toUpperCase()}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl p-6">
        
        {/* PHASE: INTRO */}
        {phase === "intro" && (
          <div className="text-center animate-in zoom-in duration-500">
            <Bot className="w-32 h-32 mx-auto text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-bounce mb-8" />
            <h1 className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-4 drop-shadow-lg uppercase tracking-wider">
              Thinking & Patterns
            </h1>
            <p className="text-xl text-cyan-100 mb-10 max-w-lg mx-auto">
              Agent Cipher needs your help! Can you find the missing piece to unlock the space door?
            </p>
            <Button 
              onClick={handleStart} 
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xl px-12 py-6 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-transform hover:scale-110"
            >
              <Play className="mr-2 h-6 w-6" /> START MISSION
            </Button>
          </div>
        )}

        {/* PHASE: GAME */}
        {phase === "game" && (
          <div className="text-center animate-in slide-in-from-bottom duration-500 w-full">
            <h2 className="text-3xl font-display text-cyan-300 mb-12">What comes next?</h2>
            
            <div className="flex justify-center items-center gap-6 mb-16 bg-slate-900/50 p-8 rounded-2xl border border-cyan-900/50 backdrop-blur-sm">
              <Star className="text-yellow-400 w-20 h-20 fill-current drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
              <Circle className="text-pink-500 w-20 h-20 fill-current drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]" />
              <Star className="text-yellow-400 w-20 h-20 fill-current drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
              <Circle className="text-pink-500 w-20 h-20 fill-current drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]" />
              <div className={`w-24 h-24 border-4 border-dashed rounded-xl flex items-center justify-center transition-colors duration-300
                ${feedback === 'correct' ? 'border-green-400 bg-green-400/20' : 
                  feedback === 'incorrect' ? 'border-red-400 bg-red-400/20' : 'border-cyan-400 bg-cyan-950/50'}`}>
                {feedback === 'correct' ? <Star className="text-yellow-400 w-16 h-16 fill-current animate-in zoom-in" /> : <span className="text-cyan-400 text-5xl">?</span>}
              </div>
            </div>

            <div className="flex justify-center gap-8">
              <button 
                onClick={() => handleGameAnswer(false)}
                disabled={feedback !== null}
                className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-600 hover:border-pink-500 hover:bg-slate-700 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] disabled:opacity-50"
              >
                <Circle className="text-pink-500 w-16 h-16 fill-current" />
              </button>
              <button 
                onClick={() => handleGameAnswer(true)}
                disabled={feedback !== null}
                className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-600 hover:border-yellow-400 hover:bg-slate-700 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] disabled:opacity-50"
              >
                <Star className="text-yellow-400 w-16 h-16 fill-current" />
              </button>
              <button 
                onClick={() => handleGameAnswer(false)}
                disabled={feedback !== null}
                className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-600 hover:border-blue-500 hover:bg-slate-700 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50"
              >
                <Square className="text-blue-500 w-16 h-16 fill-current" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE: SUMMARY */}
        {phase === "summary" && (
          <div className="text-center w-full max-w-2xl animate-in fade-in duration-700">
            <div className="bg-gradient-to-b from-cyan-950 to-blue-950 rounded-3xl p-8 border border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
              
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-20 rounded-full animate-pulse" />
                  <Bot className={`w-32 h-32 text-cyan-300 relative z-10 ${isSpeaking ? 'animate-bounce' : ''}`} />
                  {isSpeaking && (
                    <div className="absolute -right-4 -top-4 bg-cyan-500 text-black p-2 rounded-full animate-pulse">
                      <Volume2 className="w-6 h-6" />
                    </div>
                  )}
                </div>
                
                <div className="text-left flex-1">
                  <h2 className="text-3xl font-display font-bold text-cyan-300 mb-4 flex items-center gap-2">
                    <Sparkles className="text-yellow-400" /> Mission Success!
                  </h2>
                  <div className="space-y-4 text-lg text-cyan-50 font-body leading-relaxed bg-black/30 p-4 rounded-xl border border-cyan-900/50">
                    <p>A <strong>pattern</strong> is when things repeat in a rule.</p>
                    <p>Like <span className="text-yellow-400 font-bold">Star</span>, <span className="text-pink-400 font-bold">Circle</span>, <span className="text-yellow-400 font-bold">Star</span>, <span className="text-pink-400 font-bold">Circle</span>!</p>
                    <p>Finding patterns helps us solve big puzzles in the galaxy.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-cyan-800 flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={playSummaryAudio}
                  className="border-cyan-600 text-cyan-300 hover:bg-cyan-900/50"
                >
                  <Volume2 className="mr-2 h-4 w-4" /> REPLAY VOICE
                </Button>
                <Button 
                  onClick={handleStartQuiz}
                  className="bg-green-500 hover:bg-green-400 text-black font-bold px-8"
                >
                  START QUIZ &rarr;
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE: QUIZ */}
        {phase === "quiz" && (
          <div className="w-full text-center animate-in slide-in-from-right duration-500">
            <h2 className="text-3xl font-display text-purple-300 mb-10 drop-shadow-md">
              Question {quizIndex + 1}
            </h2>
            
            <div className="flex justify-center items-center gap-4 mb-16 bg-purple-950/30 p-8 rounded-2xl border border-purple-500/30">
              {quizzes[quizIndex].sequence.map((el, idx) => (
                <div key={idx} className="animate-in fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                  {el}
                </div>
              ))}
              <div className={`w-20 h-20 border-4 border-dashed rounded-xl flex items-center justify-center transition-all duration-300
                ${feedback === 'correct' ? 'border-green-400 bg-green-400/20 scale-110' : 
                  feedback === 'incorrect' ? 'border-red-400 bg-red-400/20 animate-shake' : 'border-purple-400 bg-purple-900/50'}`}>
                {feedback === 'correct' ? <Check className="text-green-400 w-12 h-12" /> : 
                 feedback === 'incorrect' ? <X className="text-red-400 w-12 h-12" /> : 
                 <span className="text-purple-400 text-4xl">?</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              {quizzes[quizIndex].options.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleQuizAnswer(opt.correct)}
                  disabled={feedback !== null}
                  className="p-8 bg-slate-800 rounded-2xl border-2 border-slate-600 hover:border-purple-400 hover:bg-slate-700 transition-all hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] disabled:opacity-50 flex items-center justify-center group"
                >
                  <div className="transform transition-transform group-hover:scale-125">
                    {opt.icon}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PHASE: FINISHED */}
        {phase === "finished" && (
          <div className="text-center animate-in zoom-in duration-700">
            <div className="relative mb-8">
              <Sparkles className="absolute -top-8 -left-8 w-16 h-16 text-yellow-400 animate-ping" />
              <Sparkles className="absolute -bottom-8 -right-8 w-16 h-16 text-yellow-400 animate-pulse" />
              <div className="text-[120px] leading-none mb-4 animate-bounce">🏆</div>
            </div>
            
            <h1 className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4 drop-shadow-lg uppercase">
              MODULE COMPLETE!
            </h1>
            
            <p className="text-2xl text-cyan-100 mb-2">
              You scored <span className="text-yellow-400 font-bold text-4xl mx-2">{score} / 3</span>
            </p>
            
            <p className="text-lg text-slate-400 mb-12">
              Agent Cipher is proud of you!
            </p>

            <div className="flex justify-center gap-6">
              <Button 
                variant="outline"
                size="lg"
                onClick={onBack}
                className="border-cyan-600 text-cyan-300 hover:bg-cyan-950 font-bold px-8 py-6 rounded-full"
              >
                BACK TO HQ
              </Button>
              <Button 
                size="lg"
                onClick={() => {
                  setPhase("intro");
                  setQuizIndex(0);
                  setScore(0);
                }}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-6 rounded-full shadow-[0_0_30px_rgba(250,204,21,0.5)] transition-transform hover:scale-110"
              >
                PLAY AGAIN
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Visual Feedback Overlays */}
      {feedback === 'correct' && (
        <div className="absolute inset-0 border-[16px] border-green-500/50 pointer-events-none animate-in fade-in zoom-in duration-300" />
      )}
      {feedback === 'incorrect' && (
        <div className="absolute inset-0 border-[16px] border-red-500/50 pointer-events-none animate-in fade-in zoom-in duration-300" />
      )}
    </div>
  );
}
