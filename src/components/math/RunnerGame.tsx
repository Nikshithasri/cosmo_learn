import { useEffect, useMemo, useState } from "react";
import { Heart, Zap } from "lucide-react";
import { MathQuestion } from "@/data/mathQuestions";

interface Props {
  questions: MathQuestion[];
  onFinish: (score: number) => void;
}

/** Easy mode — Space Runner: pick the correct asteroid lane before it hits */
const RunnerGame = ({ questions, onFinish }: Props) => {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [progress, setProgress] = useState(0); // 0 → 100 then auto-fail
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);

  const q = questions[idx];

  useEffect(() => {
    setProgress(0);
    setPickedIdx(null);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(100, ((now - start) / 6000) * 100);
      setProgress(p);
      if (p >= 100) handleAnswer(-1);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleAnswer = (i: number) => {
    if (pickedIdx !== null) return;
    setPickedIdx(i);
    const correct = i === q.answer;
    if (correct) setScore((s) => s + 1);
    else setLives((l) => l - 1);

    setTimeout(() => {
      if (idx + 1 >= questions.length || (!correct && lives - 1 <= 0)) {
        onFinish(correct ? score + 1 : score);
      } else {
        setIdx((n) => n + 1);
      }
    }, 700);
  };

  const lanes = useMemo(() => q.options, [q]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* HUD */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-4 rounded-full border border-primary/40 bg-background/60 px-4 py-2 backdrop-blur-md">
        <span className="font-display text-xs tracking-widest text-foreground">
          {idx + 1}/{questions.length}
        </span>
        <span className="flex items-center gap-1 text-destructive">
          {Array.from({ length: lives }).map((_, i) => (
            <Heart key={i} className="h-4 w-4 fill-current" />
          ))}
        </span>
        <span className="flex items-center gap-1 font-display text-xs text-primary">
          <Zap className="h-4 w-4" /> {score}
        </span>
      </div>

      {/* Question */}
      <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 rounded-2xl border border-primary/40 bg-card/80 px-8 py-4 backdrop-blur-md">
        <p className="font-display text-2xl tracking-widest text-foreground text-glow">{q.question}</p>
      </div>

      {/* Lanes */}
      <div className="absolute inset-0 grid grid-cols-4 gap-2 px-4 pb-24 pt-44">
        {lanes.map((opt, i) => {
          const state =
            pickedIdx === null
              ? "idle"
              : i === q.answer
              ? "correct"
              : pickedIdx === i
              ? "wrong"
              : "fade";
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="relative flex items-end justify-center overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-transparent to-primary/5 transition hover:border-primary/60"
            >
              <div
                className="absolute left-1/2 -translate-x-1/2 transition-all duration-100 ease-linear"
                style={{ top: `${progress}%` }}
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full font-display text-xl font-bold transition-all ${
                    state === "correct"
                      ? "scale-125 bg-[hsl(var(--planet-coding))] text-background"
                      : state === "wrong"
                      ? "scale-90 bg-destructive text-destructive-foreground"
                      : state === "fade"
                      ? "opacity-30 bg-muted text-muted-foreground"
                      : "bg-primary/80 text-primary-foreground"
                  }`}
                  style={{
                    boxShadow: state === "idle" ? "0 0 30px hsl(var(--primary) / 0.6)" : undefined,
                  }}
                >
                  {opt}
                </div>
              </div>
              <div className="z-10 mb-3 font-display text-[10px] tracking-widest text-muted-foreground">
                LANE {i + 1}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RunnerGame;