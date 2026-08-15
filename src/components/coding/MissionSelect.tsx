import { Mission } from "@/data/codingMissions";
import { Server, Lock } from "lucide-react";

type MissionSelectProps = {
  grade: number;
  missions: Mission[];
  completedMissions: Record<string, boolean>;
  onSelect: (mission: Mission) => void;
};

export default function MissionSelect({ grade, missions, completedMissions, onSelect }: MissionSelectProps) {
  return (
    <section className="relative z-20 mx-auto max-w-5xl px-6 pt-6 text-center animate-fade-in h-full flex flex-col items-center justify-center">
      <p className="font-display text-xs tracking-[0.4em] text-cyan-500">
        CLEARANCE: GRADE {grade}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-[0.3em] text-cyan-300 text-glow md:text-5xl">
        SELECT TARGET SERVER
      </h1>

      <div className="mt-16 grid gap-8 md:grid-cols-3 w-full">
        {missions.map((mission, i) => {
          const isCompleted = completedMissions[mission.id];
          // Simple mock: require previous mission to be completed if it's not the first one.
          // For a real app, logic would be more robust. Let's keep them all unlocked for demonstration.
          const isLocked = false; 

          return (
            <button
              key={mission.id}
              onClick={() => !isLocked && onSelect(mission)}
              disabled={isLocked}
              className={`group relative overflow-hidden rounded-xl border p-6 text-left backdrop-blur-md transition-all duration-300
                ${isLocked 
                  ? "border-slate-800 bg-slate-900/50 cursor-not-allowed opacity-60" 
                  : "border-cyan-500/30 bg-black/60 hover:scale-[1.03] hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                }
              `}
            >
              <div
                className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl transition-all duration-500 group-hover:opacity-60
                  ${isCompleted ? "bg-green-500" : isLocked ? "bg-slate-700" : "bg-cyan-500"}
                `}
              />
              <div className="relative flex items-center justify-between">
                <span className={`font-display text-xs tracking-[0.3em] ${isLocked ? 'text-slate-500' : 'text-cyan-500'}`}>
                  NODE {i + 1}
                </span>
                {isCompleted && (
                  <span className="rounded-full border border-green-500/50 px-2 py-0.5 font-display text-[10px] tracking-widest text-green-400">
                    ★ HACKED
                  </span>
                )}
                {isLocked && (
                  <Lock className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <h3 className={`relative mt-3 font-display text-xl font-bold ${isLocked ? 'text-slate-400' : 'text-cyan-100'}`}>
                {mission.title}
              </h3>
              <p className="relative mt-2 font-body text-sm text-muted-foreground line-clamp-2">
                {mission.description}
              </p>
              
              <div className="relative mt-6 flex items-center gap-2 font-display text-xs tracking-widest text-cyan-300">
                {!isLocked && (
                  <>
                    <Server className="h-4 w-4" /> CONNECT
                  </>
                )}
              </div>
              
              {/* Decorative cyber elements */}
              {!isLocked && (
                <>
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-cyan-400 transition-all duration-500 group-hover:w-full" />
                  <div className="absolute top-2 left-2 h-1 w-1 bg-cyan-500 rounded-full" />
                  <div className="absolute top-2 left-4 h-1 w-1 bg-cyan-500/50 rounded-full" />
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
