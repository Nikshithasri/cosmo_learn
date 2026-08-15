import { useEffect, useState } from "react";
import { Skull, Sword, Heart } from "lucide-react";
import { MathQuestion } from "@/data/mathQuestions";

interface Props {
  questions: MathQuestion[];
  onFinish: (score: number) => void;
}

/** Hard mode — Boss Battle: every wrong answer the boss strikes */
const BossGame = ({ questions, onFinish }: Props) => {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [picked, setPicked] = useState<number | null>(null);
  const [shake, setShake] = useState<"player" | "boss" | null>(null);
  const q = questions[idx];
  const damage = Math.ceil(100 / questions.length);

  useEffect(() => {
    setPicked(null);
    setShake(null);
  }, [idx]);

  const handle = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === q.answer;
    if (correct) {
      setScore((s) => s + 1);
      setBossHp((h) => Math.max(0, h - damage));
      setShake("boss");
    } else {
      setPlayerHp((h) => Math.max(0, h - damage));
      setShake("player");
    }
    setTimeout(() => {
      const newBoss = correct ? Math.max(0, bossHp - damage) : bossHp;
      const newPlayer = !correct ? Math.max(0, playerHp - damage) : playerHp;
      if (idx + 1 >= questions.length || newBoss <= 0 || newPlayer <= 0) {
        onFinish(correct ? score + 1 : score);
      } else {
        setIdx((n) => n + 1);
      }
    }, 900);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Boss */}
      <div className={`absolute left-1/2 top-16 z-10 -translate-x-1/2 transition-transform ${shake === "boss" ? "animate-pulse" : ""}`}>
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle at 30% 30%, hsl(var(--planet-science)), hsl(0 60% 20%))",
              boxShadow: "0 0 50px hsl(var(--planet-science) / 0.7)",
            }}
          >
            <Skull className="h-16 w-16 text-background" strokeWidth={1.5} />
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-destructive transition-all"
              style={{ width: `${bossHp}%` }}
            />
          </div>
          <p className="font-display text-[10px] tracking-widest text-muted-foreground">BOSS · {bossHp}%</p>
        </div>
      </div>

      {/* Question */}
      <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary/40 bg-card/80 px-10 py-4 backdrop-blur-md">
        <p className="font-display text-3xl tracking-widest text-foreground text-glow">{q.question}</p>
      </div>

      {/* Player HUD bottom */}
      <div className={`absolute bottom-4 left-1/2 z-20 -translate-x-1/2 ${shake === "player" ? "animate-pulse" : ""}`}>
        <div className="flex items-center gap-3 rounded-full border border-primary/40 bg-background/60 px-4 py-2 backdrop-blur-md">
          <Heart className="h-4 w-4 fill-destructive text-destructive" />
          <div className="h-2 w-40 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-[hsl(var(--planet-coding))] transition-all" style={{ width: `${playerHp}%` }} />
          </div>
          <span className="font-display text-xs text-primary">{score}</span>
        </div>
      </div>

      {/* Answers — sword strikes */}
      <div className="absolute bottom-20 left-1/2 z-20 grid -translate-x-1/2 grid-cols-2 gap-3 sm:grid-cols-4">
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
              disabled={picked !== null}
              className={`flex h-16 w-24 items-center justify-center gap-2 rounded-lg border font-display text-lg font-bold transition-all hover:scale-105 ${
                state === "correct"
                  ? "border-[hsl(var(--planet-coding))] bg-[hsl(var(--planet-coding))]/30 text-foreground"
                  : state === "wrong"
                  ? "border-destructive bg-destructive/30 text-foreground"
                  : state === "fade"
                  ? "border-muted bg-muted/20 text-muted-foreground opacity-40"
                  : "border-primary/50 bg-background/40 text-foreground hover:border-primary"
              }`}
            >
              <Sword className="h-3 w-3 opacity-50" />
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BossGame;