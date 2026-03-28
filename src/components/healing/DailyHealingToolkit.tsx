import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Play, Pause, Timer, TrendingUp, Award, Info, Heart, Sparkles, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useHealingProgress } from "@/hooks/useHealingProgress";
import BreathingExercise from "./BreathingExercise";
import FrequencyPlayer from "./FrequencyPlayer";
import DigitalRelease from "./DigitalRelease";
import SoulJournal from "./SoulJournal";
import BodyTensionMap from "./BodyTensionMap";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const affirmations = [
  "I am stronger than my struggles. Every day I choose healing.",
  "My voice matters and my story has power.",
  "I deserve love, safety, and peace in my life.",
  "Each breath I take is a victory over my past.",
  "I am worthy of all the good things life has to offer.",
  "My healing journey is sacred and I honor my progress.",
  "I choose to be gentle with myself today.",
  "I am brave, I am strong, I am enough.",
  "Today I reclaim my power and my peace.",
  "I trust in my ability to overcome challenges.",
  "I am creating a life filled with hope and healing.",
  "My past does not define my future.",
  "I am surrounded by love and support.",
  "Every step forward is a victory worth celebrating.",
  "I choose faith over fear, hope over despair."
];

const DailyHealingToolkit = () => {
  const [mood, setMood] = useState([5]);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);
  const [showGrounding, setShowGrounding] = useState(false);
  const { progress, updateProgress, checkIn } = useHealingProgress();

  const handleMoodChange = (value: number[]) => {
    setMood(value);
    updateProgress('mood_check');
    checkIn(value[0]);
  };

  const newAffirmation = () => {
    const next = (currentAffirmation + 1) % affirmations.length;
    setCurrentAffirmation(next);
    updateProgress('affirmation_view');
  };

  const getMoodFeedback = (moodValue: number) => {
    if (moodValue <= 3) return "It's okay to have difficult days. You're showing strength by checking in.";
    if (moodValue <= 6) return "You're doing your best, and that's enough for today.";
    return "It's wonderful to see you feeling positive today!";
  };

  const shareProgress = async () => {
    const text = `I've been strong for ${progress.daysStrong} days on my healing journey! 💪 #HealingJourney #StayStrong`;
    
    try {
      if (navigator.share && navigator.canShare) {
        await navigator.share({ text });
        toast({
          title: "Shared successfully!",
          description: "Your progress has been shared."
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied to clipboard!",
          description: "Your progress message is ready to share."
        });
      }
    } catch (error) {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied to clipboard!",
          description: "Your progress message is ready to share."
        });
      } catch (clipboardError) {
        toast({
          title: "Share message",
          description: text,
          duration: 10000
        });
      }
    }
  };

  return (
    <section className="py-24 bg-gradient-to-br from-cream/20 via-background to-cream/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-6">
            Digital Healing Sanctuary
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Clinically-informed digital tools for stabilization, release, and long-term recovery.
            Designed to help you navigate trauma and find peace at your own pace.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {/* Somatic Map - High Impact */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4 px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-osu-scarlet">Stabilize</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-60 text-xs">Somatic exercises help regulate the nervous system by shifting focus from distressing thoughts to physical sensations.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <BodyTensionMap />
          </div>

          {/* Digital Release - High Impact */}
          <div className="lg:col-span-1">
             <div className="flex items-center gap-2 mb-4 px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Release</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-60 text-xs">Expressive writing facilitates emotional processing and provides a safe outlet for intrusive thoughts.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <DigitalRelease />
          </div>

          {/* Soul Journal - High Impact */}
          <div className="lg:col-span-1">
             <div className="flex items-center gap-2 mb-4 px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-600">Reflect</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-60 text-xs">Guided reflection encourages cognitive reframing and helps build resilience through positive narrative formation.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <SoulJournal />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Crisis Relief Toolkit */}
          <Card className="crisis-toolkit pro-card border-2 border-red-200 bg-red-50/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="pro-icon-chip mx-auto mb-2">
                <Phone className="h-6 w-6" />
              </div>
              <CardTitle className="text-osu-scarlet">Instant Crisis Relief</CardTitle>
              <p className="text-muted-foreground">Immediate tools when you need help right now</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <BreathingExercise />
              
              <Button
                variant={showGrounding ? "outline" : "secondary"}
                onClick={() => setShowGrounding(!showGrounding)}
                className="w-full"
              >
                5-4-3-2-1 Grounding Technique
              </Button>
              
              {showGrounding && (
                <div className="grounding-tool p-4 bg-white rounded-lg border animate-fade-in">
                  <h4 className="font-semibold mb-2 text-osu-scarlet">Ground yourself with your senses:</h4>
                  <ul className="space-y-1 text-sm">
                    <li><strong>5 things</strong> you can see</li>
                    <li><strong>4 things</strong> you can touch</li>
                    <li><strong>3 things</strong> you can hear</li>
                    <li><strong>2 things</strong> you can smell</li>
                    <li><strong>1 thing</strong> you can taste</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button asChild variant="destructive" className="flex-1">
                  <a href="tel:988" className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    Crisis: 988
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href="tel:211" className="flex items-center justify-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Support: 211
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Daily Check-In */}
          <Card className="daily-checkin pro-card bg-slate-50/50 border-2 border-slate-200">
            <CardHeader className="text-center">
              <div className="pro-icon-chip mx-auto mb-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="text-slate-700">Daily Check-In</CardTitle>
              <p className="text-muted-foreground">How are you feeling today?</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Mood Level: {mood[0]}/10
                </label>
                <Slider
                  value={mood}
                  onValueChange={handleMoodChange}
                  max={10}
                  min={1}
                  step={1}
                  className="mood-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Struggling</span>
                  <span>Okay</span>
                  <span>Great</span>
                </div>
              </div>

              <div className="affirmation-display bg-gradient-to-r from-osu-scarlet to-osu-scarlet-dark text-white p-4 rounded-lg text-center">
                <p className="italic font-medium">{affirmations[currentAffirmation]}</p>
              </div>

              <Button onClick={newAffirmation} variant="outline" className="w-full">
                New Affirmation
              </Button>

              <div className="mood-feedback p-3 bg-white rounded-lg border text-sm text-center">
                {getMoodFeedback(mood[0])}
              </div>
            </CardContent>
          </Card>

          {/* Healing Frequencies Player */}
          <Card className="frequency-player pro-card bg-slate-50/50 border-2 border-slate-300">
            <CardHeader className="text-center">
              <div className="pro-icon-chip mx-auto mb-2">
                <BookOpen className="h-6 w-6" />
              </div>
              <CardTitle className="text-slate-700">Healing Frequencies</CardTitle>
              <p className="text-muted-foreground">Therapeutic sound frequencies for deep healing</p>
            </CardHeader>
            <CardContent>
              <FrequencyPlayer onUse={() => updateProgress('frequency_use')} />
            </CardContent>
          </Card>

          {/* Progress Dashboard */}
          <Card className="progress-dashboard pro-card bg-slate-50/50 border-2 border-slate-200">
            <CardHeader className="text-center">
              <div className="pro-icon-chip mx-auto mb-2">
                <TrendingUp className="h-6 w-6" />
              </div>
              <CardTitle className="text-slate-700">Your Healing Journey</CardTitle>
              <p className="text-muted-foreground">Celebrate your progress and milestones</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-osu-scarlet">{progress.daysStrong}</div>
                  <div className="text-xs text-muted-foreground">Days Strong</div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-osu-scarlet">{progress.toolsUsed}</div>
                  <div className="text-xs text-muted-foreground">Tools Used</div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-osu-scarlet">{progress.checkIns}</div>
                  <div className="text-xs text-muted-foreground">Check-ins</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 text-center">Milestones</h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  <div className={`badge px-3 py-1 rounded-full text-xs font-semibold ${progress.daysStrong >= 1 ? 'bg-osu-scarlet text-white' : 'bg-slate-300 text-slate-600'}`}>
                    <Award className="h-3 w-3 inline mr-1" />
                    Day 1
                  </div>
                  <div className={`badge px-3 py-1 rounded-full text-xs font-semibold ${progress.daysStrong >= 7 ? 'bg-osu-scarlet text-white' : 'bg-slate-300 text-slate-600'}`}>
                    <Award className="h-3 w-3 inline mr-1" />
                    7 Days
                  </div>
                  <div className={`badge px-3 py-1 rounded-full text-xs font-semibold ${progress.daysStrong >= 30 ? 'bg-osu-scarlet text-white' : 'bg-slate-300 text-slate-600'}`}>
                    <Award className="h-3 w-3 inline mr-1" />
                    30 Days
                  </div>
                  <div className={`badge px-3 py-1 rounded-full text-xs font-semibold ${progress.daysStrong >= 100 ? 'bg-osu-scarlet text-white' : 'bg-slate-300 text-slate-600'}`}>
                    <Award className="h-3 w-3 inline mr-1" />
                    100 Days
                  </div>
                </div>
              </div>

              <Button 
                onClick={shareProgress}
                variant="outline" 
                className="w-full"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Share Your Strength
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default DailyHealingToolkit;