import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bot, Play, Trophy, Crown, Star, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, X, Zap, Battery, BatteryCharging } from "lucide-react";
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
  batteries: Point[];
  startEnergy: number;
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    description: "Reach the goal before energy runs out! Every step costs 1 energy.",
    gridWidth: 5,
    gridHeight: 3,
    startPos: { x: 0, y: 1 },
    goalPos: { x: 4, y: 1 },
    obstacles: [{ x: 2, y: 0 }, { x: 2, y: 2 }],
    batteries: [],
    startEnergy: 5,
  },
  {
    id: 2,
    description: "You don't have enough energy! Collect the battery (+2) to reach the goal.",
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 0, y: 0 },
    goalPos: { x: 4, y: 4 },
    obstacles: [{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 4, y: 0 }],
    batteries: [{ x: 2, y: 2 }],
    startEnergy: 6,
  },
  {
    id: 3,
    description: "Plan the longest path and manage your energy carefully!",
    gridWidth: 6,
    gridHeight: 5,
    startPos: { x: 0, y: 4 },
    goalPos: { x: 5, y: 0 },
    obstacles: [{ x: 1, y: 3 }, { x: 2, y: 4 }, { x: 3, y: 1 }, { x: 4, y: 1 }],
    batteries: [{ x: 1, y: 1 }, { x: 4, y: 4 }],
    startEnergy: 6,
  },
];

const BADGES = [
  { name: "Energy Master", icon: <Zap className="h-16 w-16 text-yellow-400" /> },
  { name: "Variable Hero", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
  { name: "Space Programmer", icon: <Star className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ = [
  { question: "What does a variable do?", options: ["Stores a value that can change", "Stops the robot", "Makes the game look cool"], correct: 0 },
  { question: "What happens when energy becomes 0?", options: ["The robot goes faster", "The robot stops moving", "The goal moves closer"], correct: 1 },
  { question: "Which code increases energy?", options: ["energy = 0", "energy = energy - 1", "energy = energy + 2"], correct: 2 },
];

const playSound = (type: "click" | "success" | "error" | "step" | "bump" | "pop" | "charge") => {
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
    } else if (type === "charge") {
      osc.type = "triangle"; 
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) { /* ignore */ }
};

const speak = (text: string) => {
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1.1;
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

export default function EnergyManagerGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  
  const [userSequence, setUserSequence] = useState<Command[]>([]);
  const [runState, setRunState] = useState<"idle" | "running" | "success" | "fail">("idle");
  const [robotPos, setRobotPos] = useState<Point>({ x: 0, y: 0 });
  const [activeCmdIndex, setActiveCmdIndex] = useState<number>(-1);
  const [energy, setEnergy] = useState<number>(0);
  const [collectedBatteries, setCollectedBatteries] = useState<Point[]>([]);
  
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);
  const runRef = useRef<NodeJS.Timeout | null>(null);

  const scenario = SCENARIOS[scenarioIdx];

  useEffect(() => {
    setUserSequence([]);
    setRobotPos(scenario.startPos);
    setEnergy(scenario.startEnergy);
    setCollectedBatteries([]);
    setRunState("idle");
    setActiveCmdIndex(-1);
    return () => {
      window.speechSynthesis.cancel();
      if (runRef.current) clearTimeout(runRef.current);
    };
  }, [scenarioIdx, scenario.startPos, scenario.startEnergy]);

  const handleAddCommand = (cmd: Command) => {
    if (runState === "running" || runState === "success") return;
    if (userSequence.length >= 15) return;
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
    setEnergy(scenario.startEnergy);
    setCollectedBatteries([]);
    setActiveCmdIndex(-1);
    
    let step = 0;
    let currentPos = { ...scenario.startPos };
    let currentEnergy = scenario.startEnergy;
    let currentCollected: Point[] = [];

    const runStep = () => {
      if (step < userSequence.length) {
        if (currentEnergy <= 0) {
          playSound("error");
          setRunState("fail");
          speak("Energy depleted! You must keep the energy above zero.");
          setTimeout(() => {
            setRobotPos(scenario.startPos);
            setEnergy(scenario.startEnergy);
            setCollectedBatteries([]);
            setActiveCmdIndex(-1);
            setRunState("idle");
          }, 2000);
          return;
        }

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
            setEnergy(scenario.startEnergy);
            setCollectedBatteries([]);
            setActiveCmdIndex(-1);
            setRunState("idle");
          }, 1500);
          return;
        }

        currentPos = nextPos;
        currentEnergy -= 1;
        
        // Check battery
        const onBattery = scenario.batteries.find(b => b.x === currentPos.x && b.y === currentPos.y && !currentCollected.some(cb => cb.x === b.x && cb.y === b.y));
        if (onBattery) {
          currentEnergy += 2;
          currentCollected.push(onBattery);
          setCollectedBatteries([...currentCollected]);
          playSound("charge");
        } else {
          playSound("step");
        }

        setRobotPos(currentPos);
        setEnergy(currentEnergy);
        
        step++;
        runRef.current = setTimeout(runStep, 600); // Slower pace for energy read
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
              speak("Variables store values. The energy value changes while the program runs.");
            }
          }, 2000);
        } else {
          setRunState("fail");
          playSound("error");
          speak("You didn't reach the goal. Try again!");
          setTimeout(() => {
            setRobotPos(scenario.startPos);
            setEnergy(scenario.startEnergy);
            setCollectedBatteries([]);
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
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors: ["#3b82f6", "#2dd4bf", "#eab308", "#f43f5e"] });
        speak("Great job! You are an Energy Master.");
      }, 800);
    } else { playSound("error"); speak("Try again!"); }
  };

  const CELL_SIZE = 64;

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#040816] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-blue-300 hover:text-blue-200 hover:bg-blue-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[15%] right-[10%] h-64 w-64 rounded-full bg-blue-900/20 blur-[80px] animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] left-[15%] h-48 w-48 rounded-full bg-teal-900/20 blur-[60px] animate-[float_19s_ease-in-out_infinite_reverse]" />
      </div>
      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-blue-950/90 border-2 border-blue-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(59,130,246,0.3)] max-w-2xl text-center animate-in zoom-in duration-500">
          <div className="bg-blue-900/50 p-4 rounded-full border border-blue-400/50 mb-6 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <BatteryCharging className="h-16 w-16 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-display font-bold text-blue-300 mb-4 drop-shadow-md uppercase tracking-widest">Energy Manager</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left font-mono bg-black/40 p-6 rounded-2xl border border-blue-500/30 mb-8">
             <div className="flex flex-col gap-3">
               <h3 className="text-blue-300 font-bold uppercase border-b border-blue-500/30 pb-2">The Rules</h3>
               <div className="flex items-center gap-3 text-sm"><Bot className="text-blue-400 h-5 w-5"/> Starts with `energy = {scenario.startEnergy}`</div>
               <div className="flex items-center gap-3 text-sm text-red-300"><Zap className="text-red-400 h-5 w-5"/> Moves cost `energy = energy - 1`</div>
               <div className="flex items-center gap-3 text-sm text-green-300"><Battery className="text-green-400 h-5 w-5"/> Battery gives `energy = energy + 2`</div>
             </div>
             <div className="flex flex-col gap-3 justify-center">
               <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-500/20 text-sm text-blue-100">
                 Variables are like boxes that store numbers. Watch how the <strong className="text-yellow-400">energy</strong> variable changes while the robot moves!
               </div>
             </div>
          </div>
          
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:scale-105 transition-transform">
            START MISSION 🚀
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-6xl px-4 animate-in fade-in duration-500">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-6 w-full">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-blue-400 mb-2 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] uppercase tracking-widest text-center">
              Mission {scenarioIdx + 1}
            </h1>
            <div className="flex items-center gap-2 mb-3">
              {SCENARIOS.map((_, idx) => (
                <div key={idx} className={`h-2 w-12 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === scenarioIdx ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-blue-900/40'}`} />
              ))}
            </div>
            <p className="text-lg text-blue-200/90 font-mono text-center max-w-2xl">{scenario.description}</p>
          </div>

          <div className="flex flex-col lg:flex-row items-start gap-8 w-full justify-center">
            
            {/* Left Column: Variable Panel & Grid */}
            <div className="flex flex-col items-center gap-6">
              
              {/* Python Variable Panel */}
              <div className="bg-slate-900/90 backdrop-blur-md border-2 border-blue-500/50 rounded-2xl p-6 w-full shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-blue-500" />
                <h3 className="text-blue-300 font-mono text-sm uppercase mb-3 flex items-center justify-between">
                  <span>Current Variable State</span>
                  <Zap className={`h-5 w-5 ${energy <= 1 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`} />
                </h3>
                <div className="bg-black/60 rounded-xl p-4 border border-blue-900 font-mono text-2xl flex items-center gap-4">
                  <span className="text-blue-400 font-bold">energy</span>
                  <span className="text-slate-400">=</span>
                  <span className={`font-bold text-4xl transition-all duration-300 ${energy === 0 ? 'text-red-500' : 'text-yellow-400'} ${runState === 'running' ? 'scale-110 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : ''}`}>
                    {energy}
                  </span>
                </div>
                
                {/* Visual Energy Bar */}
                <div className="mt-4 flex gap-1 h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  {Array.from({ length: Math.max(scenario.startEnergy + 4, 10) }).map((_, i) => (
                    <div key={i} className={`flex-1 transition-all duration-500 ${i < energy ? (energy <= 1 ? 'bg-red-500' : 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]') : 'bg-transparent'}`} />
                  ))}
                </div>
              </div>

              {/* Grid Area */}
              <div 
                className={`relative bg-black/40 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden flex-shrink-0 ${runState === 'fail' ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
                style={{ width: scenario.gridWidth * CELL_SIZE, height: scenario.gridHeight * CELL_SIZE }}
              >
                {Array.from({ length: scenario.gridHeight }).map((_, y) => (
                  Array.from({ length: scenario.gridWidth }).map((_, x) => (
                    <div key={`${x}-${y}`} className="absolute border border-blue-700/20" style={{ left: x * CELL_SIZE, top: y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }} />
                  ))
                ))}

                {/* Obstacles */}
                {scenario.obstacles.map((obs, idx) => (
                  <div key={`obs-${idx}`} className="absolute flex items-center justify-center z-10 text-4xl drop-shadow-md" style={{ left: obs.x * CELL_SIZE, top: obs.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>🪨</div>
                ))}

                {/* Batteries */}
                {scenario.batteries.map((b, idx) => {
                  const collected = collectedBatteries.some(cb => cb.x === b.x && cb.y === b.y);
                  return (
                    <div key={`bat-${idx}`} className={`absolute flex items-center justify-center z-10 text-3xl transition-all duration-500 ${collected ? 'scale-150 opacity-0' : 'scale-100 opacity-100 animate-pulse drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]'}`} style={{ left: b.x * CELL_SIZE, top: b.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>
                      🔋
                    </div>
                  );
                })}

                {/* Goal */}
                <div className={`absolute flex items-center justify-center z-10 text-4xl transition-all duration-300 ${runState === 'success' ? 'drop-shadow-[0_0_20px_rgba(59,130,246,0.9)] scale-110 animate-pulse' : 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] opacity-80'}`} style={{ left: scenario.goalPos.x * CELL_SIZE, top: scenario.goalPos.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>🏁</div>

                {/* Robot */}
                <div className="absolute flex items-center justify-center z-30 transition-all duration-300 ease-in-out" style={{ left: robotPos.x * CELL_SIZE, top: robotPos.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}>
                  <div className={`${runState === 'success' ? 'scale-125' : ''}`}>
                    <Bot className={`h-10 w-10 ${runState === 'success' ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]' : runState === 'fail' ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,1)]' : 'text-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Code Builder */}
            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="bg-slate-900/80 backdrop-blur-md border border-blue-500/30 rounded-2xl p-5 shadow-xl">
                <p className="text-blue-200 font-mono text-sm mb-3 uppercase tracking-wider text-center">Movement Queue</p>
                
                {/* Direction Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(["UP", "DOWN", "LEFT", "RIGHT"] as Command[]).map(c => (
                    <button key={c} onClick={() => handleAddCommand(c)} disabled={runState !== "idle" && runState !== "fail"}
                      className="flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 text-blue-300 hover:text-white rounded-xl h-16 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                      <CommandIcon cmd={c} className="h-6 w-6" />
                    </button>
                  ))}
                </div>
                
                {/* Sequence Viewer */}
                <div className="bg-black/50 border border-slate-700 rounded-xl p-3 min-h-[120px] flex flex-wrap gap-2 content-start relative">
                  {userSequence.length === 0 && <span className="text-slate-500 font-mono text-sm w-full text-center mt-8">Queue empty</span>}
                  {userSequence.map((cmd, idx) => (
                    <div key={idx} className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all ${
                      activeCmdIndex === idx ? 'bg-blue-500 border-blue-300 text-white shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110' : 'bg-slate-800 border-slate-600 text-slate-300'
                    }`}>
                      <CommandIcon cmd={cmd} className="h-5 w-5" />
                    </div>
                  ))}
                </div>

                {/* Edit Controls */}
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
                
                {/* Execute Button */}
                <Button onClick={handleRun} disabled={runState === "running" || runState === "success" || userSequence.length === 0}
                  className={`mt-4 w-full h-14 text-xl font-display font-bold rounded-xl transition-all ${runState === "idle" || runState === "fail" ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>
                  <Play className="h-5 w-5 mr-2 fill-current" /> EXECUTE QUEUE
                </Button>
              </div>
              
              {/* Feedback messages */}
              <div className="h-10 text-center flex items-center justify-center font-mono">
                {runState === "success" && <span className="text-green-400 font-bold text-lg animate-pulse">Mission Accomplished!</span>}
                {runState === "fail" && <span className="text-red-400 font-bold text-lg">Mission Failed. Adjust your queue.</span>}
                {runState === "running" && <span className="text-yellow-400 font-bold text-lg animate-pulse">Executing code...</span>}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===== SUMMARY ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-blue-950/95 backdrop-blur-xl border-t-4 border-blue-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(59,130,246,0.15)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-blue-900 rounded-full flex items-center justify-center border-4 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <BatteryCharging className="h-20 w-20 text-yellow-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-blue-200 mb-4">"Variables store values."</h2>
              <p className="text-xl text-blue-300 mb-8 font-mono">"Values can change while the program runs, just like your energy changed!"</p>
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
            {QUIZ.map((_, idx) => (<div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-blue-900"}`} />))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">{QUIZ[quizIndex].question}</h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-blue-900/50 hover:bg-blue-800 border-2 border-blue-500/40 hover:border-blue-300 rounded-2xl transition-all shadow-lg active:scale-95 text-blue-100">{opt}</button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-blue-950 border-4 border-blue-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(59,130,246,0.6)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.3),transparent_70%)] pointer-events-none" />
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">🎊 AMAZING! 🎊</h1>
            <div className="bg-blue-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite] relative z-10">{badge.icon}</div>
            <h2 className="text-3xl font-bold text-white mb-2 relative z-10">{badge.name}</h2>
            <p className="text-lg text-blue-200 mb-10 relative z-10">You learned how to store and change values!</p>
            <div className="flex flex-col gap-4 w-full relative z-10">
              <Button onClick={() => { setPhase("game"); setScenarioIdx(0); setCompletedCount(0); setQuizIndex(0); setUserSequence([]); setRobotPos(SCENARIOS[0].startPos); setEnergy(SCENARIOS[0].startEnergy); setCollectedBatteries([]); setRunState("idle"); }} className="h-14 text-xl font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-full">PLAY AGAIN</Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-blue-500 text-blue-300 hover:bg-blue-900/50 rounded-full">RETURN TO MISSIONS</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
