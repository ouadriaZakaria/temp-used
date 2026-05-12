import { useEffect, useState, Fragment } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ChevronDown, ChevronRight, Building2,
  Clock, FileText, Banknote, AlertTriangle,
} from "lucide-react";
import { fmtDA } from "@/lib/api";

type Creance = {
  num_bord: string;
  organisme: string;
  etat: string;
  montant_vire: number;
  nb_fact: number;
  montant_total: number;
  montant_attendu: number;
  premiere_facture: string | null;
  derniere_facture: string | null;
  age_jours: number;
};

type FactureCreance = {
  num_fact: string;
  date_fact: string;
  num_assure: string;
  nom_assure: string;
  organisme: string;
  mont_fact: number;
  mont_as: number;
  mont_off: number;
  etat: string;
  prescripteur: string;
  risque_label: string;
};

const orgColors: Record<string, string> = {
  "CNAS SBA": "bg-primary/15 text-primary",
  "CASNOS SBA": "bg-sky-500/15 text-sky-600",
  "CNAS SBA (Ret.)": "bg-amber-500/15 text-amber-700",
};

function ageBadge(jours: number) {
  if (jours > 90)
    return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15 text-[10px] gap-1"><AlertTriangle className="w-3 h-3" />{jours}j</Badge>;
  if (jours > 60)
    return <Badge className="bg-orange-500/15 text-orange-700 hover:bg-orange-500/15 text-[10px]">{jours}j</Badge>;
  if (jours > 30)
    return <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/20 text-[10px]">{jours}j</Badge>;
  return <Badge className="bg-muted text-muted-foreground hover:bg-muted text-[10px]">{jours}j</Badge>;
}

function FacturesDetail({ numBord }: { numBord: string }) {
  const [rows, setRows] = useState<FactureCreance[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api-server/api/pharma/creances/${encodeURIComponent(numBord)}/factures`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (j?.error) throw new Error(j.error);
        setRows(j.data);
      })
      .catch((e: Error) => setErr(e.message));
  }, [numBord]);

  if (err) return <div className="p-4 text-xs text-destructive">Erreur : {err}</div>;
  if (!rows) return (
    <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
    </div>
  );

  return (
    <div className="bg-muted/30 border-t border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left p-2.5 pl-10 font-medium">N° Facture</th>
            <th className="text-left p-2.5 font-medium">Date</th>
            <th className="text-left p-2.5 font-medium">Patient</th>
            <th className="text-left p-2.5 font-medium">Risque</th>
            <th className="text-right p-2.5 font-medium">Total facture</th>
            <th className="text-right p-2.5 font-medium">Part CNAS</th>
            <th className="text-right p-2.5 font-medium">Part patient</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((f) => (
            <tr key={f.num_fact} className="hover:bg-muted/40 transition-colors">
              <td className="p-2.5 pl-10 font-mono font-semibold">{f.num_fact}</td>
              <td className="p-2.5 text-muted-foreground">{f.date_fact}</td>
              <td className="p-2.5">
                <div className="font-medium">{f.nom_assure}</div>
                <div className="text-muted-foreground text-[10px]">{f.num_assure}</div>
              </td>
              <td className="p-2.5 text-muted-foreground">{f.risque_label}</td>
              <td className="p-2.5 text-right font-semibold">{fmtDA(f.mont_fact)}</td>
              <td className="p-2.5 text-right text-primary font-bold">{fmtDA(f.mont_as)}</td>
              <td className="p-2.5 text-right text-muted-foreground">{fmtDA(f.mont_off)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-primary/5 font-bold text-xs border-t border-border">
          <tr>
            <td colSpan={4} className="p-2.5 pl-10">TOTAL ({rows.length} factures)</td>
            <td className="p-2.5 text-right">{fmtDA(rows.reduce((s, f) => s + f.mont_fact, 0))}</td>
            <td className="p-2.5 text-right text-primary">{fmtDA(rows.reduce((s, f) => s + f.mont_as, 0))}</td>
            <td className="p-2.5 text-right text-muted-foreground">{fmtDA(rows.reduce((s, f) => s + f.mont_off, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function CreancesPage() {
  const [data, setData] = useState<{ data: Creance[]; total: number; totalFactures: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api-server/api/pharma/creances")
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur serveur : ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (json?.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggle(num: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  }

  const maxAge = data ? Math.max(...data.data.map((c) => c.age_jours), 0) : 0;

  return (
    <AppShell>
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Créances CNAS</h1>
          <p className="text-sm text-muted-foreground">
            Bordereaux en attente de virement — montants que la CNAS doit à la pharmacie.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive">
            Erreur : {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : data ? (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Banknote}
                label="Total créances CNAS"
                value={fmtDA(data.total)}
                sub="Part organismes non encore versée"
                accent="primary"
              />
              <KpiCard
                icon={FileText}
                label="Montant facturé total"
                value={fmtDA(data.totalFactures)}
                sub={`${data.data.reduce((s, c) => s + c.nb_fact, 0)} factures en attente`}
                accent="default"
              />
              <KpiCard
                icon={Clock}
                label="Bordereaux ouverts"
                value={`${data.data.length}`}
                sub="Non encore virés"
                accent="warning"
              />
              <KpiCard
                icon={AlertTriangle}
                label="Ancienneté max"
                value={`${maxAge} jours`}
                sub="Depuis la 1ère facture"
                accent={maxAge > 90 ? "destructive" : maxAge > 60 ? "warning" : "default"}
              />
            </div>

            {/* Résumé par organisme */}
            {data.data.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {Object.entries(
                  data.data.reduce((acc, c) => {
                    acc[c.organisme] = (acc[c.organisme] ?? 0) + c.montant_attendu;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([org, montant]) => (
                  <div key={org} className="bg-card border border-border rounded-xl p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${orgColors[org] ?? "bg-muted text-muted-foreground"}`}>
                      <Building2 className="w-3 h-3" />{org}
                    </div>
                    <div className="text-xl font-bold">{fmtDA(montant)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {data.data.filter((c) => c.organisme === org).length} bordereau(x)
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table créances avec détail dépliable */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-base">Détail des créances par bordereau</h2>
                <span className="ml-auto text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary">
                  {fmtDA(data.total)}
                </span>
              </div>

              {data.data.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm bg-muted/20 rounded-xl border border-border">
                  Aucune créance en attente. Tous les bordereaux ont été réglés.
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-8 p-3" />
                        <th className="text-left p-3 font-medium">N° Bordereau</th>
                        <th className="text-left p-3 font-medium">Organisme</th>
                        <th className="text-left p-3 font-medium">Période</th>
                        <th className="text-right p-3 font-medium">Nb factures</th>
                        <th className="text-right p-3 font-medium">Montant facturé</th>
                        <th className="text-right p-3 font-medium">Part CNAS attendue</th>
                        <th className="text-center p-3 font-medium">Ancienneté</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.map((c) => {
                        const open = expanded.has(c.num_bord);
                        return (
                          <Fragment key={c.num_bord}>
                            <tr
                              className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => toggle(c.num_bord)}
                            >
                              <td className="p-3 text-muted-foreground">
                                {open
                                  ? <ChevronDown className="w-4 h-4" />
                                  : <ChevronRight className="w-4 h-4" />}
                              </td>
                              <td className="p-3 font-mono text-xs font-bold">{c.num_bord}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orgColors[c.organisme] ?? "bg-muted text-muted-foreground"}`}>
                                  {c.organisme}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {c.premiere_facture ?? "—"} → {c.derniere_facture ?? "—"}
                              </td>
                              <td className="p-3 text-right text-xs">{c.nb_fact}</td>
                              <td className="p-3 text-right text-xs">{fmtDA(c.montant_total)}</td>
                              <td className="p-3 text-right text-xs font-bold text-primary">{fmtDA(c.montant_attendu)}</td>
                              <td className="p-3 text-center">{ageBadge(c.age_jours)}</td>
                            </tr>
                            {open && (
                              <tr>
                                <td colSpan={8} className="p-0">
                                  <FacturesDetail numBord={c.num_bord} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      <tr className="bg-primary/5 font-bold text-sm border-t-2 border-primary/20">
                        <td colSpan={5} className="p-3">TOTAL CRÉANCES</td>
                        <td className="p-3 text-right">{fmtDA(data.totalFactures)}</td>
                        <td className="p-3 text-right text-primary">{fmtDA(data.total)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: "primary" | "warning" | "destructive" | "default";
}) {
  const map = {
    primary: "bg-primary/15 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    default: "bg-muted text-muted-foreground",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${map[accent]} mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
