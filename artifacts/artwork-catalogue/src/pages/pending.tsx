import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function PendingPage() {
  const { signOut, profile } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <img src="/hourglass-logo.jpg" alt="Hourglass" className="w-32 mx-auto object-contain" />
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-serif text-xl">Awaiting Approval</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {profile?.full_name ? `Hello ${profile.full_name.split(" ")[0]}, your` : "Your"} account request has been received. The Hourglass team will review your request and you'll receive a confirmation email once approved.
            </p>
          </div>
        </div>
        <div className="border border-border p-4 text-left space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Registered email</p>
          <p className="text-sm">{profile?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">Sign out</Button>
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Private Registry · Hourglass Gallery</p>
      </div>
    </div>
  );
}
