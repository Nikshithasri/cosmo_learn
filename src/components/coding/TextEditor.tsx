import { useState } from "react";
import { Play, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Action } from "./BlockEditor";

type TextEditorProps = {
  onRun: (actions: Action[]) => void;
  isRunning: boolean;
};

export default function TextEditor({ onRun, isRunning }: TextEditorProps) {
  const [code, setCode] = useState("agent.moveRight();\nagent.moveRight();");
  const [error, setError] = useState<string | null>(null);

  const handleRun = () => {
    try {
      setError(null);
      // Very basic parsing to simulate code execution
      const lines = code.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const actions: Action[] = [];
      
      for (const line of lines) {
        if (line.includes("agent.moveUp()")) actions.push("UP");
        else if (line.includes("agent.moveDown()")) actions.push("DOWN");
        else if (line.includes("agent.moveLeft()")) actions.push("LEFT");
        else if (line.includes("agent.moveRight()")) actions.push("RIGHT");
        else if (!line.startsWith("//")) {
          throw new Error(`Syntax Error: Unknown command '${line}'`);
        }
      }
      onRun(actions);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-background/80 border-l border-cyan-900 p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-cyan-400 text-glow flex items-center gap-2">
            <Code2 className="h-6 w-6" /> TERMINAL
          </h2>
          <p className="text-xs text-muted-foreground">Write JavaScript-like commands</p>
        </div>
        <Button 
          onClick={handleRun} 
          disabled={isRunning || code.trim() === ""}
          className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]"
        >
          <Play className="mr-2 h-4 w-4" /> COMPILE & RUN
        </Button>
      </div>

      <div className="mb-4 space-y-1 text-xs font-mono text-cyan-700">
        <p>// Available Commands:</p>
        <p>// agent.moveUp();</p>
        <p>// agent.moveDown();</p>
        <p>// agent.moveLeft();</p>
        <p>// agent.moveRight();</p>
      </div>

      <div className="relative flex-1 rounded-xl border border-cyan-800 bg-black/60 p-4 shadow-inner group">
        {/* Line numbers mock */}
        <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-cyan-900 bg-cyan-950/20 py-4 flex flex-col text-right pr-2 text-xs font-mono text-cyan-800 select-none">
          {code.split("\n").map((_, i) => <span key={i}>{i + 1}</span>)}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isRunning}
          spellCheck={false}
          className="h-full w-full bg-transparent pl-8 font-mono text-sm text-cyan-300 outline-none resize-none placeholder:text-cyan-900/50"
          placeholder="// Enter your code here..."
        />
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-950/50 border border-red-900 p-3 text-xs font-mono text-red-400">
          {">"} {error}
        </div>
      )}
    </div>
  );
}
