export const TypingIndicator = () => {
  return (
    <div className="flex gap-3 justify-start animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-primary/30">
        F
      </div>
      <div className="bg-card/40 border border-glass-border rounded-2xl px-4 py-3 backdrop-blur-md">
        <div className="flex gap-1.5">
          <div
            className="w-2 h-2 rounded-full bg-primary/60"
            style={{
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
          <div
            className="w-2 h-2 rounded-full bg-primary/60"
            style={{
              animation: "pulse 1.4s ease-in-out 0.2s infinite",
            }}
          />
          <div
            className="w-2 h-2 rounded-full bg-primary/60"
            style={{
              animation: "pulse 1.4s ease-in-out 0.4s infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
};
