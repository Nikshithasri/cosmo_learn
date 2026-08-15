import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

type Point = { x: number; y: number };

type Challenge = {
  id: number;
  gridWidth: number;
  gridHeight: number;
  startPos: Point;
  goalPos: Point;
  collectibles: Point[];
  obstacles: Point[];
  instruction: string;
};

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 0, y: 2 },
    goalPos: { x: 4, y: 2 },
    collectibles: [{ x: 2, y: 2 }],
    obstacles: [{ x: 2, y: 0 }, { x: 2, y: 4 }],
    instruction: "Collect the ⭐ and reach the base 🏁",
  },
  {
    id: 2,
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 0, y: 4 },
    goalPos: { x: 4, y: 0 },
    collectibles: [{ x: 0, y: 0 }, { x: 4, y: 4 }],
    obstacles: [{ x: 2, y: 2 }],
    instruction: "Collect both ⭐⭐ before heading home 🏁",
  },
  {
    id: 3,
    gridWidth: 6,
    gridHeight: 5,
    startPos: { x: 0, y: 2 },
    goalPos: { x: 5, y: 2 },
    collectibles: [{ x: 2, y: 0 }, { x: 2, y: 4 }],
    obstacles: [{ x: 2, y: 1 }, { x: 2, y: 3 }, { x: 3, y: 2 }],
    instruction: "Get all energy cells ⭐ to power the base 🏁",
  },
];

const BADGES = [
  { name: "Mission Master", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Space Explorer", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
  { name: "Galaxy Hero", icon: <Medal className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ_QUESTIONS = [
  {
    question: "What should you do first in a mission?",
    options: ["Look at the goal and plan", "Run around randomly", "Go straight to the end"],
    correct: 0,
  },
  {
    question: "You need 2 stars to open the door. You have 1. What now?",
    options: ["Try to open the door", "Find the second star", "Give up"],
    correct: 1,
  },
  {
    question: "Which of these is a bad plan?",
    options: ["Collecting all items on the way", "Walking into an asteroid", "Following the shortest path"],
    correct: 1,
  },
];

// --- Audio ---
const playSound = (type: "step" | "collect" | "success" | "error" | "bump") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "step") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === "collect") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === "bump") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
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
      osc.type = "square";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) { console.error("Audio error", e); }
};

const speak = (text: string) => {
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1.2;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
};

export default function GoalBasedMissionsGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [robotPos, setRobotPos] = useState<Point>({ x: 0, y: 0 });
  const [collectedItems, setCollectedItems] = useState<number[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);
  const [hint, setHint] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const challenge = CHALLENGES[challengeIdx];

  // Initialize robot pos on challenge load
  useEffect(() => {
    setRobotPos(challenge.startPos);
    setCollectedItems([]);
    setIsSuccess(false);
    setHint(null);
  }, [challengeIdx]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleMove = useCallback((dx: number, dy: number) => {
    if (isSuccess || phase !== "game") return;

    setRobotPos(prev => {
      const next = { x: prev.x + dx, y: prev.y + dy };
      
      // Bounds check
      if (next.x < 0 || next.x >= challenge.gridWidth || next.y < 0 || next.y >= challenge.gridHeight) {
        playSound("bump");
        return prev;
      }

      // Obstacle check
      if (challenge.obstacles.some(o => o.x === next.x && o.y === next.y)) {
        playSound("bump");
        return prev;
      }

      playSound("step");

      // Check collectible
      const colIdx = challenge.collectibles.findIndex(c => c.x === next.x && c.y === next.y);
      if (colIdx !== -1 && !collectedItems.includes(colIdx)) {
        setTimeout(() => {
          playSound("collect");
          setCollectedItems(curr => [...curr, colIdx]);
        }, 150); // slight delay to feel in-sync with visual movement
      }

      // Check goal
      if (next.x === challenge.goalPos.x && next.y === challenge.goalPos.y) {
        // Did they collect everything?
        const hasAll = (collectedItems.length + (colIdx !== -1 && !collectedItems.includes(colIdx) ? 1 : 0)) === challenge.collectibles.length;
        
        if (!hasAll) {
          playSound("error");
          setHint("Collect all stars first!");
          setTimeout(() => setHint(null), 2000);
          return prev; // Bounce back
        } else {
          setIsSuccess(true);
          playSound("success");
          setCompletedCount(c => c + 1);
          setTimeout(() => {
            if (challengeIdx < CHALLENGES.length - 1) {
              setChallengeIdx(i => i + 1);
            } else {
              setPhase("summary");
              speak("Goals need steps to complete. Planning helps you succeed.");
            }
          }, 2000);
          return next;
        }
      }

      return next;
    });
  }, [challenge, collectedItems, isSuccess, phase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") handleMove(0, -1);
      if (e.key === "ArrowDown") handleMove(0, 1);
      if (e.key === "ArrowLeft") handleMove(-1, 0);
      if (e.key === "ArrowRight") handleMove(1, 0);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  const handleQuizAnswer = (selectedIndex: number) => {
    if (selectedIndex === QUIZ_QUESTIONS[quizIndex].correct) {
      playSound("success");
      if (quizIndex < QUIZ_QUESTIONS.length - 1) {
        setTimeout(() => setQuizIndex(quizIndex + 1), 800);
      } else {
        setTimeout(() => {
          setPhase("reward");
          setBadge(BADGES[Math.floor(Math.random() * BADGES.length)]);
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#eab308", "#3b82f6", "#ef4444", "#10b981"] });
          speak("Great job! You earned a new badge.");
        }, 800);
      }
    } else {
      playSound("error");
      speak("Try again!");
    }
  };

  const fullReset = () => {
    setChallengeIdx(0);
    setCompletedCount(0);
    setQuizIndex(0);
  };

  const CELL_SIZE = 56; // px

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#060A10] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-yellow-300 hover:text-yellow-200 hover:bg-yellow-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[10%] right-[20%] h-32 w-32 rounded-full bg-yellow-900/20 blur-2xl animate-[float_15s_ease-in-out_infinite]" />
        <div className="absolute bottom-[15%] left-[25%] h-40 w-40 rounded-full bg-amber-900/15 blur-3xl animate-[float_18s_ease-in-out_infinite_reverse]" />
      </div>

      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes robotBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes itemFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-4px) scale(1.1); } }
        @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shakeHint { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-yellow-950/90 border-2 border-yellow-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(250,204,21,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-yellow-900/50 p-4 rounded-full border border-yellow-400/50 mb-6 shadow-[0_0_20px_rgba(250,204,21,0.5)]">
            <Info className="h-16 w-16 text-yellow-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-yellow-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-yellow-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-yellow-600 text-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Read the mission instruction at the top.</li>
            <li className="flex items-start gap-3"><span className="bg-yellow-600 text-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Use the arrow buttons to move the robot.</li>
            <li className="flex items-start gap-3"><span className="bg-yellow-600 text-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Collect all required items before reaching the goal!</li>
          </ul>
          <Button onClick={() => { playSound("step"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-yellow-600 hover:bg-yellow-500 text-black rounded-full shadow-[0_0_30px_rgba(250,204,21,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-3xl px-4 animate-in fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-yellow-400 mb-1 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] uppercase tracking-widest text-center">
            Complete the Mission
          </h1>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-4">
            {CHALLENGES.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === challengeIdx ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'bg-yellow-900/40'}`} />
            ))}
          </div>

          <p className="text-lg text-yellow-200/90 font-mono mb-6 text-center">{challenge.instruction}</p>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Grid Area */}
            <div 
              className="relative bg-black/40 backdrop-blur-md border border-yellow-500/30 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.1)] overflow-hidden"
              style={{
                width: challenge.gridWidth * CELL_SIZE,
                height: challenge.gridHeight * CELL_SIZE,
              }}
            >
              {/* Grid Cells Background */}
              {Array.from({ length: challenge.gridHeight }).map((_, y) => (
                Array.from({ length: challenge.gridWidth }).map((_, x) => (
                  <div
                    key={`${x}-${y}`}
                    className="absolute border border-yellow-700/20"
                    style={{
                      left: x * CELL_SIZE,
                      top: y * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                    }}
                  />
                ))
              ))}

              {/* Obstacles */}
              {challenge.obstacles.map((obs, idx) => (
                <div
                  key={`obs-${idx}`}
                  className="absolute flex items-center justify-center z-10 text-3xl drop-shadow-md"
                  style={{
                    left: obs.x * CELL_SIZE,
                    top: obs.y * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                >
                  🪨
                </div>
              ))}

              {/* Collectibles */}
              {challenge.collectibles.map((col, idx) => {
                const isCollected = collectedItems.includes(idx);
                return (
                  <div
                    key={`col-${idx}`}
                    className={`absolute flex items-center justify-center z-20 transition-all duration-500 ${isCollected ? 'opacity-0 scale-150' : 'opacity-100'}`}
                    style={{
                      left: col.x * CELL_SIZE,
                      top: col.y * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                    }}
                  >
                    {!isCollected && (
                      <div className="animate-[itemFloat_2s_ease-in-out_infinite] text-3xl drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                        ⭐
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Goal */}
              <div
                className={`absolute flex items-center justify-center z-10 text-4xl transition-all duration-300 ${collectedItems.length === challenge.collectibles.length ? 'drop-shadow-[0_0_20px_rgba(34,197,94,0.9)] scale-110 animate-pulse' : 'drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] opacity-80'}`}
                style={{
                  left: challenge.goalPos.x * CELL_SIZE,
                  top: challenge.goalPos.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              >
                🏁
              </div>

              {/* Robot */}
              <div
                className="absolute flex items-center justify-center z-30 transition-all duration-200 ease-out"
                style={{
                  left: robotPos.x * CELL_SIZE,
                  top: robotPos.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              >
                <div className={`animate-[robotBob_1s_ease-in-out_infinite] ${isSuccess ? 'scale-125' : ''}`}>
                  <Bot className={`h-10 w-10 ${isSuccess ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]' : 'text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]'}`} />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-6 bg-black/40 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-6">
              
              {/* Mission Status */}
              <div className="flex gap-2">
                {challenge.collectibles.map((_, idx) => (
                  <div key={idx} className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors ${collectedItems.includes(idx) ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.6)]' : 'border-yellow-800 bg-yellow-950/50'}`}>
                    {collectedItems.includes(idx) && <span className="text-xs font-bold">✓</span>}
                  </div>
                ))}
              </div>

              {/* D-Pad Controls */}
              <div className="grid grid-cols-3 gap-2">
                <div />
                <Button variant="outline" size="icon" onClick={() => handleMove(0, -1)} className="h-14 w-14 rounded-xl border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95 shadow-[0_4px_0_rgba(202,138,4,0.5)] active:shadow-none active:translate-y-1 transition-all">
                  <ArrowUp className="h-8 w-8" />
                </Button>
                <div />
                <Button variant="outline" size="icon" onClick={() => handleMove(-1, 0)} className="h-14 w-14 rounded-xl border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95 shadow-[0_4px_0_rgba(202,138,4,0.5)] active:shadow-none active:translate-y-1 transition-all">
                  <ArrowLeftIcon className="h-8 w-8" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleMove(0, 1)} className="h-14 w-14 rounded-xl border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95 shadow-[0_4px_0_rgba(202,138,4,0.5)] active:shadow-none active:translate-y-1 transition-all">
                  <ArrowDown className="h-8 w-8" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleMove(1, 0)} className="h-14 w-14 rounded-xl border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95 shadow-[0_4px_0_rgba(202,138,4,0.5)] active:shadow-none active:translate-y-1 transition-all">
                  <ArrowRight className="h-8 w-8" />
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setRobotPos(challenge.startPos);
                  setCollectedItems([]);
                  playSound("bump");
                }}
                className="mt-2 text-yellow-500/70 hover:text-yellow-400 hover:bg-yellow-900/30"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset Pos
              </Button>
            </div>
          </div>

          {/* Feedback */}
          <div className="h-12 mt-6">
            {isSuccess && (
              <div className="text-2xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-[popIn_0.5s_ease-out] flex items-center gap-3">
                <Sparkles /> Mission Complete! Great job! <Sparkles />
              </div>
            )}
            {hint && (
              <div className="px-6 py-2 bg-red-950/80 border border-red-500 text-red-300 rounded-full font-mono animate-[shakeHint_0.4s_ease-in-out]">
                {hint}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUMMARY PHASE ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-yellow-950/95 backdrop-blur-xl border-t-4 border-yellow-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(250,204,21,0.15)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-yellow-900 rounded-full flex items-center justify-center border-4 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-yellow-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-yellow-200 mb-4">
                "Goals need steps to complete."
              </h2>
              <p className="text-xl text-yellow-300 mb-8 font-mono">
                "Planning helps you succeed."
              </p>
              <Button
                onClick={() => setPhase("quiz")}
                className="h-16 px-12 text-2xl font-display font-bold bg-green-500 hover:bg-green-400 text-white rounded-full shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-105 transition-transform"
              >
                START QUIZ <Play className="ml-2 h-6 w-6 fill-current" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QUIZ PHASE ===== */}
      {phase === "quiz" && (
        <div className="z-10 flex flex-col items-center w-full max-w-3xl px-4 animate-in fade-in zoom-in duration-500">
          <div className="mb-8 flex items-center gap-2">
            {QUIZ_QUESTIONS.map((_, idx) => (
              <div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-yellow-900"}`} />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">
            {QUIZ_QUESTIONS[quizIndex].question}
          </h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ_QUESTIONS[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-yellow-900/50 hover:bg-yellow-800 border-2 border-yellow-500/40 hover:border-yellow-300 rounded-2xl transition-all shadow-lg active:scale-95 text-yellow-100">
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD PHASE ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-yellow-950 border-4 border-yellow-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(250,204,21,0.5)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
              🎊 AMAZING! 🎊
            </h1>
            <div className="bg-yellow-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">
              {badge.icon}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-yellow-200 mb-10">You unlocked a new badge!</p>
            <div className="flex flex-col gap-4 w-full">
              <Button onClick={() => { setPhase("game"); fullReset(); }} className="h-14 text-xl font-bold bg-yellow-600 hover:bg-yellow-500 rounded-full">
                PLAY AGAIN
              </Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-yellow-500 text-yellow-300 hover:bg-yellow-900/50 rounded-full">
                RETURN TO MISSIONS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
