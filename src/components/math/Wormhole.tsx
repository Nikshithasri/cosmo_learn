import { useEffect } from "react";

interface WormholeProps {
  onComplete: () => void;
}

const streakAngles = [10, 40, 70, 110, 140, 170, 200, 240, 270, 300];

const Wormhole = ({ onComplete }: WormholeProps) => {
  useEffect(() => {
    const t = setTimeout(onComplete, 2600);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#02030a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(10,16,32,0.96),_rgba(1,2,8,1)_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(96,165,250,0.14),_transparent_28%)]" />

      {streakAngles.map((angle, idx) => (
        <span
          key={angle}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[1px] w-[160vmax] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 animate-streak"
          style={{
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            animationDelay: `${idx * 0.12}s`,
          }}
        />
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute h-[70vmax] w-[70vmax] rounded-full bg-sky-400/10 blur-3xl opacity-40" />
        <div className="absolute h-[46vmax] w-[46vmax] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.12),_rgba(59,130,246,0.05)_36%,_transparent_55%)] blur-2xl" />
        <div className="relative flex items-center justify-center rounded-full border border-sky-300/20 p-4 shadow-[0_0_160px_rgba(59,130,246,0.2)]">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.22),_transparent_36%)] opacity-90" />
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="relative flex h-[55vmax] w-[55vmax] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.4),_rgba(30,58,138,0.2)_40%,_transparent_75%)] shadow-[0_0_120px_rgba(37,99,235,0.2)] animate-wormhole-image" />
          <div className="pointer-events-none absolute inset-x-10 top-[18%] h-0.5 bg-white/20 blur-sm animate-wormhole-breeze" />
          <div className="pointer-events-none absolute inset-x-10 bottom-[18%] h-0.5 bg-white/20 blur-sm animate-wormhole-breeze" />
          <div className="pointer-events-none absolute inset-y-10 left-[18%] w-0.5 bg-white/20 blur-sm animate-wormhole-breeze" />
          <div className="pointer-events-none absolute inset-y-10 right-[18%] w-0.5 bg-white/20 blur-sm animate-wormhole-breeze" />
        </div>
      </div>

      <div className="absolute inset-0 flex items-end justify-center pb-24">
        <div className="h-40 w-40 rounded-full bg-white/12 blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-white animate-wormhole-flash" />
    </div>
  );
};

export default Wormhole;
