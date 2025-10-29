import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatInput } from "@/components/ChatInput";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ConfirmationModal } from "@/components/ConfirmationModal"; // Impor modal baru
import { Bot, Sparkles, LogOut, Trash2, User, Loader2 } from "lucide-react";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: string;
}

const getTimestamp = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const WELCOME_MESSAGE_IF_EMPTY: Message = { 
    id: 1, 
    text: "Riwayat obrolan Anda kosong. Mulailah percakapan!", 
    isBot: true, 
    timestamp: getTimestamp() 
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State untuk modal
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("friday_access_token");
      if (!token) { navigate("/login"); return; }
      try {
        const [historyResponse, meResponse] = await Promise.all([
          fetch("http://localhost:5000/api/chat/history", { headers: { "Authorization": `Bearer ${token}` } } ),
          fetch("http://localhost:5000/api/me", { headers: { "Authorization": `Bearer ${token}` } } )
        ]);
        if (historyResponse.status === 401 || meResponse.status === 401) { throw new Error("Sesi tidak valid"); }
        const history = await historyResponse.json();
        if (history.length > 0) {
          const formattedMessages = history.map((msg, index) => ({
            id: Date.now() + index, text: msg.text, isBot: msg.isBot, timestamp: msg.timestamp
          }));
          setMessages(formattedMessages);
        } else {
          setMessages([WELCOME_MESSAGE_IF_EMPTY]);
        }
        const meData = await meResponse.json();
        if (meData.username) { setUsername(meData.username); }
      } catch (error) {
        localStorage.removeItem("friday_access_token");
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleLogout = () => {
    localStorage.removeItem("friday_access_token");
    navigate("/login");
  };

  // Fungsi yang menjalankan penghapusan setelah dikonfirmasi
  const performClearChat = async () => {
    setIsClearing(true);
    const token = localStorage.getItem("friday_access_token");
    if (!token) { navigate("/login"); return; }
    try {
      const response = await fetch("http://localhost:5000/api/chat/history", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      } );
      if (!response.ok) throw new Error("Gagal menghapus riwayat di server");
      setMessages([WELCOME_MESSAGE_IF_EMPTY]);
    } catch (error) {
      console.error("Error saat menghapus riwayat:", error);
      alert("Gagal menghapus riwayat. Silakan coba lagi.");
    } finally {
      setIsClearing(false);
    }
  };

  // Fungsi ini sekarang hanya untuk membuka modal
  const handleOpenClearModal = () => {
    setIsModalOpen(true);
  };

  const handleSendMessage = async (text: string) => {
    // ... (kode handleSendMessage tidak berubah)
    const userMessage: Message = { id: Date.now(), text, isBot: false, timestamp: getTimestamp() };
    setMessages(prev => (prev.length === 1 && prev[0].id === 1) ? [userMessage] : [...prev, userMessage]);
    setIsTyping(true);
    const botMessageId = Date.now() + 1;
    const placeholderMessage: Message = { id: botMessageId, text: "", isBot: true, timestamp: getTimestamp() };
    setMessages((prev) => [...prev, placeholderMessage]);
    const token = localStorage.getItem("friday_access_token");
    if (!token) { setTimeout(() => navigate("/login"), 1500); return; }
    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: text } ),
      });
      if (!response.ok) { throw new Error(response.statusText || "Terjadi kesalahan pada server"); }
      if (!response.body) { throw new Error("Response body tidak ada."); }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(currentMessages => currentMessages.map(msg => msg.id === botMessageId ? { ...msg, text: msg.text + chunk } : msg));
      }
    } catch (error: any) {
      localStorage.removeItem("friday_access_token");
      const errorMessageText = `⚠️ Sesi berakhir atau terjadi kesalahan. Mengalihkan ke halaman login...`;
      setMessages(currentMessages => currentMessages.map(msg => msg.id === botMessageId ? { ...msg, text: errorMessageText } : msg));
      setTimeout(() => navigate("/login"), 3000);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <div className="relative min-h-screen overflow-hidden">
        <ParticleBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 md:p-6">
          <div className="w-full max-w-6xl h-[90vh] max-h-[900px] grid grid-cols-1 md:grid-cols-[360px_1fr] gap-4 md:gap-6">
            
            <div className="hidden md:flex flex-col gap-4 p-6 rounded-3xl bg-card/20 border border-glass-border shadow-2xl shadow-black/30">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 flex items-center justify-center shadow-lg shadow-primary/20 animate-float border border-primary/30">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Friday AI</h2>
                  {username ? (<p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 justify-center"><User size={12} /> {username}</p>) : (<p className="text-xs text-muted-foreground mt-1">Personal Assistant</p>)}
                </div>
              </div>
              <div className="flex-1 mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" />Fitur</h3>
                <div className="space-y-2">
                  {["Chat Interaktif", "Respons Real-time", "Terintegrasi AI", "Kontrol Spotify"].map((feature, idx) => (<div key={idx} className="p-3 rounded-xl bg-muted/20 border border-glass-border backdrop-blur-sm hover:bg-muted/30 transition-all duration-300 hover:scale-105 cursor-default"><p className="text-xs text-foreground/80">{feature}</p></div>))}
                </div>
              </div>
              
              <div className="space-y-2">
                <button onClick={handleOpenClearModal} disabled={isClearing} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isClearing ? (<Loader2 size={16} className="animate-spin" />) : (<Trash2 size={16} />)}
                  {isClearing ? "Menghapus..." : "Hapus Obrolan"}
                </button>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
                  <LogOut size={16} /> Keluar
                </button>
              </div>
            </div>

            <div className="flex flex-col rounded-3xl bg-card/20 border border-glass-border shadow-2xl shadow-black/30 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-glass-border bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30"><Bot className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">Friday Chatbot</h1>
                    {username ? (<p className="text-xs text-muted-foreground flex items-center gap-1.5"><User size={12} /> {username}</p>) : (<p className="text-xs text-muted-foreground">Online</p>)}
                  </div>
                </div>
                <div className="md:hidden flex gap-2">
                  <button onClick={handleOpenClearModal} disabled={isClearing} className="p-2 text-yellow-300 rounded-full bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-50">
                    {isClearing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                  <button onClick={handleLogout} className="p-2 text-red-400 rounded-full bg-red-500/10 hover:bg-red-500/20"><LogOut size={18} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full"><div className="text-center text-muted-foreground"><Bot className="w-12 h-12 mx-auto animate-spin-slow" /><p className="mt-4">Menyiapkan sesi...</p></div></div>
                ) : (
                  messages.map((message) => (<ChatMessage key={message.id} message={message.text} isBot={message.isBot} timestamp={message.timestamp} />))
                )}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 md:p-6 border-t border-glass-border bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-md">
                <ChatInput onSend={handleSendMessage} disabled={isTyping || isLoading || isClearing} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={performClearChat}
        title="Hapus Riwayat Obrolan"
        message="Tindakan ini tidak dapat diurungkan. Semua percakapan Anda dengan Friday akan dihapus secara permanen."
      />
    </>
  );
};

export default Index;
