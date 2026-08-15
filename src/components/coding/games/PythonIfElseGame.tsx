import { useState, useEffect } from "react";
import { 
  ArrowLeft, Bot, Play, Star, Check, X, Sparkles, Volume2, VolumeX, Lightbulb, 
  Terminal, ArrowRight, RotateCcw, Award, CheckCircle2, ChevronRight, Zap, 
  Split, Lock, Unlock, ShieldAlert, GitCommit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GamePhase = "intro" | "how_to_play" | "game1" | "game2" | "game3" | "concept_note" | "quiz" | "rewards";

type GameProps = {
  onBack: () => void;
};

// --- AUDIO SYNTHESIS UTILS ---
const playSound = (type: "chime" | "buzz" | "pop" | "fanfare" | "typing" | "gate", soundEnabled = true) => {
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
      osc.frequency.setValueAtTime(1050 + Math.random() * 150, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === "gate") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(360, audioCtx.currentTime + 0.4);
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

export default function PythonIfElseGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [xp, setXp] = useState(0);
  const [stars, setStars] = useState(0);
  const [crystals, setCrystals] = useState(0);

  // If-Else specific state variables
  const [streak, setStreak] = useState(1);
  const [progress, setProgress] = useState(10);
  
  // Interactive simulator logic
  const [simOutput, setSimOutput] = useState<string[]>([]);
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [interactiveAgeInput, setInteractiveAgeInput] = useState<number>(18);

  // Game 1 Choice path (3 rounds)
  const [g1Round, setG1Round] = useState(1);
  const [g1Selection, setG1Selection] = useState<number | null>(null);
  const [g1Feedback, setG1Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Game 2 Repair assignments (3 rounds)
  const [g2Round, setG2Round] = useState(1);
  const [g2Selection, setG2Selection] = useState<number | null>(null);
  const [g2Feedback, setG2Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Game 3 Galaxy Gates Snap/Code (3 rounds)
  const [g3Round, setG3Round] = useState(1);
  const [g3CodeDraft, setG3CodeDraft] = useState<string[]>([]);
  const [g3Feedback, setG3Feedback] = useState<"correct" | "incorrect" | null>(null);
  const [g3GateOpen, setG3GateOpen] = useState(false);

  // Quiz variables
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
        speakText("Welcome! I am FORK, Choice Guardian of the Galaxy. Today we will master decision logic structures!", speechEnabled);
      } else if (newPhase === "how_to_play") {
        speakText("Analyze decision gates, pass 3 challenges, and earn condition crystals!", speechEnabled);
      } else if (newPhase === "game1") {
        speakText("Game 1: Choose the correct path. Which branch road will the conditional variables activate?", speechEnabled);
      } else if (newPhase === "game2") {
        speakText("Game 2: Fix the Decision. Locate missing colons or incorrect else parameters to repair python code!", speechEnabled);
      } else if (newPhase === "game3") {
        speakText("Game 3: Galaxy Gate Challenge. Match the conditional logic steps in order to unlock gates!", speechEnabled);
      } else if (newPhase === "concept_note") {
        speakText("Examine comparison signs and syntax offsets before launching the final security module quiz!", speechEnabled);
      } else if (newPhase === "quiz") {
        speakText("Final quiz initiated. Answer five choices to unlock the Galaxy Decision Gate nodes!", speechEnabled);
      } else if (newPhase === "rewards") {
        playSound("fanfare", soundEnabled);
        confetti({ particleCount: 150, spread: 80 });
        speakText("Extraordinary! You solved all decision forks and unlocked the Condition Master Badge!", speechEnabled);
      }
    }, 450);
  };

  // Run decision simulator
  const runConsoleSim = () => {
    if (isRunningSim) return;
    setIsRunningSim(true);
    playSound("pop", soundEnabled);
    setSimOutput(["Evaluating conditional branch..."]);

    setTimeout(() => {
      playSound("typing", soundEnabled);
      setSimOutput(prev => [...prev, `>>> age = ${interactiveAgeInput}`]);
    }, 600);

    setTimeout(() => {
      playSound("typing", soundEnabled);
      setSimOutput(prev => [...prev, ">>> if age >= 18:"]);
      setSimOutput(prev => [...prev, ">>>     print(\"Eligible to Vote\")"]);
      setSimOutput(prev => [...prev, ">>> else:"]);
      setSimOutput(prev => [...prev, ">>>     print(\"Not Eligible\")"]);
    }, 1200);

    setTimeout(() => {
      playSound("chime", soundEnabled);
      const result = interactiveAgeInput >= 18 ? "Eligible to Vote" : "Not Eligible";
      setSimOutput(prev => [...prev, result]);
      setIsRunningSim(false);
    }, 2000);
  };

  // Game 1 Data
  const g1Rounds = [
    {
      condition: `age = 20\n\nif age >= 18:`,
      question: "Which branch path will the engine take for age = 20?",
      options: ["Eligible", "Not Eligible"],
      correct: "Eligible",
      hint: "Compare 20 >= 18. Since 20 is greater than or equal to 18, the condition is TRUE!"
    },
    {
      condition: `marks = 30\n\nif marks >= 40:`,
      question: "Which option represents the output branch path?",
      options: ["Pass", "Fail"],
      correct: "Fail",
      hint: "Compare 30 >= 40. Since 30 is NOT greater than or equal to 40, it takes the ELSE branch."
    },
    {
      condition: `temperature = 38\n\nif temperature > 35:`,
      question: "Which path does FORK go down?",
      options: ["Hot", "Cold"],
      correct: "Hot",
      hint: "Compare 38 > 35. 38 is greater than 35, triggering the IF block statement."
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
      setCrystals(c => c + 10);
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
      broken: `if age >= 18\nprint("Adult")`,
      desc: "This block fails! Syntactically, what is missing at the end of the if condition?",
      options: [
        { code: `if age >= 18:\n    print("Adult")`, correct: true },
        { code: `if age >= 18\n    print("Adult")`, correct: false },
        { code: `if age >= 18:\nprint("Adult")`, correct: false } // missing indent
      ],
      hint: "A Python conditional statement requires a colon (:) at the end, and the action line must be indented (spaced in)!"
    },
    {
      broken: `else age < 18:`,
      desc: "The ELSE block cannot accept active conditions! Fix the code block.",
      options: [
        { code: `else:\n    print("Minor")`, correct: true },
        { code: `else age < 18:\n    print("Minor")`, correct: false },
        { code: `otherwise:\n    print("Minor")`, correct: false }
      ],
      hint: "An 'else' statement handles all other cases automatically. It never accepts a condition expression next to it!"
    },
    {
      broken: `if marks > 50\nprint("Pass")\nelse\nprint("Fail")`,
      desc: "Complete conditional structure broken! Colons and indentations are missing.",
      options: [
        { code: `if marks > 50:\n    print("Pass")\nelse:\n    print("Fail")`, correct: true },
        { code: `if marks > 50\n    print("Pass")\nelse\n    print("Fail")`, correct: false },
        { code: `if marks > 50:\nprint("Pass")\nelse:\nprint("Fail")`, correct: false }
      ],
      hint: "Both 'if' and 'else' must end with colons (:), and their action statements must be indented."
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
      setCrystals(c => c + 10);
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
      title: "Decisions Vault Level 1",
      mission: `If score > 90 display "Excellent", else display "Keep Practicing"`,
      blocks: [`else:`, `    print("Keep Practicing")`, `if score > 90:`, `    print("Excellent")`],
      correctOrder: [`if score > 90:`, `    print("Excellent")`, `else:`, `    print("Keep Practicing")`],
      hint: "The order must be: 'if condition:', followed by indented 'if' action, followed by 'else:', followed by indented 'else' action."
    },
    {
      title: "Decisions Vault Level 2",
      mission: `If age >= 18 display "Vote", else display "Wait"`,
      blocks: [`    print("Vote")`, `else:`, `if age >= 18:`, `    print("Wait")`],
      correctOrder: [`if age >= 18:`, `    print("Vote")`, `else:`, `    print("Wait")`],
      hint: "Setup 'if age >= 18:', print 'Vote', 'else:', print 'Wait'."
    },
    {
      title: "Inner Galaxy Final Gate",
      mission: `If password == "python" display "Access Granted", else display "Access Denied"`,
      blocks: [`else:`, `    print("Access Granted")`, `if password == "python":`, `    print("Access Denied")`],
      correctOrder: [`if password == "python":`, `    print("Access Granted")`, `else:`, `    print("Access Denied")`], // Note: blocks mapping correct setup
      hint: "Make sure 'Access Granted' follows the 'if password == \"python\":' line."
    }
  ];

  // Adjust blocks inside round 3 to map correct connections
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
    
    // Quick overwrite check for round 3 to ensure logical output alignment
    let correct = false;
    if (g3Round === 3) {
      const isOkOrder = g3CodeDraft[0] === `if password == "python":` &&
                        g3CodeDraft[1] === `    print("Access Granted")` &&
                        g3CodeDraft[2] === `else:` &&
                        g3CodeDraft[3] === `    print("Access Denied")`;
      correct = isOkOrder;
    } else {
      correct = g3CodeDraft.length === roundData.correctOrder.length &&
                g3CodeDraft.every((val, idx) => val === roundData.correctOrder[idx]);
    }

    if (correct) {
      playSound("gate", soundEnabled);
      setG3Feedback("correct");
      setG3GateOpen(true);
      setXp(x => x + 120);
      setStars(s => s + 1);
      setCrystals(c => c + 10);

      setTimeout(() => {
        setG3Feedback(null);
        setG3GateOpen(false);
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
      q: "What is IF-ELSE used for?",
      options: [
        "Looping",
        "Storing Data",
        "Decision Making",
        "Functions"
      ],
      answerIdx: 2,
      explanation: "IF-ELSE is a decision-making statement used to execute different blocks of code based on a condition."
    },
    {
      q: "Which syntax is correct?",
      options: [
        "if age > 18:",
        "if age > 18",
        "if(age > 18)",
        "age > 18 if"
      ],
      answerIdx: 0,
      explanation: "In Python, the 'if' condition statement must end with a colon (:)."
    },
    {
      q: "What is the output?\n\nage = 15\n\nif age >= 18:\n    print(\"Adult\")\nelse:\n    print(\"Minor\")",
      options: [
        "Adult",
        "Minor",
        "Error",
        "Nothing"
      ],
      answerIdx: 1,
      explanation: "Since age (15) is less than 18, the condition is False, running the else block which prints 'Minor'."
    },
    {
      q: "Which operator means Equal To?",
      options: [
        "=",
        "==",
        "===",
        "!="
      ],
      answerIdx: 1,
      explanation: "The double equals '==' is the comparison operator for checking equality, whereas a single '=' is for variable assignment."
    },
    {
      q: "What is the output?\n\nmarks = 80\n\nif marks >= 50:\n    print(\"Pass\")\nelse:\n    print(\"Fail\")",
      options: [
        "Pass",
        "Fail",
        "Error",
        "None"
      ],
      answerIdx: 0,
      explanation: "Since marks is 80, which is greater than or equal to 50, the condition is True, printing 'Pass'."
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
      
      {/* Visual background layers */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_50%)]" />
        {/* Branch junctions */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i}
            className="absolute rounded bg-fuchsia-500/10 border border-fuchsia-500/25 animate-pulse flex items-center justify-center p-1.5"
            style={{
              top: Math.random() * 80 + 10 + "%",
              left: Math.random() * 80 + 10 + "%",
              animationDuration: Math.random() * 4 + 2 + "s"
            }}
          >
            <Split className="w-3.5 h-3.5 text-fuchsia-400" />
          </div>
        ))}
      </div>

      <style>{`
        .text-glow-fuchsia {
          text-shadow: 0 0 10px rgba(217, 70, 239, 0.6);
        }
        .fuchsia-panel-glow {
          box-shadow: 0 0 30px rgba(217, 70, 239, 0.08);
        }
        @keyframes float-guardian {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(1.5deg); }
        }
        .animate-guardian {
          animation: float-guardian 3.8s ease-in-out infinite;
        }
      `}</style>

      {/* CORE HEADER */}
      <header className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row gap-4 items-center justify-between border-b border-fuchsia-950 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-950/40 border border-fuchsia-850/30"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> LEAVE PLATFORM
          </Button>
          <div className="h-6 w-px bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider">
              LEVEL 06
            </span>
            <h2 className="text-xl font-bold font-mono tracking-wide text-glow-fuchsia text-fuchsia-300 flex items-center gap-1.5">
              <Split className="h-5 w-5 animate-pulse" /> FORK_DECISIONS
            </h2>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="flex-1 max-w-md mx-6 w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-mono text-fuchsia-400 font-bold uppercase tracking-widest">
            <span>Galaxy Security Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-900 border border-fuchsia-950 rounded-full h-3.5 p-0.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(217,70,239,0.5)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* SCORE CARD & VOICE */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-yellow-400">⭐</span>
            <span className="text-yellow-100">{stars}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-fuchsia-400">⚡</span>
            <span className="text-fuchsia-100">{xp} XP</span>
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
              className={`p-2 rounded-lg border transition-all ${soundEnabled ? "bg-fuchsia-950/40 border-fuchsia-800 text-fuchsia-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
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
            <div className="lg:col-span-4 flex flex-col items-center text-center bg-slate-900/40 border border-fuchsia-900/30 p-6 rounded-2xl backdrop-blur-md animate-guardian">
              <div className="relative w-44 h-44 flex items-center justify-center bg-fuchsia-950/40 border-2 border-fuchsia-500 rounded-full shadow-[0_0_30px_rgba(217,70,239,0.3)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,70,239,0.2),transparent_70%)]" />
                <Split className="w-28 h-28 text-fuchsia-400 rotate-90" />
                <Sparkles className="absolute bottom-3 left-5 text-fuchsia-300 animate-pulse w-5 h-5" />
              </div>
              <h3 className="mt-4 font-mono font-bold text-lg text-fuchsia-400 tracking-wider">GUARDIAN FORK</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-mono">
                "Welcome to the Choice Junction Gate! I balance the logical flow paths. If the road is True, choose the left; if False, choose the right!"
              </p>
            </div>

            {/* Concept details */}
            <div className="lg:col-span-8 flex flex-col bg-slate-900/80 border-2 border-fuchsia-500 rounded-3xl p-6 md:p-8 fuchsia-panel-glow backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" />
              
              <h1 className="text-3xl font-extrabold text-white tracking-wide font-mono flex items-center gap-2">
                ⚖️ Concept: Python If–Else
              </h1>
              
              <div className="mt-6 space-y-6 text-slate-100 font-sans">
                <div>
                  <h4 className="text-fuchsia-400 font-bold font-mono text-sm uppercase tracking-wider">What is IF-ELSE?</h4>
                  <p className="text-slate-300 text-sm mt-1">
                    IF-ELSE is a decision-making statement. It allows a computer program to select between two actions based on whether a condition is True or False.
                  </p>
                </div>

                {/* Real life road analog */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h5 className="text-fuchsia-300 font-bold font-mono text-xs uppercase">Decision Analogy 🛣️</h5>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Think of a fork in the road:
                    <span className="block mt-1 font-mono text-fuchsia-400 font-bold">If it is raining &rarr; take an umbrella.</span>
                    <span className="block font-mono text-purple-400 font-bold">Else &rarr; wear sunglasses.</span>
                  </p>
                </div>

                {/* Interactive Simulator */}
                <div className="bg-slate-950 p-4 rounded-xl border border-fuchsia-950">
                  <div className="flex justify-between items-center pb-2 border-b border-fuchsia-950/40 mb-3">
                    <span className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-fuchsia-500 animate-ping" /> Logic Branch Simulator
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono">Age Input:</label>
                        <input 
                          type="number" 
                          value={interactiveAgeInput} 
                          onChange={(e) => setInteractiveAgeInput(parseInt(e.target.value) || 0)}
                          className="w-12 bg-slate-900 text-center font-mono text-xs border border-slate-700 rounded py-0.5 text-fuchsia-300"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        onClick={runConsoleSim} 
                        disabled={isRunningSim}
                        className="bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold h-7 px-3 text-xs"
                      >
                        <Play className="mr-1 w-3 h-3 fill-current" /> DEPLOY GATE
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800 text-[11px] leading-relaxed">
                      <div className="text-purple-400">age = <span className="text-cyan-300">{interactiveAgeInput}</span></div>
                      <div className="text-purple-400">if age &gt;= 18:</div>
                      <div className="text-emerald-400">    print("Eligible to Vote")</div>
                      <div className="text-purple-400">else:</div>
                      <div className="text-rose-400">    print("Not Eligible")</div>
                    </div>
                    <div className="bg-black p-3 rounded border border-fuchsia-950 min-h-[50px] flex flex-col justify-start">
                      <div className="text-fuchsia-500 text-[10px] uppercase font-bold tracking-wider mb-1 border-b border-fuchsia-950/30 pb-0.5">Console Output:</div>
                      {simOutput.map((line, idx) => (
                        <div key={idx} className="text-fuchsia-300 font-bold animate-pulse text-[11px]">{line}</div>
                      ))}
                      {simOutput.length === 0 && <span className="text-slate-600 italic">Adjust Age and Click Deploy...</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-5">
                <Button 
                  onClick={() => changePhase("how_to_play")}
                  size="lg"
                  className="bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-transform hover:scale-105"
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
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-fuchsia-500 rounded-3xl p-6 md:p-8 fuchsia-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fuchsia-500 to-purple-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6">
              🔮 Galaxy Override: How to Play
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-fuchsia-400 font-bold font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-fuchsia-400" /> Objective
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Evaluate test conditions, repair indentation and syntax colons, and assemble complete branch logic to open three Galaxy Security gates.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-amber-400 font-bold font-mono flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> Rules
                  </h4>
                  <ul className="text-xs text-slate-300 mt-1.5 space-y-1 list-disc list-inside">
                    <li>Complete all 3 decisions games</li>
                    <li>Collect Decision Crystals</li>
                    <li>Score 70% or more in the Final Quiz</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-purple-400 font-bold font-mono flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" /> Badge Reward
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Unlocks the exclusive 🏆 **Condition Master** badge and opens up Level 4 loops.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-emerald-400 font-bold font-mono flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-emerald-400" /> Guardian Hint
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Unsure of conditional comparisons? Click the lightbulb in the corner to summon FORK's syntax helper dialog.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("intro")}
                className="border-fuchsia-800 text-fuchsia-400 hover:bg-fuchsia-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("game1")}
                className="bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-transform hover:scale-105"
              >
                START GAME 1: DECIDE &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 1 (Choose the Path)
           ======================================================== */}
        {phase === "game1" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-fuchsia-500 rounded-3xl p-6 md:p-8 fuchsia-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fuchsia-500 to-purple-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold">GAME 1: BRANCH PATHS</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Choose the Path!</h3>
              </div>
              <span className="bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g1Round}/3
              </span>
            </div>

            {/* Path visualization content */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-fuchsia-950 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-fuchsia-950 text-fuchsia-400 hover:bg-fuchsia-900/60 border border-fuchsia-800/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g1Rounds[g1Round - 1].question}</p>
              
              <div className="bg-slate-900 max-w-md mx-auto p-4 rounded-xl border border-slate-800 font-mono text-base text-fuchsia-400 shadow-inner whitespace-pre-line leading-relaxed">
                {g1Rounds[g1Round - 1].condition}
              </div>
            </div>

            {/* Option paths */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {g1Rounds[g1Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-fuchsia-500 text-slate-200 hover:bg-fuchsia-950/20";
                
                if (g1Selection === idx) {
                  btnStyle = g1Feedback === "correct" 
                    ? "bg-fuchsia-950/50 border-fuchsia-400 text-fuchsia-300 scale-102 ring-2 ring-fuchsia-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG1Answer(idx)}
                    disabled={g1Feedback !== null}
                    className={`p-5 rounded-xl border-2 font-mono text-base text-center transition-all duration-300 flex flex-col items-center justify-center gap-3 group cursor-pointer ${btnStyle}`}
                  >
                    <div className="text-xl">🛣️ Path {idx === 0 ? "IF" : "ELSE"}</div>
                    <span className="font-bold text-lg">[{option}]</span>
                  </button>
                );
              })}
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-fuchsia-950/30 border border-fuchsia-800/40 p-4 rounded-xl text-xs text-fuchsia-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-fuchsia-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Guardian Tip:
                </div>
                {g1Rounds[g1Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 2 (Fix the Decision)
           ======================================================== */}
        {phase === "game2" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-fuchsia-500 rounded-3xl p-6 md:p-8 fuchsia-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold">GAME 2: SYNTAX REPAIR</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Fix the Decision!</h3>
              </div>
              <span className="bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g2Round}/3
              </span>
            </div>

            {/* Broken code presentation */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-rose-950 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-fuchsia-950 text-fuchsia-400 hover:bg-fuchsia-900/60 border border-fuchsia-800/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g2Rounds[g2Round - 1].desc}</p>
              
              <div className="bg-slate-900 max-w-md mx-auto p-4 rounded-xl border border-rose-500/30 font-mono text-base text-rose-400 shadow-inner flex items-center justify-center gap-3 whitespace-pre-line">
                <span>{g2Rounds[g2Round - 1].broken}</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-bold animate-pulse">SYNTAX FAIL</span>
              </div>
            </div>

            {/* Repair Options */}
            <div className="grid grid-cols-1 gap-4">
              {g2Rounds[g2Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-fuchsia-500 text-slate-200 hover:bg-fuchsia-950/20";
                
                if (g2Selection === idx) {
                  btnStyle = g2Feedback === "correct" 
                    ? "bg-fuchsia-950/50 border-fuchsia-400 text-fuchsia-300 scale-102 ring-2 ring-fuchsia-500/30"
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
              <div className="mt-6 bg-fuchsia-950/30 border border-fuchsia-800/40 p-4 rounded-xl text-xs text-fuchsia-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-fuchsia-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Guardian Tip:
                </div>
                {g2Rounds[g2Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 3 (Galaxy Gate Challenge)
           ======================================================== */}
        {phase === "game3" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-fuchsia-500 rounded-3xl p-6 md:p-8 fuchsia-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold">GAME 3: SECURITY BYPASS</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">{g3Rounds[g3Round - 1].title}</h3>
              </div>
              <span className="bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-800 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
                Gate Node {g3Round}/3
              </span>
            </div>

            {/* Gate UI design */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
              
              <div className="md:col-span-5 bg-slate-950 p-4 rounded-2xl border border-fuchsia-950 text-center flex flex-col justify-center items-center">
                <div className="relative w-28 h-28 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(217,70,239,0.1)]">
                  {g3GateOpen ? (
                    <Unlock className="w-14 h-14 text-emerald-400 animate-pulse" />
                  ) : (
                    <Lock className="w-14 h-14 text-fuchsia-400" />
                  )}
                </div>
                <div className="text-[11px] font-mono text-fuchsia-400 uppercase font-bold mt-1">
                  Gate State: {g3GateOpen ? "OPENED 🔓" : "LOCKED 🔒"}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-sans">{g3Rounds[g3Round - 1].mission}</p>
              </div>

              {/* Assembly Editor */}
              <div className="md:col-span-7 bg-slate-950 p-4 rounded-2xl border border-fuchsia-950 relative">
                <div className="absolute top-2 right-3">
                  <button 
                    onClick={() => setShowHint(!showHint)}
                    className="p-1.5 rounded-lg bg-fuchsia-950 text-fuchsia-400 hover:bg-fuchsia-900/60 border border-fuchsia-800/40"
                    title="Show Hint"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-3 border-b border-fuchsia-950/40 pb-1 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" /> Logic Block Assembly
                </span>

                <div className="space-y-2 min-h-[110px] bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                  {g3CodeDraft.map((block, i) => (
                    <div key={i} className="text-fuchsia-300 flex items-center gap-1.5">
                      <span className="text-slate-600 text-[10px]">{i+1}</span>
                      <pre className="font-mono text-xs">{block}</pre>
                    </div>
                  ))}
                  {g3CodeDraft.length === 0 && <span className="text-slate-600 italic text-[11px]">Click available blocks in order...</span>}
                </div>
              </div>
            </div>

            {/* Draggable blocks selector */}
            <div className="space-y-4">
              <div className="text-xs font-mono text-slate-400">Available Logic Blocks:</div>
              <div className="flex flex-wrap gap-3">
                {g3Rounds[g3Round - 1].blocks.map((block, idx) => {
                  const isSelected = g3CodeDraft.includes(block);
                  return (
                    <button
                      key={idx}
                      onClick={() => addBlockToDraft(block)}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-fuchsia-950 border-fuchsia-400 text-fuchsia-300 font-bold" 
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
                  onClick={verifyG3Vault}
                  disabled={g3CodeDraft.length === 0 || g3Feedback !== null}
                  className="bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                >
                  DECODE GATE &rarr;
                </Button>
              </div>
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-fuchsia-950/30 border border-fuchsia-800/40 p-4 rounded-xl text-xs text-fuchsia-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-fuchsia-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Guardian Tip:
                </div>
                {g3Rounds[g3Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: CONCEPT NOTE (Summary)
           ======================================================== */}
        {phase === "concept_note" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-fuchsia-500 rounded-3xl p-6 md:p-8 fuchsia-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6 flex items-center justify-center gap-2">
              📝 Revision Summary: Python If–Else
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 md:col-span-2">
                  <h4 className="text-fuchsia-400 font-bold font-mono text-xs uppercase tracking-wider">⚖️ Comparison Operators</h4>
                  <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] text-slate-300">
                    <div><span className="text-fuchsia-400 font-bold">==</span> Equal To</div>
                    <div><span className="text-fuchsia-400 font-bold">!=</span> Not Equal To</div>
                    <div><span className="text-fuchsia-400 font-bold">&gt;</span> Greater Than</div>
                    <div><span className="text-fuchsia-400 font-bold">&lt;</span> Less Than</div>
                    <div><span className="text-fuchsia-400 font-bold">&gt;=</span> Greater or Equal</div>
                    <div><span className="text-fuchsia-400 font-bold">&lt;=</span> Less or Equal</div>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-rose-400 font-bold font-mono text-xs uppercase tracking-wider">❌ Syntax Warnings</h4>
                  <ul className="text-[10px] text-slate-300 mt-2 space-y-2 list-disc list-inside leading-relaxed">
                    <li><code className="text-rose-400 font-bold">if x &gt; y</code> is invalid &rarr; Must end in colon (<code className="text-emerald-400 font-bold">:</code>)</li>
                    <li><code className="text-rose-400 font-bold">else condition:</code> is invalid &rarr; else does not accept checks!</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950/80 p-5 rounded-xl border border-fuchsia-950">
                <h4 className="text-indigo-400 font-bold font-mono text-xs uppercase tracking-wider mb-2">💡 Road Fork Concept</h4>
                <div className="text-xs text-slate-300 leading-relaxed font-mono">
                  Think of a path split:
                  <div className="mt-2 bg-slate-900 p-2 rounded text-[11px] text-fuchsia-300">
                    - TRUE condition road &rarr; code under <span className="font-bold text-emerald-400">if</span> executes.<br />
                    - FALSE condition road &rarr; code under <span className="font-bold text-rose-400">else</span> executes.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("game3")}
                className="border-fuchsia-800 text-fuchsia-400 hover:bg-fuchsia-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("quiz")}
                className="bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold px-8 py-2.5 rounded-full shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-transform hover:scale-105"
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
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-indigo-500 rounded-3xl p-6 md:p-8 fuchsia-panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">GALAXY OVERRIDE MODULE</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">If-Else Mainframe Quiz</h3>
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

            {/* Question Card */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-indigo-950/40 min-h-[100px] flex flex-col justify-center mb-6 relative">
              <h4 className="text-base font-bold text-slate-100 leading-relaxed font-sans whitespace-pre-wrap">
                {quizQuestions[quizIndex].q}
              </h4>
            </div>

            {/* Options layout */}
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
              {">"} You completed FORK – The Choice Guardian
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
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">+700</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Decision Crystals</span>
                <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">💎 {crystals}</span>
              </div>
            </div>

            {/* Badge Unlocked */}
            <div className="mt-8 bg-slate-950/60 p-5 rounded-2xl border border-yellow-500/20 max-w-md mx-auto flex items-center gap-5 text-left">
              <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-400 rounded-full flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                🏅
              </div>
              <div>
                <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest font-bold">BADGE UNLOCKED</span>
                <h4 className="text-lg font-bold font-mono text-white mt-0.5">Condition Master</h4>
                <p className="text-xs text-slate-400 mt-1">Awarded for protecting the Balance of Choices with correct IF and ELSE statements.</p>
              </div>
            </div>

            {/* Achievements Earned list */}
            <div className="mt-8">
              <span className="text-xs text-slate-500 block uppercase font-mono mb-3">Achievements Earned:</span>
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono text-purple-300">⚖️ Decision Maker</span>
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono text-fuchsia-300">🚀 Galaxy Navigator</span>
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono text-cyan-300">🤖 Logic Protector</span>
              </div>
            </div>

            {/* Next Level Unlocked */}
            <div className="mt-8 bg-emerald-950/40 border-2 border-emerald-500/30 p-5 rounded-2xl text-left max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold uppercase tracking-wider mb-2 animate-pulse">
                <Unlock className="w-4 h-4" /> Next Level Unlocked: 🔓 LOOPSTER – Time Traveler (Loops)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                <strong>Mission:</strong> Help the Time Robot repeat actions and repair broken timelines using Python Loops.
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
        Choice Guardian Mainframe | CosmoLearn Decision Core
      </footer>

    </div>
  );
}
