import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BasicSequencingGame from "./BasicSequencingGame";
import DirectionalLogicGame from "./DirectionalLogicGame";
import MatchingSortingGame from "./MatchingSortingGame";

type GameProps = { onBack: () => void };

export function ThinkingPatterns({ onBack }: GameProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-blue-950 text-white p-6">
      <Button variant="outline" onClick={onBack} className="absolute top-6 left-6 border-blue-500 text-blue-300">
        <ArrowLeft className="mr-2 h-4 w-4" /> ABORT MISSION
      </Button>
      <h1 className="text-4xl font-display font-bold text-blue-400 mb-4 drop-shadow-lg">Thinking & Patterns</h1>
      <p className="text-lg text-blue-200">Find the missing shape in the sequence!</p>
      <div className="mt-10 flex gap-4">
        {/* Placeholder game UI */}
        <div className="h-24 w-24 bg-blue-500 rounded-full animate-bounce" />
        <div className="h-24 w-24 bg-blue-500 rounded-none animate-bounce delay-100" />
        <div className="h-24 w-24 bg-blue-500 rounded-full animate-bounce delay-200" />
        <div className="h-24 w-24 border-4 border-dashed border-blue-500 rounded flex items-center justify-center text-blue-500 text-4xl">?</div>
      </div>
    </div>
  );
}

export const BasicSequencing = BasicSequencingGame;

export const DirectionalLogic = DirectionalLogicGame;

export const MatchingSorting = MatchingSortingGame;
