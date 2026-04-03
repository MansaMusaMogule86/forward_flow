import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, MessageSquare, X, Send, Mic, MicOff, Bot, HeartHandshake, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import EmailChatHistoryModal from '@/components/ai/EmailChatHistoryModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MAX_MESSAGE_LENGTH = 4000;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
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
}

interface CrisisEmergencyBotProps {
  trigger?: React.ReactNode;
}

export const CrisisEmergencyBot = ({ trigger }: CrisisEmergencyBotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [conversationContext, setConversationContext] = useState<Array<{role: string, content: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const connectToCrisisBot = async () => {
    try {
      setIsLoading(true);
      
      // Initialize with crisis support greeting focused on Ohio resources
      addMessage(
        "Hi, I'm your Crisis Emergency Support AI Assistant serving all 88 counties across Ohio.\n\nI'm here to provide immediate, compassionate support with:\n\n*   **AI-Enhanced Crisis Support** - Intelligent guidance tailored to your specific situation\n*   **Trauma-Informed Care** - Every interaction designed with safety, trust, and empowerment\n*   **Ohio-Wide Resources** - Access to crisis services across all Ohio counties\n*   **Immediate Connection** - Direct links to local support in your area\n\nI'm here to listen and help you find the right support. What's bringing you here today?",
        false
      );
      
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting to crisis bot:', error);
      addMessage("I'm sorry, I'm having trouble connecting right now. Let me help you find local Ohio crisis resources.", false);
    } finally {
      setIsLoading(false);
    }
  };

  // Real AI integration for crisis support
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !isConnected) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage(userMessage, true);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('crisis-emergency-ai', {
        body: {
          query: userMessage,
          urgencyLevel: 'moderate',
          previousContext: conversationContext
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      // Add AI response message with resources
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        resources: data.resources,
        webResources: data.webResources
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Update conversation context
      setConversationContext(prev => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.response }
      ]);
      
    } catch (error) {
      console.error('Crisis Emergency AI error:', error);
      addMessage("I apologize for the technical difficulty. Let me help connect you with local Ohio crisis resources and support services.", false);
    }
    
    setIsLoading(false);
  }, [inputValue, isConnected, conversationContext]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    // Voice functionality would be implemented here
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      connectToCrisisBot();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
            <Phone className="h-4 w-4 mr-2" />
            Crisis Support
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 bg-destructive text-destructive-foreground border-b">
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Crisis Emergency Support
          </DialogTitle>
          <p className="text-sm opacity-90">Immediate AI-powered crisis support for Ohio residents</p>
        </DialogHeader>

        {/* Static Crisis Disclaimer */}
        <div className="bg-destructive/10 border-l-4 border-destructive px-4 py-3 mx-4 mt-2">
          <div className="flex gap-2">
            <Phone className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">This is NOT a replacement for emergency services</p>
              <p className="text-muted-foreground">
                <strong>If you're in immediate danger:</strong> Call 911 right now
              </p>
              <p className="text-muted-foreground">
                <strong>Suicide/Crisis Support:</strong> Call or text 988 • Text HOME to 741741
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-line leading-relaxed prose dark:prose-invert max-w-none">
                      {message.isUser ? (
                        message.text
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
                          {message.text}
                        </ReactMarkdown>
                      )}
                    </div>
                    
                    {message.resources && message.resources.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-foreground/80">Verified Ohio Resources:</p>
                        {message.resources.map((resource) => (
                          <div key={resource.id} className="bg-card border rounded-lg p-3 text-xs">
                            <div className="font-semibold text-foreground">{resource.name}</div>
                            <div className="text-muted-foreground">{resource.organization}</div>
                            {resource.description && (
                              <p className="text-muted-foreground mt-1">{resource.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {resource.phone && (
                                <Button asChild size="sm" variant="destructive">
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
                          <Bot className="h-4 w-4 text-orange-500" />
                          Web Search Results:
                        </p>
                        {message.webResources.map((resource, idx) => (
                          <div key={idx} className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-xs">
                            <div className="font-semibold text-foreground">{resource.name}</div>
                            <p className="text-muted-foreground mt-1 leading-relaxed">{resource.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-2 italic">
                              ℹ️ Additional help found via web search.
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <span className="text-xs opacity-70 mt-2 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-xs">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Heart className="h-4 w-4 text-destructive animate-pulse" />
                      <span>AI is thinking...</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Crisis Emergency Support</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMessages([]);
                    setConversationContext([]);
                    setInputValue('');
                    connectToCrisisBot();
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
                  Email History
                </Button>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tell me what's happening..."
                  disabled={!isConnected || isLoading}
                  className="flex-1"
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                <Button
                  onClick={handleVoiceToggle}
                  variant="outline"
                  size="icon"
                  className={isListening ? "bg-destructive/10" : ""}
                  disabled
                  title="Voice feature coming soon"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || !isConnected || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {inputValue.length} / {MAX_MESSAGE_LENGTH}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Available 24/7 • Confidential • Ohio-wide support</span>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-destructive" />
                <span>You matter</span>
              </div>
            </div>
          </div>
        </div>
        
        <EmailChatHistoryModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          messages={messages.map(msg => ({
            id: msg.id,
            type: msg.isUser ? 'user' : 'ai' as const,
            content: msg.text,
            timestamp: msg.timestamp
          }))}
          coachName="Crisis Emergency Support"
        />
      </DialogContent>
    </Dialog>
  );
};