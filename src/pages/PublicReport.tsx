import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Loader2, ThumbsUp, ThumbsDown, BarChart3 } from 'lucide-react';

type ReportData = {
  title: string;
  requests: {
    id: string;
    title: string;
    description: string | null;
    scoring_type: string;
    responses: { score: number; comment: string | null; respondent_name: string | null }[];
  }[];
};

const PublicReport = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) return;

      const { data: reportData } = await supabase
        .from('kudos_reports')
        .select('*')
        .eq('share_token', token)
        .single();

      if (!reportData) { setLoading(false); return; }

      const { data: reqs } = await supabase
        .from('kudos_requests')
        .select('id, title, description, scoring_type')
        .in('id', reportData.kudos_request_ids);

      if (!reqs) { setLoading(false); return; }

      const requestsWithResponses = await Promise.all(
        reqs.map(async (req) => {
          const { data: responses } = await supabase
            .from('kudos_responses')
            .select('score, comment, respondent_name')
            .eq('kudos_request_id', req.id);
          return { ...req, responses: responses || [] };
        })
      );

      setReport({ title: reportData.title, requests: requestsWithResponses });
      setLoading(false);
    };
    fetchReport();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Report Not Found</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalResponses = report.requests.reduce((sum, r) => sum + r.responses.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">Kudos Report</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">{report.title}</h1>
          <p className="text-muted-foreground">
            {report.requests.length} kudos request{report.requests.length !== 1 ? 's' : ''} • {totalResponses} total response{totalResponses !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-4">
          {report.requests.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{req.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {req.scoring_type === 'thumbs_up' ? 'Thumbs Up' : req.scoring_type === 'thumbs_up_down' ? 'Up/Down' : 'NPS'}
                  </Badge>
                </div>
                {req.description && <CardDescription>{req.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                {req.responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No responses</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      {req.scoring_type === 'thumbs_up' && (
                        <span className="font-medium">{req.responses.length} 👍</span>
                      )}
                      {req.scoring_type === 'thumbs_up_down' && (
                        <span className="font-medium">
                          {req.responses.filter(r => r.score === 1).length} 👍 / {req.responses.filter(r => r.score === 0).length} 👎
                        </span>
                      )}
                      {req.scoring_type === 'nps' && (
                        <span className="font-medium">
                          Average: {(req.responses.reduce((s, r) => s + r.score, 0) / req.responses.length).toFixed(1)}/10
                        </span>
                      )}
                    </div>
                    {req.responses.filter(r => r.comment).map((r, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium">{r.respondent_name || 'Anonymous'}: </span>
                        <span className="text-muted-foreground">{r.comment}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PublicReport;
