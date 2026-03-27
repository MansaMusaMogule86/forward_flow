import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Home, Briefcase, GraduationCap, Heart, Scale, DollarSign, User, FileText, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import EmailChatHistoryModal from './EmailChatHistoryModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

const MAX_MESSAGE_LENGTH = 4000;

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  resources?: Array<{
    id: string;
    name: string;
    organization: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    type: string;
    description?: string;
    justice_friendly?: boolean;
    city?: string;
    county?: string;
  }>;
  webResources?: Array<{
    name: string;
    description: string;
    type: string;
    source: string;
  }>;
  reentryStage?: string;
}

interface ReentryNavigatorAIProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  selectedCoach?: {
    name: string;
    specialty: string;
    description: string;
  };
}

const ReentryNavigatorAI: React.FC<ReentryNavigatorAIProps> = ({ isOpen, onClose, initialQuery, selectedCoach }) => {
  const prevCoachNameRef = useRef<string | null>(selectedCoach?.name ?? 'Coach Kay');
  const pendingCloseRef = useRef(false);

  const getInitialMessage = (): Message => ({
    id: 'initial',
    type: 'ai',
    content: selectedCoach
      ? `Hey there! I'm ${selectedCoach.name.split(' ')[1]}, your ${selectedCoach.specialty} specialist here at The Collective (AI & Life Transformation Hub). ${selectedCoach.description}\n\nI'm here to provide personalized support in my area of expertise. What specific challenge can I help you tackle today?`
      : "Hey there! I'm Coach Kay, your personal Reentry Navigator at The Collective (AI & Life Transformation Hub). I've helped hundreds of people successfully rebuild their lives after incarceration, and I'm here to help you too!\n\nI know this journey takes real courage, and every small step forward is worth celebrating. I can help you with housing, employment, legal matters, education, healthcare, family connections, and financial stability.\n\nWhat's your biggest priority right now? Let's tackle it together!",
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<Array<{role: string, content: string}>>([]);
  const [reentryStage, setReentryStage] = useState<'preparing' | 'recently_released' | 'long_term' | 'family_member'>('recently_released');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const resetConversation = () => {
    setConversationContext([]);
    setInput('');
    setIsLoading(false);
    setMessages([getInitialMessage()]);
  };

  const finalizeClose = () => {
    onClose();
    // ensure next open starts fresh
    resetConversation();
  };

  const handleCloseRequest = (fromXButton = false) => {
    const hasUserMessages = messages.some((m) => m.type === 'user');
    if (fromXButton && hasUserMessages) {
      pendingCloseRef.current = true;
      setShowEmailModal(true);
    } else {
      finalizeClose();
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialQuery && isOpen) {
      setInput(initialQuery);
    }
  }, [initialQuery, isOpen]);

  // Reset conversation when switching coaches while open
  useEffect(() => {
    const currentCoach = selectedCoach?.name ?? 'Coach Kay';
    if (isOpen && prevCoachNameRef.current !== currentCoach) {
      resetConversation();
      prevCoachNameRef.current = currentCoach;
    }
  }, [selectedCoach?.name, isOpen]);

  const sendMessage = async (userQuery: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing in ReentryNavigatorAI');
        throw new Error('Service temporarily unavailable');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/reentry-navigator-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          query: userQuery,
          reentryStage,
          priorityNeeds: [],
          selectedCoach: selectedCoach,
          previousContext: conversationContext.slice(-6), // Keep last 6 messages for context
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Reentry Navigator AI error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // We no longer need to format manually as ReactMarkdown handles it
      const formattedResponse = data.response;
      
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.type === 'ai') {
          lastMessage.content = formattedResponse;
          lastMessage.resources = data.resources || [];
          lastMessage.webResources = data.webResources || [];
        }
        return newMessages;
      });

      // Update conversation context
      setConversationContext(prev => [
        ...prev,
        { role: 'user', content: userQuery },
        { role: 'assistant', content: formattedResponse }
      ]);
    } catch (error) {
      console.error(`${selectedCoach ? selectedCoach.name : 'Coach Kay'} (Reentry Navigator) AI error:`, error);
      toast.error("I'm having trouble connecting to the AI. Switching to fallback resources.");

      // Fallback: client-side reentry resource lookup so users still get help
      try {
        const { data: resources } = await supabase
          .from('resources')
          .select('*')
          .or('type.ilike.%housing%,type.ilike.%employment%,type.ilike.%job training%,type.ilike.%education%,type.ilike.%reentry%,type.ilike.%legal aid%,type.ilike.%mental health%,type.ilike.%substance abuse%,type.ilike.%healthcare%,type.ilike.%transportation%')
          .eq('verified', true)
          .limit(10);

        const content = `I'm experiencing a technical hiccup right now, but don't worry - I've still got your back! Here are some solid reentry resources that can help with common needs. Your success matters, and there are people ready to support you!`;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'ai') {
            lastMessage.content = content;
            lastMessage.resources = resources || [];
          }
          return newMessages;
        });
      } catch (fallbackError) {
        console.error('Reentry fallback failed:', fallbackError);
        const errorMessage = `I'm having technical difficulties, but your reentry journey is still important to me. For immediate support, call **2-1-1** for comprehensive resource navigation, or visit your local reentry program. You've got this!`;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'ai') {
            lastMessage.content = errorMessage;
          }
          return newMessages;
        });
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    // Add empty AI message for response
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: 'Let me help you with that...',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // Send message to the selected coach
      await sendMessage(userInput);
    } finally {
      setIsLoading(false);
    }
  };

  const getCoachSpecificActions = (coachName: string) => {
    const coachActions = {
      'Coach Dana': [
        "I need transitional housing options",
        "Help with rental applications with my background",
        "Understanding tenant rights and protections",
        "Housing voucher program applications",
        "Communicating with landlords about my record",
        "Budget-friendly housing search help"
      ],
      'Coach Malik': [
        "Help me write a strong resume",
        "Find fair-chance employers in my area",
        "Interview preparation and confidence building",
        "Job training program recommendations",
        "Professional skill development opportunities",
        "Understanding workplace rights"
      ],
      'Coach Rivera': [
        "Help me understand expungement eligibility",
        "Managing court obligations and compliance",
        "Legal documentation assistance",
        "Understanding probation/parole requirements",
        "Connecting with legal aid resources",
        "Rights restoration processes"
      ],
      'Coach Taylor': [
        "Communication strategies with family",
        "Setting healthy boundaries",
        "Co-parenting and custody guidance",
        "Family therapy and mediation resources",
        "Rebuilding trust after absence",
        "Supporting children through transitions"
      ],
      'Coach Jordan': [
        "Opening a bank account with my record",
        "Basic budgeting and money management",
        "Credit repair and building strategies",
        "Applying for benefits (SNAP, healthcare, housing)",
        "Financial literacy and planning",
        "Avoiding predatory lending and scams"
      ],
      'Coach Sam': [
        "Finding trauma-informed mental health resources",
        "Coping strategies for stress and anxiety",
        "Substance abuse recovery support",
        "Crisis intervention and de-escalation help",
        "Building healthy routines and self-care",
        "Community support and peer connections"
      ]
    };
    
    return coachActions[coachName as keyof typeof coachActions] || [
      "I need housing options that accept my background",
      "Help me find employers who hire people with records", 
      "What documents do I need to get started?",
      "How can I clear my record?",
      "I need job training and skills programs",
      "Help me rebuild relationships with my family"
    ];
  };

  const quickActions = selectedCoach 
    ? getCoachSpecificActions(selectedCoach.name)
    : [
        "I need housing options that accept my background",
        "Help me find employers who hire people with records", 
        "What documents do I need to get started?",
        "How can I clear my record?",
        "I need job training and skills programs",
        "Help me rebuild relationships with my family"
      ];

  const reentryAreas = [
    { icon: Home, label: "Housing", color: "text-primary" },
    { icon: Briefcase, label: "Employment", color: "text-secondary" },
    { icon: Scale, label: "Legal", color: "text-accent" },
    { icon: GraduationCap, label: "Education", color: "text-destructive" },
    { icon: Heart, label: "Family", color: "text-pink-600" },
    { icon: DollarSign, label: "Financial", color: "text-green-600" }
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseRequest(false); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <div className="sr-only">
          <h2 id="reentry-navigator-dialog-title">Reentry Navigator AI Chat</h2>
        </div>
        <DialogTitle className="sr-only">{selectedCoach ? `${selectedCoach.name} Chat` : 'Coach Kay Chat'}</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between bg-secondary p-4 text-secondary-foreground">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary-foreground/20 rounded-lg">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {selectedCoach ? `${selectedCoach.name} - ${selectedCoach.specialty}` : 'Coach Kay - Your Reentry Navigator'}
              </h3>
              <p className="text-sm opacity-90">
                {selectedCoach ? selectedCoach.description : 'Encouraging support for your success journey'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => handleCloseRequest(true)}
            className="text-secondary-foreground hover:bg-secondary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Reentry Areas */}
        <div className="bg-muted/50 border-b p-3">
          <div className="flex items-center justify-around text-xs">
            {reentryAreas.map((area, index) => {
              const Icon = area.icon;
              return (
                <div key={index} className="flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${area.color}`} />
                  <span className="font-medium">{area.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 px-4 py-3">
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Important:</strong> This AI provides general guidance and resource information. It is not a substitute for professional legal, medical, or emergency services. If you're in crisis, call <strong>988</strong> or <strong>911</strong>.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'ai' ? (
                <div className="flex gap-3 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="bg-muted/30 rounded-2xl px-4 py-3 max-w-[90%] border border-border/40">
                      <div className="text-sm leading-relaxed prose dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({node, ...props}) => <a {...props} className="text-primary hover:text-primary/80 underline font-medium" target="_blank" rel="noopener noreferrer" />,
                            p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                            ul: ({node, ...props}) => <ul {...props} className="list-disc ml-4 mb-2" />,
                            ol: ({node, ...props}) => <ol {...props} className="list-decimal ml-4 mb-2" />,
                            li: ({node, ...props}) => <li {...props} className="mb-1" />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {message.resources && message.resources.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30 pb-1 flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            Verified Collective Resources
                          </div>
                          <div className="space-y-3">
                            {message.resources.map((resource, resourceIndex) => (
                              <div 
                                key={resourceIndex} 
                                className="bg-background/80 border border-border/60 rounded-xl p-4 text-sm hover:shadow-sm transition-shadow"
                              >
                                <div className="font-semibold text-foreground mb-2 text-base">{resource.name}</div>
                                {resource.organization && (
                                  <div className="text-muted-foreground mb-3 font-medium">{resource.organization}</div>
                                )}
                                {resource.type && (
                                  <div className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full mb-3">
                                    {resource.type}
                                  </div>
                                )}
                                {resource.description && (
                                  <div className="text-muted-foreground mb-3 leading-relaxed">
                                    {resource.description}
                                  </div>
                                )}
                                <div className="space-y-2 text-sm">
                                  {resource.phone && (
                                    <div className="flex items-center gap-2 text-foreground">
                                      <Phone className="h-3 w-3 text-green-600" />
                                      <span className="font-medium">Phone:</span>
                                      <a 
                                        href={`tel:${resource.phone.replace(/[^\d]/g, '')}`}
                                        className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
                                      >
                                        {resource.phone}
                                      </a>
                                    </div>
                                  )}
                                  {resource.email && (
                                    <div className="flex items-center gap-2 text-foreground">
                                      <span className="text-blue-600">✉️</span>
                                      <span className="font-medium">Email:</span>
                                      <a 
                                        href={`mailto:${resource.email}`}
                                        className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
                                      >
                                        {resource.email}
                                      </a>
                                    </div>
                                  )}
                                  {resource.website && (
                                    <div className="flex items-center gap-2 text-foreground">
                                      <span className="text-purple-600">🌐</span>
                                      <span className="font-medium">Website:</span>
                                      <a 
                                        href={resource.website.startsWith('http') ? resource.website : `https://${resource.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium"
                                      >
                                        {resource.website}
                                      </a>
                                    </div>
                                  )}
                                  {resource.address && (
                                    <div className="flex items-center gap-2 text-foreground">
                                      <span className="text-red-600">📍</span>
                                      <span className="font-medium">Address:</span>
                                      <span className="text-muted-foreground">{resource.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.webResources && message.webResources.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider border-b border-orange-200 pb-1 flex items-center gap-2">
                            <Bot className="h-3 w-3" />
                            Additional Web Findings
                          </div>
                          <div className="space-y-3">
                            {message.webResources.map((resource, idx) => (
                              <div key={idx} className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-sm">
                                <div className="font-semibold text-foreground mb-1">{resource.name}</div>
                                <p className="text-muted-foreground leading-relaxed">{resource.description}</p>
                                <p className="text-[10px] text-muted-foreground mt-2 italic">
                                  ℹ️ Verified source not found in database. Please confirm services.
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 mb-6 justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 max-w-[80%] shadow-sm">
                    <div className="text-sm leading-relaxed">{message.content}</div>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 mb-6">
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="bg-muted/30 rounded-2xl px-4 py-3 border border-border/40">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t p-4 bg-background">
          <p className="text-sm font-medium mb-3">Quick help with common needs:</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs p-2 h-auto text-left justify-start"
                onClick={() => setInput(action)}
              >
                {action}
              </Button>
            ))}
          </div>
          
          {/* Input */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedCoach ? `What can ${selectedCoach.name.split(' ')[1]} help you with today?` : "What can Coach Kay help you with today?"}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                disabled={isLoading}
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {input.length} / {MAX_MESSAGE_LENGTH}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              Your success matters • Justice-friendly resources • Encouraging guidance every step
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs" 
                onClick={resetConversation}
              >
                New Chat
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs" 
                onClick={() => setShowEmailModal(true)}
              >
                Email Chat History
              </Button>
            </div>
          </div>

        </div>

        {/* Email Modal */}
        <EmailChatHistoryModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            if (pendingCloseRef.current) {
              finalizeClose();
              pendingCloseRef.current = false;
            }
          }}
          messages={messages}
          coachName={selectedCoach ? selectedCoach.name : 'Coach Kay'}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ReentryNavigatorAI;