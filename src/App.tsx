import { lazy, Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { registerForPushNotifications, onForegroundMessage } from "@/lib/firebase-messaging";
import { LocationContext, useLocationState } from "@/hooks/use-location";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const LocationPage = lazy(() => import("./pages/LocationPage"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const DiscoverMap = lazy(() => import("./pages/DiscoverMap"));
const Contact = lazy(() => import("./pages/Contact"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-background"
    role="status"
    aria-label="Loading"
  >
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>
);

const App = () => {
  const locationState = useLocationState();

  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) {
        console.log('Push notifications enabled');
      }
    });

    onForegroundMessage(({ title, body }) => {
      toast(title, { description: body, duration: 8000 });
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LocationContext.Provider value={locationState}>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/:locationId" element={<LocationPage />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/discover" element={<DiscoverMap />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </LocationContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
