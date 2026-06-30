import { useState, useRef } from "react";
import { useListArtworks } from "@/hooks/use-db";
import { useSettings } from "@/hooks/use-settings";
import { hashPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, X } from "lucide-react";
import { OfflineSettingsSection } from "@/components/offline-settings-section";

const BUILT_IN_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CNY", "AUD", "CAD", "HKD", "NGN"];

export default function Settings() {
  const { settings, saveSettings } = useSettings();
  const { data: artworks = [] } = useListArtworks();
  const [collectionOwner, setCollectionOwner] = useState(settings.collectionOwner || "");
  const [userEmail, setUserEmail] = useState(settings.userEmail || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usePassword, setUsePassword] = useState(settings.usePassword);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [openingMode, setOpeningMode] = useState<"fixed" | "random">(settings.openingMode);
  const [pinnedArtworkId, setPinnedArtworkId] = useState<string | null>(settings.pinnedArtworkId as any);
  const [saved, setSaved] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");
  const [currencyError, setCurrencyError] = useState("");
  const currencyInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    let passwordHash = settings.passwordHash;
    if (newPassword) {
      if (newPassword !== confirmPassword) { setPasswordMsg("Passwords do not match."); return; }
      if (newPassword.length < 6) { setPasswordMsg("Password must be at least 6 characters."); return; }
      passwordHash = await hashPassword(newPassword);
      setPasswordMsg("Password updated.");
      setNewPassword(""); setConfirmPassword("");
    }
    if (usePassword && !passwordHash) { setPasswordMsg("Please set a password before enabling login protection."); return; }
    saveSettings({ ...settings, collectionOwner: collectionOwner.trim(), userEmail: userEmail.trim(), passwordHash, usePassword: usePassword && !!passwordHash, openingMode, pinnedArtworkId: pinnedArtworkId as any });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function addCurrency() {
    const code = newCurrency.trim().toUpperCase();
    if (!code) return;
    if (!/^[A-Z]{2,6}$/.test(code)) { setCurrencyError("Currency codes must be 2–6 letters (e.g. NGN, EUR)."); return; }
    if (BUILT_IN_CURRENCIES.includes(code)) { setCurrencyError(`${code} is already included by default.`); return; }
    if (settings.customCurrencies.includes(code)) { setCurrencyError(`${code} is already in your list.`); return; }
    setCurrencyError(""); setNewCurrency("");
    saveSettings({ ...settings, customCurrencies: [...settings.customCurrencies, code] });
    currencyInputRef.current?.focus();
  }

  function removeCurrency(code: string) {
    saveSettings({ ...settings, customCurrencies: settings.customCurrencies.filter(c => c !== code) });
  }

  return (
    <div className="max-w-lg space-y-12">
      <header>
        <h1 className="text-3xl font-serif tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 font-light">Preferences for your collection registry.</p>
      </header>

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-base font-medium mb-1">Collection</h2>
          <p className="text-sm text-muted-foreground mb-5">The owner's name appears at the top of the sidebar.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-owner" className="text-sm">Collection owner name</Label>
          <Input id="collection-owner" value={collectionOwner} onChange={e => setCollectionOwner(e.target.value)} placeholder="e.g. Dozie Igweike" className="max-w-xs" />
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-6">
        <div>
          <h2 className="text-base font-medium mb-1">Account & Security</h2>
          <p className="text-sm text-muted-foreground">Your email is stored locally as an identifier for future password recovery.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email" className="text-sm">Email address</Label>
          <Input id="user-email" type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="you@example.com" className="max-w-xs" />
        </div>
        <div className="space-y-4 pt-2">
          <p className="text-sm font-medium">{settings.passwordHash ? "Change password" : "Set password"}</p>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm text-muted-foreground">{settings.passwordHash ? "New password" : "Password"}</Label>
            <div className="relative max-w-xs">
              <Input id="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordMsg(""); }} placeholder="Minimum 6 characters" className="pr-10 text-sm" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirm password</Label>
            <Input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordMsg(""); }} placeholder="Repeat password" className="max-w-xs text-sm" />
          </div>
          {passwordMsg && <p className={`text-xs ${passwordMsg.includes("updated") ? "text-green-600" : "text-destructive"}`}>{passwordMsg}</p>}
        </div>
        <div className="flex items-start gap-3 pt-2">
          <Checkbox id="use-password" checked={usePassword} onCheckedChange={checked => setUsePassword(checked === true)} />
          <div>
            <Label htmlFor="use-password" className="text-sm font-medium cursor-pointer">Require password to open app</Label>
            <p className="text-xs text-muted-foreground mt-0.5">When enabled, a password prompt appears each time the app is opened in a new browser session.{!settings.passwordHash && " You must set a password above first."}</p>
          </div>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-6">
        <div>
          <h2 className="text-base font-medium mb-1">Opening screen</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose what appears on the home screen when you open the app.</p>
        </div>
        <RadioGroup value={openingMode} onValueChange={v => setOpeningMode(v as "fixed" | "random")} className="space-y-4">
          <div className="flex items-start gap-3">
            <RadioGroupItem value="random" id="mode-random" className="mt-0.5" />
            <Label htmlFor="mode-random" className="cursor-pointer space-y-0.5">
              <span className="text-sm font-medium">Random artwork</span>
              <p className="text-xs text-muted-foreground font-normal">A different work from the collection is shown each time.</p>
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="fixed" id="mode-fixed" className="mt-0.5" />
            <Label htmlFor="mode-fixed" className="cursor-pointer space-y-0.5">
              <span className="text-sm font-medium">Fixed artwork</span>
              <p className="text-xs text-muted-foreground font-normal">Always show the same work — you choose which one.</p>
            </Label>
          </div>
        </RadioGroup>
        {openingMode === "fixed" && (
          <div className="pl-6 space-y-2">
            <Label className="text-sm text-muted-foreground">Featured artwork</Label>
            <Select value={pinnedArtworkId ?? ""} onValueChange={v => setPinnedArtworkId(v || null)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select an artwork…" /></SelectTrigger>
              <SelectContent>
                {artworks.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-serif">{a.title}</span>
                    {a.artist && <span className="text-muted-foreground ml-2 text-xs">— {a.artist}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      <div className="flex items-center gap-4 pt-2">
        <Button onClick={handleSave} size="sm">Save preferences</Button>
        {saved && <span className="text-xs text-muted-foreground animate-in fade-in duration-200">Saved.</span>}
      </div>

      <section className="space-y-5 border-t border-border pt-6">
        <div>
          <h2 className="text-base font-medium mb-1">Currencies</h2>
          <p className="text-sm text-muted-foreground mb-4">Add extra currency codes to use in pricing. Standard currencies are already included.</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {BUILT_IN_CURRENCIES.map(code => (
            <span key={code} className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-mono bg-muted text-muted-foreground border border-border">{code}</span>
          ))}
          {settings.customCurrencies.map(code => (
            <span key={code} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-mono bg-background border border-border">
              {code}
              <button type="button" onClick={() => removeCurrency(code)} className="text-muted-foreground hover:text-foreground ml-0.5"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 items-start">
          <div className="space-y-1">
            <Input ref={currencyInputRef} value={newCurrency} onChange={e => { setNewCurrency(e.target.value.toUpperCase()); setCurrencyError(""); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCurrency(); } }} placeholder="e.g. BRL" className="w-28 font-mono uppercase text-sm" maxLength={6} />
            {currencyError && <p className="text-xs text-destructive">{currencyError}</p>}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addCurrency}>Add</Button>
        </div>
      </section>

      <OfflineSettingsSection />
    </div>
  );
}
