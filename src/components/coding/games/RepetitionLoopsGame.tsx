import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, RotateCcw, MoveRight, ArrowUp, Repeat, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

// --- Challenge Data ---
type Challenge = {
  id: number;
  instruction: string;
  actionEmoji: string;
  actionLabel: string;
  correctCount: number;
  trackLength: number;       // total cells in the track
  obstacleAt?: number[];     // cell indices with obstacles (for jump challenges)
  goalEmoji: string;
  type: "move" | "jump" | "collect";
};

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    instruction: "Move forward to reach the ⭐",
    actionEmoji: "➡️",
    actionLabel: "Move Forward",
    correctCount: 3,
    trackLength: 4,
    goalEmoji: "⭐",
    type: "move",
  },
  {
    id: 2,
    instruction: "Jump over the rocks to reach 🏠",
    actionEmoji: "⬆️",
    actionLabel: "Jump",
    correctCount: 2,
    trackLength: 5,
    obstacleAt: [1, 3],
    goalEmoji: "🏠",
    type: "jump",
  },
  {
    id: 3,
    instruction: "Collect all the crystals 💎",
    actionEmoji: "⭐",
    actionLabel: "Collect",
    correctCount: 4,
    trackLength: 5,
    goalEmoji: "🏁",
    type: "collect",
  },
  {
    id: 4,
    instruction: "Move forward to reach the 🚀",
    actionEmoji: "➡️",
    actionLabel: "Move Forward",
    correctCount: 5,
    trackLength: 6,
    goalEmoji: "🚀",
    type: "move",
  },
];

const BADGES = [
  { name: "Loop Master", icon: <Repeat className="h-16 w-16 text-yellow-400" /> },
  { name: "Repeat Star", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Logic Champ", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ_QUESTIONS = [
  {
    question: "What does 'Repeat 3 times' mean?",
    options: ["Do it once", "Do it 3 times", "Do nothing"],
    correct: 1,
  },
  {
    question: "The robot needs to move forward 4 steps. How many repeats?",
    options: ["2 times", "4 times", "6 times"],
    correct: 1,
  },
  {
    question: "Which is WRONG? 'Repeat 2 times: Jump' means...",
    options: ["Jump, Jump", "Jump once then stop", "Two jumps"],
    correct: 1,
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
      osc.frequency.setValueAtTime(500 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(); osc.stop(ctx.currentTime + 0.06);
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

// --- Component ---
export default function RepetitionLoopsGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [repeatCount, setRepeatCount] = useState(1);
  const [robotPos, setRobotPos] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "fail">("idle");
  const [executedSteps, setExecutedSteps] = useState(0);
  const [trailCells, setTrailCells] = useState<number[]>([0]);
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);
  const runRef = useRef<NodeJS.Timeout | null>(null);

  const challenge = CHALLENGES[challengeIdx];

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (runRef.current) clearTimeout(runRef.current);
    };
  }, []);

  const resetChallenge = () => {
    setRobotPos(0);
    setIsRunning(false);
    setResult("idle");
    setExecutedSteps(0);
    setTrailCells([0]);
    setRepeatCount(1);
  };

  const executeLoop = () => {
    if (isRunning) return;
    setIsRunning(true);
    setResult("idle");
    setRobotPos(0);
    setTrailCells([0]);
    setExecutedSteps(0);

    let step = 0;
    const run = () => {
      if (step < repeatCount) {
        step++;
        playSound("step");
        setExecutedSteps(step);
        setRobotPos(step);
        setTrailCells(prev => [...prev, step]);
        runRef.current = setTimeout(run, 500);
      } else {
        // Check result
        setTimeout(() => {
          if (repeatCount === challenge.correctCount) {
            setResult("success");
            playSound("success");
            setCompletedCount(c => c + 1);
            setTimeout(() => {
              if (challengeIdx < CHALLENGES.length - 1) {
                setChallengeIdx(i => i + 1);
                resetChallenge();
              } else {
                setPhase("summary");
                speak("Repeating actions is called a loop. Loops help us do things faster.");
              }
            }, 1500);
          } else {
            setResult("fail");
            playSound("error");
            speak("Not quite! Try a different number.");
          }
          setIsRunning(false);
        }, 300);
      }
    };
    runRef.current = setTimeout(run, 400);
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
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#14b8a6", "#8b5cf6", "#f59e0b", "#3b82f6"] });
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
    resetChallenge();
  };

  const CELL = 64;

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#060A10] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-teal-300 hover:text-teal-200 hover:bg-teal-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[12%] left-[12%] h-32 w-32 rounded-full bg-teal-900/20 blur-2xl animate-[float_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-[18%] right-[8%] h-40 w-40 rounded-full bg-violet-900/15 blur-3xl animate-[float_18s_ease-in-out_infinite_reverse]" />
      </div>

      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes trailPulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.5; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes robotBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-teal-950/90 border-2 border-teal-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(20,184,166,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-teal-900/50 p-4 rounded-full border border-teal-400/50 mb-6 shadow-[0_0_20px_rgba(20,184,166,0.5)]">
            <Info className="h-16 w-16 text-teal-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-teal-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-teal-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Look at the robot's track and the goal.</li>
            <li className="flex items-start gap-3"><span className="bg-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Choose how many times to repeat the action.</li>
            <li className="flex items-start gap-3"><span className="bg-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Press EXECUTE to run your loop!</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-[0_0_30px_rgba(20,184,166,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-3xl px-4 animate-in fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-teal-300 mb-1 drop-shadow-[0_0_15px_rgba(45,212,191,0.8)] uppercase tracking-widest text-center">
            Repeat the Action
          </h1>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-4">
            {CHALLENGES.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === challengeIdx ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'bg-teal-900/40'}`} />
            ))}
          </div>

          {/* Instruction */}
          <p className="text-lg text-teal-200/90 font-mono mb-6 text-center">{challenge.instruction}</p>

          {/* Track Visualization */}
          <div className={`relative flex items-end gap-1 mb-8 bg-black/40 backdrop-blur-md border border-teal-500/30 rounded-2xl p-4 ${result === 'fail' ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
            {Array.from({ length: challenge.trackLength }).map((_, idx) => {
              const isRobot = idx === robotPos;
              const isGoal = idx === challenge.trackLength - 1;
              const isTrail = trailCells.includes(idx) && idx !== robotPos;
              const isObstacle = challenge.obstacleAt?.includes(idx);
              const isCollectible = challenge.type === "collect" && idx > 0 && idx < challenge.trackLength - 1;

              return (
                <div
                  key={idx}
                  className={`
                    relative flex items-center justify-center rounded-xl transition-all duration-300
                    ${isTrail ? 'bg-teal-500/15 animate-[trailPulse_2s_ease-in-out_infinite]' : 'bg-slate-900/50'}
                    ${isRobot && result === 'success' ? 'bg-green-950/50 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : ''}
                    border ${isRobot ? 'border-teal-400' : 'border-slate-700/50'}
                  `}
                  style={{ width: CELL, height: CELL }}
                >
                  {isObstacle && !isRobot && (
                    <span className="text-2xl">🪨</span>
                  )}
                  {isCollectible && !isRobot && !trailCells.includes(idx) && (
                    <span className="text-2xl animate-pulse">💎</span>
                  )}
                  {isCollectible && isTrail && !isRobot && (
                    <span className="text-2xl opacity-30">💎</span>
                  )}
                  {isGoal && !isRobot && (
                    <span className="text-3xl">{challenge.goalEmoji}</span>
                  )}
                  {isRobot && (
                    <div className={`animate-[robotBob_1s_ease-in-out_infinite] ${result === 'success' ? '' : ''}`}>
                      <Bot className={`h-8 w-8 ${result === 'success' ? 'text-green-400' : result === 'fail' ? 'text-red-400' : 'text-teal-300'} drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]`} />
                    </div>
                  )}
                  {/* Cell number */}
                  <span className="absolute bottom-0.5 right-1 text-[8px] text-slate-600 font-mono">{idx}</span>
                </div>
              );
            })}
          </div>

          {/* Loop Builder */}
          <div className="w-full bg-black/40 backdrop-blur-md border border-teal-500/30 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {/* Repeat Block */}
              <div className="flex items-center gap-2 bg-teal-900/40 border-2 border-teal-500/50 rounded-xl px-4 py-3">
                <Repeat className="h-5 w-5 text-teal-400" />
                <span className="font-display font-bold text-teal-200 text-lg">REPEAT</span>
              </div>

              {/* Count Selector */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    disabled={isRunning}
                    onClick={() => { setRepeatCount(n); playSound("click"); }}
                    className={`
                      h-12 w-12 rounded-xl font-display font-bold text-xl transition-all
                      ${n === repeatCount
                        ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(45,212,191,0.6)] scale-110 border-2 border-teal-300'
                        : 'bg-slate-800/60 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:scale-105'
                      }
                      ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                    `}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <span className="text-teal-400 font-mono text-sm">times:</span>

              {/* Action Label */}
              <div className="flex items-center gap-2 bg-violet-900/30 border border-violet-500/40 rounded-xl px-4 py-3">
                <span className="text-2xl">{challenge.actionEmoji}</span>
                <span className="font-bold text-violet-200">{challenge.actionLabel}</span>
              </div>
            </div>

            {/* Run / Reset */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <Button
                onClick={executeLoop}
                disabled={isRunning}
                className={`h-14 px-10 text-xl font-display font-bold rounded-full transition-all ${isRunning ? 'bg-teal-800 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-400 shadow-[0_0_25px_rgba(45,212,191,0.5)] hover:shadow-[0_0_35px_rgba(45,212,191,0.7)] active:scale-95'}`}
              >
                <Play className="h-5 w-5 mr-2 fill-current" /> RUN
              </Button>
              <Button
                variant="ghost"
                onClick={resetChallenge}
                disabled={isRunning}
                className="h-14 w-14 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Feedback */}
          {result === "success" && (
            <div className="text-2xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-bounce flex items-center gap-3">
              <Sparkles /> Great! You used repetition! <Sparkles />
            </div>
          )}
          {result === "fail" && (
            <p className="text-lg font-mono text-red-400/80 animate-in fade-in">Not quite — try a different repeat count!</p>
          )}
        </div>
      )}

      {/* ===== SUMMARY PHASE ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-teal-950/95 backdrop-blur-xl border-t-4 border-teal-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(45,212,191,0.2)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-teal-900 rounded-full flex items-center justify-center border-4 border-teal-400 shadow-[0_0_30px_rgba(45,212,191,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-teal-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-teal-200 mb-4">
                "Repeating actions is called a loop."
              </h2>
              <p className="text-xl text-teal-300 mb-8 font-mono">
                "Loops help us do things faster."
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
              <div key={idx} className={`h-3 w-12 rounded-full transition-colors ${idx === quizIndex ? "bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]" : idx < quizIndex ? "bg-green-500" : "bg-teal-900"}`} />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 text-center drop-shadow-md">
            {QUIZ_QUESTIONS[quizIndex].question}
          </h2>
          <div className="flex flex-col gap-4 w-full">
            {QUIZ_QUESTIONS[quizIndex].options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(idx)} className="w-full text-left px-8 py-6 text-2xl font-bold bg-teal-900/50 hover:bg-teal-800 border-2 border-teal-500/40 hover:border-teal-300 rounded-2xl transition-all shadow-lg active:scale-95 text-teal-100">
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== REWARD PHASE ===== */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-teal-950 border-4 border-teal-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(45,212,191,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
              🎊 AMAZING! 🎊
            </h1>
            <div className="bg-teal-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">
              {badge.icon}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-teal-200 mb-10">You unlocked a new badge!</p>
            <div className="flex flex-col gap-4 w-full">
              <Button onClick={() => { setPhase("game"); fullReset(); }} className="h-14 text-xl font-bold bg-teal-600 hover:bg-teal-500 rounded-full">
                PLAY AGAIN
              </Button>
              <Button variant="outline" onClick={onBack} className="h-14 text-xl font-bold border-teal-500 text-teal-300 hover:bg-teal-900/50 rounded-full">
                RETURN TO MISSIONS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
