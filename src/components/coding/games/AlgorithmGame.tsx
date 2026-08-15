import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, X, Info } from "lucide-react";
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
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    description: "Build a plan to reach the flag!",
    gridWidth: 5,
    gridHeight: 4,
    startPos: { x: 1, y: 1 },
    goalPos: { x: 3, y: 1 },
    obstacles: [{ x: 2, y: 0 }, { x: 2, y: 2 }],
  },
  {
    id: 2,
    description: "Go around the asteroids to reach the goal.",
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 0, y: 0 },
    goalPos: { x: 4, y: 2 },
    obstacles: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }],
  },
  {
    id: 3,
    description: "Plan the longest path safely!",
    gridWidth: 6,
    gridHeight: 5,
    startPos: { x: 0, y: 4 },
    goalPos: { x: 5, y: 0 },
    obstacles: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 2 }, { x: 4, y: 1 }],
  },
];

const BADGES = [
  { name: "Algorithm Master", icon: <Star className="h-16 w-16 text-violet-400" /> },
  { name: "Code Planner", icon: <Crown className="h-16 w-16 text-violet-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-violet-400" /> },
  { name: "Logic Champ", icon: <Medal className="h-16 w-16 text-violet-400" /> },
];

const QUIZ = [
  { question: "What is an algorithm?", options: ["A robot's name", "A step-by-step plan", "A type of game"], correct: 1 },
  { question: "Why do we plan steps before running?", options: ["To solve problems faster and safely", "Because robots are slow", "To make more mistakes"], correct: 0 },
  { question: "If the plan is wrong, what happens?", options: ["The computer breaks", "The robot does not reach the goal", "The game ends forever"], correct: 1 },
];

const playSound = (type: "click" | "success" | "error" | "step" | "bump" | "pop") => {
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
    } else if (type === "pop") {
      osc.type = "sine"; osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
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

export default function AlgorithmGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  
  const [userSequence, setUserSequence] = useState<Command[]>([]);
  const [runState, setRunState] = useState<"idle" | "running" | "success" | "fail">("idle");
  const [robotPos, setRobotPos] = useState<Point>({ x: 0, y: 0 });
  const [activeCmdIndex, setActiveCmdIndex] = useState<number>(-1);
  
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);
  const runRef = useRef<NodeJS.Timeout | null>(null);

  const scenario = SCENARIOS[scenarioIdx];

  useEffect(() => {
    setUserSequence([]);
    setRobotPos(scenario.startPos);
    setRunState("idle");
    setActiveCmdIndex(-1);
    return () => {
      window.speechSynthesis.cancel();
      if (runRef.current) clearTimeout(runRef.current);
    };
  }, [scenarioIdx]);

  const handleAddCommand = (cmd: Command) => {
    if (runState === "running" || runState === "success") return;
    if (userSequence.length >= 15) return; // limit
    playSound("pop");
    setUserSequence([...userSequence, cmd]);
  };

  const handleRemoveLast = () => {
    if (runState === "running" || runState === "success" || userSequence.length === 0) return;
    playSound("click");
    setUserSequence(userSequence.slice(0, -1));
  };

  const handleClear = () => {
    if (runState === "running" || runState === "success") return;
    playSound("click");
    setUserSequence([]);
  };

  const handleRun = () => {
    if (runState === "running" || userSequence.length === 0) return;
    setRunState("running");
    playSound("click");
    setRobotPos(scenario.startPos);
    setActiveCmdIndex(-1);
    
    let step = 0;
    let currentPos = { ...scenario.startPos };

    const runStep = () => {
      if (step < userSequence.length) {
        setActiveCmdIndex(step);
        const cmd = userSequence[step];
        
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
          speak("Oops! Hit an obstacle or wall.");
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
        runRef.current = setTimeout(runStep, 500);
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
              speak("An algorithm is a step by step plan. Planning helps us solve problems faster.");
            }
          }, 1500);
        } else {
          setRunState("fail");
          playSound("error");
          speak("Try planning a better path!");
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
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#8b5cf6", "#a855f7", "#c084fc", "#eab308"] });
        speak("Great job! You earned a new badge.");
      }, 800);
    } else { playSound("error"); speak("Try again!"); }
  };

  const CELL_SIZE = 56;

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#08060F] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-violet-300 hover:text-violet-200 hover:bg-violet-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[10%] right-[15%] h-48 w-48 rounded-full bg-violet-900/15 blur-3xl animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] left-[20%] h-36 w-36 rounded-full bg-fuchsia-900/15 blur-3xl animate-[float_19s_ease-in-out_infinite_reverse]" />
      </div>
      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-violet-950/90 border-2 border-violet-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(139,92,246,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-violet-900/50 p-4 rounded-full border border-violet-400/50 mb-6 shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <Info className="h-16 w-16 text-violet-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-violet-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-violet-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Look at the grid and find a safe path to the flag 🏁.</li>
            <li className="flex items-start gap-3"><span className="bg-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Build your sequence by tapping the arrow blocks.</li>
            <li className="flex items-start gap-3"><span className="bg-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Press RUN to execute your full algorithm. The robot will only follow your planned steps!</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-105 transition-transform">
            START PLANNING
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-5xl px-4 animate-in fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-violet-400 mb-1 drop-shadow-[0_0_15px_rgba(139,92,246,0.8)] uppercase tracking-widest text-center">
            Build the Solution
          </h1>
          <div className="flex items-center gap-2 mb-4">
            {SCENARIOS.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === scenarioIdx ? 'bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-violet-900/40'}`} />
            ))}
          </div>
          <p className="text-lg text-violet-200/90 font-mono mb-6 text-center">{scenario.description}</p>

          <div className="flex flex-col md:flex-row items-center gap-8 w-full justify-center">
            
            {/* Grid Area */}
            <div 
              className={`relative bg-black/40 backdrop-blur-md border border-violet-500/30 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.1)] overflow-hidden flex-shrink-0 ${runState === 'fail' ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
              style={{ width: scenario.gridWidth * CELL_SIZE, height: scenario.gridHeight * CELL_SIZE }}
            >
              {Array.from({ length: scenario.gridHeight }).map((_, y) => (
                Array.from({ length: scenario.gridWidth }).map((_, x) => (
                  <div key={`${x}-${y}`} className="absolute border border-violet-700/20" style={{ left: x * CELL_SIZE, top: y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }} />
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
                  <Bot className={`h-10 w-10 ${runState === 'success' ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]' : runState === 'fail' ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,1)]' : 'text-violet-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]'}`} />
                </div>
              </div>
            </div>

            {/* Code Panel */}
            <div className="flex flex-col gap-4 w-full max-w-md">
              {/* Controls */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-violet-500/30 rounded-2xl p-4 shadow-xl">
                <p className="text-violet-200 font-mono text-sm mb-3 uppercase tracking-wider text-center">Add Steps to Plan</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(["UP", "DOWN", "LEFT", "RIGHT"] as Command[]).map(c => (
                    <button key={c} onClick={() => handleAddCommand(c)} disabled={runState !== "idle" && runState !== "fail"}
                      className="flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-violet-600 border border-violet-500/50 hover:border-violet-400 text-violet-300 hover:text-white rounded-xl h-16 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                      <CommandIcon cmd={c} className="h-6 w-6" />
                    </button>
                  ))}
                </div>
                
                {/* Sequence Builder */}
                <div className="bg-black/50 border border-slate-700 rounded-xl p-3 min-h-[100px] flex flex-wrap gap-2 content-start">
                  {userSequence.length === 0 && <span className="text-slate-500 font-mono text-sm w-full text-center mt-6">Sequence is empty</span>}
                  {userSequence.map((cmd, idx) => (
                    <div key={idx} className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all ${
                      activeCmdIndex === idx ? 'bg-violet-500 border-violet-300 text-white shadow-[0_0_15px_rgba(139,92,246,0.8)] scale-110' : 'bg-slate-800 border-slate-600 text-slate-300'
                    }`}>
                      <CommandIcon cmd={cmd} className="h-5 w-5" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={handleRemoveLast} disabled={runState !== "idle" && runState !== "fail" || userSequence.length === 0}
                    className="flex-1 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
                    <X className="h-4 w-4 mr-1" /> Undo
                  </Button>
                  <Button variant="outline" onClick={handleClear} disabled={runState !== "idle" && runState !== "fail" || userSequence.length === 0}
                    className="flex-1 bg-slate-800 border-slate-600 text-red-400 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/50">
                    Clear All
                  </Button>
                </div>
                
                <Button onClick={handleRun} disabled={runState === "running" || runState === "success" || userSequence.length === 0}
                  className={`mt-4 w-full h-14 text-xl font-display font-bold rounded-xl transition-all ${runState === "idle" || runState === "fail" ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.4)] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>
                  <Play className="h-5 w-5 mr-2 fill-current" /> EXECUTE PLAN
                </Button>
              </div>
              
              <div className="h-8 text-center">
                {runState === "success" && <span className="text-green-400 font-bold text-lg animate-pulse">Great! You planned the solution!</span>}
                {runState === "fail" && <span className="text-red-400 font-bold text-lg">Try planning a better path!</span>}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===== SUMMARY ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-violet-950/95 backdrop-blur-xl border-t-4 border-violet-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(139,92,246,0.15)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-violet-900 rounded-full flex items-center justify-center border-4 border-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-violet-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-violet-200 mb-4">"An algorithm is a step-by-step plan."</h2>
              <p className="text-xl text-violet-300 mb-8 font-mono">"Planning helps us solve problems faster."</p>
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
            {QUIZ.map((_, idx) => (<div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-violet-900"}`} />))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">{QUIZ[quizIndex].question}</h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-violet-900/50 hover:bg-violet-800 border-2 border-violet-500/40 hover:border-violet-300 rounded-2xl transition-all shadow-lg active:scale-95 text-violet-100">{opt}</button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-violet-950 border-4 border-violet-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(139,92,246,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">🎊 AMAZING! 🎊</h1>
            <div className="bg-violet-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">{badge.icon}</div>
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-violet-200 mb-10">You unlocked a new badge!</p>
            <div className="flex flex-col gap-4 w-full">
              <Button onClick={() => { setPhase("game"); setScenarioIdx(0); setCompletedCount(0); setQuizIndex(0); setUserSequence([]); setRobotPos(SCENARIOS[0].startPos); setRunState("idle"); }} className="h-14 text-xl font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-full">PLAY AGAIN</Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-violet-500 text-violet-300 hover:bg-violet-900/50 rounded-full">RETURN TO MISSIONS</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
