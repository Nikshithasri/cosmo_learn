import { useState } from "react";
import { Play, ArrowUp, ArrowRight, ArrowDown, ArrowLeft, Trash2, Repeat, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Action } from "./BlockEditor";

export type LogicBlockType = "ACTION" | "REPEAT" | "IF_CLEAR";

export type LogicBlock = {
  id: string;
  type: LogicBlockType;
  action?: Action;
  count?: number; // for REPEAT
  children?: LogicBlock[]; // for REPEAT or IF_CLEAR
  elseChildren?: LogicBlock[]; // for IF_CLEAR
};

type LogicEditorProps = {
  onRun: (blocks: LogicBlock[]) => void;
  isRunning: boolean;
};

export default function LogicEditor({ onRun, isRunning }: LogicEditorProps) {
  const [blocks, setBlocks] = useState<LogicBlock[]>([]);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addBlock = (type: LogicBlockType, action?: Action) => {
    if (isRunning) return;

    const newBlock: LogicBlock = {
      id: generateId(),
      type,
      action,
      count: type === "REPEAT" ? 3 : undefined,
      children: type === "REPEAT" || type === "IF_CLEAR" ? [] : undefined,
      elseChildren: type === "IF_CLEAR" ? [] : undefined,
    };

    if (activeParentId) {
      setBlocks(prev => {
        const updateChildren = (list: LogicBlock[]): LogicBlock[] => {
          return list.map(b => {
            if (b.id === activeParentId && b.children) {
              return { ...b, children: [...b.children, newBlock] };
            }
            if (b.children) {
              return { ...b, children: updateChildren(b.children) };
            }
            return b;
          });
        };
        return updateChildren(prev);
      });
    } else {
      setBlocks(prev => [...prev, newBlock]);
    }
  };

  const removeBlock = (id: string) => {
    if (isRunning) return;
    setBlocks(prev => {
      const filterChildren = (list: LogicBlock[]): LogicBlock[] => {
        return list.filter(b => b.id !== id).map(b => {
          if (b.children) {
            return { ...b, children: filterChildren(b.children) };
          }
          return b;
        });
      };
      return filterChildren(prev);
    });
    if (activeParentId === id) setActiveParentId(null);
  };

  const clearBlocks = () => {
    if (!isRunning) {
      setBlocks([]);
      setActiveParentId(null);
    }
  };

  const renderBlock = (block: LogicBlock, depth = 0) => {
    return (
      <div key={block.id} className={`relative rounded-md border p-3 my-2 ${activeParentId === block.id ? 'border-yellow-400 bg-yellow-900/20' : 'border-cyan-700 bg-cyan-950/40'} transition-all`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {block.type === "ACTION" && block.action === "UP" && <><ArrowUp className="h-4 w-4 text-cyan-400" /> MOVE UP</>}
            {block.type === "ACTION" && block.action === "DOWN" && <><ArrowDown className="h-4 w-4 text-cyan-400" /> MOVE DOWN</>}
            {block.type === "ACTION" && block.action === "LEFT" && <><ArrowLeft className="h-4 w-4 text-cyan-400" /> MOVE LEFT</>}
            {block.type === "ACTION" && block.action === "RIGHT" && <><ArrowRight className="h-4 w-4 text-cyan-400" /> MOVE RIGHT</>}
            
            {block.type === "REPEAT" && (
              <div className="flex items-center gap-2 text-yellow-400">
                <Repeat className="h-4 w-4" /> REPEAT {block.count} TIMES
              </div>
            )}

            {block.type === "IF_CLEAR" && (
              <div className="flex items-center gap-2 text-purple-400">
                <HelpCircle className="h-4 w-4" /> IF PATH CLEAR
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {(block.type === "REPEAT" || block.type === "IF_CLEAR") && !isRunning && (
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveParentId(activeParentId === block.id ? null : block.id); }} 
                className={`text-xs px-2 py-1 rounded ${activeParentId === block.id ? 'bg-yellow-600 text-white' : 'bg-cyan-800 text-cyan-200'} hover:bg-cyan-700`}
              >
                {activeParentId === block.id ? 'DONE' : 'ADD INSIDE'}
              </button>
            )}
            {!isRunning && (
              <button onClick={() => removeBlock(block.id)} className="text-cyan-800 hover:text-red-400 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Render nested children */}
        {block.children && (
          <div className="mt-2 ml-4 pl-4 border-l-2 border-cyan-800/50 min-h-[40px]">
            {block.children.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Empty block. Add commands here.</span>
            ) : (
              block.children.map(child => renderBlock(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-background/80 border-l border-cyan-900 p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-yellow-400 text-glow">LOGIC SEQUENCE</h2>
          <p className="text-xs text-muted-foreground">Build loops and conditions</p>
        </div>
        <Button 
          onClick={() => onRun(blocks)} 
          disabled={isRunning || blocks.length === 0}
          className="bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]"
        >
          <Play className="mr-2 h-4 w-4" /> EXECUTE LOGIC
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        <Button onClick={() => addBlock("ACTION", "UP")} disabled={isRunning} variant="outline" className="flex-col h-14 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowUp className="mb-1 h-4 w-4 text-cyan-400" /> <span className="text-[9px]">UP</span>
        </Button>
        <Button onClick={() => addBlock("ACTION", "DOWN")} disabled={isRunning} variant="outline" className="flex-col h-14 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowDown className="mb-1 h-4 w-4 text-cyan-400" /> <span className="text-[9px]">DOWN</span>
        </Button>
        <Button onClick={() => addBlock("ACTION", "LEFT")} disabled={isRunning} variant="outline" className="flex-col h-14 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowLeft className="mb-1 h-4 w-4 text-cyan-400" /> <span className="text-[9px]">LEFT</span>
        </Button>
        <Button onClick={() => addBlock("ACTION", "RIGHT")} disabled={isRunning} variant="outline" className="flex-col h-14 border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/30">
          <ArrowRight className="mb-1 h-4 w-4 text-cyan-400" /> <span className="text-[9px]">RIGHT</span>
        </Button>
      </div>
      
      <div className="mb-6 grid grid-cols-2 gap-2">
        <Button onClick={() => addBlock("REPEAT")} disabled={isRunning} variant="outline" className="border-yellow-800 text-yellow-400 hover:border-yellow-400 hover:bg-yellow-900/30">
          <Repeat className="mr-2 h-4 w-4" /> REPEAT BLOCK
        </Button>
        <Button onClick={() => addBlock("IF_CLEAR")} disabled={isRunning} variant="outline" className="border-purple-800 text-purple-400 hover:border-purple-400 hover:bg-purple-900/30">
          <HelpCircle className="mr-2 h-4 w-4" /> IF CONDITION
        </Button>
      </div>

      <div className="flex-1 rounded-xl border border-cyan-800 bg-black/40 p-4 overflow-y-auto shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-yellow-600 font-display tracking-widest">LOGIC MEMORY</span>
          <Button variant="ghost" size="sm" onClick={clearBlocks} disabled={isRunning || blocks.length === 0} className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>

        {blocks.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-cyan-900 rounded-lg">
            Logic Empty - Add blocks above
          </div>
        ) : (
          <div className="space-y-2 pb-10">
            {blocks.map(block => renderBlock(block))}
          </div>
        )}
      </div>
    </div>
  );
}
