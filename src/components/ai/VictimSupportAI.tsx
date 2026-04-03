import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Heart, Shield, Scale, DollarSign, Mail, Phone, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
  victimType?: string;
}

interface VictimSupportAIProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const VictimSupportAI: React.FC<VictimSupportAIProps> = ({ isOpen, onClose, initialQuery }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "I'm here to support you on your healing journey. What happened to you was not your fault, and seeking help shows tremendous strength.\n\nI'm trained to understand the unique challenges faced by crime victims and can help you find:\n\n*   Trauma-informed resources\n*   Legal advocacy\n*   Compensation programs\n*   Emotional support\n\nHow can I help you today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<Array<{role: string, content: string}>>([]);
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

  const sendMessage = async (messages: {role: string, content: string}[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('victim-support-ai', {
        body: {
          query: messages[messages.length - 1].content,
          victimType: 'general',
          traumaLevel: 'ongoing',
          previousContext: messages.slice(0, -1)
        }
      });
      
      if (error) throw error;
      
      // Update AI message with the response
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.type === 'ai') {
          lastMessage.content = data.response;
          lastMessage.resources = data.resources;
          lastMessage.webResources = data.webResources;
        }
        return newMessages;
      });
    } catch (error) {
      console.error('Victim Support AI error:', error);
      toast.error("I'm having trouble connecting. Showing offline resources.");

      // Fallback: update existing AI placeholder instead of adding new message
      try {
        const { data: resources } = await (supabase as any)
          .from('resources')
          .select('*')
          .or('category.ilike.%victim%,category.ilike.%legal aid%,category.ilike.%compensation%,category.ilike.%counseling%,category.ilike.%trauma%,category.ilike.%advocacy%,category.ilike.%domestic violence%,category.ilike.%sexual assault%')
          .eq('verified', true)
          .limit(8);

        const content = "I'm having trouble connecting to the AI right now, but here are trauma-informed victim services I found that may help:";
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'ai') {
            lastMessage.content = content;
            lastMessage.resources = (resources || []).map((r: any) => ({
              id: r.id,
              name: r.title,
              organization: r.organization || 'Community Resource',
              type: r.category || 'Support',
              description: r.description || undefined,
              website: r.website_url || undefined,
              phone: r.contact_info || undefined
            }));
          }
          return newMessages;
        });
      } catch (fallbackError) {
        console.error('Victim fallback failed:', fallbackError);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.type === 'ai') {
            lastMessage.content = "I apologize for the technical difficulty. Let me connect you with local victim services that can provide direct support.\n\nPlease visit your nearest **Family Justice Center** or contact local law enforcement victim advocacy services.";
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

    // Add empty AI message for streaming
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: 'Thinking...',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);

    // Update conversation context and send message
    const newContext = [...conversationContext, { role: 'user', content: userInput }];
    await sendMessage(newContext);
    
    setConversationContext([...newContext, { role: 'assistant', content: '' }]);
    setIsLoading(false);
  };

  const quickActions = [
    "Help me understand my legal rights",
    "I need financial assistance for medical bills", 
    "Find me trauma-informed counseling",
    "I need help with victim compensation",
    "Connect me to support groups",
    "I don't know where to start"
  ];

  const supportCategories = [
    { icon: Shield, label: "Safety & Crisis", color: "text-destructive" },
    { icon: Scale, label: "Legal Rights", color: "text-primary" },
    { icon: DollarSign, label: "Compensation", color: "text-secondary" },
    { icon: Heart, label: "Healing Support", color: "text-accent" }
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[700px] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Healing & Support Navigator</DialogTitle>
          <DialogDescription>Trauma-informed victim services and healing resources.</DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-foreground/20 rounded-lg">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg" id="victim-support-title">Healing & Support Navigator</h3>
              <p className="text-sm opacity-90" id="victim-support-description">Trauma-informed victim services and healing resources</p>
            </div>
          </div>
          <Button
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Static Safety Disclaimer */}
        <div className="bg-destructive/10 border-l-4 border-destructive px-4 py-2 mx-4 mt-2">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">If you're in immediate danger, call 911</p>
              <p className="text-muted-foreground">
                <strong>24/7 Crisis:</strong> 988 (suicide/crisis) • Text HOME to 741741
              </p>
            </div>
          </div>
        </div>

        {/* Support Categories */}
        <div className="bg-muted/50 border-b p-3">
          <div className="flex items-center justify-around text-xs">
            {supportCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div key={index} className="flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${category.color}`} />
                  <span className="font-medium">{category.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground border'
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

                {message.resources && message.resources.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground/80 flex items-center gap-2">
                      <Shield className="h-3 w-3 text-primary" />
                      Verified Healing Hub Resources:
                    </p>
                    {message.resources.map((resource) => (
                      <div key={resource.id} className="bg-card border rounded-lg p-3 text-xs">
                        <div className="font-semibold text-foreground">{resource.name}</div>
                        <div className="text-muted-foreground">{resource.organization}</div>
                        {resource.description && (
                          <p className="text-muted-foreground mt-1">{resource.description}</p>
                        )}
                        <Badge variant="outline" className="mt-1 text-xs">
                          {resource.type}
                        </Badge>
                        <div className="flex gap-2 mt-2">
                          {resource.phone && (
                            <Button asChild size="sm" variant="default">
                              <a href={`tel:${resource.phone}`}>
                                Call: {resource.phone}
                              </a>
                            </Button>
                          )}
                          {resource.website && (
                            <Button asChild size="sm" variant="outline">
                              <a href={resource.website} target="_blank" rel="noopener noreferrer">
                                Visit Website
                              </a>
                            </Button>
                          )}
                        </div>
                        {resource.city && resource.county && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {resource.city}, {resource.county} County
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {message.webResources && message.webResources.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-foreground/80 flex items-center gap-2">
                      <Bot className="h-3 w-3 text-orange-500" />
                      Latest Web Findings:
                    </p>
                    {message.webResources.map((resource, idx) => (
                      <div key={idx} className="bg-orange-50/30 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-xs">
                        <div className="font-semibold text-foreground">{resource.name}</div>
                        <p className="text-muted-foreground mt-1 leading-relaxed">{resource.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-2 italic">
                          ℹ️ Found via web search. Please verify services before use.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 border">
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
        <div className="border-t p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Common support areas:</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessages([{
                    id: '1',
                    type: 'ai',
                    content: "I'm here to support you in the Healing Hub. What happened to you was not your fault, and seeking help shows tremendous strength. I'm trained to understand the unique challenges faced by survivors and can help you find trauma-informed resources, legal advocacy, compensation programs, and emotional support. How can I help you today?",
                    timestamp: new Date(),
                  }]);
                  setConversationContext([]);
                  setInput('');
                }}
                className="text-xs"
              >
                New Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailModal(true)}
                className="text-xs"
              >
                <Mail className="h-3 w-3 mr-1" />
                Email History
              </Button>
            </div>
          </div>
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
                placeholder="Share what support you need..."
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
          <p className="text-xs text-muted-foreground mt-2">
            This conversation is private and confidential • Trauma-informed support
          </p>
        </div>
      </DialogContent>

      {/* Email Chat History Modal */}
      <EmailChatHistoryModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        messages={messages}
        coachName="Healing & Support Navigator"
      />
    </Dialog>
  );
};

export default VictimSupportAI;