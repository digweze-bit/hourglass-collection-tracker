import { useState } from "react";
import { useListGoals, useCreateGoal, useDeleteGoal } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Target, Trash2, Plus, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Goals() {
  const { data: goals = [], isLoading } = useListGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleCreate() {
    if (!title.trim()) return;
    createGoal.mutate({ title: title.trim(), description: description.trim() || undefined }, {
      onSuccess: () => { setTitle(""); setDescription(""); setShowForm(false); toast({ title: "Goal added" }); },
      onError: () => toast({ title: "Failed to add goal", variant: "destructive" }),
    });
  }

  function handleDelete(id: string) {
    deleteGoal.mutate(id, {
      onSuccess: () => toast({ title: "Goal removed" }),
      onError: () => toast({ title: "Failed to remove goal", variant: "destructive" }),
    });
  }

  return (
    <div className="max-w-2xl space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-serif tracking-tight">Goals</h1><p className="text-muted-foreground mt-1 font-light">Set broad ambitions for your collection.</p></div>
        <Button size="sm" variant={showForm ? "ghost" : "outline"} className="shrink-0 gap-2 mt-1" onClick={() => setShowForm(v => !v)}><Plus className="h-4 w-4" />New goal</Button>
      </header>
      {showForm && (
        <div className="border border-border p-6 space-y-4">
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground">New Goal</h2>
          <div className="space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Increase collection value to $1M" className="text-sm" onKeyDown={e => { if (e.key === "Enter") handleCreate(); }} />
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional: describe what success looks like…" rows={3} className="text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!title.trim() || createGoal.isPending}>{createGoal.isPending ? "Adding…" : "Add Goal"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setTitle(""); setDescription(""); }}>Cancel</Button>
          </div>
        </div>
      )}
      {isLoading && <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm">Loading goals…</span></div>}
      {!isLoading && goals.length === 0 && !showForm && (
        <div className="text-center py-20 text-muted-foreground space-y-3">
          <Target className="h-10 w-10 mx-auto opacity-20" />
          <p className="text-sm">No goals yet.</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" />Add your first goal</Button>
        </div>
      )}
      <div className="space-y-4">
        {goals.map(goal => (
          <div key={goal.id} className="border border-border p-5 flex items-start gap-4">
            <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{goal.title}</p>
              {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
              {goal.created_at && <p className="text-xs text-muted-foreground mt-1">Added {formatDistanceToNow(new Date(goal.created_at), { addSuffix: true })}</p>}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(goal.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
