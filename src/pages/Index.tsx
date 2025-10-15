import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatInput } from "@/components/ChatInput";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Bot, Sparkles } from "lucide-react";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: string;
}

const WELCOME_MESSAGES = [
  "Halo! Aku Friday, asisten futuristikmu. Mau coba fitur apa hari ini?",
  "Coba ketik: 'show me demo' atau 'cuaca' untuk melihat fitur.",
];

const getTimestamp = () => {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: WELCOME_MESSAGES[0], isBot: true, timestamp: getTimestamp() },
    { id: 2, text: WELCOME_MESSAGES[1], isBot: true, timestamp: getTimestamp() },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // ✉️ Fungsi kirim pesan ke backend Flask
  const handleSendMessage = (text: string) => {
    const userMessage: Message = {
      id: Date.now(),
      text,
      isBot: false,
      timestamp: getTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(async () => {
      try {
        const res = await fetch("http://localhost:5000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        const data = await res.json();
        const botMessage: Message = {
          id: Date.now() + 1,
          text: data.reply,
          isBot: true,
          timestamp: getTimestamp(),
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (err) {
        const botMessage: Message = {
          id: Date.now() + 1,
          text: "⚠️ Server tidak merespons. Pastikan backend Friday aktif.",
          isBot: true,
          timestamp: getTimestamp(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } finally {
        setIsTyping(false);
      }
    }, 800);
  };

  // 🧱 Bagian UI Chatbot (return harus di luar handleSendMessage)
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 md:p-6">
        <div className="w-full max-w-6xl h-[90vh] max-h-[900px] grid md:grid-cols-[360px_1fr] gap-4 md:gap-6">
          {/* Left Sidebar */}
          <div className="hidden md:flex flex-col gap-4 p-6 rounded-3xl bg-card/20 border border-glass-border shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 flex items-center justify-center shadow-[0_6px_26px_rgba(58,28,113,0.28)] animate-float border border-primary/30">
                <Bot className="w-10 h-10 text-primary" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-xl animate-pulse-glow" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Friday AI
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Assistant Anda
                </p>
              </div>
            </div>

            <div className="flex-1 mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Fitur Tersedia
              </h3>
              <div className="space-y-2">
                {[
                  "Chat Interaktif",
                  "Respons Real-time",
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-muted/20 border border-glass-border backdrop-blur-sm hover:bg-muted/30 transition-all duration-300 hover:scale-105"
                  >
                    <p className="text-xs text-foreground/80">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">Online</span>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex flex-col rounded-3xl bg-card/20 border border-glass-border shadow-[0_8px_30px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="p-4 md:p-6 border-b border-glass-border bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    Friday Chatbot
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Siap Membantu
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isBot={message.isBot}
                  timestamp={message.timestamp}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-6 border-t border-glass-border bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-md">
              <ChatInput onSend={handleSendMessage} disabled={isTyping} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
