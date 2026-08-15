import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Bot, Home, RotateCcw, Play, Medal, Trophy, Crown, Star, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

// --- Grid & Level Setup ---
const GRID_SIZE = 5;

type Pos = { r: number; c: number };

const LEVEL = {
  robot: { r: 4, c: 0 } as Pos,
  home: { r: 0, c: 4 } as Pos,
  obstacles: [
    { r: 1, c: 1 },
    { r: 2, c: 3 },
    { r: 3, c: 2 },
  ] as Pos[],
};

// --- Audio Helpers ---
const playSound = (type: "step" | "success" | "error" | "click") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "step") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(520, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.36);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.error("Audio error", e);
  }
};

const speak = (text: string) => {
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.2;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
};

// --- Constants ---
const BADGES = [
  { name: "Robot Master", icon: <Bot className="h-16 w-16 text-yellow-400" /> },
  { name: "Direction Hero", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Logic Champ", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ_QUESTIONS = [
  {
    question: "Which arrow moves the robot UP?",
    options: ["⬇️ Down", "⬆️ Up", "➡️ Right"],
    correct: 1,
  },
  {
    question: "The home is to the RIGHT of the robot. Which way should it go?",
    options: ["⬅️ Left", "⬆️ Up", "➡️ Right"],
    correct: 2,
  },
  {
    question: "Which move is WRONG if the robot needs to go UP?",
    options: ["⬆️ Up", "⬇️ Down", "⬆️ Up"],
    correct: 1,
  },
];

// --- Component ---
export default function DirectionalLogicGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [robot, setRobot] = useState<Pos>({ ...LEVEL.robot });
  const [visited, setVisited] = useState<string[]>([`${LEVEL.robot.r},${LEVEL.robot.c}`]);
  const [shaking, setShaking] = useState(false);
  const [won, setWon] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);
  const [moveCount, setMoveCount] = useState(0);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const isObstacle = (r: number, c: number) =>
    LEVEL.obstacles.some((o) => o.r === r && o.c === c);

  const isHome = (r: number, c: number) =>
    LEVEL.home.r === r && LEVEL.home.c === c;

  const move = useCallback(
    (dr: number, dc: number) => {
      if (won) return;
      const nr = robot.r + dr;
      const nc = robot.c + dc;

      // Out of bounds
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) {
        playSound("error");
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        return;
      }

      // Obstacle
      if (isObstacle(nr, nc)) {
        playSound("error");
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        return;
      }

      playSound("step");
      setRobot({ r: nr, c: nc });
      setVisited((prev) => [...prev, `${nr},${nc}`]);
      setMoveCount((prev) => prev + 1);

      // Victory
      if (isHome(nr, nc)) {
        setWon(true);
        playSound("success");
        setTimeout(() => {
          setPhase("summary");
          speak("Directions help us move correctly. Commands tell the robot what to do.");
        }, 1200);
      }
    },
    [robot, won]
  );

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "game") return;
      if (e.key === "ArrowUp") move(-1, 0);
      else if (e.key === "ArrowDown") move(1, 0);
      else if (e.key === "ArrowLeft") move(0, -1);
      else if (e.key === "ArrowRight") move(0, 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move, phase]);

  const resetGame = () => {
    setRobot({ ...LEVEL.robot });
    setVisited([`${LEVEL.robot.r},${LEVEL.robot.c}`]);
    setWon(false);
    setMoveCount(0);
    setShaking(false);
  };

  const handleQuizAnswer = (selectedIndex: number) => {
    if (selectedIndex === QUIZ_QUESTIONS[quizIndex].correct) {
      playSound("success");
      if (quizIndex < QUIZ_QUESTIONS.length - 1) {
        setTimeout(() => setQuizIndex(quizIndex + 1), 800);
      } else {
        setTimeout(() => {
          setPhase("reward");
          setBadge(BADGES[Math.floor(Math.random() * BADGES.length)]);
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#f97316", "#3b82f6", "#10b981", "#f59e0b"] });
          speak("Great job! You earned a new badge.");
        }, 800);
      }
    } else {
      playSound("error");
      speak("Try again!");
    }
  };

  const CELL = 56; // px per cell

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#060D18] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-orange-300 hover:text-orange-200 hover:bg-orange-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[8%] right-[12%] h-36 w-36 rounded-full bg-orange-900/20 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-[15%] left-[8%] h-28 w-28 rounded-full bg-blue-900/20 blur-2xl animate-[float_16s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[60%] right-[60%] h-20 w-20 rounded-full bg-purple-900/15 blur-2xl animate-[float_20s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes robotBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes pathGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-orange-950/90 border-2 border-orange-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(249,115,22,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-orange-900/50 p-4 rounded-full border border-orange-400/50 mb-6 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
            <Info className="h-16 w-16 text-orange-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-orange-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-orange-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Help the robot reach its home.</li>
            <li className="flex items-start gap-3"><span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Use the Arrow buttons to move up, down, left, or right.</li>
            <li className="flex items-start gap-3"><span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Watch out for obstacles! Find the safest path.</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-full shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center animate-in fade-in duration-500 w-full max-w-xl px-4">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-display font-bold text-orange-300 mb-1 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] uppercase tracking-widest text-center">
            Guide the Robot Home
          </h1>
          <p className="text-base text-orange-200/80 font-mono mb-6 text-center">Use arrows to move 🤖 to 🏠</p>

          {/* Grid */}
          <div
            className={`relative border-2 border-orange-500/40 rounded-xl bg-black/60 backdrop-blur-md shadow-[0_0_50px_rgba(249,115,22,0.15)] ${shaking ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
            style={{ width: CELL * GRID_SIZE + 4, height: CELL * GRID_SIZE + 4 }}
          >
            {/* Grid lines */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundSize: `${CELL}px ${CELL}px`,
                backgroundImage:
                  "linear-gradient(to right, rgba(249,115,22,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(249,115,22,0.15) 1px, transparent 1px)",
              }}
            />

            {/* Visited path */}
            {visited.map((key) => {
              const [r, c] = key.split(",").map(Number);
              return (
                <div
                  key={`visited-${key}`}
                  className="absolute rounded-md bg-orange-500/15 animate-[pathGlow_2s_ease-in-out_infinite]"
                  style={{ width: CELL - 4, height: CELL - 4, left: c * CELL + 2, top: r * CELL + 2 }}
                />
              );
            })}

            {/* Obstacles */}
            {LEVEL.obstacles.map((obs, i) => (
              <div
                key={`obs-${i}`}
                className="absolute flex items-center justify-center text-2xl"
                style={{ width: CELL, height: CELL, left: obs.c * CELL, top: obs.r * CELL }}
              >
                <div className="h-10 w-10 rounded-lg bg-red-950/60 border border-red-500/40 flex items-center justify-center shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]">
                  ☄️
                </div>
              </div>
            ))}

            {/* Home */}
            <div
              className="absolute flex items-center justify-center text-3xl"
              style={{ width: CELL, height: CELL, left: LEVEL.home.c * CELL, top: LEVEL.home.r * CELL }}
            >
              <div className="h-11 w-11 rounded-xl bg-green-950/50 border-2 border-green-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.4)] animate-pulse">
                <Home className="h-6 w-6 text-green-400" />
              </div>
            </div>

            {/* Robot */}
            <div
              className="absolute flex items-center justify-center transition-all duration-300 ease-out"
              style={{ width: CELL, height: CELL, left: robot.c * CELL, top: robot.r * CELL }}
            >
              <div className={`h-11 w-11 rounded-full bg-orange-950/70 border-2 border-orange-400 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.6)] ${won ? "bg-green-950/70 border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.8)]" : "animate-[robotBounce_1.5s_ease-in-out_infinite]"}`}>
                <Bot className={`h-6 w-6 ${won ? "text-green-400" : "text-orange-300"}`} />
              </div>
            </div>
          </div>

          {/* Moves counter */}
          <div className="mt-4 text-sm font-mono text-orange-400/70 tracking-widest">MOVES: {moveCount}</div>

          {/* Arrow Controls */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <Button
              onClick={() => move(-1, 0)}
              className="h-14 w-14 rounded-xl bg-orange-800/60 border-2 border-orange-500/60 hover:bg-orange-700/80 hover:border-orange-400 shadow-lg transition-all active:scale-90 text-2xl"
            >
              <ArrowUp className="h-7 w-7 text-orange-200" />
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => move(0, -1)}
                className="h-14 w-14 rounded-xl bg-orange-800/60 border-2 border-orange-500/60 hover:bg-orange-700/80 hover:border-orange-400 shadow-lg transition-all active:scale-90 text-2xl"
              >
                <ArrowLeft className="h-7 w-7 text-orange-200" />
              </Button>
              <Button
                onClick={resetGame}
                className="h-14 w-14 rounded-xl bg-slate-800/60 border-2 border-slate-500/40 hover:bg-slate-700/80 shadow-lg transition-all active:scale-90"
              >
                <RotateCcw className="h-5 w-5 text-slate-300" />
              </Button>
              <Button
                onClick={() => move(0, 1)}
                className="h-14 w-14 rounded-xl bg-orange-800/60 border-2 border-orange-500/60 hover:bg-orange-700/80 hover:border-orange-400 shadow-lg transition-all active:scale-90 text-2xl"
              >
                <ArrowRight className="h-7 w-7 text-orange-200" />
              </Button>
            </div>
            <Button
              onClick={() => move(1, 0)}
              className="h-14 w-14 rounded-xl bg-orange-800/60 border-2 border-orange-500/60 hover:bg-orange-700/80 hover:border-orange-400 shadow-lg transition-all active:scale-90 text-2xl"
            >
              <ArrowDown className="h-7 w-7 text-orange-200" />
            </Button>
          </div>

          {/* Win overlay text */}
          {won && (
            <div className="mt-6 text-2xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-bounce flex items-center gap-3">
              <Sparkles /> Great! You guided the robot home! <Sparkles />
            </div>
          )}
        </div>
      )}

      {/* ===== SUMMARY PHASE ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-orange-950/95 backdrop-blur-xl border-t-4 border-orange-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(249,115,22,0.2)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-orange-900 rounded-full flex items-center justify-center border-4 border-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-orange-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-orange-200 mb-4">
                "Directions help us move correctly."
              </h2>
              <p className="text-xl text-orange-300 mb-8 font-mono">
                "Commands tell the robot what to do."
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
          {/* Progress dots */}
          <div className="mb-8 flex items-center gap-2">
            {QUIZ_QUESTIONS.map((_, idx) => (
              <div
                key={idx}
                className={`h-3 w-12 rounded-full transition-colors ${
                  idx === quizIndex
                    ? "bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]"
                    : idx < quizIndex
                    ? "bg-green-500"
                    : "bg-orange-900"
                }`}
              />
            ))}
          </div>

          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">
            {QUIZ_QUESTIONS[quizIndex].question}
          </h2>

          <div className="flex flex-col gap-4 w-full">
            {QUIZ_QUESTIONS[quizIndex].options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleQuizAnswer(idx)}
                className="w-full text-left px-8 py-6 text-2xl font-bold bg-orange-900/50 hover:bg-orange-800 border-2 border-orange-500/40 hover:border-orange-300 rounded-2xl transition-all shadow-lg active:scale-95 text-orange-100"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD PHASE ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-orange-950 border-4 border-orange-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(249,115,22,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
              🎊 AMAZING! 🎊
            </h1>

            <div className="bg-orange-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">
              {badge.icon}
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-orange-200 mb-10">You unlocked a new badge!</p>

            <div className="flex flex-col gap-4 w-full">
              <Button
                onClick={() => {
                  setPhase("game");
                  setQuizIndex(0);
                  resetGame();
                }}
                className="h-14 text-xl font-bold bg-orange-600 hover:bg-orange-500 rounded-full"
              >
                PLAY AGAIN
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="h-14 text-xl font-bold border-orange-500 text-orange-300 hover:bg-orange-900/50 rounded-full"
              >
                RETURN TO MISSIONS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
