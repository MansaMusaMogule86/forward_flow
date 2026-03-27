import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsContext } from "@/components/layout/AnalyticsProvider";
import {
  Rocket,
  Target,
  DollarSign,
  HelpCircle,
  Timer,
  Trophy,
  Share2,
  ArrowRight,
  Brain,
  Zap,
  CheckCircle2,
  XCircle
} from "lucide-react";

// --- Game 1: Career AI Quiz ---
export const CareerQuizGame = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();
  const { trackAIInteraction, trackError, trackClick } = useAnalyticsContext();

  const questions = [
    "What do you enjoy doing most in your free time?",
    "Which of these sounds most exciting to you?",
    "How would your friends describe you?"
  ];

  const options = [
    ["Creating art/music", "Solving puzzles", "Helping others", "Leading a team"],
    ["Building a new app", "Starting a business", "Protecting a community", "Designing a house"],
    ["Creative", "Analytical", "Supportive", "Ambitious"]
  ];

  const handleAnswer = (ans: string) => {
    const newAnswers = [...answers, ans];
    setAnswers(newAnswers);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      generateCareers(newAnswers);
    }
  };

  const generateCareers = async (finalAnswers: string[]) => {
    setLoading(true);
    trackAIInteraction('chat', { topic: 'youth-futures-quiz' });

    const fallbackResult = [
      `Based on your answers (${finalAnswers.join(', ')}), here are strong AI-enhanced career paths to explore:`,
      '',
      '1. **AI-Assisted Content Creator**',
      '   - Tools: ChatGPT, Canva Magic Studio, Descript',
      '   - Next step: Build a 3-piece portfolio and post weekly.',
      '',
      '2. **Prompt-Based Product/UX Assistant**',
      '   - Tools: Figma AI, Notion AI, ChatGPT',
      '   - Next step: Redesign one real app flow and explain your choices.',
      '',
      '3. **Community Data & Outreach Coordinator**',
      '   - Tools: Google Sheets + AI formulas, Power BI Copilot',
      '   - Next step: Create a mini impact dashboard from sample data.',
      '',
      '4. **Entry-Level AI Operations Support**',
      '   - Tools: Zapier, Airtable AI, ChatGPT',
      '   - Next step: Automate one repeat task and document the workflow.',
      '',
      'Which of these feels most exciting for your next step?'
    ].join('\n');

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          topic: 'youth-futures',
          stream: false,
          messages: [
            { role: 'user', content: `I enjoy ${finalAnswers[0]}, I'm excited about ${finalAnswers[1]}, and I'm ${finalAnswers[2]}. What AI-enhanced careers should I explore?` }
          ]
        }
      });

      if (error) throw error;

      const content = data?.response ?? (typeof data === 'string' ? data : null);

      if (!content) {
        throw new Error('Unexpected AI response format from chat function');
      }

      setResult(content);
    } catch (err) {
      console.error(err);
      trackError('youth_futures_ai_quiz_error', err instanceof Error ? err.message : 'Unknown error');
      setResult(fallbackResult);
      toast({
        title: 'AI temporarily unavailable',
        description: "Showing guidance fallback while we reconnect.",
        variant: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-osu-scarlet/20 bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-osu-scarlet" />
          Game 1: Career AI Navigator
        </CardTitle>
        <Progress value={(step / questions.length) * 100} className="h-2" />
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {result}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setStep(0); setAnswers([]); setResult(null); }} variant="outline" size="sm">Try Again</Button>
              <Button className="get-involved-gold-button" size="sm" onClick={() => trackClick('youth_futures_try_full_ai_tool')}>Try Full AI Tool <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        ) : loading ? (
          <div className="py-12 text-center animate-pulse">
            <Rocket className="h-12 w-12 text-osu-scarlet mx-auto mb-4 animate-bounce" />
            <p>Coach Kay AI is analyzing your future...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">{questions[step]}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options[step].map((opt) => (
                <Button key={opt} onClick={() => handleAnswer(opt)} variant="outline" className="h-auto py-4 px-6 text-left justify-start hover:border-osu-scarlet hover:text-osu-scarlet">
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Game 2: AI Hotspot Comparison ---
export const ComparisonGame = () => {
  const [selected, setSelected] = useState<number | null>(null);

  const hotspots = [
    { title: "Research", old: "Hours of manual searching", ai: "Seconds with AI analysis" },
    { title: "Writing", old: "Blank page anxiety", ai: "AI drafting & brainstorming" },
    { title: "Data", old: "Complex spreadsheets", ai: "Instant AI visualization" }
  ];

  return (
    <Card className="border-osu-scarlet/20 bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-osu-scarlet" />
          Game 2: The AI Edge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Click a category to see how AI transforms the workflow:</p>
            <div className="flex flex-col gap-2">
              {hotspots.map((h, i) => (
                <Button
                  key={i}
                  variant={selected === i ? "default" : "outline"}
                  onClick={() => setSelected(i)}
                  className={selected === i ? "bg-osu-scarlet hover:bg-osu-scarlet-dark" : ""}
                >
                  {h.title}
                </Button>
              ))}
            </div>
          </div>
          <div className="bg-osu-gray/5 p-6 rounded-xl border border-dashed border-osu-gray/30 h-48 flex items-center justify-center text-center">
            {selected !== null ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <Badge variant="outline" className="mb-1">Traditional</Badge>
                  <p className="text-sm line-through opacity-50">{hotspots[selected].old}</p>
                </div>
                <div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mb-1">AI-Enhanced</Badge>
                  <p className="font-semibold text-osu-scarlet">{hotspots[selected].ai}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Select a category to compare</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Game 3: Budget Allocator ---
export const BudgetGame = () => {
  const [budget, setBudget] = useState({ needs: 50, wants: 30, savings: 20 });
  const [score, setScore] = useState<number | null>(null);

  const handleUpdate = (type: keyof typeof budget, val: number) => {
    setBudget(prev => ({ ...prev, [type]: val }));
  };

  const calculateScore = () => {
    // Ideal is 50/30/20
    const diff = Math.abs(budget.needs - 50) + Math.abs(budget.wants - 30) + Math.abs(budget.savings - 20);
    setScore(Math.max(0, 100 - diff));
  };

  return (
    <Card className="border-osu-scarlet/20 bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-osu-scarlet" />
          Game 3: 50/30/20 Mastery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label>Needs (Housing, Food)</label>
              <span>{budget.needs}%</span>
            </div>
            <Input type="range" min="0" max="100" value={budget.needs} onChange={(e) => handleUpdate('needs', parseInt(e.target.value))} className="accent-osu-scarlet" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label>Wants (Entertainment, Gifts)</label>
              <span>{budget.wants}%</span>
            </div>
            <Input type="range" min="0" max="100" value={budget.wants} onChange={(e) => handleUpdate('wants', parseInt(e.target.value))} className="accent-osu-scarlet" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label>Savings & Debt</label>
              <span>{budget.savings}%</span>
            </div>
            <Input type="range" min="0" max="100" value={budget.savings} onChange={(e) => handleUpdate('savings', parseInt(e.target.value))} className="accent-osu-scarlet" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="text-lg font-bold">Total: {budget.needs + budget.wants + budget.savings}%</div>
          {budget.needs + budget.wants + budget.savings !== 100 && (
            <p className="text-xs text-destructive">Budget must equal 100%!</p>
          )}
          <Button
            disabled={budget.needs + budget.wants + budget.savings !== 100}
            onClick={calculateScore}
            className="get-involved-gold-button"
          >
            Check My Budget
          </Button>
        </div>

        {score !== null && (
          <div className="text-center p-4 bg-osu-scarlet/5 rounded-lg border border-osu-scarlet/20 animate-bounce">
            <Trophy className="h-8 w-8 text-gold mx-auto mb-2" />
            <p className="text-xl font-bold">Budget Score: {score}/100</p>
            <p className="text-sm text-muted-foreground mt-1">
              {score > 90 ? "Financial Genius!" : "Good start! Try to get closer to 50/30/20."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Game 4: Elevation Trivia ---
export const TriviaGame = () => {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const questions = [
    { q: "What does 'AI' stand for?", a: ["Advanced Intel", "Artificial Intelligence", "Automated Information"], c: 1 },
    { q: "Which tool helps you build a resume with AI?", a: ["ChatGPT", "Excel", "Photoshop"], c: 0 },
    { q: "What is the recommended % of income for savings?", a: ["5%", "10%", "20%"], c: 2 },
    { q: "Which program offers a personal mentor for 12 weeks?", a: ["Weekend Accelerator", "6-Week Intensive", "Complete Elevation"], c: 2 },
    { q: "Is the Youth Futures program free for justice-impacted youth?", a: ["Yes, 100%", "No, it costs $50", "Only for the first week"], c: 0 }
  ];

  const handleAnswer = (idx: number) => {
    const isCorrect = idx === questions[round].c;
    setFeedback(isCorrect);
    if (isCorrect) setScore(score + 20);

    setTimeout(() => {
      setFeedback(null);
      if (round < questions.length - 1) {
        setRound(round + 1);
      } else {
        setGameOver(true);
      }
    }, 1000);
  };

  return (
    <Card className="border-osu-scarlet/20 bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-osu-scarlet" />
            Game 4: Elevation Trivia
          </div>
          <Badge variant="secondary">Round {round + 1}/5</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gameOver ? (
          <div className="text-center space-y-6 py-8">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
            <h3 className="text-3xl font-bold">Final Score: {score}%</h3>
            <p className="text-muted-foreground">You're ready to elevate your future!</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setRound(0); setScore(0); setGameOver(false); }} variant="outline">Play Again</Button>
              <Button className="get-involved-gold-button"><Share2 className="mr-2 h-4 w-4" /> Share Score</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">{questions[round].q}</h3>
            <div className="grid grid-cols-1 gap-3">
              {questions[round].a.map((opt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  disabled={feedback !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`h-auto py-4 px-6 text-left justify-start transition-colors ${
                    feedback !== null && idx === questions[round].c ? "border-green-500 bg-green-50 text-green-700" :
                    feedback === false && idx !== questions[round].c ? "opacity-50" : ""
                  }`}
                >
                  {opt}
                  {feedback !== null && idx === questions[round].c && <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
