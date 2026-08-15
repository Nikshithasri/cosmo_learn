const CosmosLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative h-9 w-9">
      <div className="absolute inset-0 rounded-full border-2 border-primary/70" />
      <div className="absolute inset-1 rounded-full border border-primary/40 rotate-45" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
      <div className="absolute inset-0 animate-spin-slow">
        <div className="absolute -right-0.5 top-1/2 h-1 w-1 rounded-full bg-primary" />
      </div>
    </div>
    <div className="font-display text-lg font-bold tracking-[0.2em] text-foreground">
      COSMOS<span className="text-primary">LEARN</span>
    </div>
  </div>
);

export default CosmosLogo;
