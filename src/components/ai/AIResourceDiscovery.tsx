import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bot, User, Phone, Globe, MapPin, Star, Shield, Mail, RotateCcw, History, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EmailChatHistoryModal from './EmailChatHistoryModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MAX_MESSAGE_LENGTH = 4000;

const SEARCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'for', 'from', 'help', 'i', 'in', 'is', 'me', 'my', 'need', 'of', 'on', 'or', 'services', 'support', 'the', 'to', 'with'
]);

const SEARCH_SYNONYMS: Record<string, string[]> = {
  addiction: ['recovery', 'substance', 'treatment'],
  counseling: ['therapy', 'behavioral', 'wellness'],
  expungement: ['record', 'sealing', 'legal'],
  food: ['meals', 'pantry', 'nutrition'],
  housing: ['shelter', 'rent', 'landlord'],
  jobs: ['employment', 'training', 'career'],
  legal: ['attorney', 'court', 'rights'],
  mental: ['counseling', 'crisis', 'therapy', 'wellness'],
  reentry: ['returning', 'justice', 'employment'],
  trauma: ['healing', 'counseling', 'crisis'],
  victim: ['survivor', 'advocacy', 'compensation'],
};

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  curatedResources?: Resource[];
  webResources?: Resource[];
  usedWebFallback?: boolean;
}

interface Resource {
  id?: string;
  name: string;
  title?: string;
  organization?: string;
  category?: string;
  type?: string;
  city?: string;
  county?: string;
  state?: string;
  description?: string;
  phone?: string;
  website_url?: string;
  email?: string;
  address?: string;
  verified?: boolean;
  justice_friendly?: boolean;
  rating?: number;
  source?: 'database' | 'perplexity';
}

interface AIResourceDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  location?: string;
  county?: string;
}

const normalizeResource = (resource: Record<string, any>): Resource => ({
  id: resource.id,
  name: resource.name || resource.title || resource.organization || 'Community Resource',
  title: resource.title,
  organization: resource.organization,
  category: resource.category,
  type: resource.type,
  city: resource.city,
  county: resource.county,
  state: resource.state || resource.state_code,
  description: resource.description,
  phone: resource.phone,
  website_url: resource.website_url,
  email: resource.email,
  address: resource.address,
  verified: resource.verified,
  justice_friendly: resource.justice_friendly,
  rating: resource.rating,
  source: resource.source,
});

const getSearchTokens = (query: string) => {
  const baseTokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 2 && !SEARCH_STOP_WORDS.has(token));

  const expandedTokens = new Set(baseTokens);

  for (const token of baseTokens) {
    for (const synonym of SEARCH_SYNONYMS[token] || []) {
      expandedTokens.add(synonym);
    }
  }

  return Array.from(expandedTokens);
};

const buildResourceOrFilter = (tokens: string[]) => {
  return tokens
    .flatMap((token) => [
      `title.ilike.%${token}%`,
      `organization.ilike.%${token}%`,
      `category.ilike.%${token}%`,
      `description.ilike.%${token}%`,
    ])
    .join(',');
};

const sanitizeQueryForDisplay = (query: string) => {
  const normalized = query.replace(/[“”]/g, '"').trim();
  const unwrapped = normalized.replace(/^['"]+|['"]+$/g, '').trim();
  return unwrapped || normalized;
};

const matchesLocation = (resource: Resource, location?: string, county?: string) => {
  const countyValue = county?.toLowerCase().trim();
  const locationValue = location?.toLowerCase().trim();

  if (countyValue && !`${resource.county ?? ''}`.toLowerCase().includes(countyValue)) {
    return false;
  }

  if (!locationValue) {
    return true;
  }

  const locationFields = [resource.city, resource.county, resource.state, resource.address]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return locationFields.includes(locationValue);
};

const scoreResource = (resource: Resource, tokens: string[]) => {
  const haystack = [
    resource.name,
    resource.title,
    resource.organization,
    resource.category,
    resource.type,
    resource.description,
    resource.city,
    resource.county,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = resource.verified ? 4 : 0;
  score += resource.justice_friendly ? 3 : 0;

  for (const token of tokens) {
    if (resource.name?.toLowerCase().includes(token)) score += 6;
    if (resource.category?.toLowerCase().includes(token)) score += 5;
    if (resource.type?.toLowerCase().includes(token)) score += 5;
    if (resource.description?.toLowerCase().includes(token)) score += 2;
    if (haystack.includes(token)) score += 1;
  }

  return score;
};

const formatFallbackResponse = (resources: Resource[], query: string, location?: string, county?: string) => {
  const displayQuery = sanitizeQueryForDisplay(query);

  if (resources.length === 0) {
    return [
      `I could not find a strong match for "${displayQuery}" in our current resource directory.`,
      county || location ? `I checked for matches near ${county ?? location}.` : 'I checked our current Ohio resource directory.',
      'Try using a more specific need like housing, legal aid, counseling, expungement, victim services, food assistance, or job training.'
    ].join(' ');
  }

  const intro = county || location
    ? `I found ${resources.length} resource${resources.length === 1 ? '' : 's'} that look relevant for ${county ?? location}.`
    : `I found ${resources.length} Ohio resource${resources.length === 1 ? '' : 's'} that look relevant to your request.`;

  const bullets = resources
    .slice(0, 4)
    .map(resource => {
      const details = [resource.city, resource.county ? `${resource.county} County` : undefined].filter(Boolean).join(', ');
      return `- **${resource.name}**${details ? ` (${details})` : ''}: ${resource.description || resource.type || resource.category || 'Resource information available in the card below.'}`;
    })
    .join('\n');

  return `${intro}\n\n${bullets}\n\nIf you want, I can narrow this down further by county, age group, urgency, or resource type.`;
};

const AIResourceDiscovery: React.FC<AIResourceDiscoveryProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  location,
  county
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && initialQuery && messages.length === 0) {
      handleSend(initialQuery);
    }
  }, [isOpen, initialQuery]);

  const sendMessage = async (query: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-resource-discovery', {
        body: {
          query,
          location: location,
          county: county,
          resourceType: undefined,
          limit: 10
        }
      });

      if (error) {
        console.error('AI Resource Discovery error:', error);
        throw new Error(error.message);
      }

      const curatedResources = Array.isArray(data.curatedResources || data.resources)
        ? (data.curatedResources || data.resources).map(normalizeResource)
        : [];

      // Create AI message with the response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || 'I found some resources for you.',
        timestamp: new Date(),
        curatedResources,
        webResources: Array.isArray(data.webResources) ? data.webResources.map(normalizeResource) : [],
        usedWebFallback: data.usedWebFallback || false
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('AI Resource Discovery error:', error);
      throw error;
    }
  };

  const handleSend = async (queryText?: string) => {
    if (isLoading) return;

    const query = queryText || inputValue.trim();
    if (!query) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      await sendMessage(query);
    } catch (error) {
      console.error('Error getting AI response:', error);

      toast({
        title: "AI Assistant Temporarily Unavailable",
        description: "I'm searching our database directly for you instead.",
        variant: "default",
      });

      // Fallback: client-side resource lookup
      try {
        const tokens = getSearchTokens(query);

        const targetedFilter = buildResourceOrFilter(tokens);
        let fallbackRequest = supabase
          .from('resources')
          .select('*')
          .limit(50);

        if (targetedFilter) {
          fallbackRequest = fallbackRequest.or(targetedFilter);
        }

        let { data: allResources, error: fallbackQueryError } = await fallbackRequest;

        if ((!allResources || allResources.length === 0) && tokens.length > 0) {
          const broadFallback = await supabase
            .from('resources')
            .select('*')
            .limit(150);

          allResources = broadFallback.data;
          fallbackQueryError = broadFallback.error;
        }

        if (fallbackQueryError) {
          throw fallbackQueryError;
        }

        const fallbackResources = (allResources || [])
          .map(normalizeResource)
          .filter((resource) => matchesLocation(resource, location, county))
          .map((resource) => ({ resource, score: scoreResource(resource, tokens) }))
          .filter(({ score, resource }) => score > 0 || tokens.length === 0 || resource.verified || resource.justice_friendly)
          .sort((left, right) => right.score - left.score)
          .map(({ resource }) => resource)
          .slice(0, 8);

        const content = formatFallbackResponse(fallbackResources, query, location, county);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content,
          timestamp: new Date(),
          curatedResources: fallbackResources || [],
          webResources: []
        };

        setMessages(prev => [...prev, aiMessage]);
      } catch (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "I'm experiencing technical difficulties. Please try refreshing the page or contact support for assistance with finding resources.",
          timestamp: new Date()
        }]);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    setIsTyping(false);
  };

  const handleEmailHistory = () => {
    if (messages.length === 0) {
      toast({
        title: "No chat history",
        description: "Start a conversation to save your chat history.",
        variant: "default",
      });
      return;
    }
    setShowEmailModal(true);
  };

  const ResourceCard = ({ resource }: { resource: Resource }) => (
    <Card className="mb-3 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">{resource.name}</CardTitle>
            {resource.organization && (
              <p className="text-sm text-muted-foreground">{resource.organization}</p>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {resource.verified && (
              <Badge variant="default" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {resource.justice_friendly && (
              <Badge variant="secondary" className="text-xs">Justice-Friendly</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {resource.city && resource.county && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{resource.city}, {resource.county} County</span>
              {resource.type && (
                <Badge variant="outline" className="text-xs">{resource.type}</Badge>
              )}
            </div>
          )}

          {resource.description && (
            <p className="text-sm text-foreground leading-relaxed">{resource.description}</p>
          )}

          <div className="flex gap-2 pt-2 flex-wrap">
            {resource.phone && (
              <Button size="sm" variant="outline" className="h-8 px-3 text-sm" asChild>
                <a href={`tel:${resource.phone.replace(/[^\d]/g, '')}`}>
                  <Phone className="h-3 w-3 mr-2" />
                  Call
                </a>
              </Button>
            )}
            {resource.email && (
              <Button size="sm" variant="outline" className="h-8 px-3 text-sm" asChild>
                <a href={`mailto:${resource.email}`}>
                  <Mail className="h-3 w-3 mr-2" />
                  Email
                </a>
              </Button>
            )}
            {resource.website_url && (
              <Button size="sm" variant="outline" className="h-8 px-3 text-sm" asChild>
                <a href={resource.website_url.startsWith('http') ? resource.website_url : `https://${resource.website_url}`} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-3 w-3 mr-2" />
                  Website
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const WebResourceCard = ({ resource }: { resource: Resource }) => (
    <Card className="mb-3 border-l-4 border-l-orange-500 shadow-sm bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-base font-semibold text-foreground">{resource.name}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 dark:text-orange-400">
              Web Result - Not Verified
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {resource.description && (
            <p className="text-sm text-foreground leading-relaxed">{resource.description}</p>
          )}
          <p className="text-xs text-muted-foreground italic border-l-2 border-orange-300 pl-2">
            ℹ️ This result was found via web search. Please verify credentials and services before use.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const suggestedQueries = [
    "Find housing assistance in my area",
    "I need help with food and basic needs",
    "Looking for job training programs",
    "Need legal aid for family issues",
    "Mental health support services",
    "Help for someone coming home from prison"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideClose className="max-w-5xl max-h-[90vh] h-[90vh] p-0 flex flex-col" aria-describedby="ai-discovery-description">
        <div className="sr-only">
          <h2 id="ai-discovery-dialog-title">AI Resource Discovery Chat</h2>
        </div>
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-osu-scarlet" />
              AI Resource Discovery
              {(location || county) && (
                <Badge variant="outline" className="ml-2 border-osu-scarlet/30 text-osu-scarlet bg-osu-scarlet/5">
                  {location || county}
                </Badge>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Close AI Resource Discovery"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription id="ai-discovery-description">
            Get personalized resource recommendations using AI based on your specific needs and location
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 p-6 pt-2 bg-gradient-subtle">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-osu-scarlet mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Hi! I'm your AI Resource Navigator</h3>
                  <p className="text-muted-foreground mb-6">
                    I can help you find resources and support services across all 88 Ohio counties.
                    Just tell me what you need!
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Try asking about:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestedQueries.map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-left justify-start h-auto p-3 text-sm hover:bg-primary/10"
                        disabled={isLoading}
                        onClick={() => handleSend(query)}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-osu-scarlet rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-osu-scarlet-foreground" />
                      </div>
                    )}

                    <div className={`max-w-[75%] space-y-3 ${message.type === 'user' ? 'order-first' : ''}`}>
                      <div className={`p-4 rounded-lg ${message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted/50 border border-border'
                        }`}>
                        {message.type === 'ai' ? (
                          <div className="text-sm leading-relaxed prose dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ node, ...props }) => <a {...props} className="text-primary hover:text-primary/80 underline font-medium" target="_blank" rel="noopener noreferrer" />,
                                p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                                ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-4 mb-2" />,
                                ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-4 mb-2" />,
                                li: ({ node, ...props }) => <li {...props} className="mb-1" />,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>

                      {message.curatedResources && message.curatedResources.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            Verified Partners ({message.curatedResources.length})
                          </h4>
                          <div className="space-y-3">
                            {message.curatedResources.map((resource, idx) => (
                              <ResourceCard key={resource.id || idx} resource={resource} />
                            ))}
                          </div>
                        </div>
                      )}

                      {message.webResources && message.webResources.length > 0 && (
                        <div className="space-y-3 mt-4">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-orange-600" />
                            <h4 className="text-base font-semibold text-foreground">
                              Additional Web Results ({message.webResources.length})
                            </h4>
                          </div>
                          <div className="bg-orange-50/30 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-3">
                              ⚠️ These results were found via web search and have not been verified by Forward Focus.
                              Please confirm credentials and services before using.
                            </p>
                            <div className="space-y-3">
                              {message.webResources.map((resource, idx) => (
                                <WebResourceCard key={idx} resource={resource} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {message.type === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted/50 border border-border p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">Searching for resources...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t border-border bg-background/95 backdrop-blur-sm flex-shrink-0 space-y-1">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me about resources, services, or support in Ohio..."
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                disabled={isLoading}
                className="flex-1"
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !inputValue.trim()}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {inputValue.length} / {MAX_MESSAGE_LENGTH}
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="flex items-center gap-2 text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                New Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailHistory}
                className="flex items-center gap-2 text-sm"
              >
                <History className="h-4 w-4" />
                Email History
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Email History Modal */}
      <EmailChatHistoryModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        messages={messages}
        coachName="AI Resource Navigator"
      />
    </Dialog>
  );
};

export default AIResourceDiscovery;