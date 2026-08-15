import { useState, useEffect } from "react";
import { ArrowLeft, Bot, Sparkles, CheckCircle2, Play, Medal, Trophy, Crown, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import confetti from "canvas-confetti";

type GameProps = { onBack: () => void };

const ROCKET_STEPS = [
  { id: "step-1", text: "Suit Up", icon: "🧑‍🚀", correctOrder: 1 },
  { id: "step-2", text: "Board Ship", icon: "🚀", correctOrder: 2 },
  { id: "step-3", text: "Engines", icon: "🔥", correctOrder: 3 },
  { id: "step-4", text: "Blast Off", icon: "🌌", correctOrder: 4 },
];

const BADGES = [
  { name: "Sequencing Star", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Step Master", icon: <Crown className="h-16 w-16 text-yellow-400" /> },
  { name: "Coding King", icon: <Trophy className="h-16 w-16 text-yellow-400" /> },
  { name: "Logic Champ", icon: <Medal className="h-16 w-16 text-yellow-400" /> },
];

const QUIZ_QUESTIONS = [
  {
    question: "What was the FIRST step?",
    options: ["🚀 Board Ship", "🧑‍🚀 Suit Up", "🔥 Engines"],
    correct: 1,
  },
  {
    question: "Which order is correct?",
    options: ["Suit Up -> Blast Off -> Engines", "Suit Up -> Board Ship -> Engines"],
    correct: 1,
  },
  {
    question: "Which step does NOT belong in space?",
    options: ["🔥 Engines", "🍕 Eat Pizza", "🌌 Blast Off"],
    correct: 1,
  },
];

// Simple Web Audio API synthesizer for sound effects
const playSound = (type: "click" | "success" | "error") => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.setValueAtTime(250, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    window.speechSynthesis.speak(utterance);
  }
};

function SortableItem(props: { id: string; step: typeof ROCKET_STEPS[0] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center justify-start gap-8 px-8 py-5 md:py-6 bg-indigo-900/80 border-2 border-indigo-400 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-indigo-800 transition-colors shadow-lg touch-none w-[90%] max-w-[400px] mx-auto
        ${isDragging ? "scale-105 shadow-[0_0_30px_rgba(99,102,241,0.8)] border-indigo-300 ring-4 ring-indigo-500/50 z-50" : ""}
      `}
    >
      <div className="text-5xl md:text-6xl select-none flex-shrink-0">{props.step.icon}</div>
      <div className="text-2xl md:text-3xl font-bold text-white tracking-wide font-display select-none">{props.step.text}</div>
    </div>
  );
}

export default function BasicSequencingGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "game" | "summary" | "quiz" | "reward">("intro");
  const [items, setItems] = useState(() => [...ROCKET_STEPS].sort(() => Math.random() - 0.5));
  const [quizIndex, setQuizIndex] = useState(0);
  const [badge, setBadge] = useState(BADGES[0]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Background Ambience
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const checkOrder = (currentItems: typeof ROCKET_STEPS) => {
    const isCorrect = currentItems.every((item, index) => item.correctOrder === index + 1);
    if (isCorrect) {
      playSound("success");
      setTimeout(() => {
        setPhase("summary");
        speak("Sequencing means doing things step by step. Every action has a correct order.");
      }, 1500);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        playSound("click");
        checkOrder(newItems);
        return newItems;
      });
    }
  };

  const handleQuizAnswer = (selectedIndex: number) => {
    const isCorrect = selectedIndex === QUIZ_QUESTIONS[quizIndex].correct;
    if (isCorrect) {
      playSound("success");
      if (quizIndex < QUIZ_QUESTIONS.length - 1) {
        setTimeout(() => setQuizIndex(quizIndex + 1), 1000);
      } else {
        setTimeout(() => {
          setPhase("reward");
          setBadge(BADGES[Math.floor(Math.random() * BADGES.length)]);
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
          });
          speak("Great job! You earned a new badge.");
        }, 1000);
      }
    } else {
      playSound("error");
      speak("Try again!");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-[#050B14] text-white p-6 overflow-hidden font-sans">
      <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-900/50 z-50">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>

      {/* Animated Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Stars */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-[slide_60s_linear_infinite]" />
        {/* Floating Planets */}
        <div className="absolute top-[10%] left-[10%] h-32 w-32 rounded-full bg-blue-900/30 blur-2xl animate-[float_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] right-[15%] h-48 w-48 rounded-full bg-purple-900/20 blur-3xl animate-[float_15s_ease-in-out_infinite_reverse]" />
      </div>

      <style>{`
        @keyframes slide { from { background-position: 0 0; } to { background-position: 1000px 1000px; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
      `}</style>

      {/* ===== INTRO PHASE ===== */}
      {phase === "intro" && (
        <div className="z-20 flex flex-col items-center justify-center bg-indigo-950/90 border-2 border-indigo-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.3)] max-w-xl text-center animate-in zoom-in duration-500">
          <div className="bg-indigo-900/50 p-4 rounded-full border border-indigo-400/50 mb-6 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
            <Info className="h-16 w-16 text-indigo-300" />
          </div>
          <h1 className="text-4xl font-display font-bold text-indigo-300 mb-4 drop-shadow-md uppercase tracking-widest">How to Play</h1>
          <ul className="text-left text-lg text-indigo-200 mb-8 space-y-4 font-mono">
            <li className="flex items-start gap-3"><span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</span> Look at the steps needed to launch the rocket.</li>
            <li className="flex items-start gap-3"><span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</span> Drag and drop the cards to put them in the correct order.</li>
            <li className="flex items-start gap-3"><span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</span> The game will check automatically when you get it right!</li>
          </ul>
          <Button onClick={() => { playSound("click"); setPhase("game"); }} className="h-16 px-12 text-2xl font-display font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-105 transition-transform">
            START MISSION
          </Button>
        </div>
      )}

      {/* Game Phase */}
      {phase === "game" && (
        <div className="z-10 flex flex-col items-center w-full max-w-2xl animate-in fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-indigo-300 mb-2 drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] uppercase tracking-widest text-center">
            Arrange the Steps
          </h1>
          <p className="text-xl text-indigo-200 font-mono mb-8 text-center">Drag the cards into the correct order to launch!</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-4 w-full items-center">
                {items.map((step) => (
                  <SortableItem key={step.id} id={step.id} step={step} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {items.every((item, index) => item.correctOrder === index + 1) && (
            <div className="mt-8 text-3xl font-display font-bold text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-bounce flex items-center gap-3">
              <Sparkles /> Great job! You got the order right! <Sparkles />
            </div>
          )}
        </div>
      )}

      {/* Summary Phase (Slide Up Panel) */}
      {phase === "summary" && (
        <div className="absolute inset-x-0 bottom-0 top-[30%] bg-indigo-950/95 backdrop-blur-xl border-t-4 border-indigo-500 rounded-t-[3rem] p-8 md:p-16 flex flex-col items-center justify-center z-20 animate-in slide-in-from-bottom duration-700 shadow-[0_-20px_60px_rgba(79,70,229,0.3)]">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full">
            <div className="h-48 w-48 bg-indigo-900 rounded-full flex items-center justify-center border-4 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.6)] animate-[float_4s_ease-in-out_infinite]">
              <Bot className="h-24 w-24 text-indigo-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-indigo-200 mb-4">
                "Sequencing means doing things step by step."
              </h2>
              <p className="text-xl text-indigo-300 mb-8 font-mono">
                "Every action has a correct order."
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

      {/* Quiz Phase */}
      {phase === "quiz" && (
        <div className="z-10 flex flex-col items-center w-full max-w-3xl animate-in fade-in zoom-in duration-500">
          <div className="mb-8 flex items-center gap-2">
            {QUIZ_QUESTIONS.map((_, idx) => (
              <div key={idx} className={`h-3 w-12 rounded-full ${idx === quizIndex ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]' : idx < quizIndex ? 'bg-green-500' : 'bg-indigo-900'}`} />
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
                className="w-full text-left px-8 py-6 text-2xl font-bold bg-indigo-900/60 hover:bg-indigo-800 border-2 border-indigo-500/50 hover:border-indigo-300 rounded-2xl transition-all shadow-lg active:scale-95 text-indigo-100"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reward Phase */}
      {phase === "reward" && (
        <div className="z-30 flex flex-col items-center justify-center animate-in zoom-in duration-700 bg-black/60 absolute inset-0 backdrop-blur-sm p-6">
          <div className="bg-indigo-950 border-4 border-indigo-400 rounded-3xl p-12 flex flex-col items-center text-center max-w-lg shadow-[0_0_100px_rgba(79,70,229,0.8)]">
            <h1 className="text-5xl font-display font-bold text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
              🎊 AMAZING! 🎊
            </h1>
            
            <div className="bg-indigo-900/80 rounded-full p-8 mb-6 border-4 border-yellow-400/50 shadow-[inset_0_0_30px_rgba(250,204,21,0.2)] animate-[float_3s_ease-in-out_infinite]">
              {badge.icon}
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">{badge.name}</h2>
            <p className="text-lg text-indigo-200 mb-10">You unlocked a new badge!</p>

            <div className="flex flex-col gap-4 w-full">
              <Button 
                onClick={() => {
                  setPhase("game");
                  setQuizIndex(0);
                  setItems([...ROCKET_STEPS].sort(() => Math.random() - 0.5));
                }}
                className="h-14 text-xl font-bold bg-indigo-600 hover:bg-indigo-500 rounded-full"
              >
                PLAY AGAIN
              </Button>
              <Button 
                variant="outline"
                onClick={onBack}
                className="h-14 text-xl font-bold border-indigo-500 text-indigo-300 hover:bg-indigo-900/50 rounded-full"
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
