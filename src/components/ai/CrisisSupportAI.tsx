import React, { useState, useRef, useEffect } from 'react';
import { Send, Heart, Shield, Phone, MessageSquare, Mail, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmailChatHistoryModal from './EmailChatHistoryModal';
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
    website?: string;
    type: string;
    description?: string;
    city?: string;
    county?: string;
  }>;
  webResources?: Array<{
    name: string;
    description: string;
    type: string;
    source: string;
  }>;
  urgencyLevel?: 'immediate' | 'urgent' | 'moderate' | 'informational';
}

interface CrisisSupportAIProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const CrisisSupportAI: React.FC<CrisisSupportAIProps> = ({ isOpen, onClose, initialQuery }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi, I'm Alex, your crisis support companion. I'm here to listen and help you find immediate support. Your safety matters deeply to me. If you're in immediate danger, please call **911** right now.\n\nCan you tell me what's bringing you here today? I want to understand so I can help you best.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<Array<{role: string, content: string}>>([]);
  const [hasAskedSafety, setHasAskedSafety] = useState(false);
  const [userResponse, setUserResponse] = useState<string[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const sendMessage = async (userQuery: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing in CrisisSupportAI');
        throw new Error('Service temporarily unavailable');
      }

      // Determine urgency level based on content
      const urgencyLevel = determineUrgency(userQuery);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/crisis-support-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          query: createPersonalizedQuery(userQuery),
          urgencyLevel,
          previousContext: conversationContext
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update AI message with the response
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.type === 'ai') {
          lastMessage.content = data.response;
          lastMessage.resources = data.resources;
          lastMessage.webResources = data.webResources;
          lastMessage.urgencyLevel = data.urgencyLevel;
        }
        return newMessages;
      });
      
      // Update conversation context
      setConversationContext(prev => [
        ...prev,
        { role: 'user', content: userQuery },
        { role: 'assistant', content: data.response }
      ]);
      
      // Track user responses for follow-up questions
      setUserResponse(prev => [...prev, userQuery]);
    } catch (error) {
      console.error('Crisis AI error:', error);
      toast.error("I'm having trouble connecting right now. Switching to offline support mode.");

      // Fallback: client-side crisis resource lookup so users still get help
      try {
        const { data: resources } = await supabase
          .from('resources')
          .select('*')
          .or('type.ilike.%crisis%,type.ilike.%emergency%,type.ilike.%mental health%,type.ilike.%suicide%,type.ilike.%domestic violence%,type.ilike.%substance abuse%')
          .eq('verified', true)
          .limit(8);

        const content = "I'm experiencing technical difficulties, but your safety is my priority.\n\nFor immediate support:\n\n*   **Emergency:** Call 911\n*   **Suicide & Crisis:** Call 988\n*   **Crisis Text Line:** Text HOME to 741741\n\nHere are crisis resources I found:";
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
        console.error('Crisis fallback failed:', fallbackError);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'ai') {
            lastMessage.content = "I'm experiencing technical difficulties. For immediate crisis support:\n\n*   Call **911** for emergencies\n*   Call **988** for suicide crisis support\n*   Text **HOME** to **741741**";
          }
          return newMessages;
        });
      }
    }
  };

  const determineUrgency = (query: string): 'immediate' | 'urgent' | 'moderate' | 'informational' => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('suicide') || lowerQuery.includes('kill myself') || lowerQuery.includes('end my life') || lowerQuery.includes('hurt myself')) {
      return 'immediate';
    }
    if (lowerQuery.includes('abuse') || lowerQuery.includes('threatening') || lowerQuery.includes('unsafe') || lowerQuery.includes('danger')) {
      return 'urgent';
    }
    if (lowerQuery.includes('crisis') || lowerQuery.includes('emergency') || lowerQuery.includes('help')) {
      return 'moderate';
    }
    return 'informational';
  };
  
  const createPersonalizedQuery = (query: string): string => {
    const safetyQuestions = !hasAskedSafety ? " Alex should ask about immediate safety and current situation." : "";
    const context = userResponse.length > 0 ? ` Previous responses: ${userResponse.join(', ')}` : "";
    return `User says: "${query}". Alex (crisis counselor) should respond with empathy, assess safety, and ask probing questions.${safetyQuestions}${context}`;
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
    
    if (!hasAskedSafety) setHasAskedSafety(true);

    // Add empty AI message for response
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: 'Alex is thinking...',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);

    await sendMessage(userInput);
    setIsLoading(false);
  };

  const quickActions = [
    "I'm having thoughts of suicide",
    "I'm in an abusive relationship", 
    "I need emergency shelter",
    "I'm having a panic attack",
    "Someone is threatening me",
    "I need someone to talk to right now"
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Crisis Support AI Chat</DialogTitle>
          <DialogDescription>Your compassionate crisis companion, available 24/7.</DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="flex items-center justify-between bg-destructive p-4 text-destructive-foreground shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive-foreground/20 rounded-lg">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg" id="crisis-support-title">Coach Kay - Crisis Support</h3>
              <p className="text-sm opacity-90" id="crisis-support-description">Your compassionate crisis companion, available 24/7</p>
            </div>
          </div>
        </div>

        {/* Static Safety Disclaimer */}
        <div className="bg-destructive/10 border-l-4 border-destructive px-4 py-2 mx-4 mt-2">
          <div className="flex gap-2">
            <Phone className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">This is NOT a replacement for emergency services</p>
              <p className="text-muted-foreground">
                <strong>Immediate danger:</strong> Call 911 now • <strong>Crisis:</strong> 988 or text HOME to 741741
              </p>
            </div>
          </div>
        </div>

        {/* Support Categories */}
        <div className="bg-muted/50 border-b p-3 shrink-0">
          <div className="flex items-center justify-around text-xs">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-destructive" />
              <span className="font-medium">Crisis Support</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-primary" />
              <span className="font-medium">Safety Planning</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-secondary" />
              <span className="font-medium">Ohio Resources</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3 sm:p-4 max-h-[50vh]">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-4 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-foreground'
                }`}>
                  <div className="text-sm leading-relaxed prose dark:prose-invert max-w-none">
                    {message.type === 'user' ? (
                      message.content
                    ) : (
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
                    )}
                  </div>
                  
                  {message.urgencyLevel && (
                    <Badge 
                      variant={message.urgencyLevel === 'immediate' ? 'destructive' : 
                              message.urgencyLevel === 'urgent' ? 'secondary' : 'outline'} 
                      className="mt-2"
                    >
                      {message.urgencyLevel} priority
                    </Badge>
                  )}

                  {message.resources && message.resources.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">Verified Crisis Resources:</p>
                      <div className="grid gap-2">
                        {message.resources.map((resource) => (
                          <div key={resource.id} className="bg-card border rounded-lg p-3 text-sm">
                            <div className="font-semibold text-foreground">{resource.name}</div>
                            <div className="text-muted-foreground text-xs">{resource.organization}</div>
                            {resource.description && (
                              <p className="text-muted-foreground mt-1 text-xs">{resource.description}</p>
                            )}
                            <div className="flex gap-2 mt-3">
                              {resource.phone && (
                                <Button asChild size="sm" variant="destructive" className="h-8">
                                  <a href={`tel:${resource.phone}`}>
                                    <Phone className="h-3 w-3 mr-1" />
                                    Call Now
                                  </a>
                                </Button>
                              )}
                              {resource.website && (
                                <Button asChild size="sm" variant="outline" className="h-8">
                                  <a href={resource.website} target="_blank" rel="noopener noreferrer">
                                    Visit Website
                                  </a>
                                </Button>
                              )}
                            </div>
                            {resource.city && resource.county && (
                              <div className="text-xs text-muted-foreground mt-2">
                                {resource.city}, {resource.county} County
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.webResources && message.webResources.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Bot className="h-4 w-4 text-orange-500" />
                        Web Search Support Results:
                      </p>
                      <div className="grid gap-2">
                        {message.webResources.map((resource, idx) => (
                          <div key={idx} className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-sm">
                            <div className="font-semibold text-foreground">{resource.name}</div>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{resource.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-2 italic">
                              ℹ️ Additional help found via web search.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 max-w-[85%]">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4 text-destructive animate-pulse" />
                    <span>Coach Kay is listening and thinking...</span>
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Actions & Input */}
        <div className="border-t p-4 space-y-4 shrink-0">
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              How can Coach Kay help you right now?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs p-3 h-auto text-left justify-start hover:bg-destructive/5"
                  onClick={() => setInput(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Input */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell Alex what's on your mind..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={isLoading}
                className="flex-1 h-11 sm:h-12"
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="shrink-0 h-11 w-11 sm:h-12 sm:w-12">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {input.length} / {MAX_MESSAGE_LENGTH}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Coach Kay is here 24/7 • Confidential • Trauma-informed support</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMessages([{
                    id: '1',
                    type: 'ai',
                    content: "Hi, I'm Alex, your crisis support companion at Forward Focus Elevation. I'm here to listen and help you find immediate support. Your safety matters deeply to me. Can you tell me what's bringing you here today? I want to understand so I can help you best.",
                    timestamp: new Date(),
                  }]);
                  setConversationContext([]);
                  setInput('');
                }}
                className="text-xs h-6 px-2"
              >
                New Chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmailModal(true)}
                className="text-xs h-6 px-2"
              >
                <Mail className="h-3 w-3 mr-1" />
                Email History
              </Button>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-destructive" />
                <span>You matter</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Email Chat History Modal */}
      <EmailChatHistoryModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        messages={messages}
        coachName="Coach Kay - Crisis Support"
      />
    </Dialog>
  );
};

export default CrisisSupportAI;