import { useState, useEffect } from "react";
import { 
  ArrowLeft, Bot, Play, Star, Check, X, Sparkles, Volume2, VolumeX, Lightbulb, 
  Terminal, ArrowRight, HelpCircle, RotateCcw, Award, CheckCircle2, ChevronRight, Zap, 
  Layers, Lock, Unlock, Database, Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GamePhase = "intro" | "how_to_play" | "game1" | "game2" | "game3" | "concept_note" | "quiz" | "rewards";

type GameProps = {
  onBack: () => void;
};

// --- AUDIO SYNTHESIS UTILS ---
const playSound = (type: "chime" | "buzz" | "pop" | "fanfare" | "typing" | "vault", soundEnabled = true) => {
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
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, audioCtx.currentTime + 0.45);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.45);
    } else if (type === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.1);
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
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.08 + 0.45);
        oscNode.start(audioCtx.currentTime + idx * 0.08);
        oscNode.stop(audioCtx.currentTime + idx * 0.08 + 0.45);
      });
    } else if (type === "typing") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100 + Math.random() * 100, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === "vault") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.setValueAtTime(180, audioCtx.currentTime + 0.15);
      osc.frequency.setValueAtTime(320, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.6);
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
    utterance.pitch = 1.15; 
    window.speechSynthesis.speak(utterance);
  }
};

export default function PythonVariablesGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [xp, setXp] = useState(0);
  const [stars, setStars] = useState(0);

  // Variables specific stats
  const [streak, setStreak] = useState(1);
  const [progress, setProgress] = useState(10);
  const [activeAnalogyDrawer, setActiveAnalogyDrawer] = useState<string | null>(null);

  // Interactive console states
  const [simOutput, setSimOutput] = useState<string[]>([]);
  const [isRunningSim, setIsRunningSim] = useState(false);

  // Game 1: Store the Treasure states (3 rounds)
  const [g1Round, setG1Round] = useState(1);
  const [g1Selection, setG1Selection] = useState<number | null>(null);
  const [g1Feedback, setG1Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Game 2: Memory Repair states (3 rounds)
  const [g2Round, setG2Round] = useState(1);
  const [g2Selection, setG2Selection] = useState<number | null>(null);
  const [g2Feedback, setG2Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Game 3: Memory Vault Challenge states (3 rounds)
  const [g3Round, setG3Round] = useState(1);
  const [g3CodeDraft, setG3CodeDraft] = useState<string[]>([]);
  const [g3Feedback, setG3Feedback] = useState<"correct" | "incorrect" | null>(null);
  const [g3VaultOpen, setG3VaultOpen] = useState(false);

  // Quiz states
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelection, setQuizSelection] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

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
        speakText("Welcome to the Memory Bank! Let's help our robot banker collect and store variables inside memory boxes!", speechEnabled);
      } else if (newPhase === "how_to_play") {
        speakText("Read the rules to bypass the Memory Vault security and collect Variable Keys!", speechEnabled);
      } else if (newPhase === "game1") {
        speakText("Game 1: Store the Treasure. Choose the correct variable container box for each treasure value!", speechEnabled);
      } else if (newPhase === "game2") {
        speakText("Game 2: Memory Repair. Fix the broken variable assignment equations!", speechEnabled);
      } else if (newPhase === "game3") {
        speakText("Game 3: Memory Vault Challenge. Build the correct code sequence to open the vault doors!", speechEnabled);
      } else if (newPhase === "concept_note") {
        speakText("Review the variables syntax summary note before launching the final security test!", speechEnabled);
      } else if (newPhase === "quiz") {
        speakText("Time for the central mainframe quiz. Answer five questions to unlock the memory bank!", speechEnabled);
      } else if (newPhase === "rewards") {
        playSound("fanfare", soundEnabled);
        confetti({ particleCount: 150, spread: 80 });
        speakText("Spectacular work! You cleared all variable mainframe nodes and unlocked the Variable Master Badge!", speechEnabled);
      }
    }, 450);
  };

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

  // Intro drawer preview mapping
  const drawers = [
    { label: "name", value: `"John"`, desc: "Stores a text string (enclosed in quotes)" },
    { label: "age", value: "18", desc: "Stores a whole number (integer)" },
    { label: "marks", value: "95", desc: "Stores a numerical value" }
  ];

  // Run code example
  const runConsoleSim = () => {
    if (isRunningSim) return;
    setIsRunningSim(true);
    playSound("pop", soundEnabled);
    setSimOutput(["Allocating memory address..."]);

    setTimeout(() => {
      playSound("typing", soundEnabled);
      setSimOutput(prev => [...prev, ">>> name = \"John\""]);
    }, 800);

    setTimeout(() => {
      playSound("typing", soundEnabled);
      setSimOutput(prev => [...prev, ">>> print(name)"]);
    }, 1500);

    setTimeout(() => {
      playSound("chime", soundEnabled);
      setSimOutput(prev => [...prev, "John"]);
      setIsRunningSim(false);
    }, 2200);
  };

  // Game 1 Data
  const g1Rounds = [
    {
      value: `"Alice"`,
      desc: "Which box is best suited to store a text value representing a person's name?",
      options: ["age", "name", "marks", "salary"],
      correct: "name",
      hint: "Alice is a text name, so storing it inside 'name' matches the label's purpose!"
    },
    {
      value: "20",
      desc: "Which box should store this numeric age value?",
      options: ["city", "age", "name", "color"],
      correct: "age",
      hint: "20 is a whole number representing years. The 'age' box is the perfect fit!"
    },
    {
      value: "95",
      desc: "Which box should hold this final score grade number?",
      options: ["marks", "name", "city", "language"],
      correct: "marks",
      hint: "95 is a school test grade, which matches the 'marks' storage box."
    }
  ];

  const handleG1Answer = (optionIdx: number) => {
    if (g1Feedback !== null) return;
    setG1Selection(optionIdx);
    const selectedText = g1Rounds[g1Round - 1].options[optionIdx];
    const isCorrect = selectedText === g1Rounds[g1Round - 1].correct;

    if (isCorrect) {
      playSound("chime", soundEnabled);
      setG1Feedback("correct");
      setXp(x => x + 100);
      setStars(s => s + 1);
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

  // Game 2 Data
  const g2Rounds = [
    {
      broken: `name "John"`,
      desc: "Broken assignment! Missing the assignment operator to bind the value to the variable.",
      options: [
        { code: `name = "John"`, correct: true },
        { code: `name == "John"`, correct: false },
        { code: `variable("John")`, correct: false },
        { code: `store("John")`, correct: false }
      ],
      hint: "In Python, a SINGLE equals sign '=' assigns the value on the right to the box on the left."
    },
    {
      broken: `age : 20`,
      desc: "A colon was used. Convert this to Python assignment style.",
      options: [
        { code: `age = 20`, correct: true },
        { code: `age == 20`, correct: false },
        { code: `age -> 20`, correct: false }
      ],
      hint: "Remember to use the simple assignment operator (=) instead of a colon (:)."
    },
    {
      broken: `city == "Chennai"`,
      desc: "Double equals is used for comparisons. Change it to correct variable assignment code.",
      options: [
        { code: `city = "Chennai"`, correct: true },
        { code: `city == "Chennai"`, correct: false },
        { code: `city = Chennai`, correct: false } // missing quotes
      ],
      hint: "A double equals '==' checks if two values are equal, but a single equals '=' sets the variable value."
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

  // Game 3 Data
  const g3Rounds = [
    {
      title: "Main Vault Level 1",
      mission: `Store: Name = Rahul, Age = 21, City = Chennai`,
      blocks: [`city = "Chennai"`, `age = 21`, `name = "Rahul"`],
      correctOrder: [`name = "Rahul"`, `age = 21`, `city = "Chennai"`],
      hint: "Drag or select the blocks in order. Text values need double quotes, numbers do not!"
    },
    {
      title: "Main Vault Level 2",
      mission: `Store: Fruit = Mango, Price = 100`,
      blocks: [`price = 100`, `fruit = "Mango"`],
      correctOrder: [`fruit = "Mango"`, `price = 100`],
      hint: "Assign 'fruit' to string Mango and 'price' to numeric 100."
    },
    {
      title: "Inner Vault Final Level",
      mission: `Store: College = ABC College, Year = 3`,
      blocks: [`year = 3`, `college = "ABC College"`],
      correctOrder: [`college = "ABC College"`, `year = 3`],
      hint: "College requires string text quotes, Year is an integer digit."
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

  const verifyG3Vault = () => {
    if (g3Feedback !== null) return;
    const roundData = g3Rounds[g3Round - 1];
    const isCorrect = g3CodeDraft.length === roundData.correctOrder.length &&
      g3CodeDraft.every((val, idx) => val === roundData.correctOrder[idx]);

    if (isCorrect) {
      playSound("vault", soundEnabled);
      setG3Feedback("correct");
      setG3VaultOpen(true);
      setXp(x => x + 120);
      setStars(s => s + 1);

      setTimeout(() => {
        setG3Feedback(null);
        setG3VaultOpen(false);
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
      q: "What is a Variable in computer programming?",
      options: [
        "A math operator sign",
        "A named storage location in memory to hold data",
        "A line block comment",
        "A loop repeat counter"
      ],
      answerIdx: 1,
      explanation: "A variable is literally a named reference spot in the system memory used to hold data values that can be changed or retrieved later."
    },
    {
      q: "Which code snippet correctly assigns 20 to the variable name age?",
      options: [
        "age = 20",
        "age : 20",
        "age == 20",
        "age -> 20"
      ],
      answerIdx: 0,
      explanation: "A single '=' is the python assignment operator, making age = 20 correct."
    },
    {
      q: "What actual data value is stored inside name in the line name = \"John\"?",
      options: [
        "name",
        "John",
        "Variable",
        "SyntaxError"
      ],
      answerIdx: 1,
      explanation: "The variable is labeled 'name' and stores the string content 'John' inside it."
    },
    {
      q: "Which of these variable names is valid in Python?",
      options: [
        "1name",
        "@name",
        "student_name",
        "#name"
      ],
      answerIdx: 2,
      explanation: "Python variables can contain letters, digits, and underscores, but they cannot start with a number or contain special symbols like @ or #."
    },
    {
      q: "What gets outputted by running: \ncity = \"Chennai\"\nprint(city)",
      options: [
        "city",
        "Chennai",
        "Error",
        "None"
      ],
      answerIdx: 1,
      explanation: "The print function checks the variable label 'city' and prints its value 'Chennai' to the console screen."
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
      
      {/* Space Matrix Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.06),transparent_50%)]" />
        {/* Falling data cubes */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div 
            key={i}
            className="absolute rounded bg-cyan-500/10 border border-cyan-500/20 animate-pulse text-[9px] font-mono p-1"
            style={{
              top: Math.random() * 80 + 10 + "%",
              left: Math.random() * 80 + 10 + "%",
              animationDuration: Math.random() * 5 + 3 + "s"
            }}
          >
            0xAA{i}
          </div>
        ))}
      </div>

      <style>{`
        .text-glow-cyan {
          text-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
        }
        .cyan-panel-glow {
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.08);
        }
        @keyframes float-robobanker {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
        }
        .animate-robobanker {
          animation: float-robobanker 4s ease-in-out infinite;
        }
      `}</style>

      {/* CORE HEADER */}
      <header className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row gap-4 items-center justify-between border-b border-cyan-950 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 border border-cyan-850/30"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> LEAVE PLATFORM
          </Button>
          <div className="h-6 w-px bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider">
              LEVEL 02
            </span>
            <h2 className="text-xl font-bold font-mono tracking-wide text-glow-cyan text-cyan-300 flex items-center gap-1.5">
              <Database className="h-5 w-5 animate-pulse" /> MEM_VARIABLE_BANK
            </h2>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="flex-1 max-w-md mx-6 w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-widest">
            <span>Security Override Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-900 border border-cyan-950 rounded-full h-3.5 p-0.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* METRICS & AUDIO CONTROLS */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-yellow-400">⭐</span>
            <span className="text-yellow-100">{stars}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-cyan-400">⚡</span>
            <span className="text-cyan-100">{xp} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleSpeech}
              title={speechEnabled ? "Mute Voice" : "Unmute Voice"}
              className={`p-2 rounded-lg border transition-all ${speechEnabled ? "bg-indigo-950/40 border-indigo-800 text-indigo-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button 
              onClick={toggleSound}
              title={soundEnabled ? "Mute SFX" : "Unmute SFX"}
              className={`p-2 rounded-lg border transition-all ${soundEnabled ? "bg-cyan-950/40 border-cyan-800 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* CORE FRAME LAYOUT */}
      <main className="relative z-10 w-full max-w-5xl flex-1 flex flex-col justify-center items-center py-4">
        
        {/* ========================================================
            STAGE: INTRO
           ======================================================== */}
        {phase === "intro" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in zoom-in-95 duration-500">
            {/* Robo Mascot Card */}
            <div className="lg:col-span-4 flex flex-col items-center text-center bg-slate-900/40 border border-cyan-900/30 p-6 rounded-2xl backdrop-blur-md animate-robobanker">
              <div className="relative w-44 h-44 flex items-center justify-center bg-cyan-950/40 border-2 border-cyan-500 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.2),transparent_70%)]" />
                <Bot className="w-28 h-28 text-cyan-400" />
                <Sparkles className="absolute top-3 right-5 text-cyan-300 animate-pulse w-5 h-5" />
              </div>
              <h3 className="mt-4 font-mono font-bold text-lg text-cyan-400 tracking-wider">ROBO THE BANKER</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-mono">
                "Welcome to the Memory Bank vault! In Python, variables are magic named storage boxes where information is safely locked up until you print them out!"
              </p>
            </div>

            {/* Introduction details */}
            <div className="lg:col-span-8 flex flex-col bg-slate-900/80 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 cyan-panel-glow backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
              
              <h1 className="text-3xl font-extrabold text-white tracking-wide font-mono flex items-center gap-2">
                🤖 Concept: Python Variables
              </h1>
              
              <div className="mt-6 space-y-6 text-slate-100 font-sans">
                <div>
                  <h4 className="text-cyan-400 font-bold font-mono text-sm uppercase tracking-wider">What is a Variable?</h4>
                  <p className="text-slate-300 text-sm mt-1">
                    A Variable is a named location in the computer's memory used to store information. Think of it as a labeled container or storage box!
                  </p>
                </div>

                {/* Interactive Analog drawers */}
                <div>
                  <h4 className="text-cyan-400 font-bold font-mono text-xs uppercase tracking-wider mb-2">Click Drawers to Inspect Memory Boxes:</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {drawers.map((dr) => (
                      <button
                        key={dr.label}
                        onClick={() => {
                          playSound("pop", soundEnabled);
                          setActiveAnalogyDrawer(activeAnalogyDrawer === dr.label ? null : dr.label);
                        }}
                        className={`p-3 rounded-xl border font-mono text-xs flex flex-col items-center justify-center transition-all ${
                          activeAnalogyDrawer === dr.label 
                            ? "bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]" 
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-cyan-800"
                        }`}
                      >
                        <span className="font-bold text-sm">[{dr.label}]</span>
                        <span className="text-[10px] mt-1 text-slate-500">Click to open</span>
                      </button>
                    ))}
                  </div>

                  {activeAnalogyDrawer && (
                    <div className="mt-3 bg-slate-950/80 p-3 rounded-xl border border-cyan-900 text-xs font-mono text-slate-300 animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="text-cyan-400 font-bold">Stored Value: </span> 
                      {drawers.find(d => d.label === activeAnalogyDrawer)?.value}
                      <p className="text-slate-400 text-[10px] mt-1">
                        {drawers.find(d => d.label === activeAnalogyDrawer)?.desc}
                      </p>
                    </div>
                  )}
                </div>

                {/* Example code box */}
                <div className="bg-slate-950 p-4 rounded-xl border border-cyan-950">
                  <div className="flex justify-between items-center pb-2 border-b border-cyan-950/40 mb-3">
                    <span className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-500 animate-ping" /> Variables Simulator
                    </span>
                    <Button 
                      size="sm" 
                      onClick={runConsoleSim} 
                      disabled={isRunningSim}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-7 px-3 text-xs"
                    >
                      <Play className="mr-1 w-3 h-3 fill-current" /> RUN SIMULATOR
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <div className="text-purple-400">name = <span className="text-emerald-400">"John"</span></div>
                      <div className="text-purple-400 mt-1">print<span className="text-white">(</span><span className="text-white">name</span><span className="text-white">)</span></div>
                    </div>
                    <div className="bg-black p-3 rounded border border-cyan-950 min-h-[50px] flex flex-col justify-start">
                      <div className="text-cyan-500 text-[10px] uppercase font-bold tracking-wider mb-1 border-b border-cyan-950/30 pb-0.5">Console Output:</div>
                      {simOutput.map((line, idx) => (
                        <div key={idx} className="text-cyan-300 font-bold animate-pulse text-[11px]">{line}</div>
                      ))}
                      {simOutput.length === 0 && <span className="text-slate-600 italic">Click Run to execute...</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-5">
                <Button 
                  onClick={() => changePhase("how_to_play")}
                  size="lg"
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-transform hover:scale-105"
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
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 cyan-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-indigo-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6">
              🔑 System Access: How to Play
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-cyan-400 font-bold font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Objective
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Organize values into variable storage boxes, fix broken syntax assignments, and sort code statements to bypass 3 secure bank vaults.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-amber-400 font-bold font-mono flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> Rules
                  </h4>
                  <ul className="text-xs text-slate-300 mt-1.5 space-y-1 list-disc list-inside">
                    <li>Resolve all 3 gamemodes</li>
                    <li>Earn Vault coins and override keys</li>
                    <li>Unlock variables notes</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-purple-400 font-bold font-mono flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" /> Rewards
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Obtain the prestigious 🏆 **Variable Master** badge and unlock clearance level for "Data Types".
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-emerald-400 font-bold font-mono flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-emerald-400" /> Robot Help
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Stuck? Robo the banker is ready with tips. Click the lightbulb icon in the corner for syntax rules.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("intro")}
                className="border-cyan-800 text-cyan-400 hover:bg-cyan-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("game1")}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-transform hover:scale-105"
              >
                START GAME 1: DEPOSIT &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 1 (Store the Treasure)
           ======================================================== */}
        {phase === "game1" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 cyan-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">GAME 1: TREASURE DEPOT</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Store the Treasure!</h3>
              </div>
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g1Round}/3
              </span>
            </div>

            {/* Treasure container display */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-cyan-950 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-800/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g1Rounds[g1Round - 1].desc}</p>
              
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="text-[40px] leading-none mb-1 animate-bounce">💎</div>
                <div className="bg-slate-900 px-6 py-3 rounded-2xl border-2 border-dashed border-cyan-500/50 font-mono text-2xl text-cyan-300 font-bold shadow-inner">
                  {g1Rounds[g1Round - 1].value}
                </div>
              </div>
            </div>

            {/* Options boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {g1Rounds[g1Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-cyan-500 text-slate-200 hover:bg-cyan-950/20";
                
                if (g1Selection === idx) {
                  btnStyle = g1Feedback === "correct" 
                    ? "bg-cyan-950/50 border-cyan-400 text-cyan-300 scale-102 ring-2 ring-cyan-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG1Answer(idx)}
                    disabled={g1Feedback !== null}
                    className={`p-4 rounded-xl border-2 font-mono text-sm text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 group cursor-pointer ${btnStyle}`}
                  >
                    <div className="text-lg">📦</div>
                    <span className="font-bold">[{option}]</span>
                  </button>
                );
              })}
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-cyan-950/30 border border-cyan-800/40 p-4 rounded-xl text-xs text-cyan-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-cyan-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Robo's Tip:
                </div>
                {g1Rounds[g1Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 2 (Memory Repair)
           ======================================================== */}
        {phase === "game2" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 cyan-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">GAME 2: SYSTEM DEBUG</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Memory Repair!</h3>
              </div>
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g2Round}/3
              </span>
            </div>

            {/* Broken code presentation */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-rose-950 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-800/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g2Rounds[g2Round - 1].desc}</p>
              
              <div className="bg-slate-900 max-w-md mx-auto p-4 rounded-xl border border-rose-500/30 font-mono text-lg text-rose-400 shadow-inner flex items-center justify-center gap-3">
                <span>{g2Rounds[g2Round - 1].broken}</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-bold animate-pulse">REPAIR NEEDED</span>
              </div>
            </div>

            {/* Options layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {g2Rounds[g2Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-cyan-500 text-slate-200 hover:bg-cyan-950/20";
                
                if (g2Selection === idx) {
                  btnStyle = g2Feedback === "correct" 
                    ? "bg-cyan-950/50 border-cyan-400 text-cyan-300 scale-102 ring-2 ring-cyan-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG2Answer(idx)}
                    disabled={g2Feedback !== null}
                    className={`p-4 rounded-xl border-2 font-mono text-sm text-left transition-all duration-300 relative flex items-center justify-between group cursor-pointer ${btnStyle}`}
                  >
                    <span>{option.code}</span>
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
              <div className="mt-6 bg-cyan-950/30 border border-cyan-800/40 p-4 rounded-xl text-xs text-cyan-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-cyan-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Robo's Tip:
                </div>
                {g2Rounds[g2Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 3 (Memory Vault Challenge)
           ======================================================== */}
        {phase === "game3" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 cyan-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-cyan-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">GAME 3: DECRYPT VAULT</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">{g3Rounds[g3Round - 1].title}</h3>
              </div>
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
                Vault Level {g3Round}/3
              </span>
            </div>

            {/* Vault graphic panel */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
              
              <div className="md:col-span-5 bg-slate-950 p-4 rounded-2xl border border-cyan-950 text-center flex flex-col justify-center items-center">
                <div className="relative w-28 h-28 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  {g3VaultOpen ? (
                    <Unlock className="w-14 h-14 text-emerald-400 animate-pulse" />
                  ) : (
                    <Lock className="w-14 h-14 text-cyan-400" />
                  )}
                </div>
                <div className="text-[11px] font-mono text-cyan-400 uppercase font-bold mt-1">
                  Status: {g3VaultOpen ? "UNLOCKED 🔓" : "SECURED 🔒"}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-sans">{g3Rounds[g3Round - 1].mission}</p>
              </div>

              {/* Editor area */}
              <div className="md:col-span-7 bg-slate-950 p-4 rounded-2xl border border-cyan-950 relative">
                <div className="absolute top-2 right-3">
                  <button 
                    onClick={() => setShowHint(!showHint)}
                    className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-800/40"
                    title="Show Hint"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-3 border-b border-cyan-950/40 pb-1 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" /> Program Assembly Draft
                </span>

                <div className="space-y-2 min-h-[90px] bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-sm">
                  {g3CodeDraft.map((block, i) => (
                    <div key={i} className="text-cyan-300 flex items-center gap-1.5">
                      <span className="text-slate-600 text-xs">{i+1}</span> {block}
                    </div>
                  ))}
                  {g3CodeDraft.length === 0 && <span className="text-slate-600 italic text-xs">Assemble program blocks below...</span>}
                </div>
              </div>
            </div>

            {/* Draggable/Selectable Blocks */}
            <div className="space-y-4">
              <div className="text-xs font-mono text-slate-400">Available Variable Code Blocks:</div>
              <div className="flex flex-wrap gap-3">
                {g3Rounds[g3Round - 1].blocks.map((block, idx) => {
                  const isSelected = g3CodeDraft.includes(block);
                  return (
                    <button
                      key={idx}
                      onClick={() => addBlockToDraft(block)}
                      className={`px-4 py-2 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-cyan-950 border-cyan-400 text-cyan-300 font-bold" 
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {block}
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
                  CLEAR CODE
                </Button>
                <Button 
                  onClick={verifyG3Vault}
                  disabled={g3CodeDraft.length === 0 || g3Feedback !== null}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                >
                  DECRYPT VAULT &rarr;
                </Button>
              </div>
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-cyan-950/30 border border-cyan-800/40 p-4 rounded-xl text-xs text-cyan-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-cyan-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Robo's Tip:
                </div>
                {g3Rounds[g3Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: CONCEPT NOTE (Variables Revision)
           ======================================================== */}
        {phase === "concept_note" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-cyan-500 rounded-3xl p-6 md:p-8 cyan-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6 flex items-center justify-center gap-2">
              📝 Revision Summary: Python Variables
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-cyan-400 font-bold font-mono text-xs uppercase tracking-wider">📦 Variable Syntax Rules</h4>
                  <ul className="text-xs text-slate-300 mt-2 space-y-2 list-disc list-inside">
                    <li>Must be created using an equals operator: <code className="text-cyan-400 font-bold">name = "John"</code>.</li>
                    <li>Names can contain letters, numbers, and underscores (<code className="text-cyan-400 font-bold">_</code>).</li>
                    <li>Names <span className="text-rose-400 font-bold">cannot start with numbers</span> (e.g. `1student` is invalid!).</li>
                  </ul>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-rose-400 font-bold font-mono text-xs uppercase tracking-wider">❌ Correct vs Incorrect</h4>
                  <ul className="text-xs text-slate-300 mt-2 space-y-2 list-disc list-inside">
                    <li><code className="text-rose-400 font-bold">age : 20</code> is invalid &rarr; <code className="text-emerald-400 font-bold">age = 20</code> is correct.</li>
                    <li><code className="text-rose-400 font-bold">name == "John"</code> compares &rarr; <code className="text-emerald-400 font-bold">name = "John"</code> assigns.</li>
                    <li><code className="text-rose-400 font-bold">1name = "Ram"</code> is invalid &rarr; <code className="text-emerald-400 font-bold">name1 = "Ram"</code> is valid.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950/80 p-5 rounded-xl border border-cyan-950">
                <h4 className="text-indigo-400 font-bold font-mono text-xs uppercase tracking-wider mb-2">💡 Analogy Reminder</h4>
                <div className="text-xs text-slate-300 leading-relaxed font-mono">
                  Variable = Labeled Storage Container Box
                  <div className="mt-2 bg-slate-900 p-2 rounded text-[11px] text-cyan-300">
                    name = "Alice"<br />
                    - "name" represents the label drawer.<br />
                    - "Alice" represents the value treasure locked inside.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("game3")}
                className="border-cyan-800 text-cyan-400 hover:bg-cyan-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("quiz")}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-2.5 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-transform hover:scale-105"
              >
                LAUNCH VAULT QUIZ &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: QUIZ
           ======================================================== */}
        {phase === "quiz" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-indigo-500 rounded-3xl p-6 md:p-8 cyan-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-cyan-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">VAULT SECURITY DECRYPTION</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Variables Mainframe Quiz</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                  Question {quizIndex + 1}/{quizQuestions.length}
                </span>
                <span className="bg-slate-950 text-yellow-400 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                  🔥 Streak: {streak}
                </span>
              </div>
            </div>

            {/* Question display */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-indigo-950/40 min-h-[100px] flex flex-col justify-center mb-6 relative">
              <h4 className="text-base font-bold text-slate-100 leading-relaxed font-sans whitespace-pre-line">
                {quizQuestions[quizIndex].q}
              </h4>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizQuestions[quizIndex].options.map((opt, idx) => {
                let optStyle = "bg-slate-950 border-slate-800 hover:border-indigo-400 text-slate-200 hover:bg-indigo-950/20";
                
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

            {/* Explanation box */}
            {showExplanation && (
              <div className="mt-6 bg-slate-950 border border-indigo-950/60 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  {quizAnswers[quizIndex] ? (
                    <span className="text-emerald-400 font-bold font-mono text-xs flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> CORRECT</span>
                  ) : (
                    <span className="text-rose-400 font-bold font-mono text-xs flex items-center gap-1"><X className="w-4 h-4 text-rose-400" /> INCORRECT</span>
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
                  DECRYPT ANSWER
                </Button>
              ) : (
                <Button 
                  onClick={nextQuizQuestion}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center gap-1.5"
                >
                  {quizIndex === quizQuestions.length - 1 ? "FINISH MODULE" : "NEXT QUESTION"} <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: REWARDS / COMPLETION SCREEN
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
              MEM VAULT UNLOCKED!
            </h1>
            <p className="mt-2 font-mono text-yellow-400 text-sm tracking-widest uppercase">
              {">"} Variables logic decrypted. database access granted.
            </p>

            {/* Scorecard metrics */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Quiz Score</span>
                <span className="text-2xl font-bold font-mono text-yellow-400 mt-1 block">{(quizScore / quizQuestions.length) * 100}%</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Total Stars</span>
                <span className="text-2xl font-bold font-mono text-yellow-400 mt-1 block">⭐ {stars}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Total XP</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">⚡ {xp} XP</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Streak Level</span>
                <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">🔥 {streak}</span>
              </div>
            </div>

            {/* Unlock badge details */}
            <div className="mt-8 bg-slate-950/60 p-6 rounded-2xl border border-yellow-500/20 max-w-md mx-auto flex items-center gap-5 text-left">
              <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-400 rounded-full flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                🏅
              </div>
              <div>
                <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest font-bold">BADGE UNLOCKED</span>
                <h4 className="text-lg font-bold font-mono text-white mt-0.5">Variable Master</h4>
                <p className="text-xs text-slate-400 mt-1">Awarded for successfully executing memory box declarations and troubleshooting faulty variables.</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl text-center max-w-sm mx-auto animate-pulse flex items-center justify-center gap-2 text-xs font-mono text-emerald-300">
              <Unlock className="w-4 h-4" /> Next Level Unlocked: DATA TYPES – Data Detective
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
                <RotateCcw className="w-4 h-4" /> RETRY VAULT QUIZ
              </Button>
              
              <Button 
                size="lg"
                onClick={onBack}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-12 py-5 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-transform hover:scale-105"
              >
                RETURN TO BANK HQ &rarr;
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full text-center mt-6 text-slate-500 text-[10px] font-mono">
        Memory Banker Lab Node | CosmoLearn Cyber Mainframe Security
      </footer>

    </div>
  );
}
