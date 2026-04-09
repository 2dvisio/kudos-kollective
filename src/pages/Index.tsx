import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { buildPublicAppUrl } from '@/lib/public-url';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Link2, ThumbsUp, ThumbsDown, BarChart3, Clock, Trash2, FileText, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type KudosRequest = {
  id: string;
  title: string;
  description: string | null;
  scoring_type: 'thumbs_up' | 'thumbs_up_down' | 'nps';
  share_token: string;
  expires_at: string;
  created_at: string;
  responses: { id: string; score: number; comment: string | null; respondent_name: string | null; created_at: string }[];
};

const COLORS = ['hsl(25, 95%, 53%)', 'hsl(212, 92%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<KudosRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reportTitle, setReportTitle] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [creatingReport, setCreatingReport] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: reqs } = await supabase
        .from('kudos_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!reqs) { setLoading(false); return; }

      const requestsWithResponses: KudosRequest[] = await Promise.all(
        reqs.map(async (req) => {
          const { data: responses } = await supabase
            .from('kudos_responses')
            .select('*')
            .eq('kudos_request_id', req.id)
            .order('created_at', { ascending: false });
          return { ...req, responses: responses || [] };
        })
      );

      setRequests(requestsWithResponses);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const copyShareLink = (token: string) => {
    const url = buildPublicAppUrl(`/k/${token}`);
    navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
  };

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from('kudos_requests').delete().eq('id', id);
    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Kudos request deleted');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createReport = async () => {
    if (!user || selectedIds.size === 0) return;
    setCreatingReport(true);

    const { data, error } = await supabase
      .from('kudos_reports')
      .insert({
        user_id: user.id,
        title: reportTitle.trim() || 'Kudos Report',
        kudos_request_ids: Array.from(selectedIds),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create report');
      setCreatingReport(false);
      return;
    }

    const reportUrl = buildPublicAppUrl(`/report/${data.share_token}`);
    await navigator.clipboard.writeText(reportUrl).catch(() => {});
    toast.success('Report created! Share link copied to clipboard.');
    setReportDialogOpen(false);
    setSelectedIds(new Set());
    setReportTitle('');
    setCreatingReport(false);
  };

  // Aggregate stats
  const totalResponses = requests.reduce((sum, r) => sum + r.responses.length, 0);
  const activeRequests = requests.filter(r => !isPast(new Date(r.expires_at)));
  const avgScore = (() => {
    const npsRequests = requests.filter(r => r.scoring_type === 'nps');
    const allScores = npsRequests.flatMap(r => r.responses.map(res => res.score));
    return allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : '—';
  })();

  // Chart data
  const responsesOverTime = requests
    .filter(r => r.responses.length > 0)
    .map(r => ({
      name: r.title.length > 20 ? r.title.slice(0, 20) + '...' : r.title,
      responses: r.responses.length,
      positiveRate: r.scoring_type === 'thumbs_up'
        ? 100
        : r.scoring_type === 'thumbs_up_down'
        ? Math.round((r.responses.filter(res => res.score === 1).length / r.responses.length) * 100)
        : Math.round((r.responses.filter(res => res.score >= 9).length / r.responses.length) * 100),
    }))
    .slice(0, 8);

  const scoringTypeDistribution = [
    { name: 'Thumbs Up', value: requests.filter(r => r.scoring_type === 'thumbs_up').length },
    { name: 'Up/Down', value: requests.filter(r => r.scoring_type === 'thumbs_up_down').length },
    { name: 'NPS', value: requests.filter(r => r.scoring_type === 'nps').length },
  ].filter(d => d.value > 0);

  const getScoringIcon = (type: string) => {
    switch (type) {
      case 'thumbs_up': return <ThumbsUp className="w-4 h-4" />;
      case 'thumbs_up_down': return <div className="flex gap-0.5"><ThumbsUp className="w-3 h-3" /><ThumbsDown className="w-3 h-3" /></div>;
      case 'nps': return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getScoreSummary = (req: KudosRequest) => {
    if (req.responses.length === 0) return 'No responses yet';
    if (req.scoring_type === 'thumbs_up') return `${req.responses.length} 👍`;
    if (req.scoring_type === 'thumbs_up_down') {
      const up = req.responses.filter(r => r.score === 1).length;
      const down = req.responses.filter(r => r.score === 0).length;
      return `${up} 👍 / ${down} 👎`;
    }
    const avg = (req.responses.reduce((s, r) => s + r.score, 0) / req.responses.length).toFixed(1);
    return `Avg: ${avg}/10 (${req.responses.length} responses)`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-8 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-3xl font-bold text-foreground">{requests.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeRequests.length} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Responses</p>
              <p className="text-3xl font-bold text-foreground">{totalResponses}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Avg NPS Score</p>
              <p className="text-3xl font-bold text-foreground">{avgScore}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {responsesOverTime.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Responses per Request</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={responsesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Bar dataKey="responses" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {scoringTypeDistribution.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scoring Types Used</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={scoringTypeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {scoringTypeDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Your Kudos Requests</h2>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-1" />
                    Create Report ({selectedIds.size})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Shareable Report</DialogTitle>
                    <DialogDescription>
                      Generate a public link with the selected kudos for sharing
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="reportTitle">Report Title</Label>
                      <Input
                        id="reportTitle"
                        placeholder="e.g., Q1 Team Feedback"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createReport} disabled={creatingReport}>
                      {creatingReport ? 'Creating...' : 'Create & Copy Link'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Button onClick={() => navigate('/new')} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Request
            </Button>
          </div>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ThumbsUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No kudos requests yet</h3>
              <p className="text-muted-foreground mb-4">Create your first request to start collecting feedback</p>
              <Button onClick={() => navigate('/new')}>
                <Plus className="w-4 h-4 mr-1" />
                Create Kudos Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {requests.map((req) => {
              const isExpired = isPast(new Date(req.expires_at));
              return (
                <Card key={req.id} className={isExpired ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(req.id)}
                        onCheckedChange={() => toggleSelect(req.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">{req.title}</h3>
                          <Badge variant={isExpired ? 'secondary' : 'default'} className="text-xs shrink-0">
                            {isExpired ? 'Expired' : 'Active'}
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0 gap-1">
                            {getScoringIcon(req.scoring_type)}
                            {req.scoring_type === 'thumbs_up' ? 'Up' : req.scoring_type === 'thumbs_up_down' ? 'Up/Down' : 'NPS'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{getScoreSummary(req)}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {isExpired ? 'Expired' : `Expires ${format(new Date(req.expires_at), 'MMM d, yyyy')}`}
                        </div>

                        {/* Show comments */}
                        {req.responses.filter(r => r.comment).length > 0 && (
                          <div className="mt-3 space-y-2">
                            {req.responses.filter(r => r.comment).slice(0, 3).map(r => (
                              <div key={r.id} className="bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                                <span className="font-medium">{r.respondent_name || 'Anonymous'}: </span>
                                <span className="text-muted-foreground">{r.comment}</span>
                              </div>
                            ))}
                            {req.responses.filter(r => r.comment).length > 3 && (
                              <p className="text-xs text-muted-foreground">+{req.responses.filter(r => r.comment).length - 3} more comments</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!isExpired && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyShareLink(req.share_token)}>
                            <Link2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRequest(req.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
