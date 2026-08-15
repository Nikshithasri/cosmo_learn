import { useState, useEffect } from "react";
import { 
  ArrowLeft, Bot, Play, Star, Check, X, Sparkles, Volume2, VolumeX, Lightbulb, 
  Terminal, ArrowRight, RotateCcw, Award, CheckCircle2, ChevronRight, Zap, 
  Settings, Lock, Unlock, ShieldAlert, Disc, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GamePhase = "intro" | "how_to_play" | "game1" | "game2" | "game3" | "concept_note" | "quiz" | "rewards";

type GameProps = {
  onBack: () => void;
};

// --- AUDIO SYNTHESIS UTILS ---
const playSound = (type: "chime" | "buzz" | "pop" | "fanfare" | "typing" | "gate" | "spin", soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "chime") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.6);
    } else if (type === "buzz") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(550, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === "spin") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === "fanfare") {
      osc.type = "triangle";
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const oscNode = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscNode.type = "triangle";
        oscNode.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.08);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + idx * 0.08 + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.08 + 0.4);
        oscNode.start(audioCtx.currentTime + idx * 0.08);
        oscNode.stop(audioCtx.currentTime + idx * 0.08 + 0.4);
      });
    } else if (type === "typing") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200 + Math.random() * 200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === "gate") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.4);
    }
    setTimeout(() => { if (audioCtx.state !== 'closed') audioCtx.close(); }, 2000);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const speakText = (text: string, enabled = true) => {
  if (enabled && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; 
    utterance.pitch = 1.1; 
    window.speechSynthesis.speak(utterance);
  }
};

export default function PythonLoopsGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [showHint, setShowHint] = useState(false);
  
  // Game stats
  const [xp, setXp] = useState(0);
  const [stars, setStars] = useState(0);
  const [timeCrystals, setTimeCrystals] = useState(0);
  const [gearTokens, setGearTokens] = useState(0);
  const [streak, setStreak] = useState(1);
  const [progress, setProgress] = useState(10);
  
  // Interactive simulator logic
  const [simOutput, setSimOutput] = useState<string[]>([]);
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [demoSpinCount, setDemoSpinCount] = useState<number>(3);
  const [spinAngle, setSpinAngle] = useState(0);

  // Game 1 Predict Spins (3 rounds)
  const [g1Round, setG1Round] = useState(1);
  const [g1Selection, setG1Selection] = useState<number | null>(null);
  const [g1Feedback, setG1Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Game 2 Fix Loops (3 rounds)
  const [g2Round, setG2Round] = useState(1);
  const [g2Selection, setG2Selection] = useState<number | null>(null);
  const [g2Feedback, setG2Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Game 3 Time Portals Drag/Sort (3 rounds)
  const [g3Round, setG3Round] = useState(1);
  const [g3CodeDraft, setG3CodeDraft] = useState<string[]>([]);
  const [g3Feedback, setG3Feedback] = useState<"correct" | "incorrect" | null>(null);
  const [g3PortalOpen, setG3PortalOpen] = useState(false);

  // Quiz variables
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    playSound("pop", !soundEnabled);
  };

  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (!speechEnabled) {
      speakText("Speech enabled!", true);
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  };

  const changePhase = (newPhase: GamePhase) => {
    playSound("pop", soundEnabled);
    setPhase(newPhase);
    setShowHint(false);

    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    let p = 10;
    if (newPhase === "intro") p = 10;
    else if (newPhase === "how_to_play") p = 20;
    else if (newPhase === "game1") p = 35;
    else if (newPhase === "game2") p = 50;
    else if (newPhase === "game3") p = 65;
    else if (newPhase === "concept_note") p = 75;
    else if (newPhase === "quiz") p = 85;
    else if (newPhase === "rewards") p = 100;
    setProgress(p);

    setTimeout(() => {
      if (newPhase === "intro") {
        speakText("Welcome to SYNC, The Time Spinner! Let's help repeat cosmic actions and repair the timeline with Python loops!", speechEnabled);
      } else if (newPhase === "how_to_play") {
        speakText("Use repetition logic, repair engine code errors, and unlock the time portal gates!", speechEnabled);
      } else if (newPhase === "game1") {
        speakText("Game 1: Spin the Loop. Predict how many outputs or spins the For loops will trigger!", speechEnabled);
      } else if (newPhase === "game2") {
        speakText("Game 2: Repair the Time Engine. Fix the syntax and add missing loop control increments!", speechEnabled);
      } else if (newPhase === "game3") {
        speakText("Game 3: Time Portal Challenge. Assemble python loop code chunks to reopen security portals!", speechEnabled);
      } else if (newPhase === "concept_note") {
        speakText("Examine syntax structures and avoid infinite loop warnings before taking the final quiz!", speechEnabled);
      } else if (newPhase === "quiz") {
        speakText("Mainframe test initiated. Solve loop puzzles to confirm your credentials!", speechEnabled);
      } else if (newPhase === "rewards") {
        playSound("fanfare", soundEnabled);
        confetti({ particleCount: 150, spread: 80 });
        speakText("Congratulations! You completed the Time Spinner mission and unlocked the Loop Master badge!", speechEnabled);
      }
    }, 450);
  };

  // Run interactive For loop visualizer
  const runLoopDemo = () => {
    if (isRunningSim) return;
    setIsRunningSim(true);
    playSound("pop", soundEnabled);
    setSimOutput(["Initializing Time Engine..."]);
    
    let currentSpin = 0;
    const runStep = () => {
      if (currentSpin < demoSpinCount) {
        currentSpin++;
        setSpinAngle(prev => prev + 120);
        playSound("spin", soundEnabled);
        setSimOutput(prev => [...prev, `[Spin ${currentSpin}] => Repeating Action...`]);
        setTimeout(runStep, 600);
      } else {
        playSound("chime", soundEnabled);
        setSimOutput(prev => [...prev, "Engine synced successfully!"]);
        setIsRunningSim(false);
      }
    };

    setTimeout(() => {
      setSimOutput(prev => [...prev, `>>> for i in range(${demoSpinCount}):`]);
      setSimOutput(prev => [...prev, '>>>     print("Spin")']);
      setTimeout(runStep, 650);
    }, 800);
  };

  // Game 1 Predict Spins Rounds
  const g1Rounds = [
    {
      code: `for i in range(3):\n    print("Spin")`,
      question: 'How many times is "Spin" printed?',
      options: ["1", "2", "3", "4"],
      correctIdx: 2,
      hint: "range(3) runs the code inside the loop for i values of 0, 1, and 2. That is 3 iterations total!"
    },
    {
      code: `for i in range(5):\n    print("Go")`,
      question: 'How many times is "Go" printed?',
      options: ["4", "5", "6", "7"],
      correctIdx: 1,
      hint: "range(5) counts from 0 up to (but not including) 5. This repeats exactly 5 times!"
    },
    {
      code: `for i in range(2):\n    print("SYNC")`,
      question: 'How many outputs are printed?',
      options: ["1", "2", "3", "4"],
      correctIdx: 1,
      hint: "range(2) iterates 2 times (for i = 0 and i = 1)."
    }
  ];

  const handleG1Answer = (optionIdx: number) => {
    if (g1Feedback !== null) return;
    setG1Selection(optionIdx);
    const isCorrect = optionIdx === g1Rounds[g1Round - 1].correctIdx;

    if (isCorrect) {
      playSound("chime", soundEnabled);
      setG1Feedback("correct");
      setXp(x => x + 100);
      setStars(s => s + 1);
      setTimeCrystals(c => c + 10);
      setTimeout(() => {
        setG1Feedback(null);
        setG1Selection(null);
        if (g1Round < 3) {
          setG1Round(r => r + 1);
        } else {
          changePhase("game2");
        }
      }, 2000);
    } else {
      playSound("buzz", soundEnabled);
      setG1Feedback("incorrect");
      setTimeout(() => {
        setG1Feedback(null);
        setG1Selection(null);
      }, 1500);
    }
  };

  // Game 2 Repair Loops Rounds
  const g2Rounds = [
    {
      broken: `for i range(5):\n    print(i)`,
      desc: "Syntax error! Loops require the 'in' keyword to define boundaries. Fix the loop statement.",
      options: [
        { code: `for i in range(5):\n    print(i)`, correct: true },
        { code: `for i range(5):\n    print(i)`, correct: false },
        { code: `for i in range 5:\n    print(i)`, correct: false }
      ],
      hint: "Remember the syntax structure: 'for variable in range(limit):'."
    },
    {
      broken: `while count <= 5\n    print(count)`,
      desc: "Compilation error! Loop condition statements must end with a colon (:). Fix it.",
      options: [
        { code: `while count <= 5:\n    print(count)`, correct: true },
        { code: `while count <= 5\n    print(count)`, correct: false },
        { code: `while (count <= 5)\n    print(count)`, correct: false }
      ],
      hint: "Always add a colon (:) at the end of loop statements like 'for' or 'while'."
    },
    {
      broken: `count = 1\n\nwhile count <= 3:\n    print(count)\n    # Engine is stuck in an infinite loop!`,
      desc: "Infinite loop alert! The count variable never updates. What missing line completes the loop?",
      options: [
        { code: `count += 1`, correct: true },
        { code: `count = 1`, correct: false },
        { code: `print("Done")`, correct: false }
      ],
      hint: "To stop a while loop, we must increment the counter (e.g. 'count += 1') so the check eventually becomes False!"
    }
  ];

  const handleG2Answer = (optionIdx: number) => {
    if (g2Feedback !== null) return;
    setG2Selection(optionIdx);
    const isCorrect = g2Rounds[g2Round - 1].options[optionIdx].correct;

    if (isCorrect) {
      playSound("chime", soundEnabled);
      setG2Feedback("correct");
      setXp(x => x + 100);
      setStars(s => s + 1);
      setGearTokens(g => g + 1);
      setTimeout(() => {
        setG2Feedback(null);
        setG2Selection(null);
        if (g2Round < 3) {
          setG2Round(r => r + 1);
        } else {
          changePhase("game3");
        }
      }, 2000);
    } else {
      playSound("buzz", soundEnabled);
      setG2Feedback("incorrect");
      setTimeout(() => {
        setG2Feedback(null);
        setG2Selection(null);
      }, 1500);
    }
  };

  // Game 3 Time Portal Rounds
  const g3Rounds = [
    {
      title: "Time Portal Alpha",
      mission: `Print "Welcome" 5 times`,
      blocks: [`    print("Welcome")`, `for i in range(5):`],
      correctOrder: [`for i in range(5):`, `    print("Welcome")`],
      hint: "Start with the 'for' loop header, then place the indented print block below it."
    },
    {
      title: "Time Portal Beta",
      mission: `Print Numbers 1 to 5`,
      blocks: [`    print(i)`, `for i in range(1, 6):`],
      correctOrder: [`for i in range(1, 6):`, `    print(i)`],
      hint: "To count from 1 to 5, range(1, 6) starts at 1 and stops before 6!"
    },
    {
      title: "Core Time Portal Gate",
      mission: `Print numbers 3, 2, 1 and then "Blast Off!"`,
      blocks: [`while count >= 1:`, `    print(count)`, `count = 3`, `    count -= 1`, `print("Blast Off!")`],
      correctOrder: [`count = 3`, `while count >= 1:`, `    print(count)`, `    count -= 1`, `print("Blast Off!")`],
      hint: "1) Initialize count to 3. 2) Start while loop count >= 1. 3) Print count. 4) Subtract 1. 5) Print Blast Off after loop ends."
    }
  ];

  const addBlockToDraft = (block: string) => {
    if (g3Feedback !== null) return;
    playSound("pop", soundEnabled);
    if (g3CodeDraft.includes(block)) {
      setG3CodeDraft(prev => prev.filter(b => b !== block));
    } else {
      setG3CodeDraft(prev => [...prev, block]);
    }
  };

  const verifyG3Portal = () => {
    if (g3Feedback !== null) return;
    const roundData = g3Rounds[g3Round - 1];
    
    // Check order alignment
    const isCorrect = g3CodeDraft.length === roundData.correctOrder.length &&
      g3CodeDraft.every((val, idx) => val === roundData.correctOrder[idx]);

    if (isCorrect) {
      playSound("gate", soundEnabled);
      setG3Feedback("correct");
      setG3PortalOpen(true);
      setXp(x => x + 120);
      setStars(s => s + 1);
      setTimeCrystals(c => c + 15);

      setTimeout(() => {
        setG3Feedback(null);
        setG3PortalOpen(false);
        setG3CodeDraft([]);
        if (g3Round < 3) {
          setG3Round(r => r + 1);
        } else {
          changePhase("concept_note");
        }
      }, 2500);
    } else {
      playSound("buzz", soundEnabled);
      setG3Feedback("incorrect");
      setTimeout(() => {
        setG3Feedback(null);
      }, 1500);
    }
  };

  // Final Quiz Data
  const quizQuestions = [
    {
      q: "What is the purpose of a loop?",
      options: [
        "Store Values",
        "Repeat Actions",
        "Create Variables",
        "Import Files"
      ],
      answerIdx: 1, // B
      explanation: "Loops are used to automate repeated tasks, running a block of code multiple times without rewriting it."
    },
    {
      q: "Which loop is used when repetitions are known?",
      options: [
        "While Loop",
        "If Statement",
        "For Loop",
        "Function"
      ],
      answerIdx: 2, // C
      explanation: "A For Loop is perfect when you know beforehand how many times you need to repeat the execution."
    },
    {
      q: "What is the output?\n\nfor i in range(3):\n    print(\"Hi\")",
      options: [
        "Hi",
        "Hi Hi",
        "Hi Hi Hi",
        "Error"
      ],
      answerIdx: 2, // C
      explanation: "range(3) causes the print statement to execute exactly three times, producing 'Hi' on three separate lines."
    },
    {
      q: "Which keyword starts a repetition loop?",
      options: [
        "repeat",
        "loop",
        "for",
        "print"
      ],
      answerIdx: 2, // C
      explanation: "In Python, 'for' and 'while' are the built-in keywords used to initiate loop statements."
    },
    {
      q: "What happens if we forget count += 1 inside a while loop?",
      options: [
        "Faster Program",
        "Error",
        "Infinite Loop",
        "Nothing"
      ],
      answerIdx: 3, // C (wait, index 2 is Infinite Loop)
      // Note: A) Index 0, B) Index 1, C) Index 2, D) Index 3
      // Ah, "Infinite Loop" is option C, which is index 2!
      // Let's make sure answerIdx points to 2.
      answerIdx: 2,
      explanation: "Without incrementing count, the loop condition remains True forever, resulting in an Infinite Loop."
    }
  ];

  const handleQuizAnswer = (optIdx: number) => {
    if (quizFeedback !== null) return;
    setQuizSelection(optIdx);
    const correctIdx = quizQuestions[quizIndex].answerIdx;
    const isCorrect = optIdx === correctIdx;

    if (isCorrect) {
      playSound("chime", soundEnabled);
      setQuizFeedback("correct");
      setQuizScore(s => s + 1);
      setXp(x => x + 60);
      setQuizAnswers(prev => ({ ...prev, [quizIndex]: true }));
      setStreak(s => s + 1);
    } else {
      playSound("buzz", soundEnabled);
      setQuizFeedback("incorrect");
      setQuizAnswers(prev => ({ ...prev, [quizIndex]: false }));
      setStreak(1);
    }
    setShowExplanation(true);
  };

  const nextQuizQuestion = () => {
    setQuizFeedback(null);
    setQuizSelection(null);
    setShowExplanation(false);
    playSound("pop", soundEnabled);

    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(idx => idx + 1);
    } else {
      changePhase("rewards");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen w-full bg-slate-950 text-white overflow-y-auto px-4 py-6 md:p-8 font-sans">
      
      {/* Background vectors */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.06),transparent_50%)]" />
        
        {/* Repeating rings representing time loops */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full border border-orange-500/10 animate-spin"
            style={{
              top: "50%",
              left: "50%",
              width: `${(i + 1) * 200}px`,
              height: `${(i + 1) * 200}px`,
              transform: "translate(-50%, -50%)",
              animationDuration: `${(i + 1) * 15}s`,
              animationDirection: i % 2 === 0 ? "normal" : "reverse"
            }}
          />
        ))}
      </div>

      <style>{`
        .text-glow-orange {
          text-shadow: 0 0 10px rgba(249, 115, 22, 0.6);
        }
        .orange-panel-glow {
          box-shadow: 0 0 30px rgba(249, 115, 22, 0.08);
        }
        @keyframes gear-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-gear {
          animation: gear-spin 6s linear infinite;
        }
      `}</style>

      {/* CORE HEADER */}
      <header className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row gap-4 items-center justify-between border-b border-orange-950 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-950/40 border border-orange-850/30"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> LEAVE PLATFORM
          </Button>
          <div className="h-6 w-px bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider">
              LEVEL 06
            </span>
            <h2 className="text-xl font-bold font-mono tracking-wide text-glow-orange text-orange-300 flex items-center gap-1.5">
              <Disc className="h-5 w-5 spin-gear text-orange-400" /> SYNC_LOOP_SPINNER
            </h2>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="flex-1 max-w-md mx-6 w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-mono text-orange-400 font-bold uppercase tracking-widest">
            <span>Time Engine Repair Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-900 border border-orange-950 rounded-full h-3.5 p-0.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* METRICS & CONTROLS */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-cyan-400">💎</span>
            <span className="text-cyan-100">{timeCrystals} Crystals</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-orange-400">⚙️</span>
            <span className="text-orange-100">{gearTokens} Gears</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-fuchsia-400">⚡</span>
            <span className="text-fuchsia-100">{xp} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleSpeech}
              title={speechEnabled ? "Mute Voice" : "Unmute Voice"}
              className={`p-2 rounded-lg border transition-all ${speechEnabled ? "bg-purple-950/40 border-purple-800 text-purple-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button 
              onClick={toggleSound}
              title={soundEnabled ? "Mute SFX" : "Unmute SFX"}
              className={`p-2 rounded-lg border transition-all ${soundEnabled ? "bg-orange-950/40 border-orange-800 text-orange-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* CORE DISPLAY */}
      <main className="relative z-10 w-full max-w-5xl flex-1 flex flex-col justify-center items-center py-4">
        
        {/* ========================================================
            STAGE: INTRO
           ======================================================== */}
        {phase === "intro" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in zoom-in-95 duration-500">
            {/* Mascot Panel */}
            <div className="lg:col-span-4 flex flex-col items-center text-center bg-slate-900/40 border border-orange-900/30 p-6 rounded-2xl backdrop-blur-md">
              <div className="relative w-44 h-44 flex items-center justify-center bg-orange-950/20 border-2 border-orange-500 rounded-full shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                <Disc 
                  className="w-28 h-28 text-orange-400" 
                  style={{ transform: `rotate(${spinAngle}deg)`, transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
                <Bot className="absolute w-14 h-14 text-white" />
              </div>
              <h3 className="mt-4 font-mono font-bold text-lg text-orange-400 tracking-wider">ROBOT SYNC</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-mono">
                "Beep-boop! I am SYNC, the Time Spinner! Help me program repetitions into the Time Engine so we can mend broken loops and save the galaxy!"
              </p>
            </div>

            {/* Concept Panel */}
            <div className="lg:col-span-8 flex flex-col bg-slate-900/80 border-2 border-orange-500 rounded-3xl p-6 md:p-8 orange-panel-glow backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-purple-500 to-indigo-500" />
              
              <h1 className="text-3xl font-extrabold text-white tracking-wide font-mono flex items-center gap-2">
                🌀 Concept: Python Loops
              </h1>
              
              <div className="mt-6 space-y-4 text-slate-100 font-sans max-h-[420px] overflow-y-auto pr-2">
                <div>
                  <h4 className="text-orange-400 font-bold font-mono text-sm uppercase tracking-wider">📚 Learn First</h4>
                  <p className="text-slate-300 text-xs mt-1">
                    <strong>What is a Loop?</strong>
                  </p>
                  <p className="text-slate-300 text-xs mt-1">
                    A Loop is used to repeat a block of code multiple times. Instead of writing the same code again and again, a loop does it automatically.
                  </p>
                  <p className="text-slate-400 text-[10px] mt-1 italic">
                    Analogy: Imagine brushing your teeth. You move the brush repeatedly until the job is done. That is a loop!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                    <h5 className="text-orange-300 font-bold font-mono uppercase text-[10px] mb-1">1. For Loops (Known reps)</h5>
                    <pre className="font-mono text-orange-400 bg-slate-900 p-2 rounded">
{`for i in range(5):
    print("Hello")`}
                    </pre>
                    <p className="text-[9px] text-slate-500 mt-1">Repeats a specific number of times (5 times here).</p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                    <h5 className="text-purple-300 font-bold font-mono uppercase text-[10px] mb-1">2. While Loops (Conditional)</h5>
                    <pre className="font-mono text-purple-400 bg-slate-900 p-2 rounded">
{`count = 1
while count <= 5:
    print(count)
    count += 1`}
                    </pre>
                    <p className="text-[9px] text-slate-500 mt-1">Repeats while a condition remains True.</p>
                  </div>
                </div>

                {/* Interactive Loop Visualizer */}
                <div className="bg-slate-950 p-4 rounded-xl border border-orange-950">
                  <div className="flex justify-between items-center pb-2 border-b border-orange-950/40 mb-3">
                    <span className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" /> Time Spinner Simulator
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400 uppercase font-mono">Loop count:</label>
                        <select 
                          value={demoSpinCount} 
                          onChange={(e) => setDemoSpinCount(parseInt(e.target.value))}
                          className="bg-slate-900 border border-slate-700 text-xs font-mono rounded px-1 text-orange-300"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={runLoopDemo} 
                        disabled={isRunningSim}
                        className="bg-orange-500 hover:bg-orange-400 text-black font-bold h-7 px-3 text-xs"
                      >
                        <Play className="mr-1 w-3 h-3 fill-current" /> SPIN ENGINE
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800 text-[11px] leading-relaxed">
                      <div className="text-orange-400">for i in range({demoSpinCount}):</div>
                      <div className="text-emerald-400">    print("Spin")</div>
                    </div>
                    <div className="bg-black p-3 rounded border border-orange-950 min-h-[60px] flex flex-col justify-start">
                      <div className="text-orange-500 text-[10px] uppercase font-bold tracking-wider mb-1 border-b border-orange-950/30 pb-0.5">Console Output:</div>
                      {simOutput.map((line, idx) => (
                        <div key={idx} className="text-orange-300 font-bold animate-pulse text-[11px]">{line}</div>
                      ))}
                      {simOutput.length === 0 && <span className="text-slate-600 italic">Click Spin Engine...</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
                <Button 
                  onClick={() => changePhase("how_to_play")}
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-transform hover:scale-105"
                >
                  HOW TO PLAY <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: HOW TO PLAY
           ======================================================== */}
        {phase === "how_to_play" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-orange-500 rounded-3xl p-6 md:p-8 orange-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-purple-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6">
              ⚙️ Galaxy Repetition: How to Play
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-orange-400 font-bold font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-orange-400" /> Objective
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Solve time loop puzzles, complete code repairs for malfunctioning syntax, and match loop instructions in order to open the portals.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-amber-400 font-bold font-mono flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> Rules
                  </h4>
                  <ul className="text-xs text-slate-300 mt-1.5 space-y-1">
                    <li className="flex items-center gap-1.5"><span className="text-orange-400">✔</span> Complete all 3 games</li>
                    <li className="flex items-center gap-1.5"><span className="text-orange-400">✔</span> Use loops to solve challenges</li>
                    <li className="flex items-center gap-1.5"><span className="text-orange-400">✔</span> Earn Time Crystals & Gears</li>
                    <li className="flex items-center gap-1.5"><span className="text-orange-400">✔</span> Unlock the Time Portal</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-purple-400 font-bold font-mono flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" /> Badge Rewards
                  </h4>
                  <ul className="text-xs text-slate-300 mt-1.5 space-y-1">
                    <li>⭐ XP Points (+900)</li>
                    <li>⭐ Loop Master Badge Unlocked</li>
                    <li>⭐ New Galaxy Unlock cleared</li>
                  </ul>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-emerald-400 font-bold font-mono flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-emerald-400" /> Time Spinner Hint
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Stuck on code alignment? Click the lightbulb in the upper corner of the panel to see tips from SYNC.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("intro")}
                className="border-orange-800 text-orange-400 hover:bg-orange-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("game1")}
                className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-transform hover:scale-105"
              >
                START GAME 1: SPIN &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 1 (Predict Spins)
           ======================================================== */}
        {phase === "game1" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-orange-500 rounded-3xl p-6 md:p-8 orange-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-purple-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold">GAME 1: SPIN THE LOOP</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Predict the Spins!</h3>
              </div>
              <span className="bg-orange-950 text-orange-400 border border-orange-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g1Round}/3
              </span>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-orange-950 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-orange-950 text-orange-400 hover:bg-orange-900/60 border border-orange-850/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g1Rounds[g1Round - 1].question}</p>
              
              <div className="bg-slate-900 max-w-md mx-auto p-4 rounded-xl border border-slate-800 font-mono text-base text-orange-400 shadow-inner whitespace-pre leading-relaxed text-left pl-8">
                {g1Rounds[g1Round - 1].code}
              </div>
            </div>

            {/* Option paths */}
            <div className="grid grid-cols-2 gap-4">
              {g1Rounds[g1Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-orange-500 text-slate-200 hover:bg-orange-950/20";
                
                if (g1Selection === idx) {
                  btnStyle = g1Feedback === "correct" 
                    ? "bg-orange-950/50 border-orange-400 text-orange-300 scale-102 ring-2 ring-orange-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG1Answer(idx)}
                    disabled={g1Feedback !== null}
                    className={`p-5 rounded-xl border-2 font-mono text-lg text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 group cursor-pointer ${btnStyle}`}
                  >
                    <span className="font-bold">[{option}] Spins</span>
                  </button>
                );
              })}
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-orange-950/30 border border-orange-800/40 p-4 rounded-xl text-xs text-orange-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-orange-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> SYNC's Tip:
                </div>
                {g1Rounds[g1Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 2 (Repair loop syntax)
           ======================================================== */}
        {phase === "game2" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-orange-500 rounded-3xl p-6 md:p-8 orange-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold">GAME 2: ENGINE REPAIR</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Repair the Time Engine!</h3>
              </div>
              <span className="bg-orange-950 text-orange-400 border border-orange-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g2Round}/3
              </span>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-rose-950 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-orange-950 text-orange-400 hover:bg-orange-900/60 border border-orange-850/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g2Rounds[g2Round - 1].desc}</p>
              
              <div className="bg-slate-900 max-w-md mx-auto p-4 rounded-xl border border-rose-500/30 font-mono text-sm text-rose-400 shadow-inner flex items-center justify-between gap-3 whitespace-pre text-left pl-8">
                <span>{g2Rounds[g2Round - 1].broken}</span>
                <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-bold animate-pulse flex-shrink-0">BROKEN LOOP</span>
              </div>
            </div>

            {/* Repair Options */}
            <div className="grid grid-cols-1 gap-4">
              {g2Rounds[g2Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-orange-500 text-slate-200 hover:bg-orange-950/20";
                
                if (g2Selection === idx) {
                  btnStyle = g2Feedback === "correct" 
                    ? "bg-orange-950/50 border-orange-400 text-orange-300 scale-102 ring-2 ring-orange-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG2Answer(idx)}
                    disabled={g2Feedback !== null}
                    className={`p-4 rounded-xl border-2 font-mono text-sm text-left transition-all duration-300 relative flex items-center justify-between group cursor-pointer ${btnStyle}`}
                  >
                    <pre className="text-xs whitespace-pre-wrap">{option.code}</pre>
                    {g2Selection === idx && (
                      g2Feedback === "correct" 
                        ? <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        : <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-orange-950/30 border border-orange-800/40 p-4 rounded-xl text-xs text-orange-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-orange-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> SYNC's Tip:
                </div>
                {g2Rounds[g2Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 3 (Time Portal Challenge)
           ======================================================== */}
        {phase === "game3" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-orange-500 rounded-3xl p-6 md:p-8 orange-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-orange-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold">GAME 3: PORTAL OVERRIDE</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">{g3Rounds[g3Round - 1].title}</h3>
              </div>
              <span className="bg-orange-950 text-orange-400 border border-orange-800 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
                Portal Node {g3Round}/3
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
              
              <div className="md:col-span-5 bg-slate-950 p-4 rounded-2xl border border-orange-950 text-center flex flex-col justify-center items-center">
                <div className="relative w-28 h-28 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                  {g3PortalOpen ? (
                    <Unlock className="w-14 h-14 text-emerald-400 animate-pulse" />
                  ) : (
                    <Lock className="w-14 h-14 text-orange-400" />
                  )}
                </div>
                <div className="text-[11px] font-mono text-orange-400 uppercase font-bold mt-1">
                  Portal Gate: {g3PortalOpen ? "UNLOCKED 🔓" : "LOCKED 🔒"}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-sans">{g3Rounds[g3Round - 1].mission}</p>
              </div>

              {/* Assembly Editor */}
              <div className="md:col-span-7 bg-slate-950 p-4 rounded-2xl border border-orange-950 relative">
                <div className="absolute top-2 right-3">
                  <button 
                    onClick={() => setShowHint(!showHint)}
                    className="p-1.5 rounded-lg bg-orange-950 text-orange-400 hover:bg-orange-900/60 border border-orange-850/40"
                    title="Show Hint"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-3 border-b border-orange-950/40 pb-1 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> Loop Construction Editor
                </span>

                <div className="space-y-2 min-h-[120px] bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                  {g3CodeDraft.map((block, i) => (
                    <div key={i} className="text-orange-300 flex items-center gap-1.5">
                      <span className="text-slate-600 text-[10px]">{i+1}</span>
                      <pre className="font-mono text-xs">{block}</pre>
                    </div>
                  ))}
                  {g3CodeDraft.length === 0 && <span className="text-slate-600 italic text-[11px]">Click time blocks below in order...</span>}
                </div>
              </div>
            </div>

            {/* Draggable blocks selector */}
            <div className="space-y-4">
              <div className="text-xs font-mono text-slate-400">Available Loop Blocks:</div>
              <div className="flex flex-wrap gap-3">
                {g3Rounds[g3Round - 1].blocks.map((block, idx) => {
                  const isSelected = g3CodeDraft.includes(block);
                  return (
                    <button
                      key={idx}
                      onClick={() => addBlockToDraft(block)}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-orange-950 border-orange-400 text-orange-300 font-bold" 
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <pre className="text-[11px]">{block}</pre>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-850 pt-4 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setG3CodeDraft([])}
                  className="border-slate-800 text-slate-400 hover:bg-slate-900 rounded-full"
                >
                  RESET BLOCKS
                </Button>
                <Button 
                  onClick={verifyG3Portal}
                  disabled={g3CodeDraft.length === 0 || g3Feedback !== null}
                  className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                >
                  ACTIVATE PORTAL &rarr;
                </Button>
              </div>
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-orange-950/30 border border-orange-800/40 p-4 rounded-xl text-xs text-orange-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-orange-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> SYNC's Tip:
                </div>
                {g3Rounds[g3Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: CONCEPT NOTE (Revision Summary)
           ======================================================== */}
        {phase === "concept_note" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-orange-500 rounded-3xl p-6 md:p-8 orange-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-purple-500 to-indigo-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6 flex items-center justify-center gap-2">
              📝 Revision Summary: Python Loops
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-orange-400 font-bold font-mono text-xs uppercase tracking-wider">🔄 For Loops vs While Loops</h4>
                  <div className="mt-2 space-y-2 text-[11px] font-mono text-slate-300 leading-relaxed">
                    <div>
                      <span className="text-orange-400 font-bold">FOR LOOP:</span> Used when the number of repetitions is known.
                    </div>
                    <pre className="bg-slate-900 p-1.5 rounded text-[10px] mt-1">
{`for i in range(3):
    print("Python")`}
                    </pre>
                    <div className="mt-2">
                      <span className="text-purple-400 font-bold">WHILE LOOP:</span> Used when repetition depends on a condition.
                    </div>
                    <pre className="bg-slate-900 p-1.5 rounded text-[10px] mt-1">
{`while count <= 3:
    print(count)
    count += 1`}
                    </pre>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-rose-400 font-bold font-mono text-xs uppercase tracking-wider">⚠️ Common Syntax Mistakes</h4>
                    <ul className="text-[10px] text-slate-300 mt-2 space-y-2 list-disc list-inside leading-relaxed">
                      <li>
                        <code className="text-rose-400 font-bold">for i range(5)</code> is invalid &rarr; Must include <code className="text-emerald-400 font-bold">in</code> keyword and colon (<code className="text-emerald-400 font-bold">:</code>)
                      </li>
                      <li>
                        <code className="text-rose-400 font-bold">{"while count <= 5"}</code> is invalid &rarr; Must end in colon (<code className="text-emerald-400 font-bold">:</code>)
                      </li>
                      <li>
                        Forgetting counter update <code className="text-rose-400 font-bold">count += 1</code> inside a while loop creates an **Infinite Loop**!
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-orange-950 mt-4 text-[10px] text-orange-300 font-mono">
                    <strong className="text-orange-400">Quick Tip:</strong> FOR LOOP = Known Repetitions. WHILE LOOP = Repeat Until Condition Changes.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("game3")}
                className="border-orange-800 text-orange-400 hover:bg-orange-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("quiz")}
                className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 py-2.5 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-transform hover:scale-105"
              >
                LAUNCH MAINFRAME QUIZ &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: QUIZ
           ======================================================== */}
        {phase === "quiz" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-indigo-500 rounded-3xl p-6 md:p-8 orange-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-orange-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">LOOPSTER SECURITY GATE</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Python Loops Mainframe Quiz</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                  Question {quizIndex + 1}/{quizQuestions.length}
                </span>
                <span className="bg-slate-950 text-orange-450 border border-slate-850 px-3 py-1 rounded-full text-xs font-mono font-bold">
                  🔥 Streak: {streak}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-indigo-950/40 min-h-[100px] flex flex-col justify-center mb-6 relative">
              <h4 className="text-base font-bold text-slate-100 leading-relaxed font-sans whitespace-pre-wrap">
                {quizQuestions[quizIndex].q}
              </h4>
            </div>

            {/* Options layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizQuestions[quizIndex].options.map((opt, idx) => {
                let optStyle = "bg-slate-950 border-slate-800 hover:border-indigo-450 text-slate-200 hover:bg-indigo-950/20";
                
                if (quizFeedback !== null) {
                  const correctIdx = quizQuestions[quizIndex].answerIdx;
                  if (idx === correctIdx) {
                    optStyle = "bg-emerald-950/50 border-emerald-500 text-emerald-300 font-bold ring-2 ring-emerald-500/20";
                  } else if (quizSelection === idx) {
                    optStyle = "bg-rose-950/50 border-rose-500 text-rose-300 scale-98";
                  }
                } else if (quizSelection === idx) {
                  optStyle = "bg-indigo-950/60 border-indigo-400 text-indigo-300 scale-102 ring-2 ring-indigo-500/30 font-bold";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (quizFeedback !== null) return;
                      playSound("pop", soundEnabled);
                      setQuizSelection(idx);
                    }}
                    disabled={quizFeedback !== null}
                    className={`p-4 rounded-xl border-2 font-mono text-sm text-left transition-all duration-200 relative flex items-center justify-between group cursor-pointer ${optStyle}`}
                  >
                    <span>{opt}</span>
                    {quizFeedback !== null && idx === quizQuestions[quizIndex].answerIdx && (
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    )}
                    {quizFeedback !== null && quizSelection === idx && idx !== quizQuestions[quizIndex].answerIdx && (
                      <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation panel */}
            {showExplanation && (
              <div className="mt-6 bg-slate-950 border border-indigo-950/60 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  {quizAnswers[quizIndex] ? (
                    <span className="text-emerald-400 font-bold font-mono text-xs flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> CORRECT EXPLANATION</span>
                  ) : (
                    <span className="text-rose-400 font-bold font-mono text-xs flex items-center gap-1"><X className="w-4 h-4 text-rose-400" /> INCORRECT EXPLANATION</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {quizQuestions[quizIndex].explanation}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("concept_note")}
                className="border-indigo-800 text-indigo-400 hover:bg-indigo-950/50 font-bold rounded-full px-6"
              >
                &larr; NOTE
              </Button>
              
              {quizFeedback === null ? (
                <Button 
                  onClick={() => handleQuizAnswer(quizSelection!)}
                  disabled={quizSelection === null}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
                >
                  DECODE ANSWER
                </Button>
              ) : (
                <Button 
                  onClick={nextQuizQuestion}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center gap-1.5"
                >
                  {quizIndex === quizQuestions.length - 1 ? "FINISH MISSION" : "NEXT QUESTION"} <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: REWARDS / COMPLETION
           ======================================================== */}
        {phase === "rewards" && (
          <div className="w-full max-w-2xl bg-slate-900/80 border-2 border-yellow-500 rounded-3xl p-6 md:p-8 panel-glow text-center backdrop-blur-md animate-in zoom-in duration-500 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.15),transparent_60%)] pointer-events-none" />
            
            <div className="relative mb-6">
              <Sparkles className="absolute -top-8 -left-8 w-16 h-16 text-yellow-400 animate-ping" />
              <Sparkles className="absolute -bottom-8 -right-8 w-16 h-16 text-yellow-400 animate-pulse" />
              <div className="text-[120px] leading-none mb-4 animate-bounce">🏆</div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-500 tracking-wide uppercase drop-shadow-md">
              Congratulations! 🎉
            </h1>
            <p className="mt-2 font-mono text-yellow-400 text-sm tracking-widest uppercase">
              {">"} You completed SYNC – The Time Spinner
            </p>

            {/* Scorecard metrics */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Score</span>
                <span className="text-2xl font-bold font-mono text-yellow-400 mt-1 block">
                  {Math.round((quizScore / quizQuestions.length) * 100)}/100
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-center items-center">
                <span className="text-xs text-slate-500 block uppercase font-mono mb-1">Rating</span>
                <span className="text-xs font-bold font-mono text-yellow-400 tracking-wider">
                  ⭐⭐⭐⭐⭐
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">XP Earned</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">+900</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Time Crystals</span>
                <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">💎 {timeCrystals}</span>
              </div>
            </div>

            {/* Badge Unlocked */}
            <div className="mt-8 bg-slate-950/60 p-5 rounded-2xl border border-yellow-500/20 max-w-md mx-auto flex items-center gap-5 text-left">
              <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-400 rounded-full flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                🏅
              </div>
              <div>
                <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest font-bold">BADGE UNLOCKED</span>
                <h4 className="text-lg font-bold font-mono text-white mt-0.5">Loop Master</h4>
                <p className="text-xs text-slate-400 mt-1">Awarded for successfully executing loop structures and repairing repetitive engine logic.</p>
              </div>
            </div>

            {/* Achievements list */}
            <div className="mt-8">
              <span className="text-xs text-slate-500 block uppercase font-mono mb-3">Achievements Earned:</span>
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono text-purple-300">🌀 Time Spinner</span>
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono text-fuchsia-300">⚙️ Engine Repair Expert</span>
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono text-cyan-300">🚀 Portal Navigator</span>
              </div>
            </div>

            {/* Next Level Unlocked */}
            <div className="mt-8 bg-emerald-950/40 border-2 border-emerald-500/30 p-5 rounded-2xl text-left max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold uppercase tracking-wider mb-2 animate-pulse">
                <Unlock className="w-4 h-4" /> Next Level Unlocked: 🔓 SPARK – Function Factory (Functions)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                <strong>Mission:</strong> Help Robot SPARK create reusable commands and power up machines using Python Functions.
              </p>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-850 flex flex-col md:flex-row justify-center gap-4">
              <Button 
                variant="outline"
                size="lg"
                onClick={() => {
                  setQuizIndex(0);
                  setQuizAnswers({});
                  setQuizSelection(null);
                  setQuizFeedback(null);
                  setShowExplanation(false);
                  setQuizScore(0);
                  changePhase("quiz");
                }}
                className="border-yellow-700 text-yellow-400 hover:bg-yellow-950/50 font-bold rounded-full px-8 py-5 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> RETRY GALAXY QUIZ
              </Button>
              
              <Button 
                size="lg"
                onClick={onBack}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-12 py-5 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-transform hover:scale-105"
              >
                RETURN TO JUNCTION HQ &rarr;
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full text-center mt-6 text-slate-500 text-[10px] font-mono">
        Time Spinner Loops Core | CosmoLearn Repeat Engine
      </footer>

    </div>
  );
}
