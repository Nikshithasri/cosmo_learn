import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, FlaskConical, Sigma, BookOpen, Code2, Brain } from "lucide-react";
import CosmosLogo from "@/components/CosmosLogo";
import spaceBg from "@/assets/space-bg.jpg";
import sunImg from "@/assets/sun.png";
import earthImg from "@/assets/earth.png";
import marsImg from "@/assets/mars.png";
import saturnImg from "@/assets/saturn.png";
import neptuneImg from "@/assets/neptune.png";
import venusImg from "@/assets/venus.png";

type PlanetCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorVar: string;
  align?: "left" | "right";
};

const PlanetLabel = ({ title, description, icon, colorVar, align = "left" }: PlanetCardProps) => (
  <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start text-left"} max-w-[200px] pointer-events-none`}>
    <div className="flex items-center gap-2">
      <span style={{ color: `hsl(${colorVar})` }} className="flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      <h3 className="font-display text-sm font-bold tracking-[0.2em] text-foreground text-glow">
        {title}
      </h3>
    </div>
    <p className="mt-1.5 font-body text-[13px] leading-snug text-muted-foreground">
      {description}
    </p>
    <span
      className="mt-2 inline-block h-2.5 w-2.5 rounded-full"
      style={{
        background: `hsl(${colorVar})`,
        boxShadow: `0 0 10px hsl(${colorVar} / 0.9)`,
      }}
    />
  </div>
);

const Starfield = () => {
  const stars = Array.from({ length: 8 }).map((_, i) => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 3,
  }));
  return (
    <div className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

const ShootingStars = () => {
  const [stars, setStars] = useState<{ id: number; top: number; left: number; delay: number }[]>([]);
  useEffect(() => {
    let id = 0;
    const spawn = () => {
      const star = {
        id: id++,
        top: Math.random() * 40,
        left: 50 + Math.random() * 50,
        delay: 0,
      };
      setStars((s) => [...s, star]);
      setTimeout(() => setStars((s) => s.filter((x) => x.id !== star.id)), 2400);
    };
    const interval = setInterval(spawn, 4500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute h-0.5 w-24 animate-shooting-star bg-gradient-to-r from-white via-white/70 to-transparent"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.8))",
          }}
        />
      ))}
    </div>
  );
};

const Index = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setMouse({ x: (e.clientX - cx) / cx, y: (e.clientY - cy) / cy });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const parallax = (depth: number) => ({
    transform: `translate(${mouse.x * depth}px, ${mouse.y * depth}px)`,
  });

  // Planets in a single row — each floats in place
  const planets = [
    {
      key: "science",
      title: "SCIENCE",
      description: "Explore the wonders of our world",
      icon: <FlaskConical className="h-4 w-4" strokeWidth={2} />,
      colorVar: "var(--planet-science)",
      img: marsImg,
      size: 170,
      float: "animate-float-slow",
    },
    {
      key: "english",
      title: "ENGLISH",
      description: "Enhance your language",
      icon: <BookOpen className="h-4 w-4" strokeWidth={2} />,
      colorVar: "var(--planet-english)",
      img: saturnImg,
      size: 190,
      float: "animate-float-mid",
    },
    {
      key: "math",
      title: "MATH",
      description: "Solve. Learn. Excel.",
      icon: <Sigma className="h-4 w-4" strokeWidth={2} />,
      colorVar: "var(--planet-math)",
      img: earthImg,
      size: 210,
      float: "animate-float-slow",
    },
    {
      key: "coding",
      title: "CODING </>",
      description: "Code the future. Create infinite.",
      icon: <Code2 className="h-4 w-4" strokeWidth={2} />,
      colorVar: "var(--planet-coding)",
      img: neptuneImg,
      size: 185,
      float: "animate-float-mid",
    },
    {
      key: "knowledge",
      title: "GENERAL KNOWLEDGE",
      description: "Learn beyond the limits",
      icon: <Brain className="h-4 w-4" strokeWidth={2} />,
      colorVar: "var(--planet-knowledge)",
      img: venusImg,
      size: 175,
      float: "animate-float-slow",
    },
  ];

  return (
    <div ref={ref} className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background */}
      <img
        src={spaceBg}
        alt="Deep space cosmic background with nebulae and asteroids"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/70" />
      <Starfield />
      <ShootingStars />

      {/* Top nav */}
      <header className="relative z-30 flex items-center justify-between px-8 py-6 md:px-14">
        <CosmosLogo />
        <button className="group flex items-center gap-2 rounded-full border border-primary/50 bg-background/30 px-5 py-2 backdrop-blur-md transition hover:border-primary hover:bg-primary/10">
          <User className="h-4 w-4 text-foreground" strokeWidth={1.5} />
          <span className="font-body text-sm text-foreground">Sign In</span>
        </button>
      </header>

      {/* Hero title */}
      <section className="relative z-20 mt-12 flex flex-col items-center px-4 text-center">
        <h1 className="font-display text-4xl font-bold tracking-[0.35em] text-foreground text-glow md:text-6xl">
          EXPLORE THE UNIVERSE
        </h1>
        <p className="mt-4 font-display text-xs tracking-[0.4em] text-muted-foreground md:text-sm">
          CHOOSE YOUR PLANET. BEGIN YOUR JOURNEY.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <div className="h-px w-32 bg-gradient-to-r from-transparent to-primary/60" />
          <div className="h-2 w-2 rotate-45 bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          <div className="h-px w-32 bg-gradient-to-l from-transparent to-primary/60" />
        </div>
      </section>

      {/* Planets row */}
      <main className="relative z-10 mx-auto mt-28 flex w-full max-w-[1600px] items-center justify-center px-6">
        <div
          className="flex w-full items-center justify-between gap-4 md:gap-8"
          style={{ transform: `translate(${mouse.x * -6}px, ${mouse.y * -6}px)` }}
        >
          {planets.map((p) => (
            <div key={p.key} className="relative flex flex-1 flex-col items-center">
              <button
                type="button"
                aria-label={`Open ${p.title}`}
                onClick={() => {
                  if (p.key === "math") {
                    navigate("/math");
                    return;
                  }
                  if (p.key === "coding") {
                    navigate("/coding");
                    return;
                  }
                  setActiveKey((k) => (k === p.key ? null : p.key));
                }}
                className={`group relative rounded-full transition-transform duration-300 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${p.float} cursor-pointer`}
                style={{ width: p.size, height: p.size }}
              >
                <img
                  src={p.img}
                  alt={`Planet ${p.title}`}
                  className="planet-glow h-full w-full object-contain transition-[filter] duration-300 group-hover:[filter:drop-shadow(0_0_45px_hsl(var(--primary)/0.7))]"
                />
              </button>

              {activeKey === p.key && (
                <div className="mt-4 animate-fade-in">
                  <PlanetLabel
                    title={p.title}
                    description={p.description}
                    icon={p.icon}
                    colorVar={p.colorVar}
                    align="left"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 px-8 pb-8 md:px-14" />

    </div>
  );
};

export default Index;
