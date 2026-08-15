import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Terminal, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import spaceBg from "@/assets/space-bg.jpg";
import neptuneImg from "@/assets/neptune.png";
import MissionSelect from "@/components/coding/MissionSelect";
import Grade1ConceptSelect from "@/components/coding/Grade1ConceptSelect";
import Grade2ConceptSelect from "@/components/coding/Grade2ConceptSelect";
import Grade3ConceptSelect from "@/components/coding/Grade3ConceptSelect";
import Grade4ConceptSelect from "@/components/coding/Grade4ConceptSelect";
import Grade5ConceptSelect from "@/components/coding/Grade5ConceptSelect";
import Grade6ConceptSelect from "@/components/coding/Grade6ConceptSelect";
import GameScreen from "@/components/coding/GameScreen";
import WarpTransition from "@/components/coding/WarpTransition";
import ThinkingPatternsGame from "@/components/coding/games/ThinkingPatternsGame";
import { BasicSequencing, DirectionalLogic, MatchingSorting } from "@/components/coding/games/Grade1Games";
import CauseEffectGame from "@/components/coding/games/CauseEffectGame";
import RepetitionLoopsGame from "@/components/coding/games/RepetitionLoopsGame";
import PathOptimizationGame from "@/components/coding/games/PathOptimizationGame";
import GoalBasedMissionsGame from "@/components/coding/games/GoalBasedMissionsGame";
import IfElseGame from "@/components/coding/games/IfElseGame";
import NestedLoopsGame from "@/components/coding/games/NestedLoopsGame";
import DebuggingGame from "@/components/coding/games/DebuggingGame";
import AlgorithmGame from "@/components/coding/games/AlgorithmGame";
import EnergyManagerGame from "@/components/coding/games/EnergyManagerGame";
import PythonOutputGame from "@/components/coding/games/PythonOutputGame";
import PythonVariablesGame from "@/components/coding/games/PythonVariablesGame";
import PythonIfElseGame from "@/components/coding/games/PythonIfElseGame";
import PythonLoopsGame from "@/components/coding/games/PythonLoopsGame";
import { codingMissions, Mission } from "@/data/codingMissions";

type Phase = "grade" | "mission" | "warp" | "play_concept" | "play" | "reward";

export default function CodingPlanet() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("grade");
  const [grade, setGrade] = useState<number | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);

  // Persist completed missions locally
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("codingMissions") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("codingMissions", JSON.stringify(completedMissions));
  }, [completedMissions]);

  const handleMissionSuccess = () => {
    if (activeMission) {
      setCompletedMissions(prev => ({ ...prev, [activeMission.id]: true }));
    }
    setPhase("reward");
  };

  const getMissionsForGrade = (g: number) => {
    return codingMissions[g] || codingMissions[7]; // Fallback to hardest if missing
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-black text-cyan-50">
      {/* Background - Cyber Theme */}
      <div className="absolute inset-0 z-0">
        <img
          src={spaceBg}
          alt="Deep space cosmic background"
          className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen"
        />
        {/* Neon Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)',
            backgroundSize: '100px 100px',
            transform: 'perspective(1000px) rotateX(60deg) translateY(100px) scale(2)',
            transformOrigin: 'bottom',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      </div>

      {phase !== "play" && (
        <header className="relative z-30 flex items-center justify-between px-8 py-6 md:px-14">
          <Button
            variant="ghost"
            onClick={() => {
              if (phase === "reward") setPhase("mission");
              else if (phase === "mission") setPhase("grade");
              else navigate("/");
            }}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> ABORT
          </Button>
          <div className="flex items-center gap-3">
            <img src={neptuneImg} alt="Coding Planet" className="h-8 w-8 planet-glow" style={{ filter: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.8)) hue-rotate(-20deg)' }} />
            <span className="font-display text-sm tracking-[0.3em] text-cyan-400 text-glow flex items-center gap-2">
              <Terminal className="h-4 w-4" /> CODING_PLANET
            </span>
          </div>
        </header>
      )}

      {/* Grade Selection */}
      {phase === "grade" && (
        <section className="relative z-20 mx-auto max-w-5xl px-6 pt-6 text-center animate-fade-in flex flex-col h-[80vh] justify-center">
          <h1 className="font-display text-3xl font-bold tracking-[0.3em] text-cyan-300 text-glow md:text-5xl uppercase">
            Initialize Clearance Level
          </h1>
          <p className="mt-4 font-mono text-sm text-cyan-600/80 uppercase">
            {">"} Select your security grade to access the mainframe
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => {
              const g = i + 1;
              const missions = getMissionsForGrade(g);
              const completedCount = missions.filter(m => completedMissions[m.id]).length;
              
              return (
                <button
                  key={g}
                  onClick={() => {
                    setGrade(g);
                    setPhase("mission");
                  }}
                  className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border border-cyan-800 bg-black/60 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-cyan-400 hover:bg-cyan-950/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-600 group-hover:text-cyan-400 transition-colors">
                    LEVEL
                  </span>
                  <span className="font-display text-4xl font-bold text-cyan-100 mt-1 mb-3 text-glow">
                    {g}
                  </span>
                  
                  {/* Progress indicators */}
                  <div className="flex gap-1">
                    {missions.map((_, k) => (
                      <span
                        key={k}
                        className={`h-1.5 w-1.5 rounded-sm ${
                          k < completedCount ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-cyan-900"
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

      {/* Mission Selection */}
      {phase === "mission" && grade === 1 && (
        <Grade1ConceptSelect 
          onSelectConcept={(conceptId) => {
            setActiveConceptId(conceptId);
            setPhase("play_concept");
          }} 
        />
      )}
      {phase === "mission" && grade === 2 && (
        <Grade2ConceptSelect 
          onSelectConcept={(conceptId) => {
            setActiveConceptId(conceptId);
            setPhase("play_concept");
          }} 
        />
      )}
      {phase === "mission" && grade === 3 && (
        <Grade3ConceptSelect 
          onSelectConcept={(conceptId) => {
            setActiveConceptId(conceptId);
            setPhase("play_concept");
          }} 
        />
      )}
      {phase === "mission" && grade === 4 && (
        <Grade4ConceptSelect 
          onSelectConcept={(conceptId) => {
            setActiveConceptId(conceptId);
            setPhase("play_concept");
          }} 
        />
      )}
      {phase === "mission" && grade === 5 && (
        <Grade5ConceptSelect 
          onSelectConcept={(conceptId) => {
            setActiveConceptId(conceptId);
            setPhase("play_concept");
          }} 
        />
      )}
      {phase === "mission" && grade === 6 && (
        <Grade6ConceptSelect 
          onSelectConcept={(conceptId) => {
            setActiveConceptId(conceptId);
            setPhase("play_concept");
          }} 
        />
      )}
      {phase === "mission" && grade !== 1 && grade !== 2 && grade !== 3 && grade !== 4 && grade !== 5 && grade !== 6 && grade && (
        <MissionSelect 
          grade={grade} 
          missions={getMissionsForGrade(grade)} 
          completedMissions={completedMissions}
          onSelect={(mission) => {
            setActiveMission(mission);
            setPhase("warp");
          }} 
        />
      )}

      {/* Warp Transition */}
      {phase === "warp" && (
        <WarpTransition onComplete={() => {
          if (grade === 1 || grade === 2 || grade === 3) setPhase("play_concept");
          else setPhase("play");
        }} />
      )}

      {/* Specific Concept Games (Grade 1) */}
      {phase === "play_concept" && activeConceptId === "patterns" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><ThinkingPatternsGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "sequencing" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><BasicSequencing onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "directions" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><DirectionalLogic onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "sorting" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><MatchingSorting onBack={() => setPhase("mission")} /></div>
      )}

      {/* Grade 2 Concept Games */}
      {phase === "play_concept" && activeConceptId === "cause_effect" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><CauseEffectGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "loops" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><RepetitionLoopsGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "pathfinding" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><PathOptimizationGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "missions" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><GoalBasedMissionsGame onBack={() => setPhase("mission")} /></div>
      )}

      {/* Grade 3 Concept Games */}
      {phase === "play_concept" && activeConceptId === "if_else" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><IfElseGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "loops_commands" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><NestedLoopsGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "debugging" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><DebuggingGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "algorithm" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><AlgorithmGame onBack={() => setPhase("mission")} /></div>
      )}

      {/* Grade 4 Concept Games */}
      {phase === "play_concept" && activeConceptId === "variables" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><EnergyManagerGame onBack={() => setPhase("mission")} /></div>
      )}

      {/* Grade 6 Concept Games */}
      {phase === "play_concept" && activeConceptId === "python_output" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><PythonOutputGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "python_variables" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><PythonVariablesGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "python_ifelse" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><PythonIfElseGame onBack={() => setPhase("mission")} /></div>
      )}
      {phase === "play_concept" && activeConceptId === "python_loops" && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto"><PythonLoopsGame onBack={() => setPhase("mission")} /></div>
      )}

      {/* Game Screen */}
      {phase === "play" && grade && activeMission && (
        <div className="absolute inset-0 z-40 bg-black overflow-y-auto">
          <GameScreen 
            mission={activeMission} 
            grade={grade} 
            onBack={() => setPhase("mission")}
            onSuccess={handleMissionSuccess}
          />
        </div>
      )}

      {/* Reward Screen */}
      {phase === "reward" && activeMission && (
        <section className="relative z-50 flex h-screen w-full flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in zoom-in duration-500">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15),transparent_50%)] pointer-events-none" />
          
          <div className="text-center">
            <h2 className="font-display text-5xl font-bold tracking-widest text-green-400 text-glow animate-pulse">
              SYSTEM HACKED
            </h2>
            <p className="mt-4 font-mono text-cyan-500 uppercase tracking-widest">
              {">"} Mission "{activeMission.title}" Completed successfully.
            </p>
            <p className="mt-2 font-mono text-cyan-600/80 text-sm">
              Data extracted. Security bypass confirmed.
            </p>
          </div>

          <div className="mt-12 flex gap-6">
            <Button 
              variant="outline"
              onClick={() => setPhase("mission")}
              className="border-cyan-700 text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300"
            >
              RETURN TO NETWORK
            </Button>
            <Button 
              onClick={() => setPhase("play")}
              className="bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.6)]"
            >
              REPLAY MISSION
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
