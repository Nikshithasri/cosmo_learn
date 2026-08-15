import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import RunnerGame from "@/components/math/RunnerGame";
import MiningGame from "@/components/math/MiningGame";
import BossGame from "@/components/math/BossGame";
import BadgeReward from "@/components/math/BadgeReward";
import { Difficulty, difficultyMeta, generateQuestions } from "@/data/mathQuestions";
import spaceBg from "@/assets/space-bg.jpg";
import earthImg from "@/assets/earth.png";

type Phase = "grade" | "difficulty" | "play" | "reward";

const MathPlanet = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("grade");
  const [grade, setGrade] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [score, setScore] = useState(0);

  const questions = useMemo(() => {
    if (!grade || !difficulty) return [];
    return generateQuestions(grade, difficulty, 8);
  }, [grade, difficulty]);

  // Persist earned badges locally so the user sees progress across sessions
  const [badges, setBadges] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("mathBadges") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("mathBadges", JSON.stringify(badges));
  }, [badges]);

  const handleGameFinish = (s: number) => {
    setScore(s);
    if (grade && difficulty && s / questions.length >= 0.5) {
      setBadges((b) => ({ ...b, [`g${grade}-${difficulty}`]: true }));
    }
    setPhase("reward");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <img
        src={spaceBg}
        alt="Math planet surface from orbit"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/90" />

      {phase !== "wormhole" && (
        <header className="relative z-30 flex items-center justify-between px-8 py-6 md:px-14">
          <Button
            variant="ghost"
            onClick={() => {
              if (phase === "play" || phase === "reward") setPhase("difficulty");
              else if (phase === "difficulty") setPhase("grade");
              else navigate("/");
            }}
            className="text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <img src={earthImg} alt="" className="h-8 w-8 planet-glow" />
            <span className="font-display text-sm tracking-[0.3em] text-foreground text-glow">
              MATH PLANET
            </span>
          </div>
        </header>
      )}

      {phase === "grade" && (
        <section className="relative z-20 mx-auto max-w-5xl px-6 pt-6 text-center animate-fade-in">
          <h1 className="font-display text-3xl font-bold tracking-[0.3em] text-foreground text-glow md:text-5xl">
            CHOOSE YOUR GRADE
          </h1>
          <p className="mt-3 font-body text-sm text-muted-foreground">
            Each grade unlocks new constellations of problems
          </p>

          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => {
              const g = i + 1;
              const earned = ["easy", "medium", "hard"].filter(
                (d) => badges[`g${g}-${d}`],
              ).length;
              return (
                <button
                  key={g}
                  onClick={() => {
                    setGrade(g);
                    setPhase("difficulty");
                  }}
                  className="group relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-primary/30 bg-card/40 backdrop-blur-md transition-all hover:scale-105 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
                >
                  <span className="font-display text-[10px] tracking-[0.3em] text-muted-foreground">
                    GRADE
                  </span>
                  <span className="font-display text-4xl font-bold text-foreground text-glow">
                    {g}
                  </span>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: 3 }).map((_, k) => (
                      <span
                        key={k}
                        className={`h-1.5 w-1.5 rounded-full ${
                          k < earned ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {phase === "difficulty" && grade && (
        <section className="relative z-20 mx-auto max-w-5xl px-6 pt-6 text-center animate-fade-in">
          <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
            GRADE {grade}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-[0.3em] text-foreground text-glow md:text-5xl">
            PICK YOUR MISSION
          </h1>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(Object.keys(difficultyMeta) as Difficulty[]).map((d) => {
              const meta = difficultyMeta[d];
              const earned = badges[`g${grade}-${d}`];
              return (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    setPhase("play");
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-card/40 p-6 text-left backdrop-blur-md transition-all hover:scale-[1.03] hover:border-primary"
                  style={{
                    boxShadow: `inset 0 0 60px hsl(${meta.color} / 0.15)`,
                  }}
                >
                  <div
                    className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-2xl"
                    style={{ background: `hsl(${meta.color})` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span
                      className="font-display text-xs tracking-[0.3em]"
                      style={{ color: `hsl(${meta.color})` }}
                    >
                      {meta.label}
                    </span>
                    {earned && (
                      <span className="rounded-full border border-primary/50 px-2 py-0.5 font-display text-[10px] tracking-widest text-primary">
                        ★ EARNED
                      </span>
                    )}
                  </div>
                  <h3 className="relative mt-3 font-display text-2xl font-bold text-foreground text-glow">
                    {meta.tagline}
                  </h3>
                  <p className="relative mt-2 font-body text-sm text-muted-foreground">
                    {d === "easy" && "Dodge through asteroid lanes — quick reactions, simple problems."}
                    {d === "medium" && "Mine the right crystal in the deep core — trickier mental math."}
                    {d === "hard" && "Defeat the math overlord in a turn-based duel — tough challenges."}
                  </p>
                  <div className="relative mt-6 flex items-center gap-2 font-display text-xs tracking-widest text-foreground">
                    <Rocket className="h-4 w-4" /> LAUNCH
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-10 inline-flex items-center gap-2 font-body text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Score 50% or higher to earn the badge.
          </p>
        </section>
      )}

      {phase === "play" && grade && difficulty && (
        <section className="absolute inset-0 z-20 pt-20">
          {difficultyMeta[difficulty].mode === "runner" && (
            <RunnerGame questions={questions} onFinish={handleGameFinish} />
          )}
          {difficultyMeta[difficulty].mode === "mining" && (
            <MiningGame questions={questions} onFinish={handleGameFinish} />
          )}
          {difficultyMeta[difficulty].mode === "boss" && (
            <BossGame questions={questions} onFinish={handleGameFinish} />
          )}
        </section>
      )}

      {phase === "reward" && grade && difficulty && (
        <BadgeReward
          grade={grade}
          difficulty={difficulty}
          score={score}
          total={questions.length}
          onContinue={() => setPhase("difficulty")}
          onReplay={() => setPhase("play")}
        />
      )}
    </div>
  );
};

export default MathPlanet;