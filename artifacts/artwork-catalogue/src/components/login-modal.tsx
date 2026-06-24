import { useState } from "react";
import { hashPassword, setSessionUnlocked } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

interface LoginModalProps {
  passwordHash: string;
  collectionOwner: string;
  onUnlock: () => void;
}

export function LoginModal({ passwordHash, collectionOwner, onUnlock }: LoginModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleUnlock = async () => {
    if (!password) return;
    setChecking(true);
    setError("");
    const hash = await hashPassword(password);
    if (hash === passwordHash) {
      setSessionUnlocked();
      onUnlock();
    } else {
      setError("Incorrect password.");
      setPassword("");
    }
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-sm px-8 py-10 space-y-8 border border-border bg-background shadow-lg">
        <div className="space-y-1 text-center">
          <img src="/hourglass-logo.jpg" alt="Hourglass" className="w-28 mx-auto mb-6 object-contain" />
          {collectionOwner && (
            <p className="text-[13px] tracking-[0.15em] uppercase font-bold text-foreground">{collectionOwner}</p>
          )}
          <p className="text-[11px] tracking-[0.2em] uppercase font-light text-muted-foreground">Collection Tracker</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              autoFocus
              placeholder="Enter your password"
              className="text-sm"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button onClick={handleUnlock} disabled={!password || checking} className="w-full gap-2">
            <Lock className="h-4 w-4" />
            {checking ? "Checking..." : "Unlock"}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest">Private Registry</p>
      </div>
    </div>
  );
}
