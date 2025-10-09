import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp: string;
}

export const ChatMessage = ({ message, isBot, timestamp }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in-up",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-primary/30">
          F
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 backdrop-blur-md transition-all duration-300",
          "hover:scale-[1.02] hover:shadow-lg",
          isBot
            ? "bg-card/40 border border-glass-border text-foreground shadow-[0_4px_20px_rgba(0,255,255,0.1)]"
            : "bg-primary/10 border border-primary/30 text-foreground shadow-[0_4px_20px_rgba(255,0,255,0.1)]"
        )}
        style={{
          transform: "perspective(1000px) rotateX(0deg)",
        }}
      >
        <p className="text-sm leading-relaxed">{message}</p>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {timestamp}
        </span>
      </div>
      {!isBot && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-accent/30">
          U
        </div>
      )}
    </div>
  );
};
