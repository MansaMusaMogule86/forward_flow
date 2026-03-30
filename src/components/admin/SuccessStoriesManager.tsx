import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Award, Eye, Plus, Star, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AIStoryGenerator } from "@/components/ai/AIStoryGenerator";
import { logger } from "@/lib/logger";

interface SuccessStory {
  id: string;
  title: string;
  story: string;
  outcome: string | null;
  participant_name: string | null;
  participant_testimonial: string | null;
  impact_metrics: any;
  featured: boolean;
  published: boolean;
  created_at: string;
  published_at: string | null;
  partner_id: string;
}

export const SuccessStoriesManager = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    story: '',
    outcome: '',
    participant_name: '',
    participant_testimonial: '',
    published: false,
    featured: false
  });

  useEffect(() => {
    loadSuccessStories();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('success-stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'success_stories'
        },
        () => {
          loadSuccessStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSuccessStories = async () => {
    try {
      const { data, error } = await supabase
        .from('success_stories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error: any) {
      logger.error('Error loading success stories:', error);
      toast({
        title: "Error",
        description: "Failed to load success stories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createStory = async () => {
    if (!formData.title.trim() || !formData.story.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('success_stories')
        .insert({
          title: formData.title.trim(),
          story: formData.story.trim(),
          outcome: formData.outcome.trim() || null,
          participant_name: formData.participant_name.trim() || null,
          participant_testimonial: formData.participant_testimonial.trim() || null,
          published: formData.published,
          featured: formData.featured,
          published_at: formData.published ? new Date().toISOString() : null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Success story created",
      });

      // Reset form
      setFormData({
        title: '',
        story: '',
        outcome: '',
        participant_name: '',
        participant_testimonial: '',
        published: false,
        featured: false
      });
    } catch (error: any) {
      logger.error('Error creating success story:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create success story",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('success_stories')
        .update({
          published: !currentStatus,
          published_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Story ${!currentStatus ? 'published' : 'unpublished'}`,
      });
    } catch (error: any) {
      logger.error('Error toggling published status:', error);
      toast({
        title: "Error",
        description: "Failed to update story",
        variant: "destructive",
      });
    }
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('success_stories')
        .update({ featured: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Story ${!currentStatus ? 'featured' : 'unfeatured'}`,
      });
    } catch (error: any) {
      logger.error('Error toggling featured status:', error);
      toast({
        title: "Error",
        description: "Failed to update story",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const publishedCount = stories.filter(s => s.published).length;
  const featuredCount = stories.filter(s => s.featured).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Success Stories</h2>
          <p className="text-muted-foreground">
            Showcase impactful outcomes from partner referrals
          </p>
        </div>
        <div className="flex gap-2">
          <AIStoryGenerator onStoryGenerated={(story) => {
            setFormData({
              title: story.title,
              story: story.story,
              outcome: story.summary,
              participant_name: '',
              participant_testimonial: '',
              published: false,
              featured: false
            });
            toast({
              title: "Story Loaded",
              description: "AI-generated content has been loaded into the form",
            });
          }} />
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Story
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Success Story</DialogTitle>
                <DialogDescription>
                  Document and share a success story from your partnership work
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Story Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., From Incarceration to Employment Success"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="story">Story *</Label>
                  <Textarea
                    id="story"
                    value={formData.story}
                    onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                    placeholder="Tell the full story..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outcome">Outcome</Label>
                  <Textarea
                    id="outcome"
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    placeholder="What was the result?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participant_name">Participant Name (Optional)</Label>
                  <Input
                    id="participant_name"
                    value={formData.participant_name}
                    onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
                    placeholder="John D."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testimonial">Participant Testimonial (Optional)</Label>
                  <Textarea
                    id="testimonial"
                    value={formData.participant_testimonial}
                    onChange={(e) => setFormData({ ...formData, participant_testimonial: e.target.value })}
                    placeholder="Quote from participant"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={formData.published}
                      onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                    />
                    <Label htmlFor="published">Publish immediately</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                    />
                    <Label htmlFor="featured">Feature on homepage</Label>
                  </div>
                </div>

                <Button onClick={createStory} disabled={creating} className="w-full">
                  {creating ? 'Creating...' : 'Create Success Story'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stories</p>
                <p className="text-2xl font-bold">{stories.length}</p>
              </div>
              <Award className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{publishedCount}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold">{featuredCount}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stories List */}
      <div className="space-y-4">
        {stories.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No success stories yet</p>
            </CardContent>
          </Card>
        ) : (
          stories.map((story) => (
            <Card key={story.id} className="hover-scale">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{story.title}</CardTitle>
                    <CardDescription>
                      {new Date(story.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {story.published && (
                      <Badge variant="default">Published</Badge>
                    )}
                    {story.featured && (
                      <Badge variant="secondary">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{story.story.substring(0, 200)}...</p>
                
                {story.participant_name && (
                  <div className="text-sm">
                    <span className="font-medium">Participant: </span>
                    {story.participant_name}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={story.published ? "outline" : "default"}
                    onClick={() => togglePublished(story.id, story.published)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {story.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant={story.featured ? "outline" : "secondary"}
                    onClick={() => toggleFeatured(story.id, story.featured)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    {story.featured ? 'Unfeature' : 'Feature'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
