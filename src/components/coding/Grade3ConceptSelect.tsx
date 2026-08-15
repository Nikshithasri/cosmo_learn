import agentIfElse from "@/assets/agent_ifelse.png";
import agentLoopsCode from "@/assets/agent_loops_code.png";
import agentDebugger from "@/assets/agent_debugger.png";
import agentAlgorithm from "@/assets/agent_algorithm.png";

type Concept = {
  id: string;
  name: string;
  title: string;
  perk: string;
  color: string;
  borderColor: string;
  glowClass: string;
  image: string;
};

type Grade3ConceptSelectProps = {
  onSelectConcept: (conceptId: string) => void;
};

const concepts: Concept[] = [
  {
    id: "if_else",
    name: "FORK",
    title: "If–Else Programming",
    perk: "Predict two outcomes",
    color: "text-rose-400",
    borderColor: "border-rose-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(244,63,94,0.5)]",
    image: agentIfElse,
  },
  {
    id: "loops_commands",
    name: "NEXUS",
    title: "Loops + Commands",
    perk: "Execute code sequences",
    color: "text-lime-400",
    borderColor: "border-lime-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(132,204,22,0.5)]",
    image: agentLoopsCode,
  },
  {
    id: "debugging",
    name: "TRACE",
    title: "Debugging Game",
    perk: "Spot hidden bugs",
    color: "text-amber-400",
    borderColor: "border-amber-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]",
    image: agentDebugger,
  },
  {
    id: "algorithm",
    name: "ARCH",
    title: "Algorithm Building",
    perk: "Design perfect plans",
    color: "text-violet-400",
    borderColor: "border-violet-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]",
    image: agentAlgorithm,
  },
];

export default function Grade3ConceptSelect({ onSelectConcept }: Grade3ConceptSelectProps) {
  return (
    <section className="relative z-20 mx-auto max-w-7xl px-6 pt-10 text-center animate-fade-in flex flex-col h-full justify-center">
      <div className="mb-10">
        <p className="font-display text-xs tracking-[0.4em] text-cyan-500 mb-2 uppercase">
          GRADE 3 - ELITE DIVISION
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] md:text-5xl uppercase">
          SELECT YOUR COMMANDER
        </h1>
        <p className="mt-4 font-body text-sm text-muted-foreground max-w-2xl mx-auto">
          Only the sharpest minds access this division. Choose your commander and unlock real coding power.
        </p>
      </div>

      <style>{`
        @keyframes card-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 rgba(255,255,255,0); }
          50% { box-shadow: 0 0 20px rgba(255,255,255,0.05); }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(255,255,255,0.1); }
          50% { border-color: rgba(255,255,255,0.25); }
        }
      `}</style>

      <div className="flex flex-wrap justify-center gap-6 w-full px-4">
        {concepts.map((concept, idx) => (
          <button
            key={concept.id}
            onClick={() => onSelectConcept(concept.id)}
            className={`group relative flex flex-col overflow-hidden rounded-xl border-2 ${concept.borderColor} bg-black/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] ${concept.glowClass} w-64 h-[400px] text-left cursor-pointer`}
            style={{
              animation: `card-float ${3 + idx * 0.5}s ease-in-out infinite, glow-pulse ${4 + idx * 0.3}s ease-in-out infinite`,
              animationDelay: `${idx * 0.15}s`,
            }}
          >
            {/* Tag at top left */}
            <div className={`absolute top-4 left-4 z-10 rounded-full border border-current px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${concept.color} bg-black/50 backdrop-blur-sm`}>
              {concept.title}
            </div>

            {/* Character Image */}
            <div className="absolute inset-0 z-0 h-3/4 w-full">
              <img
                src={concept.image}
                alt={concept.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            {/* Content at bottom */}
            <div className="relative z-10 mt-auto flex flex-col p-5 w-full bg-gradient-to-t from-black to-black/80 h-1/3 justify-end">
              <h3 className="font-display text-2xl font-bold tracking-wider text-white">
                {concept.name}
              </h3>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                {concept.title}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div className={`h-2 w-2 rounded-full bg-current ${concept.color} shadow-[0_0_8px_currentColor] animate-pulse`} />
                <span className="text-[10px] text-gray-400">{concept.perk}</span>
              </div>

              <div className="flex items-center justify-end w-full text-xs font-bold uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                DEPLOY &rarr;
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
