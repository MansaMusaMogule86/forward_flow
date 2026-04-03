import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Bot, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MAX_MESSAGE_LENGTH = 4000;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const PartnerSupportChatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('partner-support-chat', {
        body: { messages: [...messages, userMessage] }
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to get response');

      setMessages(prev => [...prev, { role: 'assistant', content: data.content || data.response || '' }]);
    } catch (error: any) {
      console.error('Error in chat:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[600px] max-h-[70vh] md:max-h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Partner Support Assistant
          {user && (
            <Badge variant="secondary" className="text-xs">
              Authenticated
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="space-y-2">
          <span className="block">Ask questions about referrals, verification, or partner features</span>
          <span className="text-xs text-muted-foreground italic">This assistant provides general guidance about partner features.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="h-[400px] md:h-[450px] p-2 md:p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Hello! I'm here to help partners with any questions.</p>
                <p className="text-sm mt-2">Ask me about submitting referrals, verification, or anything else!</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm leading-relaxed prose dark:prose-invert max-w-none">
                    {msg.role === 'user' ? (
                      msg.content
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
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t space-y-1">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type your question..."
              disabled={loading}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {input.length} / {MAX_MESSAGE_LENGTH}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
