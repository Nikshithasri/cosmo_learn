import { useState, useEffect } from "react";
import { Mission, Position } from "@/data/codingMissions";
import SimulationView from "./SimulationView";
import BlockEditor, { Action } from "./BlockEditor";
import LogicEditor, { LogicBlock } from "./LogicEditor";
import TextEditor from "./TextEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import cockpitViewBg from "@/assets/cockpit-view.png";

type GameScreenProps = {
  mission: Mission;
  grade: number;
  onBack: () => void;
  onSuccess: () => void;
};

export default function GameScreen({ mission, grade, onBack, onSuccess }: GameScreenProps) {
  const [robotPos, setRobotPos] = useState<Position>(mission.start);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "failure">("idle");
  const [sequenceQueue, setSequenceQueue] = useState<Action[]>([]);

  // Reset when mission changes
  useEffect(() => {
    setRobotPos(mission.start);
    setStatus("idle");
    setSequenceQueue([]);
  }, [mission]);

  // Execute queue step by step
  useEffect(() => {
    if (status === "running" && sequenceQueue.length > 0) {
      const timer = setTimeout(() => {
        const nextAction = sequenceQueue[0];
        setSequenceQueue(prev => prev.slice(1));
        
        setRobotPos(prev => {
          const newPos = { ...prev };
          if (nextAction === "UP") newPos.y -= 1;
          if (nextAction === "DOWN") newPos.y += 1;
          if (nextAction === "LEFT") newPos.x -= 1;
          if (nextAction === "RIGHT") newPos.x += 1;

          // Check bounds
          if (newPos.x < 0 || newPos.x >= mission.gridSize.width || 
              newPos.y < 0 || newPos.y >= mission.gridSize.height) {
            setStatus("failure");
            return prev;
          }

          // Check obstacles
          const hitObstacle = mission.obstacles.some(obs => obs.x === newPos.x && obs.y === newPos.y);
          if (hitObstacle) {
            setStatus("failure");
            return newPos; // Show it hitting the obstacle
          }

          return newPos;
        });
      }, 500);
      return () => clearTimeout(timer);
    } else if (status === "running" && sequenceQueue.length === 0) {
      // Check win condition
      if (robotPos.x === mission.goal.x && robotPos.y === mission.goal.y) {
        setStatus("success");
        setTimeout(() => onSuccess(), 2000);
      } else {
        setStatus("failure");
      }
    }
  }, [status, sequenceQueue, robotPos, mission, onSuccess]);

  const handleRun = (actions: Action[]) => {
    setRobotPos(mission.start); // Reset to start
    setSequenceQueue(actions);
    setStatus("running");
  };

  const handleLogicRun = (blocks: LogicBlock[]) => {
    const unroll = (list: LogicBlock[]): Action[] => {
      const res: Action[] = [];
      for (const b of list) {
        if (b.type === "ACTION" && b.action) res.push(b.action);
        if (b.type === "REPEAT") {
          const children = unroll(b.children || []);
          for (let i = 0; i < (b.count || 3); i++) {
            res.push(...children);
          }
        }
        if (b.type === "IF_CLEAR") {
          res.push(...unroll(b.children || []));
        }
      }
      return res;
    };
    handleRun(unroll(blocks));
  };

  const isTextEditor = grade >= 7;
  const isLogicEditor = grade >= 4 && grade < 7;

  return (
    <div className="relative flex h-full w-full flex-col md:flex-row overflow-hidden bg-black text-cyan-50">
      {/* Background - Cockpit View */}
      <div className="absolute inset-0 z-0">
        <img src={cockpitViewBg} alt="Cockpit View" className="h-full w-full object-cover" />
      </div>

      <div className="absolute top-6 left-6 z-50">
        <Button variant="ghost" onClick={onBack} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/50 backdrop-blur-md border border-cyan-800/50">
          <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
        </Button>
      </div>

      <div className="flex-1 relative z-10 pointer-events-none">
        <div className="pointer-events-auto w-full h-full">
          <SimulationView 
            mission={mission} 
            robotPos={robotPos} 
            status={status} 
          />
          {status === 'failure' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
               <Button 
                  onClick={() => { setStatus("idle"); setRobotPos(mission.start); }}
                  className="bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] font-display tracking-wider"
                >
                 RETRY MISSION
               </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-20 w-full md:w-[400px] lg:w-[450px] bg-black/60 backdrop-blur-xl border-l border-cyan-500/30 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col">
        {isTextEditor ? (
          <TextEditor onRun={handleRun} isRunning={status === "running"} />
        ) : isLogicEditor ? (
          <LogicEditor onRun={handleLogicRun} isRunning={status === "running"} />
        ) : (
          <BlockEditor onRun={handleRun} isRunning={status === "running"} />
        )}
      </div>
    </div>
  );
}
