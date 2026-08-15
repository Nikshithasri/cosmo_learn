import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

type Point = { x: number; y: number };

type PathOption = {
  id: string;
  color: string;
  points: Point[];
  isOptimal: boolean;
};

type Challenge = {
  id: number;
  gridWidth: number;
  gridHeight: number;
  startPos: Point;
  goalPos: Point;
  obstacles: Point[];
  paths: PathOption[];
};

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 0, y: 2 },
    goalPos: { x: 4, y: 2 },
    obstacles: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
    paths: [
      {
        id: "A",
        color: "bg-blue-500",
        points: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
        isOptimal: true, // 6 steps
      },
      {
        id: "B",
        color: "bg-orange-500",
        points: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }],
        isOptimal: false, // 8 steps
      }
    ]
  },
  {
    id: 2,
    gridWidth: 6,
    gridHeight: 5,
    startPos: { x: 1, y: 4 },
    goalPos: { x: 4, y: 0 },
    obstacles: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
    paths: [
      {
        id: "A",
        color: "bg-pink-500",
        points: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 1 }, { x: 5, y: 0 }, { x: 4, y: 0 }],
        isOptimal: false, // 9 steps
      },
      {
        id: "B",
        color: "bg-green-500",
        points: [{ x: 1, y: 4 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
        isOptimal: true, // 9 steps? Wait: 1,4->0,4 (1), 0,3 (2), 0,2 (3), 0,1 (4), 0,0 (5), 1,0 (6), 2,0 (7), 3,0 (8), 4,0 (9).
        // Let's make path A longer: 1,4 -> 1,3 -> 2,3 -> 3,3 -> 4,3 -> 5,3 -> 5,2 -> 5,1 -> 5,0 -> 4,0 (9 steps)
      }
    ]
  },
  {
    id: 3,
    gridWidth: 5,
    gridHeight: 5,
    startPos: { x: 0, y: 0 },
    goalPos: { x: 4, y: 4 },
    obstacles: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
    paths: [
      {
        id: "A",
        color: "bg-purple-500",
        points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }],
        isOptimal: true, // 8 steps
      },
      {
        id: "B",
        color: "bg-yellow-500",
        points: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
        isOptimal: false, // 8 steps? Wait. 0,0->0,1(1)->0,2(2)->1,2(3)->1,3(4)->2,3(5)->2,4(6)->3,4(7)->4,4(8).
        // Let's make B longer: 0,0->0,1->0,2->0,3->0,4->1,4->2,4->3,4->4,4 (8 steps).
        // If both are 8 steps, it's a tie. We need one to be shorter.
      }
    ]
  }
];

// Adjust Challenge 2 and 3 to ensure one path is strictly shorter
CHALLENGES[1].paths[0].points = [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 1 }, { x: 5, y: 0 }, { x: 4, y: 0 }]; // 9 steps
CHALLENGES[1].paths[1].points = [{ x: 1, y: 4 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 0 }]; // 9 steps
// Let's explicitly define shortest for 2:
CHALLENGES[1].paths[1].points = [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 0, y: 3 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 0 }]; // 9
// Wait, 1,4 to 4,0 without obstacles is |4-1| + |0-4| = 3 + 4 = 7 steps.
// With obstacle wall at y=2 from x=1 to 4:
// Option B (left around wall): 1,4 -> 0,4 -> 0,3 -> 0,2 -> 0,1 -> 0,0 -> 1,0 -> 2,0 -> 3,0 -> 4,0 (9 steps)
// Option A (right around wall): 1,4 -> 2,4 -> 3,4 -> 4,4 -> 5,4 -> 5,3 -> 5,2 -> 5,1 -> 5,0 -> 4,0 (9 steps)
// Still tie. Let's make wall start at x=0 instead.
CHALLENGES[1].obstacles = [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }];
// Now left around wall is blocked at 0,2. Must go right around wall.
CHALLENGES[1].paths[0].points = [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 0 }]; // 7 steps! (Optimal)
CHALLENGES[1].paths[0].isOptimal = true;
CHALLENGES[1].paths[1].points = [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 1 }, { x: 5, y: 0 }, { x: 4, y: 0 }]; // 9 steps (Long)
CHALLENGES[1].paths[1].isOptimal = false;

// Challenge 3 fix: 0,0 to 4,4.
CHALLENGES[2].obstacles = [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}, {x: 3, y: 4}, {x: 3, y: 3}, {x: 3, y: 2}];
// Path A (zig zag through middle): 0,0->0,1->0,2->0,3->1,3->2,3->2,2->2,1->3,1->4,1->4,2->4,3->4,4 (12 steps)
CHALLENGES[2].paths[0].points = [{x:0,y:0}, {x:0,y:1}, {x:0,y:2}, {x:0,y:3}, {x:1,y:3}, {x:2,y:3}, {x:2,y:2}, {x:2,y:1}, {x:3,y:1}, {x:4,y:1}, {x:4,y:2}, {x:4,y:3}, {x:4,y:4}];
CHALLENGES[2].paths[0].isOptimal = false;
// Path B (around edges): 0,0->0,1->0,2->0,3->0,4->1,4->2,4->2,3->2,2->2,1->2,0->3,0->4,0->4,1->4,2->4,3->4,4 (16 steps) -> let's just do a simple short path
// Short path: 0,0->0,1->0,2->0,3->1,3->2,3->2,4->3,4? wait, 3,4 is obstacle.
// Let's redefine Challenge 3 to be simple.
CHALLENGES[2].obstacles = [{x:2, y:1}, {x:2, y:2}, {x:2, y:3}];
CHALLENGES[2].startPos = {x:0, y:2};
CHALLENGES[2].goalPos = {x:4, y:2};
CHALLENGES[2].paths[0].points = [{x:0,y:2}, {x:1,y:2}, {x:1,y:1}, {x:1,y:0}, {x:2,y:0}, {x:3,y:0}, {x:3,y:1}, {x:3,y:2}, {x:4,y:2}]; // 8 steps
CHALLENGES[2].paths[0].isOptimal = true;
CHALLENGES[2].paths[1].points = [{x:0,y:2}, {x:0,y:3}, {x:0,y:4}, {x:1,y:4}, {x:2,y:4}, {x:3,y:4}, {x:4,y:4}, {x:4,y:3}, {x:4,y:2}]; // 8 steps -> Wait, tie again.
// Let's make Path 1 shorter:
CHALLENGES[2].paths[0].points = [{x:0,y:2}, {x:1,y:2}, {x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:3,y:2}, {x:4,y:2}]; // 6 steps - WAIT obstacle is at 2,1 !
// Obstacles: 2,1 / 2,2 / 2,3. So 2,1 is blocked.
// Path going over top: 0,2->1,2->1,0->2,0->3,0->3,2->4,2 (6 steps).
CHALLENGES[2].paths[0].points = [{x:0,y:2}, {x:1,y:2}, {x:1,y:1}, {x:1,y:0}, {x:2,y:0}, {x:3,y:0}, {x:3,y:1}, {x:3,y:2}, {x:4,y:2}]; // 8 steps
// Path going way around bottom:
CHALLENGES[2].paths[1].points = [{x:0,y:2}, {x:0,y:3}, {x:0,y:4}, {x:1,y:4}, {x:2,y:4}, {x:3,y:4}, {x:4,y:4}, {x:4,y:3}, {x:4,y:2}]; // 8 steps
// Let's move obstacle to 2,2 and 2,3 and 2,4.
CHALLENGES[2].obstacles = [{x:2, y:2}, {x:2, y:3}, {x:2, y:4}];
// Bottom is completely blocked.
CHALLENGES[2].paths[0].points = [{x:0,y:2}, {x:1,y:2}, {x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:3,y:2}, {x:4,y:2}]; // 6 steps (Optimal)
CHALLENGES[2].paths[0].isOptimal = true;
CHALLENGES[2].paths[1].points = [{x:0,y:2}, {x:1,y:2}, {x:1,y:1}, {x:1,y:0}, {x:2,y:0}, {x:3,y:0}, {x:3,y:1}, {x:3,y:2}, {x:4,y:2}]; // 8 steps
CHALLENGES[2].paths[1].isOptimal = false;


const BADGES = [
  { name: "Path Finder", icon: <Star className="h-16 w-16 text-pink-400" /> },
  { name: "Smart Navigator", icon: <Crown className="h-16 w-16 text-pink-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-pink-400" /> },
  { name: "Logic Champ", icon: <Medal className="h-16 w-16 text-pink-400" /> },
];

const QUIZ_QUESTIONS = [
  {
    question: "Which path is the best to choose?",
    options: ["The shortest path", "The longest path", "The zigzag path"],
    correct: 0,
  },
  {
    question: "Why do we want the shortest path?",
    options: ["It takes more time", "It saves time and energy", "It looks pretty"],
    correct: 1,
  },
  {
    question: "Which of these is a smart thinking choice?",
    options: ["Going in circles", "Choosing the longest way", "Finding the most direct route"],
    correct: 2,
  },
];

// --- Audio ---
const playSound = (type: "step" | "success" | "error" | "click") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "step") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
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
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
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

export default function PathOptimizationGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [robotPos, setRobotPos] = useState<Point | null>(null);
  const [result, setResult] = useState<"idle" | "success" | "fail">("idle");
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);
  const runRef = useRef<NodeJS.Timeout | null>(null);

  const challenge = CHALLENGES[challengeIdx];

  useEffect(() => {
    setRobotPos(challenge.startPos);
    return () => {
      window.speechSynthesis.cancel();
      if (runRef.current) clearTimeout(runRef.current);
    };
  }, [challengeIdx]);

  const handlePathSelect = (path: PathOption) => {
    if (isRunning || result === "success") return;
    playSound("click");
    setSelectedPathId(path.id);
  };

  const executePath = () => {
    if (!selectedPathId || isRunning) return;
    setIsRunning(true);
    setResult("idle");
    
    const path = challenge.paths.find(p => p.id === selectedPathId)!;
    let step = 0;
    
    const run = () => {
      if (step < path.points.length) {
        setRobotPos(path.points[step]);
        if (step > 0) playSound("step");
        step++;
        runRef.current = setTimeout(run, 300);
      } else {
        setTimeout(() => {
          if (path.isOptimal) {
            setResult("success");
            playSound("success");
            setCompletedCount(c => c + 1);
            setTimeout(() => {
              if (challengeIdx < CHALLENGES.length - 1) {
                setChallengeIdx(i => i + 1);
                setSelectedPathId(null);
                setResult("idle");
                setIsRunning(false);
              } else {
                setPhase("summary");
                speak("The best path is the shortest path. Smart thinking saves time.");
              }
            }, 1500);
          } else {
            setResult("fail");
            playSound("error");
            speak("Can you find a shorter way?");
            setTimeout(() => {
              setRobotPos(challenge.startPos);
              setSelectedPathId(null);
              setResult("idle");
              setIsRunning(false);
            }, 1500);
          }
        }, 300);
      }
    };
    runRef.current = setTimeout(run, 200);
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
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#ec4899", "#8b5cf6", "#f59e0b", "#3b82f6"] });
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
    setSelectedPathId(null);
    setResult("idle");
    setIsRunning(false);
    setRobotPos(CHALLENGES[0].startPos);
  };

  const CELL_SIZE = 48; // px

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#060A10] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-pink-300 hover:text-pink-200 hover:bg-pink-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[20%] left-[15%] h-40 w-40 rounded-full bg-pink-900/20 blur-3xl animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] right-[20%] h-48 w-48 rounded-full bg-purple-900/15 blur-3xl animate-[float_19s_ease-in-out_infinite_reverse]" />
      </div>

      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes robotBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes pathGlow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-pink-950/90 border-2 border-pink-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(236,72,153,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-pink-900/50 p-4 rounded-full border border-pink-400/50 mb-6 shadow-[0_0_20px_rgba(236,72,153,0.5)]">
            <Info className="h-16 w-16 text-pink-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-pink-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-pink-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Look at the different colored paths.</li>
            <li className="flex items-start gap-3"><span className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Find the shortest, most direct route to the ⭐ goal.</li>
            <li className="flex items-start gap-3"><span className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Select it and press RUN!</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-pink-600 hover:bg-pink-500 text-white rounded-full shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-3xl px-4 animate-in fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-pink-300 mb-1 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] uppercase tracking-widest text-center">
            Find the Best Path
          </h1>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-4">
            {CHALLENGES.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === challengeIdx ? 'bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'bg-pink-900/40'}`} />
            ))}
          </div>

          <p className="text-lg text-pink-200/90 font-mono mb-6 text-center">Select the shortest route to the goal!</p>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Grid Area */}
            <div 
              className={`relative bg-black/40 backdrop-blur-md border border-pink-500/30 rounded-2xl p-4 shadow-xl ${result === 'fail' ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
              style={{
                width: challenge.gridWidth * CELL_SIZE + 32,
                height: challenge.gridHeight * CELL_SIZE + 32,
              }}
            >
              {/* Grid Cells */}
              {Array.from({ length: challenge.gridHeight }).map((_, y) => (
                Array.from({ length: challenge.gridWidth }).map((_, x) => (
                  <div
                    key={`${x}-${y}`}
                    className="absolute border border-slate-700/30"
                    style={{
                      left: x * CELL_SIZE + 16,
                      top: y * CELL_SIZE + 16,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                    }}
                  />
                ))
              ))}

              {/* Paths */}
              <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
                {challenge.paths.map(path => (
                  <polyline
                    key={path.id}
                    points={path.points.map(p => `${p.x * CELL_SIZE + 16 + CELL_SIZE/2},${p.y * CELL_SIZE + 16 + CELL_SIZE/2}`).join(" ")}
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-all duration-300 ${selectedPathId === path.id ? `stroke-${path.color.replace('bg-', '')} opacity-100 drop-shadow-[0_0_8px_currentColor] animate-[pathGlow_2s_ease-in-out_infinite]` : `stroke-${path.color.replace('bg-', '')} opacity-30`}`}
                    style={{ stroke: selectedPathId === path.id ? 'currentColor' : undefined }} // Tailwinds stroke-color classes might need to be explicitly set or defined in safe list. Let's use currentColor and text-color.
                  />
                ))}
              </svg>
              {/* Overlay SVG with proper tailwind colors */}
              <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
                {challenge.paths.map(path => {
                   // Map bg-color to stroke color manually for SVG
                   const strokeColor = path.color.includes('blue') ? '#3b82f6' : 
                                       path.color.includes('orange') ? '#f97316' : 
                                       path.color.includes('pink') ? '#ec4899' :
                                       path.color.includes('green') ? '#22c55e' :
                                       path.color.includes('purple') ? '#a855f7' :
                                       path.color.includes('yellow') ? '#eab308' : 'white';
                   return (
                    <polyline
                      key={`actual-${path.id}`}
                      points={path.points.map(p => `${p.x * CELL_SIZE + 16 + CELL_SIZE/2},${p.y * CELL_SIZE + 16 + CELL_SIZE/2}`).join(" ")}
                      fill="none"
                      strokeWidth={selectedPathId === path.id ? "10" : "6"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      stroke={strokeColor}
                      className={`transition-all duration-300 ${selectedPathId === path.id ? `opacity-100 animate-[pathGlow_2s_ease-in-out_infinite]` : `opacity-30`}`}
                      style={{ filter: selectedPathId === path.id ? `drop-shadow(0 0 8px ${strokeColor})` : 'none' }}
                    />
                   );
                })}
              </svg>


              {/* Obstacles */}
              {challenge.obstacles.map((obs, idx) => (
                <div
                  key={`obs-${idx}`}
                  className="absolute flex items-center justify-center z-20 text-3xl drop-shadow-md"
                  style={{
                    left: obs.x * CELL_SIZE + 16,
                    top: obs.y * CELL_SIZE + 16,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                >
                  🪨
                </div>
              ))}

              {/* Goal */}
              <div
                className="absolute flex items-center justify-center z-20 text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse"
                style={{
                  left: challenge.goalPos.x * CELL_SIZE + 16,
                  top: challenge.goalPos.y * CELL_SIZE + 16,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              >
                ⭐
              </div>

              {/* Robot */}
              {robotPos && (
                <div
                  className="absolute flex items-center justify-center z-30 transition-all duration-300 ease-linear"
                  style={{
                    left: robotPos.x * CELL_SIZE + 16,
                    top: robotPos.y * CELL_SIZE + 16,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                >
                  <div className={`animate-[robotBob_1s_ease-in-out_infinite] ${result === 'success' ? 'scale-125 transition-transform' : ''}`}>
                    <Bot className={`h-10 w-10 ${result === 'success' ? 'text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,1)]' : result === 'fail' ? 'text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,1)]' : 'text-pink-300 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 bg-black/40 backdrop-blur-md border border-pink-500/30 rounded-2xl p-6 min-w-[200px]">
              <p className="text-pink-200/80 font-mono text-sm mb-2 text-center uppercase tracking-wider">Available Routes</p>
              
              {challenge.paths.map(path => {
                const colorMap:Record<string, string> = {
                  'bg-blue-500': 'Blue Route',
                  'bg-orange-500': 'Orange Route',
                  'bg-pink-500': 'Pink Route',
                  'bg-green-500': 'Green Route',
                  'bg-purple-500': 'Purple Route',
                  'bg-yellow-500': 'Yellow Route',
                };
                
                return (
                  <button
                    key={path.id}
                    disabled={isRunning}
                    onClick={() => handlePathSelect(path)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-lg
                      ${selectedPathId === path.id 
                        ? 'bg-slate-800 border-2 border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.4)]' 
                        : 'bg-slate-900 border border-slate-700 hover:bg-slate-800'
                      }
                      ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                    `}
                  >
                    <div className={`h-4 w-4 rounded-full ${path.color} shadow-[0_0_8px_currentColor]`} />
                    {colorMap[path.color] || `Path ${path.id}`}
                  </button>
                );
              })}

              <Button
                onClick={executePath}
                disabled={isRunning || !selectedPathId}
                className={`mt-4 h-14 w-full text-xl font-display font-bold rounded-xl transition-all 
                  ${!selectedPathId || isRunning 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-pink-600 hover:bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] text-white hover:shadow-[0_0_30px_rgba(236,72,153,0.7)] active:scale-95'
                  }`}
              >
                <Play className="h-5 w-5 mr-2 fill-current" /> RUN
              </Button>
            </div>
          </div>

          {/* Feedback */}
          <div className="h-12 mt-6">
            {result === "success" && (
              <div className="text-2xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-bounce flex items-center gap-3">
                <Sparkles /> Great! You found the best path! <Sparkles />
              </div>
            )}
            {result === "fail" && (
              <p className="text-xl font-mono text-pink-300 animate-in fade-in">Can you find a shorter way?</p>
            )}
          </div>
        </div>
      )}

      {/* ===== SUMMARY PHASE ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-pink-950/95 backdrop-blur-xl border-t-4 border-pink-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(236,72,153,0.2)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-pink-900 rounded-full flex items-center justify-center border-4 border-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-pink-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-pink-200 mb-4">
                "The best path is the shortest path."
              </h2>
              <p className="text-xl text-pink-300 mb-8 font-mono">
                "Smart thinking saves time."
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
              <div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-pink-900"}`} />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">
            {QUIZ_QUESTIONS[quizIndex].question}
          </h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ_QUESTIONS[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-pink-900/50 hover:bg-pink-800 border-2 border-pink-500/40 hover:border-pink-300 rounded-2xl transition-all shadow-lg active:scale-95 text-pink-100">
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD PHASE ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-pink-950 border-4 border-pink-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(236,72,153,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
              🎊 AMAZING! 🎊
            </h1>
            <div className="bg-pink-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">
              {badge.icon}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-pink-200 mb-10">You unlocked a new badge!</p>
            <div className="flex flex-col gap-4 w-full">
              <Button onClick={() => { setPhase("game"); fullReset(); }} className="h-14 text-xl font-bold bg-pink-600 hover:bg-pink-500 rounded-full">
                PLAY AGAIN
              </Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-pink-500 text-pink-300 hover:bg-pink-900/50 rounded-full">
                RETURN TO MISSIONS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
