export type Difficulty = "easy" | "medium" | "hard";

export interface MathQuestion {
  question: string;
  options: number[];
  answer: number; // index into options
}

// Procedurally generate sample questions per grade & difficulty.
// Real data will come from the backend via Postman later.
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildQ = (correct: number, q: string): MathQuestion => {
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const delta = Math.max(1, Math.round(correct * 0.2)) + Math.floor(Math.random() * 5);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const d = correct + sign * delta;
    if (d !== correct && d >= 0) distractors.add(d);
  }
  const opts = shuffle([correct, ...Array.from(distractors)]);
  return { question: q, options: opts, answer: opts.indexOf(correct) };
};

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateQuestions = (
  grade: number,
  difficulty: Difficulty,
  count = 8,
): MathQuestion[] => {
  const out: MathQuestion[] = [];
  const range = (() => {
    const base = grade * (difficulty === "easy" ? 4 : difficulty === "medium" ? 10 : 25);
    return Math.max(5, base);
  })();

  for (let i = 0; i < count; i++) {
    const opType = (() => {
      if (grade <= 2) return ["+", "-"][rand(0, 1)];
      if (grade <= 4) return ["+", "-", "×"][rand(0, 2)];
      if (grade <= 6) return ["+", "-", "×", "÷"][rand(0, 3)];
      return ["×", "÷", "+", "-", "²"][rand(0, 4)];
    })();

    let a = rand(1, range);
    let b = rand(1, Math.max(2, Math.floor(range / 2)));
    let correct = 0;
    let q = "";

    switch (opType) {
      case "+":
        correct = a + b;
        q = `${a} + ${b} = ?`;
        break;
      case "-":
        if (b > a) [a, b] = [b, a];
        correct = a - b;
        q = `${a} − ${b} = ?`;
        break;
      case "×":
        correct = a * b;
        q = `${a} × ${b} = ?`;
        break;
      case "÷":
        correct = a;
        q = `${a * b} ÷ ${b} = ?`;
        break;
      case "²":
        correct = a * a;
        q = `${a}² = ?`;
        break;
    }
    out.push(buildQ(correct, q));
  }
  return out;
};

export const difficultyMeta: Record<Difficulty, { label: string; tagline: string; color: string; mode: "runner" | "mining" | "boss" }> = {
  easy: { label: "EASY", tagline: "Space Runner", color: "var(--planet-coding)", mode: "runner" },
  medium: { label: "MEDIUM", tagline: "Crystal Mining", color: "var(--planet-knowledge)", mode: "mining" },
  hard: { label: "HARD", tagline: "Boss Battle", color: "var(--planet-science)", mode: "boss" },
};