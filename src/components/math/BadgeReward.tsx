import { Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BadgeRewardProps {
  grade: number;
  difficulty: string;
  score: number;
  total: number;
  onContinue: () => void;
  onReplay: () => void;
}

const tiers = [
  { min: 1.0, name: "Cosmic Master", color: "var(--planet-knowledge)" },
  { min: 0.75, name: "Stellar Scholar", color: "var(--planet-math)" },
  { min: 0.5, name: "Orbit Cadet", color: "var(--planet-coding)" },
  { min: 0, name: "Rookie Astronaut", color: "var(--planet-english)" },
];

const BadgeReward = ({ grade, difficulty, score, total, onContinue, onReplay }: BadgeRewardProps) => {
  const ratio = score / total;
  const tier = tiers.find((t) => ratio >= t.min)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-6 rounded-2xl border border-primary/40 bg-card/90 p-10 text-center shadow-[0_0_60px_hsl(var(--primary)/0.4)]">
        <Sparkles className="absolute -left-4 -top-4 h-8 w-8 text-primary animate-twinkle" />
        <Sparkles className="absolute -right-4 -top-2 h-6 w-6 text-primary animate-twinkle" style={{ animationDelay: "0.4s" }} />

        <div
          className="flex h-32 w-32 items-center justify-center rounded-full animate-badge-pop"
          style={{
            background: `radial-gradient(circle at 30% 30%, hsl(${tier.color}), hsl(${tier.color} / 0.3))`,
            boxShadow: `0 0 40px hsl(${tier.color} / 0.8), inset 0 0 20px hsl(${tier.color} / 0.5)`,
          }}
        >
          <Award className="h-16 w-16 text-foreground" strokeWidth={1.5} />
        </div>

        <div>
          <p className="font-display text-xs tracking-[0.3em] text-muted-foreground">BADGE EARNED</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-widest text-foreground text-glow">
            {tier.name}
          </h2>
          <p className="mt-3 font-body text-sm text-muted-foreground">
            Grade {grade} · {difficulty.toUpperCase()} · {score}/{total}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onReplay}>Play Again</Button>
          <Button onClick={onContinue}>Choose Level</Button>
        </div>
      </div>
    </div>
  );
};

export default BadgeReward;