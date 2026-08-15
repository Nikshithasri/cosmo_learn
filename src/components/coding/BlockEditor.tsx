import { useState } from "react";
import { Play, ArrowUp, ArrowRight, ArrowDown, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Action = "UP" | "DOWN" | "LEFT" | "RIGHT";

type BlockEditorProps = {
  onRun: (actions: Action[]) => void;
  isRunning: boolean;
};

export default function BlockEditor({ onRun, isRunning }: BlockEditorProps) {
  const [sequence, setSequence] = useState<Action[]>([]);

  const addAction = (action: Action) => {
    if (!isRunning) {
      setSequence([...sequence, action]);
    }
  };

  const removeAction = (index: number) => {
    if (!isRunning) {
      const newSeq = [...sequence];
      newSeq.splice(index, 1);
      setSequence(newSeq);
    }
  };

  const clearSequence = () => {
    if (!isRunning) setSequence([]);
  };

  return (
    <div className="flex h-full flex-col bg-background/80 border-l border-cyan-900 p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-cyan-400 text-glow">COMMAND SEQUENCE</h2>
          <p className="text-xs text-muted-foreground">Click blocks to build your logic path</p>
        </div>
        <Button 
          onClick={() => onRun(sequence)} 
          disabled={isRunning || sequence.length === 0}
          className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]"
        >
          <Play className="mr-2 h-4 w-4" /> EXECUTE
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2">
        <Button onClick={() => addAction("UP")} disabled={isRunning} variant="outline" className="flex-col h-16 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowUp className="mb-1 h-5 w-5 text-cyan-400" /> <span className="text-[10px]">UP</span>
        </Button>
        <Button onClick={() => addAction("DOWN")} disabled={isRunning} variant="outline" className="flex-col h-16 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowDown className="mb-1 h-5 w-5 text-cyan-400" /> <span className="text-[10px]">DOWN</span>
        </Button>
        <Button onClick={() => addAction("LEFT")} disabled={isRunning} variant="outline" className="flex-col h-16 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowLeft className="mb-1 h-5 w-5 text-cyan-400" /> <span className="text-[10px]">LEFT</span>
        </Button>
        <Button onClick={() => addAction("RIGHT")} disabled={isRunning} variant="outline" className="flex-col h-16 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowRight className="mb-1 h-5 w-5 text-cyan-400" /> <span className="text-[10px]">RIGHT</span>
        </Button>
      </div>

      <div className="flex-1 rounded-xl border border-cyan-800 bg-black/40 p-4 overflow-y-auto shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-cyan-600 font-display tracking-widest">SEQUENCE MEMORY</span>
          <Button variant="ghost" size="sm" onClick={clearSequence} disabled={isRunning || sequence.length === 0} className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>

        {sequence.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-cyan-900 rounded-lg">
            Memory Empty - Add commands
          </div>
        ) : (
          <div className="space-y-2">
            {sequence.map((action, i) => (
              <div key={i} className="group relative flex items-center justify-between rounded-md border border-cyan-700 bg-cyan-950/40 px-4 py-2 transition-all hover:border-cyan-400">
                <div className="flex items-center gap-3 text-sm text-cyan-100">
                  <span className="font-display text-cyan-600 w-4">{i + 1}.</span>
                  {action === "UP" && <><ArrowUp className="h-4 w-4 text-cyan-400" /> MOVE UP</>}
                  {action === "DOWN" && <><ArrowDown className="h-4 w-4 text-cyan-400" /> MOVE DOWN</>}
                  {action === "LEFT" && <><ArrowLeft className="h-4 w-4 text-cyan-400" /> MOVE LEFT</>}
                  {action === "RIGHT" && <><ArrowRight className="h-4 w-4 text-cyan-400" /> MOVE RIGHT</>}
                </div>
                {!isRunning && (
                  <button onClick={() => removeAction(i)} className="text-cyan-800 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
