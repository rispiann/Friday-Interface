import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatInput } from "@/components/ChatInput";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Bot, Sparkles, Trash2 } from "lucide-react";

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
  const loadInitialMessages = (): Message[] => {
    try {
      const savedMessages = localStorage.getItem("friday_chat_history");
      if (savedMessages) {
        return JSON.parse(savedMessages); // Kembalikan riwayat yang tersimpan
      }
    } catch (error) {
      console.error("Gagal memuat riwayat chat dari localStorage:", error);
      // Jika terjadi error (misalnya, data korup), hapus data yang salah
      localStorage.removeItem("friday_chat_history");
    }

    return [
      { id: 1, text: WELCOME_MESSAGES[0], isBot: true, timestamp: getTimestamp() },
      { id: 2, text: WELCOME_MESSAGES[1], isBot: true, timestamp: getTimestamp() },
    ];
  };

  const [messages, setMessages] = useState<Message[]>(loadInitialMessages);


  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping && messages.length > 2) {
      try {
        localStorage.setItem("friday_chat_history", JSON.stringify(messages));
        console.log("Riwayat obrolan berhasil disimpan.");
      } catch (error) {
        console.error("Gagal menyimpan riwayat chat ke localStorage:", error);
      }
    }
  }, [messages, isTyping]);

  // ✉️ Fungsi kirim pesan ke backend Flask
  const handleSendMessage = async (text: string) => {
    // 1. Tambahkan pesan pengguna ke UI
    const userMessage: Message = {
      id: Date.now(),
      text,
      isBot: false,
      timestamp: getTimestamp(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 2. Tampilkan indikator "sedang mengetik"
    setIsTyping(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.body) {
        throw new Error("Response body tidak ada.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullReply = ""; // Variabel untuk mengumpulkan seluruh teks

      // 3. Baca seluruh stream di belakang layar
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          fullReply += chunk; // Tambahkan setiap potongan ke variabel
        }
      }

      // 4. Setelah stream selesai, buat pesan bot yang sudah lengkap
      if (fullReply) {
        const botMessage: Message = {
          id: Date.now() + 1,
          text: fullReply.trim(), // Gunakan teks yang sudah terkumpul
          isBot: true,
          timestamp: getTimestamp(),
        };
        // Tambahkan pesan bot yang sudah jadi ke UI
        setMessages((prev) => [...prev, botMessage]);
      }

    } catch (error) {
      console.error("Gagal memproses respons dari server:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "⚠️ Maaf, terjadi kesalahan saat menghubungi server.",
        isBot: true,
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // 5. Sembunyikan indikator "sedang mengetik"
      setIsTyping(false);
    }
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
                  "Terintegrasi dengan Gemini",
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
                    Powered by Gemini
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
