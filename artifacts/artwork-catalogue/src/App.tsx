import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Catalogue from "@/pages/catalogue";
import Artists from "@/pages/artists";
import ArtworkDetail from "@/pages/artwork-detail";
import AddArtwork from "@/pages/add-artwork";
import BatchUpload from "@/pages/batch-upload";
import Locations from "@/pages/locations";
import Loans from "@/pages/loans";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Goals from "@/pages/goals";
import { LoginModal } from "@/components/login-modal";
import { useSettings } from "@/hooks/use-settings";
import { isSessionUnlocked } from "@/lib/auth";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/artworks" component={Catalogue} />
        <Route path="/artists" component={Artists} />
        <Route path="/artworks/new" component={AddArtwork} />
        <Route path="/artworks/:id" component={ArtworkDetail} />
        <Route path="/batch-upload" component={BatchUpload} />
        <Route path="/locations" component={Locations} />
        <Route path="/loans" component={Loans} />
        <Route path="/goals" component={Goals} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppWithAuth() {
  const { settings } = useSettings();
  const [unlocked, setUnlocked] = useState(
    () => !settings.usePassword || !settings.passwordHash || isSessionUnlocked()
  );
  return (
    <>
      <Router />
      {!unlocked && (
        <LoginModal passwordHash={settings.passwordHash} collectionOwner={settings.collectionOwner} onUnlock={() => setUnlocked(true)} />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppWithAuth />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
