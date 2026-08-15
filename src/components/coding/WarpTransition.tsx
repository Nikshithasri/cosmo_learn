import { useEffect, useState } from "react";

type WarpTransitionProps = {
  onComplete: () => void;
};

export default function WarpTransition({ onComplete }: WarpTransitionProps) {
  const [warpActive, setWarpActive] = useState(false);

  useEffect(() => {
    // Basic browser audio API synthesis for Engine and Warp sounds since we don't have local files
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Engine sound (low hum ramping up)
    const engineOsc = audioCtx.createOscillator();
    const engineGain = audioCtx.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.setValueAtTime(50, audioCtx.currentTime);
    engineOsc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 2);
    engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
    engineGain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 1);
    
    engineOsc.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();

    // Start warp visual and sound at 2 seconds
    const warpTimer = setTimeout(() => {
      setWarpActive(true);
      
      // Warp whoosh sound
      const noise = audioCtx.createBufferSource();
      const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(100, audioCtx.currentTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(5000, audioCtx.currentTime + 1);
      
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0, audioCtx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start();

      // Stop engine hum
      engineGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
      setTimeout(() => engineOsc.stop(), 1000);
      
    }, 2000);

    // End transition at 5 seconds
    const endTimer = setTimeout(() => {
      audioCtx.close();
      onComplete();
    }, 5000);

    return () => {
      clearTimeout(warpTimer);
      clearTimeout(endTimer);
      if (audioCtx.state !== 'closed') audioCtx.close();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-center justify-center">
      {/* Moving Stars Background */}
      <div className={`absolute inset-0 transition-transform duration-3000 ${warpActive ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}>
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              opacity: Math.random(),
              animation: `moveStar ${Math.random() * 3 + 2}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Warp Speed Lines */}
      {warpActive && (
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 animate-warp">
            {Array.from({ length: 50 }).map((_, i) => {
              const angle = Math.random() * 360;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 h-0.5 bg-cyan-400 origin-left"
                  style={{
                    width: `${Math.random() * 200 + 100}px`,
                    transform: `rotate(${angle}deg) translateX(${Math.random() * 100 + 50}px)`,
                    boxShadow: '0 0 10px #22d3ee',
                    animation: `shoot 0.5s ease-in infinite ${Math.random() * 0.5}s`,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Cockpit Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
        <div className="h-32 bg-gradient-to-b from-black/90 to-transparent w-full flex items-start justify-between px-10 pt-4">
          <div className="text-cyan-500 font-mono text-xs animate-pulse">SYS.READY</div>
          <div className="text-red-500 font-mono text-xs animate-pulse">WARP.ENGAGE</div>
        </div>
        
        {/* Cockpit Frame elements */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-900 to-transparent border-r border-gray-700/50" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-900 to-transparent border-l border-gray-700/50" />
        
        <div className="h-48 bg-gradient-to-t from-gray-900 to-transparent w-full border-t border-gray-700/50 relative">
          {/* Dashboard lights */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
            <div className={`h-4 w-12 rounded bg-cyan-500/20 border border-cyan-500 ${warpActive ? 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]' : ''} transition-all duration-300`} />
            <div className={`h-4 w-12 rounded bg-cyan-500/20 border border-cyan-500 ${warpActive ? 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]' : ''} transition-all duration-300 delay-100`} />
            <div className={`h-4 w-12 rounded bg-cyan-500/20 border border-cyan-500 ${warpActive ? 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]' : ''} transition-all duration-300 delay-200`} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes moveStar {
          from { transform: translateZ(0) scale(1); opacity: 0; }
          50% { opacity: 1; }
          to { transform: translateZ(200px) scale(2); opacity: 0; }
        }
        @keyframes shoot {
          0% { transform: rotate(var(--angle)) translateX(100px) scaleX(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: rotate(var(--angle)) translateX(1000px) scaleX(5); opacity: 0; }
        }
        .animate-warp {
          animation: warpScale 3s ease-in forwards;
        }
        @keyframes warpScale {
          0% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(5); }
        }
      `}</style>
    </div>
  );
}
