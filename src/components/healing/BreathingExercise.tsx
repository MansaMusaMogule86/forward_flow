import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

const BreathingExercise = () => {
  const [isBreathing, setIsBreathing] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isBreathing) {
      interval = setInterval(() => {
        setSeconds(prev => {
          const newSeconds = prev + 1;
          const cycle = newSeconds % 16; // 16 second total cycle

          if (cycle <= 4) {
            setPhase('inhale');
          } else if (cycle <= 8) {
            setPhase('hold');
          } else if (cycle <= 12) {
            setPhase('exhale');
          } else {
            setPhase('pause');
          }

          return newSeconds;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isBreathing]);

  const startBreathing = () => {
    setIsBreathing(!isBreathing);
    if (!isBreathing) {
      setSeconds(0);
      setPhase('inhale');
    }
  };

  const getInstructions = () => {
    switch (phase) {
      case 'inhale': return 'Breathe in slowly...';
      case 'hold': return 'Hold your breath...';
      case 'exhale': return 'Breathe out slowly...';
      case 'pause': return 'Brief pause...';
    }
  };

  const getCircleScale = () => {
    switch (phase) {
      case 'inhale': return 'scale-125';
      case 'hold': return 'scale-125';
      case 'exhale': return 'scale-75';
      case 'pause': return 'scale-75';
    }
  };

  return (
    <div className="text-center space-y-4">
      <Button
        onClick={startBreathing}
        variant={isBreathing ? "outline" : "default"}
        className="w-full bg-osu-scarlet hover:bg-osu-scarlet-dark text-white"
      >
        {isBreathing ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
        {isBreathing ? 'Stop' : 'Start'} Breathing Exercise
      </Button>

      {isBreathing && (
        <div className="breathing-container p-6 bg-white rounded-lg border animate-fade-in">
          <div className="flex flex-col items-center space-y-4">
            <div 
              className={`breathing-circle w-20 h-20 rounded-full bg-gradient-to-br from-osu-scarlet to-osu-scarlet-dark transition-transform duration-4000 ease-in-out ${getCircleScale()}`}
            />
            <div className="text-center">
              <p className="text-lg font-medium text-slate-700">{getInstructions()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Follow the circle and breathe deeply
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreathingExercise;