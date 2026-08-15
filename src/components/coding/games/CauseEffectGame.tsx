import { useState, useEffect } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, Zap, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

// --- Scenario Data ---
type Scenario = {
  id: number;
  causeEmoji: string;
  causeLabel: string;
  actionText: string;
  options: { emoji: string; label: string; correct: boolean }[];
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    causeEmoji: "🔘",
    causeLabel: "Press the Button",
    actionText: "TAP!",
    options: [
      { emoji: "💡", label: "Light turns ON", correct: true },
      { emoji: "🌧️", label: "It rains", correct: false },
      { emoji: "🍕", label: "Pizza appears", correct: false },
    ],
  },
  {
    id: 2,
    causeEmoji: "💧",
    causeLabel: "Water the Plant",
    actionText: "POUR!",
    options: [
      { emoji: "🌵", label: "Plant dries up", correct: false },
      { emoji: "🌿", label: "Plant grows", correct: true },
      { emoji: "❄️", label: "It snows", correct: false },
    ],
  },
  {
    id: 3,
    causeEmoji: "🔥",
    causeLabel: "Light a Match",
    actionText: "STRIKE!",
    options: [
      { emoji: "🎵", label: "Music plays", correct: false },
      { emoji: "🕯️", label: "Candle lights up", correct: true },
      { emoji: "🌈", label: "Rainbow appears", correct: false },
    ],
  },
  {
    id: 4,
    causeEmoji: "🌬️",
    causeLabel: "Blow the Wind",
    actionText: "WHOOSH!",
    options: [
      { emoji: "🍃", label: "Leaves fly away", correct: true },
      { emoji: "🐟", label: "Fish jumps", correct: false },
      { emoji: "🔔", label: "Bell rings", correct: false },
    ],
  },
];

const BADGES = [
  { name: "Logic Explorer", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Cause Master", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
  { name: "Brain Booster", icon: <Medal className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ_QUESTIONS = [
  {
    question: "What happens if you press a light switch? 🔘",
    options: ["💡 Light turns on", "🌧️ It rains", "🎵 Music plays"],
    correct: 0,
  },
  {
    question: "You water a seed 💧🌱. What is the correct result?",
    options: ["❄️ It freezes", "🍕 Pizza grows", "🌿 The plant grows"],
    correct: 2,
  },
  {
    question: "Which effect does NOT match blowing wind? 🌬️",
    options: ["🍃 Leaves fly", "📄 Paper moves", "🐟 Fish jumps"],
    correct: 2,
  },
];

// --- Audio ---
const playSound = (type: "action" | "success" | "error") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "action") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
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

// --- Component ---
export default function CauseEffectGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [actionFired, setActionFired] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);

  const scenario = SCENARIOS[scenarioIdx];

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const handleAction = () => {
    playSound("action");
    setActionFired(true);
    setSelectedOption(null);
    setFeedback(null);
  };

  const handlePickOption = (idx: number) => {
    if (feedback === "correct") return;
    setSelectedOption(idx);
    const isCorrect = scenario.options[idx].correct;

    if (isCorrect) {
      setFeedback("correct");
      playSound("success");
      setCompletedCount((c) => c + 1);

      setTimeout(() => {
        if (scenarioIdx < SCENARIOS.length - 1) {
          setScenarioIdx((i) => i + 1);
          setActionFired(false);
          setSelectedOption(null);
          setFeedback(null);
        } else {
          // All scenarios done
          setPhase("summary");
          speak("Every action has a result. This is called cause and effect.");
        }
      }, 1200);
    } else {
      setFeedback("wrong");
      playSound("error");
      speak("Try again!");
      setTimeout(() => {
        setFeedback(null);
        setSelectedOption(null);
      }, 800);
    }
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
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#f97316", "#8b5cf6", "#10b981", "#f59e0b"] });
          speak("Great job! You earned a new badge.");
        }, 800);
      }
    } else {
      playSound("error");
      speak("Try again!");
    }
  };

  const resetGame = () => {
    setScenarioIdx(0);
    setActionFired(false);
    setSelectedOption(null);
    setFeedback(null);
    setCompletedCount(0);
    setQuizIndex(0);
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#08060F] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-orange-300 hover:text-orange-200 hover:bg-orange-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[10%] right-[15%] h-36 w-36 rounded-full bg-orange-900/15 blur-3xl animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] left-[10%] h-28 w-28 rounded-full bg-purple-900/15 blur-2xl animate-[float_18s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[50%] right-[55%] h-20 w-20 rounded-full bg-amber-900/10 blur-2xl animate-[float_22s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes actionPop { 0% { transform: scale(1); } 30% { transform: scale(0.85); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes optionBounce { 0% { transform: scale(0.8); opacity:0; } 50% { transform: scale(1.08); } 100% { transform: scale(1); opacity:1; } }
        @keyframes correctGlow { 0%, 100% { box-shadow: 0 0 20px rgba(74,222,128,0.4); } 50% { box-shadow: 0 0 40px rgba(74,222,128,0.8); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes pulseArrow { 0%, 100% { opacity: 0.4; transform: translateX(0); } 50% { opacity: 1; transform: translateX(6px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-orange-950/90 border-2 border-orange-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(249,115,22,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-orange-900/50 p-4 rounded-full border border-orange-400/50 mb-6 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
            <Info className="h-16 w-16 text-orange-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-orange-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-orange-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Look at the action (The Cause).</li>
            <li className="flex items-start gap-3"><span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Tap the button to make the action happen.</li>
            <li className="flex items-start gap-3"><span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Choose the correct result (The Effect) from the options!</li>
          </ul>
          <Button onClick={() => { playSound("action"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-full shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-2xl px-4 animate-in fade-in duration-500">
          {/* Title + Progress */}
          <h1 className="text-3xl md:text-4xl font-display font-bold text-orange-300 mb-1 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] uppercase tracking-widest text-center">
            What Happens Next?
          </h1>
          <div className="flex items-center gap-2 mb-6">
            {SCENARIOS.map((_, idx) => (
              <div key={idx} className={`h-2.5 w-10 rounded-full transition-colors ${idx < completedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : idx === scenarioIdx ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]' : 'bg-orange-900/40'}`} />
            ))}
          </div>

          {/* Scenario Card */}
          <div className="w-full bg-black/40 backdrop-blur-md border border-orange-500/30 rounded-3xl p-6 md:p-10 flex flex-col items-center">
            {/* Cause Section */}
            <div className="flex flex-col items-center mb-6">
              <p className="text-sm text-orange-400/80 font-mono tracking-widest mb-3 uppercase">The Cause</p>
              <div
                className={`h-32 w-32 md:h-40 md:w-40 rounded-3xl bg-orange-950/50 border-2 border-orange-500/60 flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:border-orange-400 ${actionFired ? 'animate-[actionPop_0.4s_ease-out]' : ''}`}
                onClick={handleAction}
              >
                <span className="text-7xl md:text-8xl select-none">{scenario.causeEmoji}</span>
              </div>
              <button
                onClick={handleAction}
                className={`mt-4 px-8 py-3 rounded-full font-display font-bold text-xl tracking-widest transition-all ${actionFired ? 'bg-orange-700 text-orange-300 cursor-default' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-[0_0_25px_rgba(249,115,22,0.5)] hover:shadow-[0_0_35px_rgba(249,115,22,0.7)] active:scale-95 animate-pulse'}`}
              >
                <Zap className="inline h-5 w-5 mr-2 -mt-0.5" />
                {scenario.actionText}
              </button>
            </div>

            {/* Arrow Divider */}
            {actionFired && (
              <div className="flex items-center gap-1 mb-6 text-orange-400/60 animate-in fade-in duration-300">
                <span className="text-2xl animate-[pulseArrow_1.5s_ease-in-out_infinite]">→</span>
                <span className="text-xs font-mono tracking-widest uppercase">What happens?</span>
                <span className="text-2xl animate-[pulseArrow_1.5s_ease-in-out_infinite_0.3s]">→</span>
              </div>
            )}

            {/* Effect Options */}
            {actionFired && (
              <div className="w-full">
                <p className="text-sm text-orange-400/80 font-mono tracking-widest mb-4 uppercase text-center">Pick the Effect</p>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center items-center">
                  {scenario.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = opt.correct && feedback === "correct" && isSelected;
                    const isWrong = !opt.correct && feedback === "wrong" && isSelected;

                    return (
                      <button
                        key={idx}
                        onClick={() => handlePickOption(idx)}
                        className={`
                          flex items-center gap-4 px-6 py-5 rounded-2xl border-2 transition-all w-full md:w-auto md:flex-1 text-left
                          animate-[optionBounce_0.4s_ease-out]
                          ${isCorrect ? 'border-green-400 bg-green-950/50 animate-[correctGlow_1s_ease-in-out_infinite] scale-105' : ''}
                          ${isWrong ? 'border-red-500 bg-red-950/30 animate-[shake_0.4s_ease-in-out]' : ''}
                          ${!isCorrect && !isWrong ? 'border-orange-500/30 bg-orange-950/30 hover:border-orange-400 hover:bg-orange-900/40 hover:scale-[1.03] active:scale-95 cursor-pointer' : ''}
                        `}
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        <span className="text-4xl md:text-5xl flex-shrink-0">{opt.emoji}</span>
                        <span className="text-lg md:text-xl font-bold text-white">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Win text */}
          {completedCount === SCENARIOS.length && (
            <div className="mt-6 text-2xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-bounce flex items-center gap-3">
              <Sparkles /> Awesome! You understood cause & effect! <Sparkles />
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
                "Every action has a result."
              </h2>
              <p className="text-xl text-orange-300 mb-8 font-mono">
                "This is called cause and effect."
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
