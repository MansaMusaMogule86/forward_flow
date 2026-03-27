import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Timer, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FrequencyPlayerProps {
  onUse: () => void;
}

const frequencies = [
  { value: '528', label: '528 Hz - Love & Healing', description: 'DNA repair and transformation' },
  { value: '432', label: '432 Hz - Anxiety Relief', description: 'Calming frequency for reducing anxiety and stress' },
  { value: '396', label: '396 Hz - Fear Release', description: 'Liberating fear and guilt' },
  { value: '741', label: '741 Hz - Expression', description: 'Awakening intuition' }
];

const FrequencyPlayer = ({ onUse }: FrequencyPlayerProps) => {
  const [selectedFreq, setSelectedFreq] = useState('528');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState('0');
  const [timeLeft, setTimeLeft] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timeLeft]);

  const createAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playFrequency = (frequency: number) => {
    try {
      const audioContext = createAudioContext();
      
      // Resume context if suspended (required by browser autoplay policies)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create oscillator and gain nodes
      oscillatorRef.current = audioContext.createOscillator();
      gainNodeRef.current = audioContext.createGain();

      // Set frequency and type
      oscillatorRef.current.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillatorRef.current.type = 'sine';

      // Set volume (gentle)
      gainNodeRef.current.gain.setValueAtTime(0.1, audioContext.currentTime);

      // Connect nodes
      oscillatorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContext.destination);

      // Start the oscillator
      oscillatorRef.current.start();
      
      toast({
        title: "Frequency playing",
        description: `Now playing ${frequency}Hz healing frequency`,
      });
    } catch (error) {
      toast({
        title: "Audio not supported",
        description: "Your browser may not support Web Audio API",
        variant: "destructive"
      });
    }
  };

  const stopFrequency = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch (error) {
      // Silently handle cleanup errors
    }
  };

  const togglePlay = () => {
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);
    
    if (newPlayState) {
      onUse();
      if (timer !== '0') {
        setTimeLeft(parseInt(timer) * 60);
      }
      
      // Play the selected frequency
      const frequency = parseInt(selectedFreq);
      playFrequency(frequency);
    } else {
      setTimeLeft(0);
      stopFrequency();
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopFrequency();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const selectFrequency = (freq: string) => {
    setSelectedFreq(freq);
    if (isPlaying) {
      // Stop current frequency and start new one
      stopFrequency();
      const frequency = parseInt(freq);
      playFrequency(frequency);
      onUse();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentFreq = frequencies.find(f => f.value === selectedFreq);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {frequencies.map((freq) => (
          <Button
            key={freq.value}
            variant={selectedFreq === freq.value ? "default" : "outline"}
            size="sm"
            onClick={() => selectFrequency(freq.value)}
            className={`text-xs p-2 h-auto ${
              selectedFreq === freq.value 
                ? 'bg-slate-600 hover:bg-slate-700 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {freq.label.split(' - ')[1]}
          </Button>
        ))}
      </div>

      <div className="current-freq p-3 bg-white rounded-lg border text-center">
        <p className="font-medium text-slate-700">{currentFreq?.label}</p>
        <p className="text-xs text-muted-foreground">{currentFreq?.description}</p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={togglePlay}
          className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
        >
          {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {isPlaying ? 'Stop' : 'Play'} Healing Sounds
        </Button>

        <Select value={timer} onValueChange={setTimer}>
          <SelectTrigger className="w-32">
            <Timer className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No Timer</SelectItem>
            <SelectItem value="5">5 min</SelectItem>
            <SelectItem value="10">10 min</SelectItem>
            <SelectItem value="20">20 min</SelectItem>
            <SelectItem value="30">30 min</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPlaying && (
        <div className="playing-indicator p-3 bg-slate-100 rounded-lg text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Volume2 className="w-4 h-4 text-osu-scarlet animate-pulse" />
            <span className="text-sm font-medium text-slate-700">
              Now Playing: {currentFreq?.label}
            </span>
          </div>
          {timeLeft > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Time remaining: {formatTime(timeLeft)}
            </p>
          )}
          <div className="mt-2 text-xs text-green-600">
            🎵 Audio frequency is now playing through your speakers
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        * Real healing frequencies generated using Web Audio API. Use headphones for best experience.
      </div>
    </div>
  );
};

export default FrequencyPlayer;