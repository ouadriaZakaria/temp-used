import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
} from "recharts";
import { Loader2 } from "lucide-react";
import { api, fmtDA, type MonthlyRow } from "@/lib/api";

export default function StatsPage() {
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [totals, setTotals] = useState<{ totalFactures: number; totalCa: number; avgTicket: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.statistiques()
      .then((r) => {
        setMonthly(r.monthly);
        setTotals(r.totals);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const monthly12 = monthly.slice(-12);

  const displayMonthly = monthly12.map((r) => ({
    ...r,
    mois: r.mois.replace(/^20(\d\d)-0?/, "'$1/"),
  }));

  const maxMonth = [...displayMonthly].sort((a, b) => b.ca - a.ca)[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Analyse réelle — données de la base pharmacie BELFEKROUN HADJAR.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement des statistiques…
          </div>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {[
                { label: "CA 12 mois", value: fmtDA(monthly12.reduce((s, m) => s + m.ca, 0)) },
                { label: "Total factures", value: `${totals?.totalFactures ?? 0}` },
                { label: "Panier moyen", value: fmtDA(totals?.avgTicket ?? 0) },
                { label: "Meilleur mois", value: maxMonth ? `${maxMonth.mois} · ${fmtDA(maxMonth.ca)}` : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="font-bold text-sm truncate">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
              <h2 className="font-semibold mb-1">Répartition CA par organisme — 12 mois</h2>
              <p className="text-xs text-muted-foreground mb-4">Données réelles issues des factures (CNAS/CASNOS)</p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayMonthly} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.02 190)" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtDA(v)} contentStyle={{ borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="CNAS SBA" stackId="a" fill="oklch(0.68 0.11 185)" />
                    <Bar dataKey="CASNOS SBA" stackId="a" fill="oklch(0.62 0.13 220)" />
                    <Bar dataKey="CNAS (Ret.)" stackId="a" fill="oklch(0.78 0.15 75)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                <h2 className="font-semibold mb-1">CA mensuel réel</h2>
                <p className="text-xs text-muted-foreground mb-4">Évolution sur 12 mois</p>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayMonthly} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.02 190)" />
                      <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmtDA(v)} contentStyle={{ borderRadius: 12 }} />
                      <Line type="monotone" dataKey="ca" name="CA" stroke="oklch(0.68 0.11 185)" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                <h2 className="font-semibold mb-1">Panier moyen par mois</h2>
                <p className="text-xs text-muted-foreground mb-4">Montant moyen par facture</p>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayMonthly} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.02 190)" />
                      <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`} />
                      <Tooltip formatter={(v: number) => fmtDA(v)} contentStyle={{ borderRadius: 12 }} />
                      <Line type="monotone" dataKey="avg_ticket" name="Panier moyen" stroke="oklch(0.62 0.13 220)" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">Détail mensuel</h2>
                <p className="text-xs text-muted-foreground">Récapitulatif CA par mois</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Mois</th>
                      <th className="text-right p-3 font-medium">CA Total</th>
                      <th className="text-right p-3 font-medium">Part organisme</th>
                      <th className="text-right p-3 font-medium">Nb factures</th>
                      <th className="text-right p-3 font-medium">Panier moyen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...monthly12].reverse().map((m) => (
                      <tr key={m.mois} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{m.mois.replace(/^20(\d\d)-0?/, "'$1/")}</td>
                        <td className="p-3 text-right font-semibold">{fmtDA(m.ca)}</td>
                        <td className="p-3 text-right text-muted-foreground">{fmtDA(m.cas)}</td>
                        <td className="p-3 text-right">{m.n}</td>
                        <td className="p-3 text-right text-muted-foreground">{fmtDA(m.avg_ticket ?? 0)}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 font-bold">
                      <td className="p-3">TOTAL 12 mois</td>
                      <td className="p-3 text-right">{fmtDA(monthly12.reduce((s, m) => s + m.ca, 0))}</td>
                      <td className="p-3 text-right">{fmtDA(monthly12.reduce((s, m) => s + m.cas, 0))}</td>
                      <td className="p-3 text-right">{monthly12.reduce((s, m) => s + m.n, 0)}</td>
                      <td className="p-3 text-right">{fmtDA(Math.round(monthly12.reduce((s, m) => s + m.ca, 0) / Math.max(monthly12.reduce((s, m) => s + m.n, 0), 1)))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
