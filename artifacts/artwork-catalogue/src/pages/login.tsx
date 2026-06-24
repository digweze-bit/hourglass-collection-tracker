import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!fullName.trim()) { setError("Please enter your full name."); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        setSuccess("Account created! Your request is pending approval. You'll receive an email once approved.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <img src="/hourglass-logo.jpg" alt="Hourglass" className="w-32 mx-auto object-contain" />
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-light text-muted-foreground">Collection</p>
            <p className="text-[11px] tracking-[0.2em] uppercase font-light text-muted-foreground">Tracker</p>
          </div>
        </div>

        {success ? (
          <div className="border border-border p-6 text-center space-y-3">
            <p className="text-sm font-medium">Request submitted</p>
            <p className="text-sm text-muted-foreground">{success}</p>
            <Button variant="ghost" size="sm" onClick={() => { setSuccess(""); setMode("login"); }}>Back to login</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex border-b border-border">
              {(["login", "signup"] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); }}
                  className={`flex-1 py-2.5 text-sm transition-colors ${mode === m ? "border-b-2 border-foreground text-foreground font-medium -mb-px" : "text-muted-foreground hover:text-foreground"}`}>
                  {m === "login" ? "Sign In" : "Request Access"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button onClick={handleSubmit} disabled={loading || !email || !password} className="w-full">
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Request Access"}
              </Button>
            </div>

            {mode === "login" && (
              <p className="text-center text-xs text-muted-foreground">
                Don't have an account?{" "}
                <button onClick={() => { setMode("signup"); setError(""); }} className="text-primary hover:underline">Request access</button>
              </p>
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/50 uppercase tracking-widest">Private Registry · Hourglass Gallery</p>
      </div>
    </div>
  );
}
