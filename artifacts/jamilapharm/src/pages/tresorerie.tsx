import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingDown, Clock, Truck, Building2, AlertCircle, ArrowDownCircle } from "lucide-react";
import { fmtDA } from "@/lib/api";

type BordDetail = {
  organisme: string;
  num_bord: string;
  date_depot: string | null;
  nb_fact: number;
  montant_attendu: number;
  montant_vire: number;
};

type ParOrganisme = {
  organisme: string;
  nb_bords: number;
  montant_attendu: number;
  montant_vire: number;
};

type Dette = {
  id: number;
  nom: string;
  adresse: string;
  telephone: string;
  montant_du: number;
  date_echeance: string;
};

type Livraison = {
  id: number;
  reference: string;
  date_livraison: string;
  montant_ht: number;
  montant_ttc: number;
  statut_paiement: string;
  date_paiement: string | null;
  nb_articles: number;
  fournisseur: string;
};

type TresoData = {
  restant: { total: number; details: BordDetail[]; parOrganisme: ParOrganisme[] };
  dettes: { total: number; details: Dette[] };
  livraisons: Livraison[];
};

const orgColors: Record<string, string> = {
  "CNAS SBA": "bg-primary/15 text-primary",
  "CASNOS SBA": "bg-sky-500/15 text-sky-600",
  "CNAS SBA (Ret.)": "bg-amber-500/15 text-amber-700",
};

function daysUntil(dateStr: string) {
  const d = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(d / 86400000);
}

export default function TresoreriePage() {
  const [data, setData] = useState<TresoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api-server/api/pharma/tresorerie")
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

  return (
    <AppShell>
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trésorerie & Fournisseurs</h1>
          <p className="text-sm text-muted-foreground">
            Créances à recevoir, dettes fournisseurs et dernières livraisons — données en direct.
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
            {/* ── KPI row ── */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              <KpiCard
                icon={Clock}
                label="Restant à recevoir"
                value={fmtDA(data.restant.total)}
                sub={`${data.restant.details.length} bordereau(x) ouvert(s)`}
                accent="warning"
              />
              <KpiCard
                icon={TrendingDown}
                label="Dettes fournisseurs"
                value={fmtDA(data.dettes.total)}
                sub={`${data.dettes.details.length} fournisseur(s) créditeur(s)`}
                accent="destructive"
              />
              <KpiCard
                icon={Truck}
                label="Livraisons récentes"
                value={`${data.livraisons.length}`}
                sub={`${data.livraisons.filter((l) => l.statut_paiement === "en_attente").length} en attente de règlement`}
                accent="primary"
              />
            </div>

            {/* ── Restant à recevoir ── */}
            <Section
              icon={Clock}
              title="Restant à recevoir par organisme"
              badge={fmtDA(data.restant.total)}
              badgeClass="bg-warning/20 text-warning-foreground"
            >
              {/* Par organisme */}
              <div className="grid gap-3 md:grid-cols-3 mb-4">
                {data.restant.parOrganisme.map((o) => (
                  <div key={o.organisme} className="bg-muted/40 rounded-xl p-4 border border-border">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${orgColors[o.organisme] ?? "bg-muted text-muted-foreground"}`}>
                      <Building2 className="w-3 h-3" />
                      {o.organisme}
                    </div>
                    <div className="text-lg font-bold">{fmtDA(o.montant_attendu)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {o.nb_bords} bordereau(x) • {fmtDA(o.montant_vire)} déjà viré
                    </div>
                  </div>
                ))}
              </div>

              {/* Détail par bordereau */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">N° Bordereau</th>
                      <th className="text-left p-3 font-medium">Organisme</th>
                      <th className="text-left p-3 font-medium">Date dépôt</th>
                      <th className="text-right p-3 font-medium">Nb factures</th>
                      <th className="text-right p-3 font-medium">Montant attendu</th>
                      <th className="text-right p-3 font-medium">Déjà viré</th>
                      <th className="text-right p-3 font-medium">Solde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.restant.details.map((b) => {
                      const solde = b.montant_attendu - b.montant_vire;
                      return (
                        <tr key={b.num_bord} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-xs font-semibold">{b.num_bord}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orgColors[b.organisme] ?? "bg-muted"}`}>
                              {b.organisme}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{b.date_depot || "—"}</td>
                          <td className="p-3 text-right text-xs">{b.nb_fact}</td>
                          <td className="p-3 text-right text-xs font-semibold">{fmtDA(b.montant_attendu)}</td>
                          <td className="p-3 text-right text-xs text-muted-foreground">{fmtDA(b.montant_vire)}</td>
                          <td className="p-3 text-right text-xs font-bold text-warning-foreground">{fmtDA(solde)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-primary/5 font-bold text-sm">
                      <td colSpan={4} className="p-3">TOTAL</td>
                      <td className="p-3 text-right">{fmtDA(data.restant.details.reduce((s, b) => s + b.montant_attendu, 0))}</td>
                      <td className="p-3 text-right text-muted-foreground">{fmtDA(data.restant.details.reduce((s, b) => s + b.montant_vire, 0))}</td>
                      <td className="p-3 text-right">{fmtDA(data.restant.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ── Dettes fournisseurs ── */}
            <Section
              icon={TrendingDown}
              title="Dettes fournisseurs"
              badge={fmtDA(data.dettes.total)}
              badgeClass="bg-destructive/15 text-destructive"
            >
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.dettes.details.map((d) => {
                  const jours = daysUntil(d.date_echeance);
                  const urgent = jours <= 15;
                  const proche = jours <= 30 && jours > 15;
                  return (
                    <div
                      key={d.id}
                      className={`rounded-2xl border p-4 transition-all ${urgent ? "border-destructive/40 bg-destructive/5" : proche ? "border-warning/40 bg-warning/5" : "border-border bg-card"}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {urgent ? (
                          <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15 text-[10px] gap-1">
                            <AlertCircle className="w-3 h-3" /> Urgent {jours}j
                          </Badge>
                        ) : proche ? (
                          <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/20 text-[10px]">
                            Échéance proche
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground hover:bg-muted text-[10px]">
                            dans {jours}j
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-sm leading-tight">{d.nom}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.adresse}</p>
                      <div className="mt-3 pt-3 border-t border-border flex items-end justify-between">
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground">Montant dû</div>
                          <div className="font-bold text-base">{fmtDA(d.montant_du)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-muted-foreground">Échéance</div>
                          <div className="font-semibold text-sm">{d.date_echeance}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* ── Versements récents CNAS ── */}
            <VersementsRecents />

            {/* ── Dernières livraisons ── */}
            <Section
              icon={Truck}
              title="Dernières livraisons fournisseurs"
              badge={`${data.livraisons.length} livraisons`}
              badgeClass="bg-primary/15 text-primary"
            >
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Référence BL</th>
                      <th className="text-left p-3 font-medium">Fournisseur</th>
                      <th className="text-left p-3 font-medium">Date livraison</th>
                      <th className="text-right p-3 font-medium">Montant HT</th>
                      <th className="text-right p-3 font-medium">Montant TTC</th>
                      <th className="text-right p-3 font-medium">Articles</th>
                      <th className="text-center p-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.livraisons.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs font-semibold">{l.reference}</td>
                        <td className="p-3 text-xs font-medium">{l.fournisseur}</td>
                        <td className="p-3 text-xs text-muted-foreground">{l.date_livraison}</td>
                        <td className="p-3 text-right text-xs">{fmtDA(l.montant_ht)}</td>
                        <td className="p-3 text-right text-xs font-semibold">{fmtDA(l.montant_ttc)}</td>
                        <td className="p-3 text-right text-xs">{l.nb_articles}</td>
                        <td className="p-3 text-center">
                          {l.statut_paiement === "payé" ? (
                            <Badge className="bg-success/15 text-success hover:bg-success/15 text-[10px]">
                              Payé {l.date_paiement ? `· ${l.date_paiement}` : ""}
                            </Badge>
                          ) : (
                            <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/20 text-[10px]">
                              En attente
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

type Versement = {
  id: number;
  num_bord: string;
  montant: number;
  date_versement: string;
  reference_virement: string;
  organisme: string;
  nb_fact: number;
  montant_factures: number;
};

function VersementsRecents() {
  const [rows, setRows] = useState<Versement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api-server/api/pharma/versements")
      .then((r) => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then((j) => { if (j?.error) throw new Error(j.error); setRows(j.data); setTotal(j.total); })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (err) return null;

  return (
    <Section
      icon={ArrowDownCircle}
      title="Virements CNAS reçus (récents)"
      badge={loading ? "…" : fmtDA(total)}
      badgeClass="bg-success/15 text-success"
    >
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Réf. virement</th>
                <th className="text-left p-3 font-medium">N° Bord.</th>
                <th className="text-left p-3 font-medium">Organisme</th>
                <th className="text-left p-3 font-medium">Date virement</th>
                <th className="text-right p-3 font-medium">Nb factures</th>
                <th className="text-right p-3 font-medium">Montant facturé</th>
                <th className="text-right p-3 font-medium">Montant reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs font-semibold">{v.reference_virement}</td>
                  <td className="p-3 font-mono text-xs">{v.num_bord}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orgColors[v.organisme] ?? "bg-muted text-muted-foreground"}`}>
                      {v.organisme}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{v.date_versement}</td>
                  <td className="p-3 text-right text-xs">{v.nb_fact}</td>
                  <td className="p-3 text-right text-xs">{fmtDA(v.montant_factures)}</td>
                  <td className="p-3 text-right text-xs font-bold text-success">{fmtDA(v.montant)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-success/5 border-t border-border font-bold text-sm">
              <tr>
                <td colSpan={6} className="p-3 text-muted-foreground text-xs">TOTAL (20 derniers virements)</td>
                <td className="p-3 text-right text-success">{fmtDA(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Section>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string;
  accent: "primary" | "warning" | "destructive";
}) {
  const map = {
    primary: "bg-primary/15 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${map[accent]} mb-3`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Section({
  icon: Icon, title, badge, badgeClass, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; badge: string; badgeClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-semibold text-base">{title}</h2>
        <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${badgeClass}`}>{badge}</span>
      </div>
      {children}
    </div>
  );
}
