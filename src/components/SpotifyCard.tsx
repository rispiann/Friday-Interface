import { Music } from 'lucide-react';

// Definisikan tipe data yang kita harapkan dari backend
interface SpotifyCardProps {
  data: {
    title: string;       // <-- Pastikan namanya 'title'
    artist: string;      // <-- Pastikan namanya 'artist'
    imageUrl?: string;   // <-- Pastikan namanya 'imageUrl'
    songUrl: string;     // <-- Pastikan namanya 'songUrl'
  };
}

export const SpotifyCard = ({ data }: SpotifyCardProps) => {
  // Jika karena suatu alasan data tidak ada, jangan render apa-apa
  if (!data) {
    return null;
  }

  return (
    <div className="flex gap-3 justify-start animate-fade-in-up">
      {/* Ikon Bot */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-primary/30">
        F
      </div>
      
      {/* Konten Kartu */}
      <a
        href={data.songUrl} // <-- Gunakan data.songUrl
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 max-w-[85%] md:max-w-[60%] rounded-2xl p-3 backdrop-blur-md transition-all duration-300 bg-card/40 border border-glass-border shadow-[0_4px_20px_rgba(30,255,30,0.1)] hover:bg-card/60 hover:scale-[1.02] hover:shadow-lg"
      >
        {/* Gambar Album */}
        {data.imageUrl ? (
          <img
            src={data.imageUrl} // <-- Gunakan data.imageUrl
            alt={`Album art for ${data.title}`} // <-- Gunakan data.title
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted/30 flex items-center justify-center">
            <Music className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        
        {/* Info Lagu */}
        <div className="flex flex-col justify-center overflow-hidden">
          <p className="text-sm font-bold text-foreground truncate">
            {data.title || 'Lagu Tidak Dikenal'} {/* <-- Gunakan data.title */}
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {data.artist || 'Artis Tidak Dikenal'} {/* <-- Gunakan data.artist */}
          </p>
        </div>
      </a>
    </div>
  );
};
