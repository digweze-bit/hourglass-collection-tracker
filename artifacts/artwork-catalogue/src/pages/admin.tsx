import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, Users } from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  approved: boolean;
  approved_at: string | null;
  created_at: string;
};

const ADMIN_EMAILS = ["info@hourglassgallery.com"];

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  async function loadProfiles() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  }

  async function approveUser(userId: string, userEmail: string | null, userName: string | null) {
    const { error } = await supabase.from("profiles").update({ approved: true, approved_at: new Date().toISOString() }).eq("id", userId);
    if (error) { toast({ title: "Failed to approve user", variant: "destructive" }); return; }
    toast({ title: `${userName || userEmail} approved` });
    loadProfiles();
    // Email notification will be wired here once Resend is set up
  }

  useEffect(() => { loadProfiles(); }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Access restricted.</p>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  const pending = profiles.filter(p => !p.approved);
  const approved = profiles.filter(p => p.approved);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <img src="/hourglass-logo.jpg" alt="Hourglass" className="w-24 mb-4 object-contain" />
          <h1 className="text-2xl font-serif">Admin — User Approvals</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">Sign out</Button>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Clock className="h-4 w-4 text-amber-500" />
          <h2 className="font-medium">Pending Approval ({pending.length})</h2>
        </div>
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && pending.length === 0 && <p className="text-sm text-muted-foreground italic">No pending requests.</p>}
        {pending.map(p => (
          <div key={p.id} className="flex items-center justify-between border border-border p-4">
            <div>
              <p className="font-medium text-sm">{p.full_name || "No name"}</p>
              <p className="text-xs text-muted-foreground">{p.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Requested {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <Button size="sm" onClick={() => approveUser(p.id, p.email, p.full_name)} className="gap-2">
              <CheckCircle className="h-3.5 w-3.5" />Approve
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Users className="h-4 w-4 text-emerald-500" />
          <h2 className="font-medium">Approved Users ({approved.length})</h2>
        </div>
        {approved.map(p => (
          <div key={p.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
            <div>
              <p className="text-sm">{p.full_name || "No name"}</p>
              <p className="text-xs text-muted-foreground">{p.email}</p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-emerald-600 border-emerald-600/30">Active</Badge>
          </div>
        ))}
      </section>
    </div>
  );
}
