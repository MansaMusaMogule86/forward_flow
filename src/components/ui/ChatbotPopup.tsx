import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Bot, User, RotateCcw, History, Mail } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import EmailChatHistoryModal from "@/components/ai/EmailChatHistoryModal";

const MAX_MESSAGE_LENGTH = 4000;

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const ChatbotPopup = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Coach Kay, your crisis-support navigator here at Forward Focus Elevation. I'm here to help you find local resources and support in Columbus, Ohio. How can I assist you today?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messages: {role: string, content: string}[]) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('coach-k', {
        body: { messages }
      });

      if (error) throw error;
      if (!data) throw new Error('No response from Coach Kay');

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.isBot) {
          lastMessage.text = data.content || data.response || '';
        }
        return newMessages;
      });
      scrollToBottom();
    } catch (error) {
      console.error('Coach K error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: error instanceof Error && error.message ? 
          `Error: ${error.message}` : 
          "Sorry, I can't reach the server right now. Please try again in a moment.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Add empty AI message for streaming
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: '',
      isBot: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);

    // Convert messages to OpenAI format
    const chatMessages = messages.map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: msg.text
    }));
    
    // Add the new user message
    chatMessages.push({ role: 'user', content: userInput });

    await sendMessage(chatMessages);
    setIsLoading(false);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: '1',
        text: "Hi! I'm Coach Kay, your crisis-support navigator here at Forward Focus Elevation. I'm here to help you find local resources and support in Columbus, Ohio. How can I assist you today?",
        isBot: true,
        timestamp: new Date()
      }
    ]);
    setInputMessage("");
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="lg" 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Connect with Coach Kay
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Support Chat
          </DialogTitle>
          <DialogDescription className="sr-only">Chat with Coach Kay for support resources and guidance.</DialogDescription>
        </DialogHeader>

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 px-4 py-3">
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Important:</strong> This AI provides guidance and resources, not professional counseling or emergency services. If you're in crisis, call <strong>988</strong> or <strong>911</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-end gap-2 px-1">
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="h-7 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              New Chat
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowEmailModal(true)} className="h-7 text-xs">
              <Mail className="h-3 w-3 mr-1" />
              Email History
            </Button>
          </div>
          <ScrollArea className="h-80 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {message.isBot && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.isBot
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.text}
                  </div>
                  {!message.isBot && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <Button onClick={handleSendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {inputMessage.length} / {MAX_MESSAGE_LENGTH}
            </div>
          </div>
        </div>
      </DialogContent>

      <EmailChatHistoryModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        messages={messages.map(msg => ({
          id: msg.id,
          type: msg.isBot ? 'ai' : 'user',
          content: msg.text,
          timestamp: msg.timestamp
        }))}
        coachName="Coach Kay"
      />
    </Dialog>
  );
};

export default ChatbotPopup;