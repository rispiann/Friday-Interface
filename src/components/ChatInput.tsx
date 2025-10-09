import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ketik pesan Anda..."
        disabled={disabled}
        className="flex-1 bg-card/40 border-glass-border backdrop-blur-md focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
      />
      <Button
        type="submit"
        disabled={!input.trim() || disabled}
        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 border border-primary/30 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all duration-300"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
};
