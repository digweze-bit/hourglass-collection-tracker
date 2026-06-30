import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/auth-context";
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
import LoginPage from "@/pages/login";
import PendingPage from "@/pages/pending";
import AdminPage from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <img src="/hourglass-logo.jpg" alt="Hourglass" className="w-24 mx-auto object-contain opacity-50" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );

  // Not logged in
  if (!user) return <LoginPage />;

  // Admin route — accessible to admin email regardless of approval
  const isAdmin = user.email === "info@hourglassgallery.com";

  // Logged in but not approved (unless admin)
  if (!profile?.approved && !isAdmin) return <PendingPage />;

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
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
