import { useState, useEffect } from "react";
import { ArrowLeft, Bot, Play, Medal, Trophy, Crown, Star, Sparkles, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

// --- Data ---
type SortItem = {
  id: string;
  emoji: string;
  label: string;
  bin: string; // which bin it belongs to
};

type Bin = {
  id: string;
  label: string;
  emoji: string;
  color: string;       // tailwind border/text color key
  bgColor: string;     // tailwind bg
  glowColor: string;   // CSS glow
};

const BINS: Bin[] = [
  { id: "red", label: "Red", emoji: "🔴", color: "red", bgColor: "bg-red-950/50", glowColor: "rgba(239,68,68,0.6)" },
  { id: "blue", label: "Blue", emoji: "🔵", color: "blue", bgColor: "bg-blue-950/50", glowColor: "rgba(59,130,246,0.6)" },
  { id: "yellow", label: "Yellow", emoji: "🟡", color: "yellow", bgColor: "bg-yellow-950/50", glowColor: "rgba(234,179,8,0.6)" },
];

const ITEMS: SortItem[] = [
  { id: "item-1", emoji: "🍎", label: "Apple", bin: "red" },
  { id: "item-2", emoji: "🍓", label: "Berry", bin: "red" },
  { id: "item-3", emoji: "🫐", label: "Blueberry", bin: "blue" },
  { id: "item-4", emoji: "🦋", label: "Butterfly", bin: "blue" },
  { id: "item-5", emoji: "⭐", label: "Star", bin: "yellow" },
  { id: "item-6", emoji: "🌻", label: "Flower", bin: "yellow" },
];

const BADGES = [
  { name: "Sorting Star", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Match Master", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
  { name: "Logic Champ", icon: <Medal className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ_QUESTIONS = [
  {
    question: "Which two items MATCH?",
    options: ["🍎 Apple & 🍓 Berry", "🍎 Apple & 🦋 Butterfly", "⭐ Star & 🫐 Blueberry"],
    correct: 0,
  },
  {
    question: "Which group does 🌻 belong to?",
    options: ["🔴 Red", "🔵 Blue", "🟡 Yellow"],
    correct: 2,
  },
  {
    question: "Which item is DIFFERENT from the others?",
    options: ["🍎 Apple", "🍓 Berry", "🦋 Butterfly"],
    correct: 2,
  },
];

// --- Audio ---
const playSound = (type: "pop" | "success" | "error") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
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
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
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

// --- Draggable Item ---
function DraggableItem({ item, isPlaced }: { item: SortItem; isPlaced: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  if (isPlaced) return null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex flex-col items-center justify-center h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-slate-800/80 border-2 border-slate-500/50
        cursor-grab active:cursor-grabbing touch-none select-none transition-all
        hover:scale-110 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]
        ${isDragging ? "opacity-40 scale-110" : "opacity-100"}
      `}
    >
      <span className="text-4xl md:text-5xl">{item.emoji}</span>
      <span className="text-[10px] md:text-xs text-slate-300 font-mono mt-1">{item.label}</span>
    </div>
  );
}

// --- Droppable Bin ---
function DroppableBin({ bin, placedItems, shakeId }: { bin: Bin; placedItems: SortItem[]; shakeId: string | null }) {
  const { isOver, setNodeRef } = useDroppable({ id: bin.id });

  const borderColor: Record<string, string> = {
    red: "border-red-500/60",
    blue: "border-blue-500/60",
    yellow: "border-yellow-500/60",
  };
  const borderActiveColor: Record<string, string> = {
    red: "border-red-400",
    blue: "border-blue-400",
    yellow: "border-yellow-400",
  };
  const textColor: Record<string, string> = {
    red: "text-red-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
  };

  const isShaking = shakeId === bin.id;
  const isFull = placedItems.length >= 2;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col items-center p-3 md:p-4 rounded-2xl border-3 min-h-[160px] md:min-h-[200px] w-[130px] md:w-[160px] transition-all
        ${bin.bgColor} backdrop-blur-md
        ${isOver ? `${borderActiveColor[bin.color]} scale-105 shadow-[0_0_30px_${bin.glowColor}]` : borderColor[bin.color]}
        ${isFull ? `shadow-[0_0_25px_${bin.glowColor}] ${borderActiveColor[bin.color]}` : ""}
        ${isShaking ? "animate-[shake_0.4s_ease-in-out]" : ""}
      `}
      style={isOver ? { boxShadow: `0 0 30px ${bin.glowColor}` } : isFull ? { boxShadow: `0 0 25px ${bin.glowColor}` } : {}}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{bin.emoji}</span>
        <span className={`text-sm font-bold font-display tracking-widest ${textColor[bin.color]}`}>{bin.label}</span>
      </div>
      <div className="flex-1 flex flex-wrap gap-2 items-start justify-center w-full">
        {placedItems.map((item) => (
          <div
            key={item.id}
            className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl md:text-4xl animate-[itemBounce_0.4s_ease-out]"
          >
            {item.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Component ---
export default function MatchingSortingGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [unplacedItems, setUnplacedItems] = useState<SortItem[]>(() => [...ITEMS].sort(() => Math.random() - 0.5));
  const [binContents, setBinContents] = useState<Record<string, SortItem[]>>({ red: [], blue: [], yellow: [] });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shakeBinId, setShakeBinId] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  // Check win
  useEffect(() => {
    if (won) return;
    const totalPlaced = Object.values(binContents).reduce((sum, arr) => sum + arr.length, 0);
    if (totalPlaced === ITEMS.length) {
      setWon(true);
      playSound("success");
      setTimeout(() => {
        setPhase("summary");
        speak("Matching means finding things that are the same. Sorting means grouping similar things together.");
      }, 1500);
    }
  }, [binContents, won]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const item = unplacedItems.find((i) => i.id === active.id);
    if (!item) return;

    const binId = over.id as string;

    // Check if correct bin
    if (item.bin === binId) {
      playSound("pop");
      setBinContents((prev) => ({ ...prev, [binId]: [...prev[binId], item] }));
      setUnplacedItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      playSound("error");
      setShakeBinId(binId);
      setTimeout(() => setShakeBinId(null), 500);
    }
  };

  const resetGame = () => {
    setUnplacedItems([...ITEMS].sort(() => Math.random() - 0.5));
    setBinContents({ red: [], blue: [], yellow: [] });
    setWon(false);
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
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#10b981", "#3b82f6", "#ef4444", "#eab308"] });
          speak("Great job! You earned a new badge.");
        }, 800);
      }
    } else {
      playSound("error");
      speak("Try again!");
    }
  };

  const activeItem = unplacedItems.find((i) => i.id === activeId);

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#050D12] text-white overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-25 animate-[slide_60s_linear_infinite]" />
        <div className="absolute top-[12%] left-[15%] h-28 w-28 rounded-full bg-emerald-900/20 blur-2xl animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-[18%] right-[10%] h-40 w-40 rounded-full bg-blue-900/15 blur-3xl animate-[float_18s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[55%] left-[65%] h-24 w-24 rounded-full bg-yellow-900/10 blur-2xl animate-[float_22s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes itemBounce { 0% { transform: scale(0.6); opacity:0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity:1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-emerald-950/90 border-2 border-emerald-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-emerald-900/50 p-4 rounded-full border border-emerald-400/50 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <Info className="h-16 w-16 text-emerald-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-emerald-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-emerald-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Look at the different space items.</li>
            <li className="flex items-start gap-3"><span className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Drag and drop them into the matching color bin.</li>
            <li className="flex items-start gap-3"><span className="bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> Sort all the items correctly to win the game!</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* ===== GAME PHASE ===== */}
      {phase === "game" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="z-10 flex flex-col items-center w-full max-w-3xl px-4 animate-in fade-in duration-500">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-emerald-300 mb-1 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)] uppercase tracking-widest text-center">
              Sort &amp; Match Fun
            </h1>
            <p className="text-base text-emerald-200/80 font-mono mb-6 text-center">Drag each item into its matching color bin!</p>

            {/* Bins */}
            <div className="flex gap-3 md:gap-6 mb-8 justify-center flex-wrap">
              {BINS.map((bin) => (
                <DroppableBin key={bin.id} bin={bin} placedItems={binContents[bin.id]} shakeId={shakeBinId} />
              ))}
            </div>

            {/* Items Bank */}
            <div className="bg-black/40 border border-emerald-800/40 rounded-2xl p-4 md:p-6 backdrop-blur-md w-full max-w-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-emerald-400 font-mono text-sm tracking-widest">ITEMS TO SORT</h3>
                <Button variant="ghost" onClick={resetGame} className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-3 md:gap-4 flex-wrap justify-center min-h-[96px] items-center">
                {unplacedItems.map((item) => (
                  <DraggableItem key={item.id} item={item} isPlaced={false} />
                ))}
                {unplacedItems.length === 0 && (
                  <div className="text-emerald-700 font-mono italic text-sm">All items sorted!</div>
                )}
              </div>
            </div>

            {/* Win message */}
            {won && (
              <div className="mt-6 text-2xl md:text-3xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-bounce flex items-center gap-3">
                <Sparkles /> Awesome! You sorted everything! <Sparkles />
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeItem ? (
              <div className="flex flex-col items-center justify-center h-24 w-24 rounded-2xl bg-slate-700/90 border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] scale-110">
                <span className="text-5xl">{activeItem.emoji}</span>
                <span className="text-xs text-slate-200 font-mono mt-1">{activeItem.label}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ===== SUMMARY PHASE ===== */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-emerald-950/95 backdrop-blur-xl border-t-4 border-emerald-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(52,211,153,0.2)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-44 w-44 bg-emerald-900 rounded-full flex items-center justify-center border-4 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] animate-[float_4s_ease-in-out_infinite] flex-shrink-0">
              <Bot className="h-20 w-20 text-emerald-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-emerald-200 mb-4">
                "Matching means finding things that are the same."
              </h2>
              <p className="text-xl text-emerald-300 mb-8 font-mono">
                "Sorting means grouping similar things together."
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
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                    : idx < quizIndex
                    ? "bg-green-500"
                    : "bg-emerald-900"
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
                className="w-full text-left px-8 py-6 text-2xl font-bold bg-emerald-900/50 hover:bg-emerald-800 border-2 border-emerald-500/40 hover:border-emerald-300 rounded-2xl transition-all shadow-lg active:scale-95 text-emerald-100"
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
          <div className="bg-emerald-950 border-4 border-emerald-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(52,211,153,0.6)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
              🎊 AMAZING! 🎊
            </h1>

            <div className="bg-emerald-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">
              {badge.icon}
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-emerald-200 mb-10">You unlocked a new badge!</p>

            <div className="flex flex-col gap-4 w-full">
              <Button
                onClick={() => {
                  setPhase("game");
                  setQuizIndex(0);
                  resetGame();
                }}
                className="h-14 text-xl font-bold bg-emerald-600 hover:bg-emerald-500 rounded-full"
              >
                PLAY AGAIN
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="h-14 text-xl font-bold border-emerald-500 text-emerald-300 hover:bg-emerald-900/50 rounded-full"
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
