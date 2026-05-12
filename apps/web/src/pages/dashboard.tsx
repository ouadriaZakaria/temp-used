import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ScrollText, Receipt, BarChart3, Pill, FileDown,
  TrendingUp, Wallet, Clock, AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { api, fmtDA, type DashboardData } from "@/lib/api";

const chartColors = ["oklch(0.68 0.11 185)", "oklch(0.62 0.13 220)", "oklch(0.78 0.15 75)"];

const FOURNISSEURS_NEXT = "30/06/2025";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const quickLinks = [
    { to: "/bordereaux", label: "Bordereaux", icon: ScrollText, color: "from-teal-400/20 to-teal-500/10" },
    { to: "/statistiques", label: "Statistiques", icon: BarChart3, color: "from-sky-400/20 to-sky-500/10" },
    { to: "/factures", label: "Factures", icon: Receipt, color: "from-amber-400/20 to-amber-500/10" },
    { to: "/medicaments", label: "Médicaments", icon: Pill, color: "from-emerald-400/20 to-emerald-500/10" },
    { to: "/exports", label: "Exports", icon: FileDown, color: "from-rose-400/20 to-rose-500/10" },
  ] as const;

  const monthlyDisplay = data?.monthlyData.map((r) => ({
    ...r,
    mois: r.mois.replace(/^20(\d\d)-0?/, "'$1/"),
  })) ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble — Pharmacie BELFEKROUN HADJAR • données en direct</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive">
            Erreur chargement données : {error}
          </div>
        )}

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KPI icon={TrendingUp} label="CA 12 mois" value={data ? fmtDA(data.kpis.ca12mois) : "…"} accent="primary" sub="Fév 2024 – Jan 2025" />
          <KPI icon={Wallet} label="Versé (virements)" value={data ? fmtDA(data.kpis.verse) : "…"} accent="success" sub="Total virements reçus" />
          <KPI icon={Clock} label="Restant à recevoir" value={data ? fmtDA(data.kpis.restant) : "…"} accent="warning" sub="Bordereaux ouverts" />
          <KPI icon={AlertTriangle} label="Dettes fournisseurs" value={data ? fmtDA(data.kpis.dettes_fournisseurs) : "…"} accent="destructive" sub={`Prochaine éch. : ${FOURNISSEURS_NEXT}`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Chiffre d'affaires mensuel</h2>
                <p className="text-xs text-muted-foreground">Données réelles — base de données live</p>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyDisplay} margin={{ left: -10, right: 8, top: 5 }}>
                  <defs>
                    <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.11 185)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.68 0.11 185)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.02 190)" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} stroke="oklch(0.52 0.03 210)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.52 0.03 210)" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtDA(v)} contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.91 0.02 190)" }} />
                  <Area type="monotone" dataKey="ca" name="CA Total" stroke="oklch(0.68 0.11 185)" strokeWidth={2.5} fill="url(#ca)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
            <h2 className="font-semibold mb-1">CA par organisme</h2>
            <p className="text-xs text-muted-foreground mb-3">12 mois — données réelles</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.pieData ?? []} dataKey="montant" nameKey="organisme" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {(data?.pieData ?? []).map((_: unknown, i: number) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtDA(v)} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard title="Bordereaux ouverts" value={data ? `${data.bordereaux.ouverts}` : "…"} sub={data ? fmtDA(data.bordereaux.totalOuvert) : "…"} icon={ScrollText} to="/bordereaux" />
          <SummaryCard title="Total factures" value={data ? `${data.factures.total}` : "…"} sub={data ? `${fmtDA(data.factures.verse)} part org.` : "…"} icon={Receipt} to="/factures" />
          <SummaryCard title="Dettes fournisseurs" value={data ? fmtDA(data.kpis.dettes_fournisseurs) : "…"} sub={`Éch. ${FOURNISSEURS_NEXT}`} icon={Clock} to="/exports" />
        </div>

        <div>
          <h2 className="font-semibold mb-3">Accès rapide</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickLinks.map(({ to, label, icon: Icon, color }) => (
              <Link
                key={to}
                href={to}
                className={`group bg-gradient-to-br ${color} bg-card border border-border rounded-2xl p-5 hover:shadow-[var(--shadow-elevated)] transition-all hover:-translate-y-0.5`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <div className="font-semibold text-sm">{label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KPI({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string;
  accent: "primary" | "success" | "warning" | "destructive";
}) {
  const accentMap = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentMap[accent]} mb-3`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function SummaryCard({ title, value, sub, icon: Icon, to }: {
  title: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>; to: string;
}) {
  return (
    <Link href={to} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-[var(--shadow-soft)] transition-all flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--gradient-primary)] flex items-center justify-center text-primary-foreground">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      </div>
    </Link>
  );
}
