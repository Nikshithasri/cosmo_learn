import { Mission, Position } from "@/data/codingMissions";
import { Bot, Target, Crosshair, AlertTriangle } from "lucide-react";

type SimulationViewProps = {
  mission: Mission;
  robotPos: Position;
  status: "idle" | "running" | "success" | "failure";
};

export default function SimulationView({ mission, robotPos, status }: SimulationViewProps) {
  const { width, height } = mission.gridSize;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden pointer-events-none">
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes reticle-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Windshield HUD - Top Status Bar */}
      <div className="absolute top-[6%] left-1/2 -translate-x-1/2 flex gap-12 text-cyan-400 font-mono text-xs tracking-widest z-10 pointer-events-none">
        <span className="flex flex-col items-center">
          <span className="text-cyan-600 text-[9px]">SHIELDS</span>
          <span className="text-cyan-200 text-sm drop-shadow-[0_0_8px_rgba(103,232,249,0.9)]">100%</span>
        </span>
        <span className="flex flex-col items-center">
          <span className="text-cyan-600 text-[9px]">SYSTEM</span>
          <span className="text-green-400 text-sm drop-shadow-[0_0_8px_rgba(74,222,128,0.9)]">ONLINE</span>
        </span>
        <span className="flex flex-col items-center">
          <span className="text-cyan-600 text-[9px]">HULL</span>
          <span className="text-cyan-200 text-sm drop-shadow-[0_0_8px_rgba(103,232,249,0.9)]">100%</span>
        </span>
      </div>

      {/* Left Side - Velocity */}
      <div className="absolute top-[28%] left-[8%] flex flex-col items-center gap-1 text-cyan-500/70 font-mono text-[10px] z-10 pointer-events-none">
        <span className="mb-1 text-cyan-300 text-[9px] tracking-widest">VEL</span>
        <div className="w-7 border-l border-cyan-500/30 pl-1.5 space-y-3">
          <span>200</span>
          <span>160</span>
          <span className="text-cyan-300 font-bold border-l-2 border-cyan-400 -ml-[1px] pl-1.5 bg-cyan-900/30 py-0.5 rounded-r-sm">120</span>
          <span>80</span>
          <span>0</span>
        </div>
      </div>

      {/* Right Side - Altitude */}
      <div className="absolute top-[28%] right-[8%] flex flex-col items-center gap-1 text-cyan-500/70 font-mono text-[10px] text-right z-10 pointer-events-none">
        <span className="mb-1 text-cyan-300 text-[9px] tracking-widest">ALT</span>
        <div className="w-7 border-r border-cyan-500/30 pr-1.5 space-y-3 flex flex-col items-end">
          <span>2.0</span>
          <span>1.8</span>
          <span>1.5</span>
          <span className="text-cyan-300 font-bold border-r-2 border-cyan-400 -mr-[1px] pr-1.5 bg-cyan-900/30 py-0.5 rounded-l-sm">1.3KM</span>
          <span>1.0</span>
        </div>
      </div>

      {/* Center Crosshair / Target Reticle */}
      <div className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none animate-[reticle-pulse_3s_ease-in-out_infinite]">
        <Crosshair className="h-20 w-20 text-cyan-400/40" strokeWidth={0.8} />
      </div>

      {/* Holographic Game Grid - Centered in Windshield */}
      <div className="relative z-20 pointer-events-auto flex flex-col items-center" style={{ marginTop: '-5%' }}>
        {/* Mission title */}
        <div className="mb-4 text-center bg-black/30 px-5 py-1.5 rounded-lg border border-cyan-500/20 backdrop-blur-sm">
          <h3 className="font-display text-base font-bold text-cyan-300 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
            {mission.title}
          </h3>
          <p className="font-mono text-[9px] text-cyan-200/60 mt-0.5 uppercase tracking-widest">{mission.description}</p>
        </div>

        {/* Grid */}
        <div
          className="relative bg-black/30 border border-cyan-500/30 rounded-md shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-[2px]"
          style={{
            width: `${width * 44}px`,
            height: `${height * 44}px`,
            backgroundSize: '44px 44px',
            backgroundImage: 'linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)',
            transform: 'perspective(1000px) rotateX(8deg)',
          }}
        >
          {/* Scanline effect */}
          <div className="absolute inset-0 overflow-hidden rounded-md pointer-events-none">
            <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-[scanline_4s_linear_infinite]" />
          </div>

          {/* Goal */}
          <div className="absolute flex items-center justify-center transition-all duration-300" style={{ width: '44px', height: '44px', left: `${mission.goal.x * 44}px`, top: `${mission.goal.y * 44}px` }}>
            <div className="absolute inset-2 rounded-full border-2 border-green-500/40 animate-[spin_3s_linear_infinite]" />
            <Target className="h-5 w-5 text-green-400 animate-pulse drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
          </div>

          {/* Obstacles */}
          {mission.obstacles.map((obs, i) => (
            <div key={i} className="absolute flex items-center justify-center" style={{ width: '44px', height: '44px', left: `${obs.x * 44}px`, top: `${obs.y * 44}px` }}>
              <div className="absolute inset-2 bg-red-500/10 rounded-sm animate-pulse" />
              <AlertTriangle className="h-5 w-5 text-red-500/80 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
            </div>
          ))}

          {/* Robot */}
          <div className="absolute flex items-center justify-center transition-all duration-500 z-10" style={{ width: '44px', height: '44px', left: `${robotPos.x * 44}px`, top: `${robotPos.y * 44}px` }}>
            <div className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-cyan-950/70 border border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.7)] backdrop-blur-sm ${status === 'running' ? 'animate-bounce border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,1)]' : ''} ${status === 'failure' ? 'bg-red-950/70 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : ''} ${status === 'success' ? 'bg-green-950/70 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]' : ''}`}>
              <Bot className={`h-4 w-4 ${status === 'failure' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-cyan-300 drop-shadow-[0_0_4px_rgba(103,232,249,0.8)]'}`} />
            </div>
          </div>
        </div>

        {/* Status overlays */}
        {status === 'failure' && (
          <div className="mt-4 px-6 py-2 bg-red-950/80 border border-red-500 text-red-400 rounded-full text-sm font-bold tracking-widest flex items-center gap-2 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <AlertTriangle className="h-4 w-4 animate-pulse" /> SYSTEM FAILURE
          </div>
        )}

        {status === 'success' && (
          <div className="mt-4 px-6 py-2 bg-green-950/80 border border-green-500 text-green-400 rounded-full text-sm font-bold tracking-widest flex items-center gap-2 backdrop-blur-md shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            <Target className="h-4 w-4 animate-pulse" /> MISSION ACCOMPLISHED
          </div>
        )}
      </div>
    </div>
  );
}
