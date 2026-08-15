import agentThinking from "@/assets/agent_thinking.png";
import agentSequencing from "@/assets/agent_sequencing.png";
import agentLogic from "@/assets/agent_logic.png";
import agentSorting from "@/assets/agent_sorting.png";

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

type Grade1ConceptSelectProps = {
  onSelectConcept: (conceptId: string) => void;
};

const concepts: Concept[] = [
  {
    id: "patterns",
    name: "CIPHER",
    title: "Thinking & Patterns",
    perk: "+3s on door locks",
    color: "text-blue-400",
    borderColor: "border-blue-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
    image: agentThinking,
  },
  {
    id: "sequencing",
    name: "NOVA",
    title: "Basic Sequencing",
    perk: "Lasers cool down faster",
    color: "text-purple-400",
    borderColor: "border-purple-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]",
    image: agentSequencing,
  },
  {
    id: "directions",
    name: "ROOK",
    title: "Directional Logic",
    perk: "Robots stunned 1 extra hit",
    color: "text-orange-500",
    borderColor: "border-orange-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]",
    image: agentLogic,
  },
  {
    id: "sorting",
    name: "ECHO",
    title: "Matching & Sorting",
    perk: "+10% crystal rewards",
    color: "text-green-400",
    borderColor: "border-green-500",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(74,222,128,0.5)]",
    image: agentSorting,
  },
];

export default function Grade1ConceptSelect({ onSelectConcept }: Grade1ConceptSelectProps) {
  return (
    <section className="relative z-20 mx-auto max-w-7xl px-6 pt-10 text-center animate-fade-in flex flex-col h-full justify-center">
      <div className="mb-10">
        <p className="font-display text-xs tracking-[0.4em] text-cyan-500 mb-2 uppercase">
          GRADE 1 - BRIEFING
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] md:text-5xl uppercase">
          SELECT YOUR AGENT
        </h1>
        <p className="mt-4 font-body text-sm text-muted-foreground max-w-2xl mx-auto">
          Each operative brings a unique edge to the mission. Choose wisely — the galaxy won't save itself.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 w-full px-4">
        {concepts.map((concept) => (
          <button
            key={concept.id}
            onClick={() => onSelectConcept(concept.id)}
            className={`group relative flex flex-col overflow-hidden rounded-xl border-2 ${concept.borderColor} bg-black/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] ${concept.glowClass} w-64 h-[400px] text-left cursor-pointer`}
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
