import { Cloud, Sun, CloudSun, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';

interface WeatherCardProps {
  data: {
    city: string;
    temperature: number;
    condition: string;
    icon_code: string;
  };
}

// Fungsi helper untuk memilih ikon berdasarkan kode dari API
const getWeatherIcon = (iconCode: string) => {
  const main = iconCode.substring(0, 2);
  switch (main) {
    case '01': return <Sun size={64} className="text-yellow-300" />;
    case '02': return <CloudSun size={64} className="text-yellow-200" />;
    case '03':
    case '04': return <Cloud size={64} className="text-gray-300" />;
    case '09':
    case '10': return <CloudRain size={64} className="text-blue-300" />;
    case '11': return <CloudLightning size={64} className="text-yellow-400" />;
    case '13': return <CloudSnow size={64} className="text-white" />;
    default: return <Cloud size={64} className="text-gray-400" />;
  }
};

export const WeatherCard = ({ data }: WeatherCardProps) => {
  return (
    <div className="flex gap-3 justify-start animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-semibold flex-shrink-0 border border-primary/30">
        F
      </div>
      <div className="max-w-[75%] w-full sm:w-auto sm:min-w-[280px] rounded-2xl p-4 backdrop-blur-md bg-card/40 border border-glass-border shadow-lg shadow-cyan-500/10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-bold text-lg text-white">{data.city}</p>
            <p className="text-sm text-muted-foreground">{data.condition}</p>
            <p className="text-5xl font-bold text-white mt-2">{data.temperature}°</p>
          </div>
          <div className="animate-float">
            {getWeatherIcon(data.icon_code)}
          </div>
        </div>
      </div>
    </div>
  );
};
