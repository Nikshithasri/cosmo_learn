import { useEffect, useState } from "react";
import { Gem, Zap } from "lucide-react";
import { MathQuestion } from "@/data/mathQuestions";

interface Props {
  questions: MathQuestion[];
  onFinish: (score: number) => void;
}

/** Medium mode — Crystal Mining: tap the crystal showing the right answer */
const MiningGame = ({ questions, onFinish }: Props) => {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = questions[idx];

  useEffect(() => {
    setPicked(null);
  }, [idx]);

  const handle = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === q.answer;
    if (correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (idx + 1 >= questions.length) onFinish(correct ? score + 1 : score);
      else setIdx((n) => n + 1);
    }, 800);
  };

  // Cave colors per crystal slot
  const colors = ["var(--planet-math)", "var(--planet-knowledge)", "var(--planet-english)", "var(--planet-coding)"];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute left-4 top-4 z-20 flex items-center gap-4 rounded-full border border-primary/40 bg-background/60 px-4 py-2 backdrop-blur-md">
        <span className="font-display text-xs tracking-widest text-foreground">
          {idx + 1}/{questions.length}
        </span>
        <span className="flex items-center gap-1 font-display text-xs text-primary">
          <Zap className="h-4 w-4" /> {score}
        </span>
      </div>

      <div className="absolute left-1/2 top-10 z-20 -translate-x-1/2 rounded-2xl border border-primary/40 bg-card/80 px-8 py-4 backdrop-blur-md">
        <p className="font-display text-xs tracking-widest text-muted-foreground">MINE THE CORRECT CRYSTAL</p>
        <p className="text-center font-display text-2xl tracking-widest text-foreground text-glow">{q.question}</p>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-4 pt-24">
        <div className="grid w-full max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {q.options.map((opt, i) => {
            const state =
              picked === null
                ? "idle"
                : i === q.answer
                ? "correct"
                : picked === i
                ? "wrong"
                : "fade";
            return (
              <button
                key={i}
                onClick={() => handle(i)}
                className="group relative flex h-40 items-center justify-center transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed"
                disabled={picked !== null}
              >
                <div
                  className={`relative flex h-32 w-24 items-center justify-center transition-all ${
                    state === "correct" ? "animate-pulse" : state === "wrong" ? "opacity-40" : state === "fade" ? "opacity-30" : ""
                  }`}
                  style={{
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    background: `linear-gradient(180deg, hsl(${colors[i]} / 0.9), hsl(${colors[i]} / 0.4))`,
                    boxShadow: `0 0 40px hsl(${colors[i]} / 0.7)`,
                  }}
                >
                  <Gem className="absolute inset-0 m-auto h-8 w-8 opacity-30 text-foreground" />
                  <span className="relative font-display text-2xl font-bold text-foreground text-glow">
                    {opt}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MiningGame;