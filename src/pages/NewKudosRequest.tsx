import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { buildPublicAppUrl } from '@/lib/public-url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ThumbsUp, ThumbsDown, BarChart3 } from 'lucide-react';
import Header from '@/components/Header';

type ScoringType = 'thumbs_up' | 'thumbs_up_down' | 'nps';

const NewKudosRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scoringType, setScoringType] = useState<ScoringType>('thumbs_up');
  const [expiresIn, setExpiresIn] = useState('3');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }

    setIsSubmitting(true);

    const days = parseInt(expiresIn);
    const maxDays = 7;
    const actualDays = Math.min(days, maxDays);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + actualDays);

    const { data, error } = await supabase
      .from('kudos_requests')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        scoring_type: scoringType,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create kudos request');
      setIsSubmitting(false);
      return;
    }

    const shareUrl = buildPublicAppUrl(`/k/${data.share_token}`);
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    toast.success('Kudos request created! Share link copied to clipboard.');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Kudos Request</CardTitle>
            <CardDescription>
              Ask people to share their feedback about something you did
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">What did you do?</Label>
                <Input
                  id="title"
                  placeholder="e.g., Helped onboard the new team member"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Additional context (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Any details you'd like respondents to know..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>How should people rate this?</Label>
                <RadioGroup
                  value={scoringType}
                  onValueChange={(v) => setScoringType(v as ScoringType)}
                  className="grid gap-3"
                >
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="thumbs_up" />
                    <ThumbsUp className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Thumbs Up Only</p>
                      <p className="text-xs text-muted-foreground">Simple positive endorsement</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="thumbs_up_down" />
                    <div className="flex gap-1">
                      <ThumbsUp className="w-4 h-4 text-primary" />
                      <ThumbsDown className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Thumbs Up / Down</p>
                      <p className="text-xs text-muted-foreground">Positive or negative feedback</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="nps" />
                    <BarChart3 className="w-5 h-5 text-accent" />
                    <div>
                      <p className="font-medium text-sm">NPS Score (0-10)</p>
                      <p className="text-xs text-muted-foreground">Detailed numerical rating</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Expires in</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days (max)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All requests expire after 7 days maximum
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create & Get Share Link
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewKudosRequest;
