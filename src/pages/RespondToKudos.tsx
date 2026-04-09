import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Heart, ThumbsUp, ThumbsDown, CheckCircle2, Clock } from 'lucide-react';

type KudosRequest = {
  id: string;
  title: string;
  description: string | null;
  scoring_type: 'thumbs_up' | 'thumbs_up_down' | 'nps';
  expires_at: string;
};

const RespondToKudos = () => {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<KudosRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!token) return;
      const { data, error } = await supabase
        .rpc('get_kudos_request_by_token', { _share_token: token })
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setRequest(data);
      setLoading(false);
    };
    fetchRequest();
  }, [token]);

  const handleSubmit = async () => {
    if (score === null || !request) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('kudos_responses').insert({
      kudos_request_id: request.id,
      score,
      comment: comment.trim() || null,
      respondent_name: respondentName.trim() || null,
    });

    if (error) {
      toast.error('Failed to submit feedback');
      setIsSubmitting(false);
      return;
    }

    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Not Found</h2>
            <p className="text-muted-foreground">This kudos request doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Expired</h2>
            <p className="text-muted-foreground">This kudos request has expired and is no longer accepting feedback.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Thank You!</h2>
            <p className="text-muted-foreground">Your feedback has been submitted.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-2">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle>{request.title}</CardTitle>
          {request.description && (
            <CardDescription>{request.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {request.scoring_type === 'thumbs_up' && (
            <div className="flex justify-center">
              <Button
                size="lg"
                variant={score === 1 ? 'default' : 'outline'}
                onClick={() => setScore(1)}
                className="h-16 w-16 rounded-full"
              >
                <ThumbsUp className="w-6 h-6" />
              </Button>
            </div>
          )}

          {request.scoring_type === 'thumbs_up_down' && (
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                variant={score === 1 ? 'default' : 'outline'}
                onClick={() => setScore(1)}
                className="h-16 w-16 rounded-full"
              >
                <ThumbsUp className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                variant={score === 0 ? 'destructive' : 'outline'}
                onClick={() => setScore(0)}
                className="h-16 w-16 rounded-full"
              >
                <ThumbsDown className="w-6 h-6" />
              </Button>
            </div>
          )}

          {request.scoring_type === 'nps' && (
            <div>
              <p className="text-sm text-muted-foreground text-center mb-3">
                How likely are you to recommend? (0 = Not at all, 10 = Extremely likely)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: 11 }, (_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={score === i ? 'default' : 'outline'}
                    onClick={() => setScore(i)}
                    className={`w-10 h-10 ${
                      score === i
                        ? i <= 6
                          ? 'bg-destructive hover:bg-destructive/90'
                          : i <= 8
                          ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                          : ''
                        : ''
                    }`}
                  >
                    {i}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Your name (optional)</Label>
            <Input
              id="name"
              placeholder="Anonymous"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your thoughts..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={score === null || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Submit Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RespondToKudos;
