import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { registerForPushNotifications, onForegroundMessage } from "@/lib/firebase-messaging";
import { LocationContext, useLocationState } from "@/hooks/use-location";
import Index from "./pages/Index";
import LocationPage from "./pages/LocationPage";
import HowItWorks from "./pages/HowItWorks";
import DiscoverMap from "./pages/DiscoverMap";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/:locationId" element={<LocationPage />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/discover" element={<DiscoverMap />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LocationContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
