import { useState, useEffect } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

type Scenario = {
  id: number;
  description: string;
  gridWidth: number;
  gridHeight: number;
  outerOptions: number[];
  innerOptions: number[];
  actionOptions: string[];
  correctOuter: number;
  correctInner: number;
  correctAction: string;
  drawPaths: (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => void;
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    description: "Robot needs to walk down 3 hallways. Each hallway is 3 steps long.",
    gridWidth: 10,
    gridHeight: 2,
    outerOptions: [2, 3, 4],
    innerOptions: [1, 2, 3],
    actionOptions: ["Move Forward", "Turn Left", "Jump"],
    correctOuter: 3,
    correctInner: 3,
    correctAction: "Move Forward",
    drawPaths: (ctx, w, h, p) => {
      ctx.strokeStyle = "#84cc16"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w*0.1, h/2);
      ctx.lineTo(w*0.1 + (w*0.8 * p), h/2);
      ctx.stroke();
    }
  },
  {
    id: 2,
    description: "Collect 4 groups of stars. Each group has 2 stars.",
    gridWidth: 8,
    gridHeight: 4,
    outerOptions: [2, 3, 4],
    innerOptions: [2, 3, 5],
    actionOptions: ["Turn Right", "Collect Star", "Move Back"],
    correctOuter: 4,
    correctInner: 2,
    correctAction: "Collect Star",
    drawPaths: (ctx, w, h, p) => {
      ctx.fillStyle = "#eab308";
      for(let i=0; i<4; i++) {
        for(let j=0; j<2; j++) {
          const totalSteps = 4 * 2;
          const currentStep = i * 2 + j;
          if (p >= currentStep / totalSteps) {
             ctx.beginPath();
             ctx.arc(w*0.2 + i*(w*0.2) + j*20, h/2 + (j%2 === 0 ? -10 : 10), 8, 0, Math.PI*2);
             ctx.fill();
          }
        }
      }
    }
  },
  {
    id: 3,
    description: "Climb 2 big stairs. Each stair takes 2 jumps.",
    gridWidth: 6,
    gridHeight: 6,
    outerOptions: [2, 3, 4],
    innerOptions: [2, 3, 4],
    actionOptions: ["Move Forward", "Jump", "Stop"],
    correctOuter: 2,
    correctInner: 2,
    correctAction: "Jump",
    drawPaths: (ctx, w, h, p) => {
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w*0.1, h*0.9);
      const totalJumps = 4;
      for(let i=0; i<=totalJumps * p; i++) {
         const x = w*0.1 + i*(w*0.15);
         const y = h*0.9 - i*(h*0.15);
         if (i === 0) ctx.moveTo(x, y);
         else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
];

const BADGES = [
  { name: "Loop Genius", icon: <Star className="h-16 w-16 text-lime-400" /> },
  { name: "Repeat Master", icon: <Crown className="h-16 w-16 text-lime-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-lime-400" /> },
  { name: "Logic Champ", icon: <Medal className="h-16 w-16 text-lime-400" /> },
];

const QUIZ = [
  { question: "What does a loop inside a loop mean?", options: ["It breaks the computer", "It repeats a set of repeated actions", "It stops the robot"], correct: 1 },
  { question: "If Outer repeats 2 times, and Inner repeats 3 times, how many total actions?", options: ["5 actions", "6 actions", "2 actions"], correct: 1 },
  { question: "Why use nested loops?", options: ["To repeat actions faster and write less code", "To make the game slower", "Just for fun"], correct: 0 },
];

const playSound = (type: "click" | "success" | "error" | "step") => {
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
    } else if (type === "error") {
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === "step") {
      osc.type = "square"; osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
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

export default function NestedLoopsGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [outerChoice, setOuterChoice] = useState<number | null>(null);
  const [innerChoice, setInnerChoice] = useState<number | null>(null);
  const [actionChoice, setActionChoice] = useState<string | null>(null);
  
  const [runResult, setRunResult] = useState<"idle" | "running" | "success" | "fail">("idle");
  const [progress, setProgress] = useState(0); // 0 to 1
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);

  const scenario = SCENARIOS[scenarioIdx];

  useEffect(() => { return () => { window.speechSynthesis.cancel(); }; }, []);

  // Canvas drawing
  useEffect(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    scenario.drawPaths(ctx, canvas.width, canvas.height, progress);
    
  }, [progress, scenario]);


  const handleRun = () => {
    if (outerChoice === null || innerChoice === null || actionChoice === null) return;
    setRunResult("running");
    playSound("click");
    setProgress(0);

    const isCorrect = outerChoice === scenario.correctOuter && 
                      innerChoice === scenario.correctInner && 
                      actionChoice === scenario.correctAction;

    const totalSteps = outerChoice * innerChoice;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setProgress(currentStep / totalSteps);
      playSound("step");

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          if (isCorrect) {
            setRunResult("success");
            playSound("success");
            setCompletedCount(c => c + 1);
            setTimeout(() => {
              if (scenarioIdx < SCENARIOS.length - 1) {
                setScenarioIdx(i => i + 1);
                setOuterChoice(null);
                setInnerChoice(null);
                setActionChoice(null);
                setRunResult("idle");
                setProgress(0);
              } else {
                setPhase("summary");
                speak("A loop can contain another loop. This helps us repeat actions faster.");
              }
            }, 1500);
          } else {
            setRunResult("fail");
            playSound("error");
            speak("Can you repeat this smarter?");
            setTimeout(() => { 
              setRunResult("idle"); 
              setProgress(0);
            }, 1500);
          }
        }, 500);
      }
    }, 400); // speed of each step
  };

  const handleQuizAnswer = (idx: number) => {
    if (idx === QUIZ[quizIndex].correct) {
      playSound("success");
      if (quizIndex < QUIZ.length - 1) setTimeout(() => setQuizIndex(quizIndex + 1), 800);
      else setTimeout(() => {
        setPhase("reward");
        setBadge(BADGES[Math.floor(Math.random() * BADGES.length)]);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#a3e635", "#84cc16", "#3b82f6", "#eab308"] });
        speak("Great job! You earned a new badge.");
      }, 800);
    } else { playSound("error"); speak("Try again!"); }
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#050C0A] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-lime-300 hover:text-lime-200 hover:bg-lime-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[20%] left-[10%] h-48 w-48 rounded-full bg-lime-900/10 blur-3xl animate-[float_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] right-[10%] h-40 w-40 rounded-full bg-emerald-900/10 blur-3xl animate-[float_20s_ease-in-out_infinite_reverse]" />
      </div>
      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes blockPulse { 0%,100% { border-color: rgba(132,204,22,0.4); } 50% { border-color: rgba(132,204,22,1); box-shadow: 0 0 15px rgba(132,204,22,0.5); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-lime-950/90 border-2 border-lime-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(132,204,22,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-lime-900/50 p-4 rounded-full border border-lime-400/50 mb-6 shadow-[0_0_20px_rgba(132,204,22,0.5)]">
            <Info className="h-16 w-16 text-lime-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-lime-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-lime-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-lime-600 text-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Read the scenario at the top.</li>
            <li className="flex items-start gap-3"><span className="bg-lime-600 text-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Choose the Outer Loop (how many big groups).</li>
            <li className="flex items-start gap-3"><span className="bg-lime-600 text-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Choose the Inner Loop and Action. Then EXECUTE!</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-lime-600 hover:bg-lime-500 text-black rounded-full shadow-[0_0_30px_rgba(132,204,22,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-4xl px-4 animate-in fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-lime-300 mb-1 drop-shadow-[0_0_15px_rgba(132,204,22,0.8)] uppercase tracking-widest text-center">
            Repeat Smartly
          </h1>
          <div className="flex items-center gap-2 mb-4">
            {SCENARIOS.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === scenarioIdx ? 'bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.6)]' : 'bg-lime-900/40'}`} />
            ))}
          </div>

          {/* Scenario Area */}
          <div className="w-full flex flex-col md:flex-row gap-6 mb-6">
            
            {/* Visual Screen */}
            <div className="flex-1 bg-black/50 backdrop-blur-md border border-lime-500/30 rounded-2xl p-4 text-center relative overflow-hidden flex flex-col justify-between">
              <p className="text-lg text-lime-200 font-mono z-10 mb-2">{scenario.description}</p>
              <div className="flex-1 relative w-full border-t border-b border-lime-900/50 my-2 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] bg-repeat opacity-80">
                 <canvas id="game-canvas" width="400" height="200" className="w-full h-full object-contain"></canvas>
                 <div className="absolute top-1/2 left-[5%] -translate-y-1/2 z-20">
                   <Bot className={`h-12 w-12 text-lime-300 ${runResult === 'running' ? 'animate-bounce' : ''}`} />
                 </div>
              </div>
              <div className="h-6">
                {runResult === "success" && <span className="text-green-400 font-bold animate-pulse">Awesome! Loops inside loops!</span>}
                {runResult === "fail" && <span className="text-red-400 font-bold">Can you repeat this smarter?</span>}
              </div>
            </div>

            {/* Code Builder */}
            <div className={`flex-[1.2] bg-slate-900/80 backdrop-blur-md border-2 rounded-2xl p-6 transition-all ${runResult === 'fail' ? 'border-red-500 animate-[shake_0.4s_ease-in-out]' : runResult === 'success' ? 'border-green-500 shadow-[0_0_30px_rgba(74,222,128,0.3)]' : runResult === 'running' ? 'animate-[blockPulse_1s_infinite]' : 'border-lime-500/40'}`}>
              
              {/* Outer Loop */}
              <div className="border-l-4 border-lime-500 pl-4 py-2 mb-2 bg-lime-900/20 rounded-r-xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-display font-bold text-lime-400 uppercase tracking-wider">REPEAT</span>
                  <div className="flex gap-2">
                    {scenario.outerOptions.map(opt => (
                      <button key={`outer-${opt}`} onClick={() => { setOuterChoice(opt); playSound("click"); }} disabled={runResult !== 'idle'}
                        className={`w-10 h-10 rounded-lg font-bold transition-all ${outerChoice === opt ? 'bg-lime-500 text-black shadow-[0_0_15px_rgba(132,204,22,0.6)] scale-110' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-lime-500 border border-slate-600'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <span className="font-display font-bold text-lime-400 uppercase tracking-wider">TIMES</span>
                </div>

                {/* Inner Loop */}
                <div className="mt-4 ml-6 border-l-4 border-emerald-500 pl-4 py-2 mb-2 bg-emerald-900/20 rounded-r-xl">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display font-bold text-emerald-400 uppercase tracking-wider">REPEAT</span>
                    <div className="flex gap-2">
                      {scenario.innerOptions.map(opt => (
                        <button key={`inner-${opt}`} onClick={() => { setInnerChoice(opt); playSound("click"); }} disabled={runResult !== 'idle'}
                          className={`w-10 h-10 rounded-lg font-bold transition-all ${innerChoice === opt ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-110' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-emerald-500 border border-slate-600'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <span className="font-display font-bold text-emerald-400 uppercase tracking-wider">TIMES</span>
                  </div>

                  {/* Action */}
                  <div className="mt-4 ml-6">
                    <div className="flex gap-2 flex-wrap">
                      {scenario.actionOptions.map(opt => (
                        <button key={`action-${opt}`} onClick={() => { setActionChoice(opt); playSound("click"); }} disabled={runResult !== 'idle'}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${actionChoice === opt ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-cyan-500 border border-slate-600'}`}>
                          → {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <Button onClick={handleRun} disabled={outerChoice === null || innerChoice === null || actionChoice === null || runResult !== "idle"}
                className={`mt-6 w-full h-14 text-xl font-display font-bold rounded-xl transition-all ${outerChoice !== null && innerChoice !== null && actionChoice !== null && runResult === "idle" ? 'bg-lime-500 hover:bg-lime-400 text-black shadow-[0_0_25px_rgba(132,204,22,0.5)] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>
                <Play className="h-5 w-5 mr-2 fill-current" /> EXECUTE LOOPS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUMMARY ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-lime-950/95 backdrop-blur-xl border-t-4 border-lime-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-lime-900 rounded-full flex items-center justify-center border-4 border-lime-400 shadow-[0_0_30px_rgba(132,204,22,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-lime-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-lime-200 mb-4">"A loop can contain another loop."</h2>
              <p className="text-xl text-lime-300 mb-8 font-mono">"This helps us repeat actions faster."</p>
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
            {QUIZ.map((_, idx) => (<div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-lime-400 shadow-[0_0_10px_rgba(132,204,22,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-lime-900"}`} />))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">{QUIZ[quizIndex].question}</h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-lime-900/50 hover:bg-lime-800 border-2 border-lime-500/40 hover:border-lime-300 rounded-2xl transition-all shadow-lg active:scale-95 text-lime-100">{opt}</button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-lime-950 border-4 border-lime-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(132,204,22,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">🎊 AMAZING! 🎊</h1>
            <div className="bg-lime-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">{badge.icon}</div>
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-lime-200 mb-10">You unlocked a new badge!</p>
            <div className="flex flex-col gap-4 w-full">
              <Button onClick={() => { setPhase("game"); setScenarioIdx(0); setCompletedCount(0); setQuizIndex(0); setOuterChoice(null); setInnerChoice(null); setActionChoice(null); setRunResult("idle"); setProgress(0); }} className="h-14 text-xl font-bold bg-lime-600 hover:bg-lime-500 text-black rounded-full">PLAY AGAIN</Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-lime-500 text-lime-300 hover:bg-lime-900/50 rounded-full">RETURN TO MISSIONS</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
