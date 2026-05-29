import { useState } from "react";
import { useListGoals, useCreateGoal, useDeleteGoal, useAnalyzeGoal } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Target, Trash2, Sparkles, Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Goals() {
  const { data: goals = [], isLoading } = useListGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const analyzeGoal = useAnalyzeGoal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  function toggleExpanded(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleCreate() {
    if (!title.trim()) return;
    createGoal.mutate(
      { data: { title: title.trim(), description: description.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listGoals"] });
          setTitle("");
          setDescription("");
          setShowForm(false);
          toast({ title: "Goal added" });
        },
        onError: () => toast({ title: "Failed to add goal", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteGoal.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listGoals"] });
          toast({ title: "Goal removed" });
        },
        onError: () => toast({ title: "Failed to remove goal", variant: "destructive" }),
      }
    );
  }

  async function handleAnalyze(id: number) {
    setAnalyzingId(id);
    setExpandedIds(prev => new Set([...prev, id]));
    analyzeGoal.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listGoals"] });
          setAnalyzingId(null);
        },
        onError: () => {
          toast({ title: "Analysis failed", variant: "destructive" });
          setAnalyzingId(null);
        },
      }
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-1 font-light">
            Set broad ambitions for your collection. AI analyses each goal against your current holdings.
          </p>
        </div>
        <Button
          size="sm"
          variant={showForm ? "ghost" : "outline"}
          className="shrink-0 gap-2 mt-1"
          onClick={() => setShowForm(v => !v)}
        >
          <Plus className="h-4 w-4" />
          New goal
        </Button>
      </header>

      {showForm && (
        <div className="border border-border p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground">New Goal</h2>
          <div className="space-y-3">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Increase collection value to $1M"
              className="text-sm"
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            />
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional: describe what success looks like, target timeframe, or specific criteria…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!title.trim() || createGoal.isPending}>
              {createGoal.isPending ? "Adding…" : "Add Goal"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setTitle(""); setDescription(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading goals…</span>
        </div>
      )}

      {!isLoading && goals.length === 0 && !showForm && (
        <div className="text-center py-20 text-muted-foreground space-y-3">
          <Target className="h-10 w-10 mx-auto opacity-20" />
          <p className="text-sm">No goals yet. Set one to start tracking your collection's direction.</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add your first goal
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {goals.map(goal => {
          const isExpanded = expandedIds.has(goal.id);
          const isAnalyzing = analyzingId === goal.id;

          return (
            <div key={goal.id} className="border border-border">
              {/* Header row */}
              <div className="flex items-start gap-4 p-5">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{goal.title}</p>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
                  )}
                  {goal.lastAnalysisAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last analysed {formatDistanceToNow(new Date(goal.lastAnalysisAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {goal.lastAnalysis && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleExpanded(goal.id)}
                      title={isExpanded ? "Collapse" : "View analysis"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleAnalyze(goal.id)}
                    disabled={isAnalyzing}
                    title="Run AI analysis"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isAnalyzing ? "Analysing…" : "Analyse"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(goal.id)}
                    title="Delete goal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Analysis panel */}
              {isExpanded && goal.lastAnalysis && (
                <div className="border-t border-border bg-muted/20 px-5 py-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">AI Analysis</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 font-light">{goal.lastAnalysis}</p>
                </div>
              )}

              {/* Loading state for fresh analysis */}
              {isAnalyzing && !goal.lastAnalysis && (
                <div className="border-t border-border bg-muted/20 px-5 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">Analysing collection against this goal…</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
