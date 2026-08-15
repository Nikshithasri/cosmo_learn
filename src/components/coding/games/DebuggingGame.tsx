import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, Bug, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

type Point = { x: number; y: number };
type Command = "UP" | "DOWN" | "LEFT" | "RIGHT";

type Scenario = {
  id: number;
  description: string;
  gridWidth: number;
  gridHeight: number;
  startPos: Point;
  goalPos: Point;
  obstacles: Point[];
  buggySequence: Command[];
  correctSequence: Command[];
  bugIndex: number; // The index of the bug
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    description: "Robot needs to go around the asteroid. Find the wrong step!",
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 1, y: 2 },
    goalPos: { x: 3, y: 2 },
    obstacles: [{ x: 2, y: 2 }],
    buggySequence: ["UP", "RIGHT", "LEFT", "DOWN"],
    correctSequence: ["UP", "RIGHT", "RIGHT", "DOWN"],
    bugIndex: 2,
  },
  {
    id: 2,
    description: "Robot is getting confused. Fix the code to reach the star!",
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 1, y: 3 },
    goalPos: { x: 4, y: 2 },
    obstacles: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
    buggySequence: ["UP", "RIGHT", "UP", "DOWN"],
    correctSequence: ["UP", "RIGHT", "RIGHT", "RIGHT"],
    bugIndex: 2, // Wait, UP -> 1,2. RIGHT -> 2,2. RIGHT -> 3,2. RIGHT -> 4,2 (Goal!).
    // Buggy: UP(1,2), RIGHT(2,2), UP(2,1), DOWN(2,2).
    // Let's make buggy sequence match length of correct: ["UP", "RIGHT", "UP", "RIGHT"]
  },
  {
    id: 3,
    description: "Two bugs are hiding here! Fix both to reach home safely.",
    gridWidth: 6,
    gridHeight: 5,
    startPos: { x: 1, y: 0 },
    goalPos: { x: 1, y: 4 },
    obstacles: [{ x: 1, y: 2 }],
    buggySequence: ["DOWN", "LEFT", "DOWN", "UP", "RIGHT"],
    correctSequence: ["DOWN", "LEFT", "DOWN", "DOWN", "RIGHT"],
    bugIndex: 3, // Just keeping one bug for simplicity of state, or allow editing any.
  },
];

// Refined scenario 2 and 3
SCENARIOS[1].buggySequence = ["UP", "RIGHT", "UP", "RIGHT"];
SCENARIOS[1].correctSequence = ["UP", "RIGHT", "RIGHT", "RIGHT"];

const BADGES = [
  { name: "Debug Master", icon: <Wrench className="h-16 w-16 text-amber-400" /> },
  { name: "Code Fixer", icon: <Bug className="h-16 w-16 text-amber-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-amber-400" /> },
  { name: "Logic Champ", icon: <Medal className="h-16 w-16 text-amber-400" /> },
];

const QUIZ = [
  { question: "What is debugging?", options: ["Making new bugs", "Fixing mistakes in the code", "Turning off the robot"], correct: 1 },
  { question: "If code doesn't work, what should you do?", options: ["Give up", "Find the mistake and fix it", "Run it again and hope it works"], correct: 1 },
  { question: "Programs don't always work the first time.", options: ["True, we often need to debug", "False, they always work perfectly"], correct: 0 },
];

const playSound = (type: "click" | "success" | "error" | "step" | "bump" | "fix") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "click") {
      osc.type = "sine"; osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    } else if (type === "fix") {
      osc.type = "sine"; osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === "success") {
      osc.type = "sine";
      [523, 659, 784, 1047].forEach((f, i) => osc.frequency.setValueAtTime(f, ctx.currentTime + i*0.1));
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(); osc.stop(ctx.currentTime + 0.45);
    } else if (type === "error" || type === "bump") {
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(type==="bump"?150:250, ctx.currentTime);
      if(type==="error") osc.frequency.setValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === "step") {
      osc.type = "square"; osc.frequency.setValueAtTime(300, ctx.currentTime);
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

const CommandIcon = ({ cmd, className }: { cmd: Command, className?: string }) => {
  if (cmd === "UP") return <ArrowUp className={className} />;
  if (cmd === "DOWN") return <ArrowDown className={className} />;
  if (cmd === "LEFT") return <ArrowLeftIcon className={className} />;
  return <ArrowRight className={className} />;
};

export default function DebuggingGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"game" | "summary" | "quiz" | "reward">("game");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  
  const [currentSequence, setCurrentSequence] = useState<Command[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [runState, setRunState] = useState<"idle" | "running" | "success" | "fail">("idle");
  const [robotPos, setRobotPos] = useState<Point>({ x: 0, y: 0 });
  const [activeCmdIndex, setActiveCmdIndex] = useState<number>(-1);
  
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);
  const runRef = useRef<NodeJS.Timeout | null>(null);

  const scenario = SCENARIOS[scenarioIdx];

  useEffect(() => {
    setCurrentSequence([...scenario.buggySequence]);
    setRobotPos(scenario.startPos);
    setRunState("idle");
    setActiveCmdIndex(-1);
    return () => {
      window.speechSynthesis.cancel();
      if (runRef.current) clearTimeout(runRef.current);
    };
  }, [scenarioIdx]);

  const handleEditCommand = (index: number) => {
    if (runState === "running" || runState === "success") return;
    playSound("click");
    setEditingIndex(index);
  };

  const handleChangeCommand = (cmd: Command) => {
    if (editingIndex === null) return;
    const newSeq = [...currentSequence];
    newSeq[editingIndex] = cmd;
    setCurrentSequence(newSeq);
    setEditingIndex(null);
    playSound("fix");
    setRunState("idle");
    setRobotPos(scenario.startPos);
  };

  const handleRun = () => {
    if (runState === "running") return;
    setRunState("running");
    playSound("click");
    setRobotPos(scenario.startPos);
    setActiveCmdIndex(-1);
    
    let step = 0;
    let currentPos = { ...scenario.startPos };

    const runStep = () => {
      if (step < currentSequence.length) {
        setActiveCmdIndex(step);
        const cmd = currentSequence[step];
        
        let nextPos = { ...currentPos };
        if (cmd === "UP") nextPos.y -= 1;
        if (cmd === "DOWN") nextPos.y += 1;
        if (cmd === "LEFT") nextPos.x -= 1;
        if (cmd === "RIGHT") nextPos.x += 1;

        // Check bounds & obstacles
        const outOfBounds = nextPos.x < 0 || nextPos.x >= scenario.gridWidth || nextPos.y < 0 || nextPos.y >= scenario.gridHeight;
        const hitObstacle = scenario.obstacles.some(o => o.x === nextPos.x && o.y === nextPos.y);

        if (outOfBounds || hitObstacle) {
          playSound("bump");
          setRunState("fail");
          speak("Oops! Hit an obstacle.");
          setTimeout(() => {
            setRobotPos(scenario.startPos);
            setActiveCmdIndex(-1);
            setRunState("idle");
          }, 1500);
          return;
        }

        currentPos = nextPos;
        setRobotPos(currentPos);
        playSound("step");
        
        step++;
        runRef.current = setTimeout(runStep, 600);
      } else {
        setActiveCmdIndex(-1);
        if (currentPos.x === scenario.goalPos.x && currentPos.y === scenario.goalPos.y) {
          setRunState("success");
          playSound("success");
          setCompletedCount(c => c + 1);
          setTimeout(() => {
            if (scenarioIdx < SCENARIOS.length - 1) {
              setScenarioIdx(i => i + 1);
            } else {
              setPhase("summary");
              speak("Debugging means fixing mistakes. Programs don't always work the first time.");
            }
          }, 1500);
        } else {
          setRunState("fail");
          playSound("error");
          speak("We didn't reach the goal. Find the mistake!");
          setTimeout(() => {
            setRobotPos(scenario.startPos);
            setRunState("idle");
          }, 1500);
        }
      }
    };

    runRef.current = setTimeout(runStep, 400);
  };

  const handleQuizAnswer = (idx: number) => {
    if (idx === QUIZ[quizIndex].correct) {
      playSound("success");
      if (quizIndex < QUIZ.length - 1) setTimeout(() => setQuizIndex(quizIndex + 1), 800);
      else setTimeout(() => {
        setPhase("reward");
        setBadge(BADGES[Math.floor(Math.random() * BADGES.length)]);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#fbbf24", "#f59e0b", "#d97706", "#3b82f6"] });
        speak("Great job! You earned a new badge.");
      }, 800);
    } else { playSound("error"); speak("Try again!"); }
  };

  const CELL_SIZE = 56;

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#0F0806] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-amber-300 hover:text-amber-200 hover:bg-amber-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[10%] right-[15%] h-48 w-48 rounded-full bg-amber-900/15 blur-3xl animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] left-[20%] h-36 w-36 rounded-full bg-orange-900/15 blur-3xl animate-[float_19s_ease-in-out_infinite_reverse]" />
      </div>
      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes blinkRed { 0%,100% { background-color: rgba(239, 68, 68, 0.2); } 50% { background-color: rgba(239, 68, 68, 0.6); } }
      `}</style>

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-4xl px-4 animate-in fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-amber-400 mb-1 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] uppercase tracking-widest text-center">
            Fix the Code
          </h1>
          <div className="flex items-center gap-2 mb-4">
            {SCENARIOS.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === scenarioIdx ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-amber-900/40'}`} />
            ))}
          </div>
          <p className="text-lg text-amber-200/90 font-mono mb-6 text-center">{scenario.description}</p>

          <div className="flex flex-col md:flex-row items-start gap-8 w-full justify-center">
            
            {/* Grid Area */}
            <div 
              className={`relative bg-black/40 backdrop-blur-md border border-amber-500/30 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.1)] overflow-hidden flex-shrink-0 ${runState === 'fail' ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
              style={{ width: scenario.gridWidth * CELL_SIZE, height: scenario.gridHeight * CELL_SIZE }}
            >
              {Array.from({ length: scenario.gridHeight }).map((_, y) => (
                Array.from({ length: scenario.gridWidth }).map((_, x) => (
                  <div key={`${x}-${y}`} className="absolute border border-amber-700/20" style={{ left: x * CELL_SIZE, top: y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }} />
                ))
              ))}

              {/* Obstacles */}
              {scenario.obstacles.map((obs, idx) => (
                <div key={`obs-${idx}`} className="absolute flex items-center justify-center z-10 text-3xl drop-shadow-md" style={{ left: obs.x * CELL_SIZE, top: obs.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>🪨</div>
              ))}

              {/* Goal */}
              <div className={`absolute flex items-center justify-center z-10 text-4xl transition-all duration-300 ${runState === 'success' ? 'drop-shadow-[0_0_20px_rgba(34,197,94,0.9)] scale-110 animate-pulse' : 'drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] opacity-80'}`} style={{ left: scenario.goalPos.x * CELL_SIZE, top: scenario.goalPos.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>🏁</div>

              {/* Robot */}
              <div className="absolute flex items-center justify-center z-30 transition-all duration-300 ease-in-out" style={{ left: robotPos.x * CELL_SIZE, top: robotPos.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>
                <div className={`${runState === 'success' ? 'scale-125' : ''}`}>
                  <Bot className={`h-10 w-10 ${runState === 'success' ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]' : runState === 'fail' ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,1)]' : 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`} />
                </div>
              </div>
            </div>

            {/* Code Panel */}
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-amber-200 font-mono text-sm border-b border-amber-900/50 pb-2">
                  <Bug className="h-4 w-4" /> Tap a block to fix it
                </div>
                
                <div className="flex flex-col gap-2">
                  {currentSequence.map((cmd, idx) => (
                    <div key={idx} className="relative">
                      <button
                        onClick={() => handleEditCommand(idx)}
                        disabled={runState === "running" || runState === "success"}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${
                          activeCmdIndex === idx 
                            ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105 z-10' 
                            : editingIndex === idx
                            ? 'bg-slate-700 border-2 border-amber-400 text-amber-300'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-3"><CommandIcon cmd={cmd} className="h-5 w-5" /> MOVE {cmd}</span>
                        {/* Hint for bug */}
                        {runState === 'fail' && cmd === scenario.buggySequence[idx] && cmd !== scenario.correctSequence[idx] && (
                           <Bug className="h-5 w-5 text-red-400 animate-bounce" />
                        )}
                      </button>

                      {/* Edit Menu Popover */}
                      {editingIndex === idx && (
                        <div className="absolute top-0 left-full ml-2 bg-slate-800 border border-amber-500 rounded-xl p-2 flex gap-2 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                          {(["UP", "DOWN", "LEFT", "RIGHT"] as Command[]).map(c => (
                            <button key={c} onClick={() => handleChangeCommand(c)} className={`p-3 rounded-lg transition-colors ${cmd === c ? 'bg-amber-500 text-black' : 'hover:bg-slate-700 text-white'}`}>
                              <CommandIcon cmd={c} className="h-6 w-6" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <Button onClick={handleRun} disabled={runState === "running" || runState === "success" || editingIndex !== null}
                  className={`mt-6 w-full h-14 text-xl font-display font-bold rounded-xl transition-all ${runState === "idle" || runState === "fail" ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>
                  <Play className="h-5 w-5 mr-2 fill-current" /> RUN CODE
                </Button>
              </div>
              
              <div className="h-8 text-center">
                {runState === "success" && <span className="text-green-400 font-bold text-lg animate-pulse">Great! You fixed the mistake!</span>}
                {runState === "fail" && <span className="text-red-400 font-bold text-lg">Something is wrong. Fix it!</span>}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===== SUMMARY ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-amber-950/95 backdrop-blur-xl border-t-4 border-amber-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(245,158,11,0.15)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-amber-900 rounded-full flex items-center justify-center border-4 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-amber-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-amber-200 mb-4">"Debugging means fixing mistakes."</h2>
              <p className="text-xl text-amber-300 mb-8 font-mono">"Programs don't always work the first time."</p>
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
            {QUIZ.map((_, idx) => (<div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-amber-900"}`} />))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">{QUIZ[quizIndex].question}</h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-amber-900/50 hover:bg-amber-800 border-2 border-amber-500/40 hover:border-amber-300 rounded-2xl transition-all shadow-lg active:scale-95 text-amber-100">{opt}</button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-amber-950 border-4 border-amber-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(245,158,11,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">🎊 AMAZING! 🎊</h1>
            <div className="bg-amber-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">{badge.icon}</div>
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-amber-200 mb-10">You unlocked a new badge!</p>
            <div className="flex flex-col gap-4 w-full">
              <Button onClick={() => { setPhase("game"); setScenarioIdx(0); setCompletedCount(0); setQuizIndex(0); setCurrentSequence([...SCENARIOS[0].buggySequence]); setRobotPos(SCENARIOS[0].startPos); setRunState("idle"); }} className="h-14 text-xl font-bold bg-amber-600 hover:bg-amber-500 text-black rounded-full">PLAY AGAIN</Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-amber-500 text-amber-300 hover:bg-amber-900/50 rounded-full">RETURN TO MISSIONS</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
