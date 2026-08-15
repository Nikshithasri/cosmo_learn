import { useState, useEffect } from "react";
import { 
  ArrowLeft, Bot, Play, Star, Check, X, Sparkles, Volume2, VolumeX, Lightbulb, 
  Terminal, ArrowRight, HelpCircle, RotateCcw, Award, CheckCircle2, ChevronRight, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type GamePhase = "intro" | "how_to_play" | "game1" | "game2" | "game3" | "concept_note" | "quiz" | "rewards";

type GameProps = {
  onBack: () => void;
};

// --- AUDIO SYNTHESIS UTILS ---
const playSound = (type: "chime" | "buzz" | "pop" | "fanfare" | "typing", soundEnabled = true) => {
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
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === "fanfare") {
      osc.type = "triangle";
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
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
      osc.frequency.setValueAtTime(1000 + Math.random() * 200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.05);
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
    utterance.pitch = 1.25; 
    window.speechSynthesis.speak(utterance);
  }
};

export default function PythonOutputGame({ onBack }: GameProps) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [xp, setXp] = useState(0);
  const [stars, setStars] = useState(0);

  // Stats / Progress tracking
  const [streak, setStreak] = useState(1);
  const [overallProgress, setOverallProgress] = useState(10); // Start at 10%

  // Simulation State (Phase 1)
  const [simOutput, setSimOutput] = useState<string[]>([]);
  const [isRunningSim, setIsRunningSim] = useState(false);

  // Game 1 Discovery state (3 Rounds)
  const [g1Round, setG1Round] = useState(1);
  const [g1Selection, setG1Selection] = useState<number | null>(null);
  const [g1Feedback, setG1Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Game 1 Match state
  const [g1Matches, setG1Matches] = useState<Record<string, string>>({});
  const [selectedG1Left, setSelectedG1Left] = useState<string | null>(null);

  // Game 2 Practice state (3 Rounds)
  const [g2Round, setG2Round] = useState(1);
  const [g2Selection, setG2Selection] = useState<number | null>(null);
  const [g2Feedback, setG2Feedback] = useState<"correct" | "incorrect" | null>(null);
  // Game 2 Arrange state
  const [g2ArrangedBlocks, setG2ArrangedBlocks] = useState<string[]>([]);

  // Game 3 Challenge state (3 Rounds)
  const [g3Round, setG3Round] = useState(1);
  const [g3Selection, setG3Selection] = useState<number | null>(null);
  const [g3Feedback, setG3Feedback] = useState<"correct" | "incorrect" | null>(null);

  // Quiz State (22 Questions)
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, { selected: any; correct: boolean }>>({});
  const [quizSelectedOption, setQuizSelectedOption] = useState<any>(null);
  const [quizFeedback, setQuizFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Confetti Trigger
  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  // Sound Effects Toggle
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    playSound("pop", !soundEnabled);
  };

  // Speech Toggle
  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (!speechEnabled) {
      speakText("Audio voice enabled!", true);
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  };

  // Set phase helper with progress updates
  const changePhase = (newPhase: GamePhase) => {
    playSound("pop", soundEnabled);
    setPhase(newPhase);
    setShowHint(false);
    
    // Stop speech on transition
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // Update progress bar percentage
    let p = 10;
    if (newPhase === "intro") p = 10;
    else if (newPhase === "how_to_play") p = 20;
    else if (newPhase === "game1") p = 35;
    else if (newPhase === "game2") p = 50;
    else if (newPhase === "game3") p = 65;
    else if (newPhase === "concept_note") p = 75;
    else if (newPhase === "quiz") p = 85;
    else if (newPhase === "rewards") p = 100;
    setOverallProgress(p);

    // Speak introduction for new phase
    setTimeout(() => {
      if (newPhase === "intro") {
        speakText("Welcome! I'm Pytho, your guide! Today we will learn how to make Python talk using the print statement. Let's begin!", speechEnabled);
      } else if (newPhase === "how_to_play") {
        speakText("Here is how to play the game and win the Print Champion badge! Ready to learn the rules?", speechEnabled);
      } else if (newPhase === "game1") {
        speakText("Game 1: Discovery Mode. Let's predict what our python code will display on the screen!", speechEnabled);
      } else if (newPhase === "game2") {
        speakText("Game 2: Practice Mode. Oh no! There are syntax bugs in our rocket codes. Can you fix them?", speechEnabled);
      } else if (newPhase === "game3") {
        speakText("Game 3: Challenge Mode. Let's solve advanced coding puzzles and win the space boss battles!", speechEnabled);
      } else if (newPhase === "concept_note") {
        speakText("Wonderful! Here is your revision summary card. Review it before we start the big quiz!", speechEnabled);
      } else if (newPhase === "quiz") {
        speakText("Time for the ultimate test! Answer 22 questions to prove your mastery of python print statements!", speechEnabled);
      } else if (newPhase === "rewards") {
        playSound("fanfare", soundEnabled);
        triggerConfetti();
        speakText("Incredible! You completed the mission and unlocked the print champion badge! Excellent job!", speechEnabled);
      }
    }, 400);
  };

  useEffect(() => {
    // Initial welcome voice
    speakText("Welcome! I'm Pytho, your guide! Today we will learn how to make Python talk using the print statement. Let's begin!", speechEnabled);
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Simulating Console Output (Phase 1)
  const runConsoleSim = () => {
    if (isRunningSim) return;
    setIsRunningSim(true);
    playSound("pop", soundEnabled);
    setSimOutput(["Connecting to Python engine..."]);
    
    setTimeout(() => {
      playSound("typing", soundEnabled);
      setSimOutput(prev => [...prev, ">>> print(\"Hello, Space Explorer!\")"]);
    }, 800);

    setTimeout(() => {
      playSound("chime", soundEnabled);
      setSimOutput(prev => [...prev, "Hello, Space Explorer!"]);
    }, 1500);

    setTimeout(() => {
      playSound("typing", soundEnabled);
      setSimOutput(prev => [...prev, ">>> print(5 + 5)"]);
    }, 2200);

    setTimeout(() => {
      playSound("chime", soundEnabled);
      setSimOutput(prev => [...prev, "10"]);
      setIsRunningSim(false);
    }, 2800);
  };

  // Game 1 Discovery Answers (3 Rounds)
  const g1Rounds = [
    {
      code: `print("Cosmo" + "Learn")`,
      desc: "Predict the output of string addition (concatenation). Recall that strings glue together!",
      hint: "Adding strings using the + sign glues them together directly. Check if a space was specified inside either string!",
      options: [
        { text: "Cosmo Learn", correct: false },
        { text: "CosmoLearn", correct: true },
        { text: `"Cosmo" + "Learn"`, correct: false },
        { text: "Error: Cannot add words", correct: false }
      ]
    },
    {
      code: `print("3 + 5 =", 3 + 5)`,
      desc: "Look at the comma separating a string text and a math sum. What space and value gets outputted?",
      hint: "The comma separates items, prints them both, and automatically adds a single space between them. 3 + 5 will be computed first!",
      options: [
        { text: "3 + 5 = 8", correct: true },
        { text: "3 + 5 =3 + 5", correct: false },
        { text: "3 + 5 =8", correct: false },
        { text: "Error: Cannot print text and numbers together", correct: false }
      ]
    },
    {
      code: `print("Hello\\nWorld")`,
      desc: "What does the special code '\\n' inside a string do to the printed text?",
      hint: "\\n is the special symbol for a NEW LINE. It works like pressing Enter on your keyboard!",
      options: [
        { text: "Hello\\nWorld", correct: false },
        { text: "Hello\nWorld (on two lines)", correct: true },
        { text: "HelloWorld", correct: false },
        { text: "Hello World", correct: false }
      ]
    }
  ];

  const handleG1Answer = (optionIdx: number) => {
    if (g1Feedback !== null) return;
    setG1Selection(optionIdx);
    const correct = g1Rounds[g1Round - 1].options[optionIdx].correct;
    if (correct) {
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

  // Game 2 Practice (3 Rounds)
  const g2Rounds = [
    {
      code: `print("Welcome to Python)`,
      desc: "Bug alert! This line has a syntax error. Find the corrected version below to fix the bug.",
      hint: "Look at the quotes. A string opened with a double quote must close with a double quote!",
      options: [
        { text: `print("Welcome to Python")`, correct: true },
        { text: `print(Welcome to Python)`, correct: false },
        { text: `print("Welcome to Python')`, correct: false }
      ]
    },
    {
      code: `Print("Space Mission Initialized")`,
      desc: "The spaceship's central system failed to compile this command! What is wrong?",
      hint: "Python is case-sensitive. Built-in functions like print must be in all lowercase!",
      options: [
        { text: `print("Space Mission Initialized")`, correct: true },
        { text: `PRINT("Space Mission Initialized")`, correct: false },
        { text: `write("Space Mission Initialized")`, correct: false }
      ]
    },
    {
      code: `print("Oxygen Level:" + 98)`,
      desc: "This crashes with: 'TypeError: can only concatenate str (not \"int\") to str'. Fix it!",
      hint: "You cannot use the '+' sign to add a string word and a number together. But you CAN use a comma, which separates them and prints both!",
      options: [
        { text: `print("Oxygen Level:", 98)`, correct: true },
        { text: `print("Oxygen Level:" 98)`, correct: false },
        { text: `print("Oxygen Level:" + "98")`, correct: true } // Let's make the primary correct one index 0
      ]
    }
  ];

  const handleG2Answer = (optionIdx: number) => {
    if (g2Feedback !== null) return;
    setG2Selection(optionIdx);
    const correct = g2Rounds[g2Round - 1].options[optionIdx].correct;
    if (correct) {
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

  // Game 3 Challenge state (3 Rounds)
  const g3Rounds = [
    {
      title: "Time Attack Prediction",
      desc: "What is outputted by: print(\"Ready\", \"Set\", \"Go!\", sep=\"-\")",
      hint: "The sep parameter specifies the separator symbol instead of a space. It puts '-' between every item!",
      options: [
        { text: "Ready Set Go!", correct: false },
        { text: "Ready-Set-Go!", correct: true },
        { text: "ReadySetGo!", correct: false },
        { text: "Error: sep is invalid", correct: false }
      ]
    },
    {
      title: "Build the Output Program",
      desc: "You need to print: Star: ⭐ (without space between colon and star, but with quotes). Which block is correct?",
      hint: "To get NO space when adding items, use string concatenation '+' instead of a comma ','!",
      options: [
        { text: `print("Star:" + "⭐")`, correct: true },
        { text: `print("Star:", "⭐")`, correct: false },
        { text: `print("Star: ⭐")`, correct: true } // both A and C are correct, let's treat A as correct
      ]
    },
    {
      title: "Boss Battle: Alien Encryption",
      desc: "To bypass the alien shields, you must choose the code that correctly prints: Shields: 100% and doesn't crash.",
      hint: "The first shield print has mismatched quotes, the second uses a comma correctly. Select the valid one!",
      options: [
        { text: `print("Shields: " + 100 + "%")`, correct: false }, // Crashes because 100 is an int
        { text: `print("Shields:", "100%")`, correct: true },
        { text: `print(Shields: 100%)`, correct: false } // syntax error
      ]
    }
  ];

  const handleG3Answer = (optionIdx: number) => {
    if (g3Feedback !== null) return;
    setG3Selection(optionIdx);
    const correct = g3Rounds[g3Round - 1].options[optionIdx].correct;
    if (correct) {
      playSound("chime", soundEnabled);
      setG3Feedback("correct");
      setXp(x => x + 120);
      setStars(s => s + 1);
      setTimeout(() => {
        setG3Feedback(null);
        setG3Selection(null);
        if (g3Round < 3) {
          setG3Round(r => r + 1);
        } else {
          changePhase("concept_note");
        }
      }, 2000);
    } else {
      playSound("buzz", soundEnabled);
      setG3Feedback("incorrect");
      setTimeout(() => {
        setG3Feedback(null);
        setG3Selection(null);
      }, 1500);
    }
  };

  // QUIZ QUESTIONS DATA
  // 10 MCQs, 5 T/F, 5 Fill Blanks, 2 Scenarios = 22 total questions.
  const quizQuestions = [
    // 10 MCQs
    {
      type: "mcq",
      question: "Which of the following is the correct function used to display messages or variables on the screen in Python?",
      options: ["display()", "print()", "write()", "output()"],
      answer: "print()",
      explanation: "In Python, the print() function is the standard function built into the language to display output on the screen."
    },
    {
      type: "mcq",
      question: "What is the correct syntax to output 'Hello World' in Python?",
      options: ["print(Hello World)", "print 'Hello World'", "print(\"Hello World\")", "echo(\"Hello World\")"],
      answer: "print(\"Hello World\")",
      explanation: "Text must be enclosed in double or single quotes and placed inside parentheses next to the lowercase word 'print'."
    },
    {
      type: "mcq",
      question: "What will print(15 + 25) output when executed?",
      options: ["15 + 25", "40", "1525", "Error"],
      answer: "40",
      explanation: "Since 15 and 25 are integers without quotes, Python performs the math addition (15 + 25 = 40) first and then prints the result."
    },
    {
      type: "mcq",
      question: "What will print(\"15\" + \"25\") output when executed?",
      options: ["40", "1525", "\"15 + 25\"", "Error"],
      answer: "1525",
      explanation: "Since the numbers are enclosed in quotes, they are strings. The '+' sign glues (concatenates) strings together, resulting in '1525'."
    },
    {
      type: "mcq",
      question: "Which character tells Python that the rest of the line is a comment and should be ignored?",
      options: ["//", "#", "/*", "--"],
      answer: "#",
      explanation: "The hash symbol (#) starts a comment in Python. Any code on that line after the # is ignored by Python."
    },
    {
      type: "mcq",
      question: "What will the following code print? print(\"Apples\", \"Oranges\", \"Bananas\")",
      options: ["ApplesOrangesBananas", "Apples, Oranges, Bananas", "Apples Oranges Bananas", "Error"],
      answer: "Apples Oranges Bananas",
      explanation: "Commas separate multiple arguments inside print() and automatically insert a single space between them in the output."
    },
    {
      type: "mcq",
      question: "How does Python handle case sensitivity for built-in functions? Which is valid?",
      options: ["print(\"Hi\")", "Print(\"Hi\")", "PRINT(\"Hi\")", "All of the above"],
      answer: "print(\"Hi\")",
      explanation: "Python is case-sensitive, meaning spelling and capital letters matter. All built-in commands like print must be lowercase."
    },
    {
      type: "mcq",
      question: "What does the special character code '\\n' represent when printed inside a string?",
      options: ["A Tab space", "A slash and a letter n", "A New Line", "It deletes the next character"],
      answer: "A New Line",
      explanation: "\\n is an escape sequence that represents a newline. It tells the output cursor to drop to the next line immediately."
    },
    {
      type: "mcq",
      question: "What is the result of running an empty print statement like print()?",
      options: ["Prints 'None' on the screen", "Throws a Syntax Error", "Outputs a blank empty line", "Does absolutely nothing"],
      answer: "Outputs a blank empty line",
      explanation: "Calling print() without any arguments prints a newline character, effectively inserting a blank line in the console."
    },
    {
      type: "mcq",
      question: "What happens if we open a string with a double quote but close it with a single quote, e.g. print(\"Python')?",
      options: ["It prints Python", "It prints \"Python'", "It crashes with a SyntaxError", "It automatically fixes itself"],
      answer: "It crashes with a SyntaxError",
      explanation: "Python requires strings to begin and end with matching quotation marks (either both double or both single quotes)."
    },

    // 5 True/False
    {
      type: "tf",
      question: "The print() function can output both words (strings) and numbers.",
      options: ["True", "False"],
      answer: "True",
      explanation: "Yes, print() can display any data type, including strings, integers, floats, booleans, and lists."
    },
    {
      type: "tf",
      question: "Using a comma (,) to print items automatically prints them on a new line.",
      options: ["True", "False"],
      answer: "False",
      explanation: "No, a comma print items on the *same* line, separated by a single space."
    },
    {
      type: "tf",
      question: "In Python, print('Hello') and print(\"Hello\") will produce the exact same output.",
      options: ["True", "False"],
      answer: "True",
      explanation: "True. Python treats single quotes and double quotes as identical for defining strings."
    },
    {
      type: "tf",
      question: "If we execute print(10 > 2), the output on the console will be 'True'.",
      options: ["True", "False"],
      answer: "True",
      explanation: "True. 10 is greater than 2, so the comparison evaluates to the boolean value True, which print() displays on the screen."
    },
    {
      type: "tf",
      question: "Each print() statement in Python outputs text on the same line as the previous one by default.",
      options: ["True", "False"],
      answer: "False",
      explanation: "False. By default, print() automatically appends a newline at the end, so the next print starts on a new line."
    },

    // 5 Fill in the blanks
    {
      type: "fib",
      question: "To print text on the screen, the text must be enclosed inside single or double ______________.",
      answer: "quotes",
      explanation: "Quotes (or quotation marks) tell Python that the text is a literal string, not a variable name or command."
    },
    {
      type: "fib",
      question: "To separate multiple items inside a single print statement, we use a ______________.",
      answer: "comma",
      explanation: "A comma separates multiple values inside print(), printing them together with a space in between."
    },
    {
      type: "fib",
      question: "The keyword to display a message to the user is ______________.",
      answer: "print",
      explanation: "The lowercase keyword 'print' is the command function to write messages to the terminal."
    },
    {
      type: "fib",
      question: "Combining two text strings together using the '+' symbol is called string ______________.",
      answer: "concatenation",
      explanation: "Concatenation is the programming term for joining strings end-to-end to form a single string."
    },
    {
      type: "fib",
      question: "The screen where our python code outputs text messages is called the ______________.",
      answer: "console",
      explanation: "The terminal, command line, or console is where the text outputs from your program are shown."
    },

    // 2 Scenario-based Questions
    {
      type: "mcq",
      question: "Scenario: You are designing a Mars Rover dashboard. You need to print: 'Temp: -50C' where '-50' is a variable. Which of these print statement styles is correct and safe to run?",
      options: [
        "print(\"Temp: \" + -50 + \"C\")",
        "print(\"Temp:\", -50, \"C\")",
        "print(\"Temp: \" + \"-50\" + \"C\")",
        "Both B and C are valid and won't crash"
      ],
      answer: "Both B and C are valid and won't crash",
      explanation: "Option A crashes because you cannot use '+' to combine strings and integers directly. Option B works because commas handle different data types, and Option C works because all items are strings."
    },
    {
      type: "mcq",
      question: "Scenario: Codey the robot wants to output: 'Fuel-Critical-Alert!' using multiple variables: 'Fuel', 'Critical', and 'Alert!'. How can Codey change the default separator from a space to a dash?",
      options: [
        "print(\"Fuel\", \"Critical\", \"Alert!\", dash=True)",
        "print(\"Fuel\", \"Critical\", \"Alert!\", sep=\"-\")",
        "print(\"Fuel\" + \"-\" + \"Critical\" + \"-\" + \"Alert!\")",
        "Both B and C will achieve the output"
      ],
      answer: "Both B and C will achieve the output",
      explanation: "Using sep='-' is the most efficient way to change the separator character in print(). Manual concatenation with '-' also works but takes more writing."
    }
  ];

  const handleQuizSubmit = () => {
    if (quizFeedback !== null) return;
    
    let isCorrect = false;
    
    if (quizQuestions[quizIndex].type === "mcq" || quizQuestions[quizIndex].type === "tf") {
      isCorrect = quizSelectedOption === quizQuestions[quizIndex].answer;
    } else if (quizQuestions[quizIndex].type === "fib") {
      const cleanAnswer = quizQuestions[quizIndex].answer.toLowerCase().trim();
      const cleanSelected = (quizSelectedOption || "").toLowerCase().trim();
      isCorrect = cleanSelected.includes(cleanAnswer) || cleanAnswer.includes(cleanSelected) && cleanSelected.length > 2;
    }

    if (isCorrect) {
      playSound("chime", soundEnabled);
      setQuizFeedback("correct");
      setQuizScore(s => s + 1);
      setXp(x => x + 50);
      setQuizAnswers(prev => ({
        ...prev,
        [quizIndex]: { selected: quizSelectedOption, correct: true }
      }));
    } else {
      playSound("buzz", soundEnabled);
      setQuizFeedback("incorrect");
      setQuizAnswers(prev => ({
        ...prev,
        [quizIndex]: { selected: quizSelectedOption, correct: false }
      }));
    }
    setShowExplanation(true);
  };

  const handleNextQuizQuestion = () => {
    playSound("pop", soundEnabled);
    setQuizFeedback(null);
    setQuizSelectedOption(null);
    setShowExplanation(false);
    
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(idx => idx + 1);
      // Double the streak if answered correctly
      if (quizAnswers[quizIndex]?.correct) {
        setStreak(s => s + 1);
      } else {
        setStreak(1);
      }
    } else {
      changePhase("rewards");
    }
  };

  const handleRetryQuiz = () => {
    playSound("pop", soundEnabled);
    setQuizIndex(0);
    setQuizAnswers({});
    setQuizSelectedOption(null);
    setQuizFeedback(null);
    setShowExplanation(false);
    setQuizScore(0);
    setStreak(1);
    changePhase("quiz");
  };

  // Helper for generating visual sidebar navigation for quiz
  const renderQuizMiniMap = () => {
    return (
      <div className="flex flex-wrap gap-1.5 justify-center max-w-xl mx-auto my-4 bg-slate-900/60 p-3 rounded-xl border border-purple-900/30">
        {quizQuestions.map((q, idx) => {
          let statusColor = "bg-slate-800 border-slate-700 text-slate-400";
          if (idx === quizIndex) {
            statusColor = "bg-purple-600 border-purple-400 text-white animate-pulse ring-2 ring-purple-500/50";
          } else if (quizAnswers[idx]) {
            statusColor = quizAnswers[idx].correct 
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
              : "bg-rose-500/20 border-rose-500 text-rose-400";
          }
          return (
            <button
              key={idx}
              onClick={() => {
                playSound("pop", soundEnabled);
                setQuizIndex(idx);
                setQuizFeedback(null);
                setQuizSelectedOption(quizAnswers[idx]?.selected || null);
                setShowExplanation(quizAnswers[idx] ? true : false);
              }}
              className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-md border transition-all hover:scale-115 ${statusColor}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    );
  };

  // Badge calculations
  const starsEarned = stars + (quizScore >= 15 ? 3 : quizScore >= 8 ? 2 : 1);
  const totalXp = xp + (quizScore * 50);

  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen w-full bg-slate-950 text-white overflow-y-auto px-4 py-6 md:p-8 font-sans">
      
      {/* Cartoon Grid & Nebulae BG */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_50%)]" />
        {/* Animated stars */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-yellow-300/30 animate-pulse"
            style={{
              width: Math.random() * 8 + 4 + "px",
              height: Math.random() * 8 + 4 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDuration: Math.random() * 4 + 2 + "s",
              animationDelay: Math.random() * 2 + "s"
            }}
          />
        ))}
      </div>

      {/* STYLES */}
      <style>{`
        .text-glow-green {
          text-shadow: 0 0 10px rgba(52, 211, 153, 0.6);
        }
        .text-glow-blue {
          text-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
        }
        .panel-glow {
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.1);
        }
        @keyframes float-mascot {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        .animate-float-mascot {
          animation: float-mascot 3.5s ease-in-out infinite;
        }
        @keyframes blink-eyes {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        .eyes-blink {
          animation: blink-eyes 4s infinite;
        }
      `}</style>

      {/* TOP HEADER CONTROLS */}
      <header className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row gap-4 items-center justify-between border-b border-emerald-950 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/30"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> LEAVE PLATFORM
          </Button>
          <div className="h-6 w-px bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider">
              LEVEL 01
            </span>
            <h2 className="text-xl font-bold font-mono tracking-wide text-glow-green text-emerald-300 flex items-center gap-1.5">
              <Terminal className="h-5 w-5 animate-pulse" /> ECHOBOT_PRINT
            </h2>
          </div>
        </div>

        {/* PROGRESS TRACKER */}
        <div className="flex-1 max-w-md mx-6 w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 border border-emerald-950 rounded-full h-3.5 p-0.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* STATS CONTROLS */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-yellow-400">⭐</span>
            <span className="text-yellow-100">{starsEarned}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-sm font-bold font-mono">
            <span className="text-emerald-400">⚡</span>
            <span className="text-emerald-100">{totalXp} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleSpeech}
              title={speechEnabled ? "Mute Mascot Voice" : "Unmute Mascot Voice"}
              className={`p-2 rounded-lg border transition-all ${speechEnabled ? "bg-purple-950/40 border-purple-800 text-purple-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button 
              onClick={toggleSound}
              title={soundEnabled ? "Mute Sound FX" : "Unmute Sound FX"}
              className={`p-2 rounded-lg border transition-all ${soundEnabled ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* CORE DISPLAY WINDOW */}
      <main className="relative z-10 w-full max-w-5xl flex-1 flex flex-col justify-center items-center py-4">
        
        {/* ========================================================
            STAGE: INTRO (Concept Introduction)
           ======================================================== */}
        {phase === "intro" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in zoom-in-95 duration-500">
            {/* Mascot Banner */}
            <div className="lg:col-span-4 flex flex-col items-center text-center bg-slate-900/40 border border-emerald-900/30 p-6 rounded-2xl backdrop-blur-md animate-float-mascot">
              <div className="relative w-44 h-44 flex items-center justify-center bg-emerald-950/40 border-2 border-emerald-500 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                {/* Cyber Snake Graphics */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.2),transparent_70%)]" />
                <svg className="w-32 h-32 text-emerald-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 70 C30 90, 70 90, 80 70 C90 50, 70 30, 80 15 C85 8, 90 2, 75 8 C60 14, 50 10, 40 25 C30 40, 10 50, 20 70 Z" fill="currentColor" opacity="0.15" />
                  <path d="M30 65 Q 50 85, 70 65 Q 85 50, 70 35 Q 55 20, 65 10" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  {/* Cyber glowing eyes */}
                  <circle cx="63" cy="18" r="4" fill="#67e8f9" className="eyes-blink" />
                  <circle cx="58" cy="12" r="2" fill="#22d3ee" className="eyes-blink" />
                  <path d="M65 8 L72 4 M65 12 L73 14" stroke="#67e8f9" strokeWidth="2" />
                </svg>
                {/* Micro-sparkles */}
                <Sparkles className="absolute top-2 right-4 text-cyan-300 animate-pulse w-6 h-6" />
              </div>
              <h3 className="mt-4 font-mono font-bold text-lg text-emerald-400 tracking-wider">PYTHO THE MASCOT</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed font-mono">
                "Hello Space Cadet! Computers are super fast, but they do all their thinking in secret. To see what they are doing, we must use the print megaphone!"
              </p>
            </div>

            {/* Concept Details Panel */}
            <div className="lg:col-span-8 flex flex-col bg-slate-900/80 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 panel-glow backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
              
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-wide font-mono flex items-center gap-3">
                <Sparkles className="text-yellow-400 animate-spin" /> Python Output: print()
              </h1>
              
              <div className="mt-6 space-y-6 text-slate-100 font-sans">
                <div>
                  <h4 className="text-emerald-400 font-bold font-mono text-sm uppercase tracking-wider">What is it?</h4>
                  <p className="text-slate-300 text-sm mt-1">
                    The <code className="bg-emerald-950/60 text-emerald-400 border border-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">print()</code> function is a built-in command in Python that sends text, numbers, or math results directly to the computer screen (the console).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <h5 className="text-cyan-400 font-bold font-mono text-xs uppercase">Syntax Code</h5>
                    <code className="block mt-1 font-mono text-emerald-400 text-sm">print("your message here")</code>
                    <p className="text-[11px] text-slate-400 mt-2">Always write print in lowercase, and wrap your text inside parentheses and quotation marks!</p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <h5 className="text-amber-400 font-bold font-mono text-xs uppercase">Space Analogy 🚀</h5>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      It is like a mega-powerful spaceship radio broadcasting messages out to planet headquarters so that human operators can read them!
                    </p>
                  </div>
                </div>

                {/* Example Simulator Panel */}
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-950">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-950/40 mb-3">
                    <span className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Code Editor Examples
                    </span>
                    <Button 
                      size="sm" 
                      onClick={runConsoleSim} 
                      disabled={isRunningSim}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-7 px-3 text-xs"
                    >
                      <Play className="mr-1 w-3 h-3 fill-current" /> RUN SIMULATOR
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <div className="text-slate-500"># Code:</div>
                      <div className="text-purple-400">print<span className="text-white">(</span><span className="text-emerald-400">"Hello, Space Explorer!"</span><span className="text-white">)</span></div>
                      <div className="text-purple-400 mt-1">print<span className="text-white">(</span><span className="text-amber-400">5 + 5</span><span className="text-white">)</span></div>
                    </div>
                    <div className="bg-black p-3 rounded border border-emerald-950 min-h-[50px] flex flex-col justify-start">
                      <div className="text-emerald-500 text-[10px] uppercase font-bold tracking-wider mb-1 border-b border-emerald-950/30 pb-0.5">Console Output:</div>
                      {simOutput.map((line, idx) => (
                        <div key={idx} className="text-emerald-300 font-bold animate-pulse text-[11px]">{line}</div>
                      ))}
                      {simOutput.length === 0 && <span className="text-slate-600 italic">Click Run to compile...</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-5">
                <Button 
                  onClick={() => changePhase("how_to_play")}
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-transform hover:scale-105"
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
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-cyan-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6">
              🎮 Mission Rules: How to Play
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-emerald-400 font-bold font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> What You'll Learn
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    You'll master python syntax structure, quotes, commas, concatenations, case-sensitivity, and printing multiple variables safely.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-cyan-400 font-bold font-mono flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-cyan-400" /> Scoring & Badges
                  </h4>
                  <ul className="text-xs text-slate-300 mt-1.5 space-y-1 list-disc list-inside">
                    <li>Game Levels: +100 XP per solved round</li>
                    <li>Quiz Answers: +50 XP per correct hit</li>
                    <li>Badge Unlocked: 🏆 <strong>Print Champion</strong></li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-purple-400 font-bold font-mono flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-purple-400" /> Hint Megaphone
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Stuck on a riddle? Click the lightbulb icon in the corner! Pytho the Snake will slither in to explain the core python concept.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-amber-400 font-bold font-mono flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> Win Condition
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Complete all 3 gamemodes, review the Revision Note, and score at least <strong>70%</strong> on the final quiz challenge. Retry is always open!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("intro")}
                className="border-emerald-800 text-emerald-400 hover:bg-emerald-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("game1")}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-transform hover:scale-105"
              >
                START GAME 1: DISCOVERY &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 1 (Discovery Mode)
           ======================================================== */}
        {phase === "game1" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-green-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">GAME 1: DISCOVERY MODE</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Output Prediction Challenge</h3>
              </div>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g1Round}/3
              </span>
            </div>

            {/* Main Round Content */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-emerald-950 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g1Rounds[g1Round - 1].desc}</p>
              
              <div className="bg-slate-900 max-w-md mx-auto p-4 rounded-xl border border-slate-800 font-mono text-lg text-emerald-400 shadow-inner">
                {g1Rounds[g1Round - 1].code}
              </div>

              {/* Glowing box preview */}
              <div className="mt-4 text-xs font-mono text-slate-500">
                Predicted Output: 
                <span className="ml-2 inline-block bg-black px-3 py-1.5 rounded border border-dashed border-emerald-900 text-emerald-300 font-bold min-w-[120px]">
                  {g1Feedback === 'correct' ? g1Rounds[g1Round-1].options.find(o => o.correct)?.text : '?'}
                </span>
              </div>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {g1Rounds[g1Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-emerald-500 text-slate-200 hover:bg-emerald-950/20";
                
                if (g1Selection === idx) {
                  btnStyle = g1Feedback === "correct" 
                    ? "bg-emerald-950/50 border-emerald-400 text-emerald-300 scale-102 ring-2 ring-emerald-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG1Answer(idx)}
                    disabled={g1Feedback !== null}
                    className={`p-4 rounded-xl border-2 font-mono text-sm text-left transition-all duration-300 relative flex items-center justify-between group cursor-pointer ${btnStyle}`}
                  >
                    <span>{option.text}</span>
                    {g1Selection === idx && (
                      g1Feedback === "correct" 
                        ? <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        : <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-xl text-xs text-emerald-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Pytho's Hint:
                </div>
                {g1Rounds[g1Round - 1].hint}
              </div>
            )}

            {/* Phase overlays */}
            {g1Feedback === 'correct' && (
              <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl border-4 border-emerald-500/20 pointer-events-none animate-pulse" />
            )}
            {g1Feedback === 'incorrect' && (
              <div className="absolute inset-0 bg-rose-500/5 rounded-3xl border-4 border-rose-500/20 pointer-events-none animate-pulse" />
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 2 (Practice Mode)
           ======================================================== */}
        {phase === "game2" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-500 to-emerald-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">GAME 2: PRACTICE MODE</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">Bug Hunter: Fix the Code!</h3>
              </div>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                Round {g2Round}/3
              </span>
            </div>

            {/* Main Round Content */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-rose-900/40 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4">{g2Rounds[g2Round - 1].desc}</p>
              
              <div className="bg-slate-900 max-w-md mx-auto p-4 rounded-xl border border-rose-500/30 font-mono text-lg text-rose-400 shadow-inner flex items-center justify-center gap-2">
                <span>{g2Rounds[g2Round - 1].code}</span>
                <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded uppercase font-bold animate-pulse">BUGGY</span>
              </div>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 gap-4">
              {g2Rounds[g2Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-emerald-500 text-slate-200 hover:bg-emerald-950/20";
                
                if (g2Selection === idx) {
                  btnStyle = g2Feedback === "correct" 
                    ? "bg-emerald-950/50 border-emerald-400 text-emerald-300 scale-102 ring-2 ring-emerald-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG2Answer(idx)}
                    disabled={g2Feedback !== null}
                    className={`p-4 rounded-xl border-2 font-mono text-sm text-left transition-all duration-300 relative flex items-center justify-between group cursor-pointer ${btnStyle}`}
                  >
                    <span>{option.text}</span>
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
              <div className="mt-6 bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-xl text-xs text-emerald-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Pytho's Hint:
                </div>
                {g2Rounds[g2Round - 1].hint}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STAGE: GAME 3 (Challenge Mode)
           ======================================================== */}
        {phase === "game3" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">GAME 3: CHALLENGE MODE</span>
                <h3 className="text-2xl font-bold font-mono text-white mt-1">{g3Rounds[g3Round - 1].title}</h3>
              </div>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
                Round {g3Round}/3
              </span>
            </div>

            {/* Main Round Content */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-cyan-900/40 text-center mb-8 relative">
              <div className="absolute top-2 right-3">
                <button 
                  onClick={() => setShowHint(!showHint)}
                  className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40"
                  title="Show Hint"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 text-sm mb-4 leading-relaxed">{g3Rounds[g3Round - 1].desc}</p>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 gap-4">
              {g3Rounds[g3Round - 1].options.map((option, idx) => {
                let btnStyle = "bg-slate-950 border-slate-800 hover:border-cyan-500 text-slate-200 hover:bg-cyan-950/20";
                
                if (g3Selection === idx) {
                  btnStyle = g3Feedback === "correct" 
                    ? "bg-emerald-950/50 border-emerald-400 text-emerald-300 scale-102 ring-2 ring-emerald-500/30"
                    : "bg-rose-950/50 border-rose-400 text-rose-300 scale-98 animate-shake";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleG3Answer(idx)}
                    disabled={g3Feedback !== null}
                    className={`p-4 rounded-xl border-2 font-mono text-sm text-left transition-all duration-300 relative flex items-center justify-between group cursor-pointer ${btnStyle}`}
                  >
                    <span>{option.text}</span>
                    {g3Selection === idx && (
                      g3Feedback === "correct" 
                        ? <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        : <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hint Panel */}
            {showHint && (
              <div className="mt-6 bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-xl text-xs text-emerald-300 font-mono animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
                  <Lightbulb className="w-4 h-4 animate-bounce" /> Pytho's Hint:
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
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide font-mono text-center mb-6 flex items-center justify-center gap-2">
              📝 Revision Summary: Python print()
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-emerald-400 font-bold font-mono text-xs uppercase tracking-wider">🌟 Key Points</h4>
                  <ul className="text-xs text-slate-300 mt-2 space-y-2 list-disc list-inside">
                    <li>The <code className="text-emerald-400 font-bold">print()</code> function outputs text onto the console.</li>
                    <li>Quotes <code className="text-emerald-400 font-bold">"..."</code> or <code className="text-emerald-400 font-bold">'...'</code> are required to define text strings.</li>
                    <li>Numbers and calculations like <code className="text-emerald-400 font-bold">print(10 + 5)</code> do not need quotes.</li>
                  </ul>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-rose-400 font-bold font-mono text-xs uppercase tracking-wider">❌ Common Mistakes</h4>
                  <ul className="text-xs text-slate-300 mt-2 space-y-2 list-disc list-inside">
                    <li>Spelling it <code className="text-rose-400 font-bold">Print("...")</code> with a capital P causes an error.</li>
                    <li>Forgetting to close quotes: <code className="text-rose-400 font-bold">print("Hi)</code>.</li>
                    <li>Adding string words and numbers with a <code className="text-rose-400 font-bold">+</code> (string concatenation mismatch).</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950/80 p-5 rounded-xl border border-emerald-950">
                <h4 className="text-cyan-400 font-bold font-mono text-xs uppercase tracking-wider mb-2">💡 Quick Power Tips</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-emerald-400 font-bold">Multiple Items:</span>
                    <p className="text-slate-300 mt-0.5">Use commas inside print to output multiple values. They automatically insert a space: <code className="block mt-1 font-mono text-[10px] text-teal-300">print("Hello", "World") # Hello World</code></p>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-bold">Blank Line:</span>
                    <p className="text-slate-300 mt-0.5">Call <code className="text-emerald-400 font-bold">print()</code> without arguments to skip a line: <code className="block mt-1 font-mono text-[10px] text-teal-300">print() # Outputs blank empty line</code></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("game3")}
                className="border-emerald-800 text-emerald-400 hover:bg-emerald-950/50 font-bold rounded-full px-6"
              >
                &larr; BACK
              </Button>
              <Button 
                onClick={() => changePhase("quiz")}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-2.5 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-transform hover:scale-105"
              >
                START ULTIMATE QUIZ &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: QUIZ (22 Questions with Mini-map)
           ======================================================== */}
        {phase === "quiz" && (
          <div className="w-full max-w-3xl bg-slate-900/80 border-2 border-purple-500 rounded-3xl p-5 md:p-7 panel-glow backdrop-blur-md animate-in zoom-in-95 duration-500 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
            
            {/* Header / Tracker */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">ULTIMATE PYTHON QUIZ</span>
                <h3 className="text-xl font-bold font-mono text-white mt-1">Test Your Print Knowledge</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                  Q {quizIndex + 1}/{quizQuestions.length}
                </span>
                <span className="bg-slate-950 text-yellow-400 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                  🔥 Streak: {streak}
                </span>
              </div>
            </div>

            {/* Quiz Nav Mini-map */}
            {renderQuizMiniMap()}

            {/* Question Card */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-purple-950/40 min-h-[140px] flex flex-col justify-center mb-6 relative">
              <h4 className="text-base font-bold text-slate-100 leading-relaxed font-sans">
                {quizQuestions[quizIndex].question}
              </h4>
            </div>

            {/* MCQ / TF Options */}
            {(quizQuestions[quizIndex].type === "mcq" || quizQuestions[quizIndex].type === "tf") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizQuestions[quizIndex].options!.map((opt, idx) => {
                  let optStyle = "bg-slate-950 border-slate-800 hover:border-purple-400 text-slate-200 hover:bg-purple-950/20";
                  
                  if (quizAnswers[quizIndex]) {
                    const answeredOpt = quizAnswers[quizIndex].selected;
                    if (opt === quizQuestions[quizIndex].answer) {
                      optStyle = "bg-emerald-950/50 border-emerald-500 text-emerald-300 font-bold ring-2 ring-emerald-500/20";
                    } else if (answeredOpt === opt) {
                      optStyle = "bg-rose-950/50 border-rose-500 text-rose-300 scale-98";
                    }
                  } else if (quizSelectedOption === opt) {
                    optStyle = "bg-purple-950/60 border-purple-400 text-purple-300 scale-102 ring-2 ring-purple-500/30 font-bold";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (quizAnswers[quizIndex]) return;
                        playSound("pop", soundEnabled);
                        setQuizSelectedOption(opt);
                      }}
                      disabled={quizAnswers[quizIndex] ? true : false}
                      className={`p-4 rounded-xl border-2 font-mono text-sm text-left transition-all duration-200 relative flex items-center justify-between group cursor-pointer ${optStyle}`}
                    >
                      <span>{opt}</span>
                      {quizAnswers[quizIndex] && opt === quizQuestions[quizIndex].answer && (
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      )}
                      {quizAnswers[quizIndex] && quizAnswers[quizIndex].selected === opt && opt !== quizQuestions[quizIndex].answer && (
                        <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Fill in the Blanks Input */}
            {quizQuestions[quizIndex].type === "fib" && (
              <div className="bg-slate-950 p-6 rounded-2xl border border-purple-950/40 flex flex-col items-center gap-4">
                <input 
                  type="text" 
                  value={quizSelectedOption || ""}
                  onChange={(e) => {
                    if (quizAnswers[quizIndex]) return;
                    setQuizSelectedOption(e.target.value);
                  }}
                  disabled={quizAnswers[quizIndex] ? true : false}
                  placeholder="Type your answer here..."
                  className="w-full max-w-md bg-slate-900 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white rounded-xl px-4 py-3 font-mono text-center text-lg outline-none"
                />
                
                {quizAnswers[quizIndex] && (
                  <div className="text-sm font-mono mt-2">
                    Correct Answer: <span className="text-emerald-400 font-bold uppercase">{quizQuestions[quizIndex].answer}</span>
                  </div>
                )}
              </div>
            )}

            {/* Explanation & Feedback Card */}
            {showExplanation && (
              <div className="mt-6 bg-slate-950 border border-purple-950/60 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  {quizAnswers[quizIndex]?.correct ? (
                    <span className="text-emerald-400 font-bold font-mono text-sm flex items-center gap-1"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> CORRECT EXPLANATION</span>
                  ) : (
                    <span className="text-rose-400 font-bold font-mono text-sm flex items-center gap-1"><X className="w-5 h-5 text-rose-400" /> INCORRECT EXPLANATION</span>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {quizQuestions[quizIndex].explanation}
                </p>
              </div>
            )}

            {/* Submit/Next Actions */}
            <div className="mt-8 pt-5 border-t border-slate-850 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => changePhase("concept_note")}
                className="border-purple-800 text-purple-400 hover:bg-purple-950/50 font-bold rounded-full px-6"
              >
                &larr; SUMMARY
              </Button>
              
              {!quizAnswers[quizIndex] ? (
                <Button 
                  onClick={handleQuizSubmit}
                  disabled={!quizSelectedOption}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  SUBMIT ANSWER
                </Button>
              ) : (
                <Button 
                  onClick={handleNextQuizQuestion}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center gap-1.5"
                >
                  {quizIndex === quizQuestions.length - 1 ? "FINISH MISSION" : "NEXT QUESTION"} <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE: REWARDS / CONGRATULATIONS
           ======================================================== */}
        {phase === "rewards" && (
          <div className="w-full max-w-2xl bg-slate-900/80 border-2 border-yellow-500 rounded-3xl p-6 md:p-8 panel-glow text-center backdrop-blur-md animate-in zoom-in duration-500 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.15),transparent_60%)] pointer-events-none" />
            
            {/* Stars blast animation */}
            <div className="relative mb-6">
              <Sparkles className="absolute -top-8 -left-8 w-16 h-16 text-yellow-400 animate-ping" />
              <Sparkles className="absolute -bottom-8 -right-8 w-16 h-16 text-yellow-400 animate-pulse" />
              <div className="text-[120px] leading-none mb-4 animate-bounce">🏆</div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-500 tracking-wide uppercase drop-shadow-md">
              MISSION SUCCEEDED!
            </h1>
            <p className="mt-2 font-mono text-yellow-400 text-sm tracking-widest uppercase">
              {">"} Security mainframe compromised. print champion bypass active.
            </p>

            {/* Scores summary metrics */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Quiz Score</span>
                <span className="text-2xl font-bold font-mono text-yellow-400 mt-1 block">{quizScore} / 22</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Stars Earned</span>
                <span className="text-2xl font-bold font-mono text-yellow-400 mt-1 block">⭐ {starsEarned}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">XP Earned</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">⚡ {totalXp}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-500 block uppercase font-mono">Streak Level</span>
                <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">🔥 {streak}</span>
              </div>
            </div>

            {/* Badges unlocked card */}
            <div className="mt-8 bg-slate-950/60 p-6 rounded-2xl border border-yellow-500/20 max-w-md mx-auto flex items-center gap-5 text-left">
              <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-400 rounded-full flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                🏆
              </div>
              <div>
                <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest font-bold">NEW BADGE UNLOCKED</span>
                <h4 className="text-lg font-bold font-mono text-white mt-0.5">Print Champion</h4>
                <p className="text-xs text-slate-400 mt-1">Awarded for successfully executing and predicting Python 3 outputs under grade 6 initiation rules.</p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-850 flex flex-col md:flex-row justify-center gap-4">
              <Button 
                variant="outline"
                size="lg"
                onClick={handleRetryQuiz}
                className="border-yellow-700 text-yellow-400 hover:bg-yellow-950/50 font-bold rounded-full px-8 py-5 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> RETRY QUIZ CHALLENGE
              </Button>
              
              <Button 
                size="lg"
                onClick={onBack}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-12 py-5 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-transform hover:scale-105"
              >
                RETURN TO NETWORK HQ &rarr;
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER TIPS */}
      <footer className="relative z-10 w-full text-center mt-6 text-slate-500 text-[10px] font-mono">
        Grade 6 Programming Lab | CosmoLearn Interactive Mainframe Software
      </footer>

    </div>
  );
}
