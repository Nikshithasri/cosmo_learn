import { useState, useEffect } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

type Scenario = {
  id: number;
  description: string;
  condition: string;
  conditionMet: boolean;
  ifAction: string;
  elseAction: string;
  ifOptions: string[];
  elseOptions: string[];
  correctIf: number;
  correctElse: number;
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    description: "Robot sees a rock ahead!",
    condition: "Obstacle Ahead?",
    conditionMet: true,
    ifAction: "What should robot do IF obstacle ahead?",
    elseAction: "What should robot do ELSE (no obstacle)?",
    ifOptions: ["Turn Right", "Move Forward", "Jump Up"],
    elseOptions: ["Move Forward", "Turn Left", "Stop"],
    correctIf: 0,
    correctElse: 0,
  },
  {
    id: 2,
    description: "Robot is at a crossroad. There's a star to the left!",
    condition: "Star on Left?",
    conditionMet: true,
    ifAction: "What should robot do IF star is on left?",
    elseAction: "What should robot do ELSE (no star)?",
    ifOptions: ["Move Forward", "Turn Left", "Turn Right"],
    elseOptions: ["Move Forward", "Turn Left", "Stop"],
    correctIf: 1,
    correctElse: 0,
  },
  {
    id: 3,
    description: "Robot is on a bridge. The bridge is broken!",
    condition: "Bridge Broken?",
    conditionMet: true,
    ifAction: "What should robot do IF bridge is broken?",
    elseAction: "What should robot do ELSE (bridge safe)?",
    ifOptions: ["Cross Anyway", "Find Another Path", "Wait Forever"],
    elseOptions: ["Find Another Path", "Cross the Bridge", "Turn Back"],
    correctIf: 1,
    correctElse: 1,
  },
  {
    id: 4,
    description: "Robot found a locked door. It has a key!",
    condition: "Has Key?",
    conditionMet: true,
    ifAction: "What should robot do IF it has a key?",
    elseAction: "What should robot do ELSE (no key)?",
    ifOptions: ["Break the Door", "Use the Key", "Go Back"],
    elseOptions: ["Find a Key", "Break the Door", "Wait"],
    correctIf: 1,
    correctElse: 0,
  },
];

const BADGES = [
  { name: "Logic Builder", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Smart Coder", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
  { name: "Decision Master", icon: <Medal className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ = [
  { question: "What should the robot do IF there is an obstacle?", options: ["Walk into it", "Turn or find another way", "Stop forever"], correct: 1 },
  { question: "IF it rains, take umbrella. ELSE?", options: ["Take umbrella anyway", "Wear sunglasses", "Stay inside"], correct: 1 },
  { question: "Which decision is WRONG? IF door locked...", options: ["Use the key", "Knock on the door", "Walk through the wall"], correct: 2 },
];

const playSound = (type: "click" | "success" | "error") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "click") {
      osc.type = "sine"; osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(); osc.stop(ctx.currentTime + 0.45);
    } else {
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) { /* ignore */ }
};

const speak = (text: string) => {
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1.2;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
};

export default function IfElseGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [ifChoice, setIfChoice] = useState<number | null>(null);
  const [elseChoice, setElseChoice] = useState<number | null>(null);
  const [runResult, setRunResult] = useState<"idle" | "running" | "success" | "fail">("idle");
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);

  const scenario = SCENARIOS[scenarioIdx];

  useEffect(() => { return () => { window.speechSynthesis.cancel(); }; }, []);

  const handleRun = () => {
    if (ifChoice === null || elseChoice === null) return;
    setRunResult("running");
    playSound("click");

    setTimeout(() => {
      const ifCorrect = ifChoice === scenario.correctIf;
      const elseCorrect = elseChoice === scenario.correctElse;

      if (ifCorrect && elseCorrect) {
        setRunResult("success");
        playSound("success");
        setCompletedCount(c => c + 1);
        setTimeout(() => {
          if (scenarioIdx < SCENARIOS.length - 1) {
            setScenarioIdx(i => i + 1);
            setIfChoice(null);
            setElseChoice(null);
            setRunResult("idle");
          } else {
            setPhase("summary");
            speak("If Else helps us make decisions. We choose actions based on conditions.");
          }
        }, 1500);
      } else {
        setRunResult("fail");
        playSound("error");
        speak("Try a different decision!");
        setTimeout(() => { setRunResult("idle"); }, 1200);
      }
    }, 800);
  };

  const handleQuizAnswer = (idx: number) => {
    if (idx === QUIZ[quizIndex].correct) {
      playSound("success");
      if (quizIndex < QUIZ.length - 1) setTimeout(() => setQuizIndex(quizIndex + 1), 800);
      else setTimeout(() => {
        setPhase("reward");
        setBadge(BADGES[Math.floor(Math.random() * BADGES.length)]);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#f43f5e", "#8b5cf6", "#10b981", "#eab308"] });
        speak("Great job! You earned a new badge.");
      }, 800);
    } else { playSound("error"); speak("Try again!"); }
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#08060F] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-rose-300 hover:text-rose-200 hover:bg-rose-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[15%] left-[20%] h-40 w-40 rounded-full bg-rose-900/15 blur-3xl animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] right-[15%] h-36 w-36 rounded-full bg-blue-900/15 blur-3xl animate-[float_19s_ease-in-out_infinite_reverse]" />
      </div>
      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-rose-950/90 border-2 border-rose-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(244,63,94,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-rose-900/50 p-4 rounded-full border border-rose-400/50 mb-6 shadow-[0_0_20px_rgba(244,63,94,0.5)]">
            <Info className="h-16 w-16 text-rose-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-rose-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-rose-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-rose-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Read the scenario at the top.</li>
            <li className="flex items-start gap-3"><span className="bg-rose-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Pick what the robot should do IF the condition is true.</li>
            <li className="flex items-start gap-3"><span className="bg-rose-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Pick what the robot should do ELSE (if it's not true).</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-3xl px-4 animate-in fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-rose-300 mb-1 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)] uppercase tracking-widest text-center">
            Smart Robot Decisions
          </h1>
          <div className="flex items-center gap-2 mb-4">
            {SCENARIOS.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === scenarioIdx ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-rose-900/40'}`} />
            ))}
          </div>

          {/* Scenario Description */}
          <div className="w-full bg-black/40 backdrop-blur-md border border-rose-500/30 rounded-2xl p-6 mb-6 text-center">
            <div className="text-5xl mb-3">🤖</div>
            <p className="text-xl text-rose-200 font-mono">{scenario.description}</p>
          </div>

          {/* Visual Code Block Builder */}
          <div className={`w-full bg-slate-900/80 backdrop-blur-md border-2 rounded-2xl p-5 mb-4 transition-all ${runResult === 'fail' ? 'border-red-500 animate-[shake_0.4s_ease-in-out]' : runResult === 'success' ? 'border-green-500 shadow-[0_0_30px_rgba(74,222,128,0.3)]' : 'border-rose-500/40'}`}>
            {/* IF Block */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1.5 bg-rose-600 text-white font-display font-bold text-sm rounded-lg shadow-[0_0_10px_rgba(244,63,94,0.4)]">IF</span>
                <span className="px-3 py-1.5 bg-slate-700 text-rose-200 font-mono text-sm rounded-lg border border-rose-500/30">{scenario.condition} ✅</span>
              </div>
              <p className="text-xs text-rose-300/70 mb-2 ml-10 font-mono">{scenario.ifAction}</p>
              <div className="flex gap-2 ml-10 flex-wrap">
                {scenario.ifOptions.map((opt, idx) => (
                  <button key={idx} onClick={() => { setIfChoice(idx); playSound("click"); setRunResult("idle"); }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${ifChoice === idx ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-105' : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:scale-105'}`}>
                    → {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* ELSE Block */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1.5 bg-blue-600 text-white font-display font-bold text-sm rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.4)]">ELSE</span>
                <span className="px-3 py-1.5 bg-slate-700 text-blue-200 font-mono text-sm rounded-lg border border-blue-500/30">No {scenario.condition.replace("?", "")}</span>
              </div>
              <p className="text-xs text-blue-300/70 mb-2 ml-10 font-mono">{scenario.elseAction}</p>
              <div className="flex gap-2 ml-10 flex-wrap">
                {scenario.elseOptions.map((opt, idx) => (
                  <button key={idx} onClick={() => { setElseChoice(idx); playSound("click"); setRunResult("idle"); }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${elseChoice === idx ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105' : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:scale-105'}`}>
                    → {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Run Button */}
          <Button onClick={handleRun} disabled={ifChoice === null || elseChoice === null || runResult === "running" || runResult === "success"}
            className={`h-14 px-10 text-xl font-display font-bold rounded-full transition-all mb-4 ${ifChoice !== null && elseChoice !== null && runResult !== "running" ? 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.5)] active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
            <Play className="h-5 w-5 mr-2 fill-current" /> RUN LOGIC ▶
          </Button>

          {/* Feedback */}
          <div className="h-10">
            {runResult === "success" && (
              <div className="text-2xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-bounce flex items-center gap-3"><Sparkles /> Great! Smart decisions! <Sparkles /></div>
            )}
            {runResult === "fail" && (
              <p className="text-lg font-mono text-red-400/80 animate-in fade-in">Try a different decision!</p>
            )}
          </div>
        </div>
      )}

      {/* ===== SUMMARY ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-rose-950/95 backdrop-blur-xl border-t-4 border-rose-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-rose-900 rounded-full flex items-center justify-center border-4 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-rose-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-rose-200 mb-4">"If–Else helps us make decisions."</h2>
              <p className="text-xl text-rose-300 mb-8 font-mono">"We choose actions based on conditions."</p>
              <Button onClick={() => setPhase("quiz")} className="h-16 px-12 text-2xl font-display font-bold bg-green-500 hover:bg-green-400 text-white rounded-full shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-105 transition-transform">
                START QUIZ <Play className="ml-2 h-6 w-6 fill-current" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QUIZ ===== */}
      {phase === "quiz" && (
        <div className="z-10 flex flex-col items-center w-full max-w-3xl px-4 animate-in fade-in zoom-in duration-500">
          <div className="mb-8 flex items-center gap-2">
            {QUIZ.map((_, idx) => (<div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-rose-900"}`} />))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">{QUIZ[quizIndex].question}</h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-rose-900/50 hover:bg-rose-800 border-2 border-rose-500/40 hover:border-rose-300 rounded-2xl transition-all shadow-lg active:scale-95 text-rose-100">{opt}</button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-rose-950 border-4 border-rose-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(244,63,94,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">🎊 AMAZING! 🎊</h1>
            <div className="bg-rose-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">{badge.icon}</div>
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-rose-200 mb-10">You unlocked a new badge!</p>
            <div className="flex flex-col gap-4 w-full">
              <Button onClick={() => { setPhase("game"); setScenarioIdx(0); setCompletedCount(0); setQuizIndex(0); setIfChoice(null); setElseChoice(null); setRunResult("idle"); }} className="h-14 text-xl font-bold bg-rose-600 hover:bg-rose-500 rounded-full">PLAY AGAIN</Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-rose-500 text-rose-300 hover:bg-rose-900/50 rounded-full">RETURN TO MISSIONS</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
