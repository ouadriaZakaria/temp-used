import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import BordereauxPage from "@/pages/bordereaux";
import FacturesPage from "@/pages/factures";
import StatistiquesPage from "@/pages/statistiques";
import MedsPage from "@/pages/medicaments";
import ExportsPage from "@/pages/exports";
import TresoreriePage from "@/pages/tresorerie";
import CreancesPage from "@/pages/creances";
import AnalysePage from "@/pages/analyse";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => { window.location.href = "/dashboard"; return null; }} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/bordereaux" component={BordereauxPage} />
      <Route path="/factures" component={FacturesPage} />
      <Route path="/statistiques" component={StatistiquesPage} />
      <Route path="/medicaments" component={MedsPage} />
      <Route path="/exports" component={ExportsPage} />
      <Route path="/tresorerie" component={TresoreriePage} />
      <Route path="/creances" component={CreancesPage} />
      <Route path="/analyse" component={AnalysePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
        <Toaster richColors position="top-right" />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
