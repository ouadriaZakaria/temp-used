import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Loader2, FlaskConical, Users, Pill, Activity, Building2 } from "lucide-react";
import { fmtDA } from "@/lib/api";

const COLOURS = ["#00897B","#26A69A","#4DB6AC","#80CBC4","#B2DFDB","#00695C","#00796B","#009688","#43A047","#66BB6A","#81C784","#A5D6A7","#388E3C","#43A047","#2E7D32","#1B5E20","#004D40","#00251A","#1DE9B6","#64FFDA"];
const ORG_COLOURS: Record<string,string> = { "CNAS SBA":"#00897B", "CASNOS SBA":"#1565C0", "CNAS SBA (Ret.)":"#F57F17" };

type TopMed = { medicament: string; nom_dci: string; dosage: string; nb_prescriptions: number; total_qte: number; total_mont: number; total_as: number };
type Risque = { label: string; nb: number; ca: number };
type Prescripteur = { prescripteur: string; nb_factures: number; total_ca: number; avg_ticket: number };
type OrgDetail = { organisme: string; nb_factures: number; total_mont: number; total_as: number; total_patient: number };
type Globaux = { total_lignes: number; medics_distincts: number; factures_avec_detail: number; total_mont: number; total_as: number; qte_moy: number };
type PharmaInfo = { code_ps: string; nom_pharmacie: string; nom: string; prenom: string; adresse: string; num_tel: string; code_centre: string };

type AnalyseData = {
  globaux: Globaux;
  topMedQte: TopMed[];
  topMedMont: TopMed[];
  parRisque: Risque[];
  topPrescripteurs: Prescripteur[];
  parOrganismeDetail: OrgDetail[];
  pharmaInfo: PharmaInfo | null;
};

type Tab = "medicaments" | "prescripteurs" | "risque" | "organismes";

const shortName = (s: string) => s?.length > 22 ? s.slice(0, 21) + "…" : s;

export default function AnalysePage() {
  const [data, setData] = useState<AnalyseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("medicaments");
  const [medSort, setMedSort] = useState<"qte" | "mont">("qte");

  useEffect(() => {
    fetch("/api-server/api/pharma/analyse")
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
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analyse des prescriptions</h1>
            <p className="text-sm text-muted-foreground">
              {data?.pharmaInfo
                ? [
                    data.pharmaInfo.nom_pharmacie || `${data.pharmaInfo.nom} ${data.pharmaInfo.prenom}`.trim(),
                    data.pharmaInfo.adresse,
                    data.pharmaInfo.num_tel ? `Tél. ${data.pharmaInfo.num_tel}` : null,
                  ].filter(Boolean).join(" — ")
                : "Analyse complète — données directes de la base pharmacie."}
            </p>
          </div>
        </div>

        {error && <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive">Erreur : {error}</div>}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Analyse en cours…
          </div>
        ) : data && data.globaux ? (
          <>
            {/* ── KPI row ── */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={FlaskConical} label="Lignes de prescription" value={data.globaux.total_lignes.toLocaleString("fr-DZ")} sub="dans detail_fact" accent="teal" />
              <KpiCard icon={Pill} label="Médicaments distincts" value={data.globaux.medics_distincts.toLocaleString("fr-DZ")} sub="références différentes" accent="green" />
              <KpiCard icon={Activity} label="Montant total prescrit" value={fmtDA(data.globaux.total_mont)} sub={`Org. : ${fmtDA(data.globaux.total_as)}`} accent="blue" />
              <KpiCard icon={Users} label="Prescripteurs" value={data.topPrescripteurs.length.toString() + "+"} sub={`Top : ${data.topPrescripteurs[0]?.prescripteur?.slice(0,18) ?? "—"}`} accent="amber" />
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 border-b border-border">
              {([
                { key: "medicaments", label: "Top médicaments" },
                { key: "prescripteurs", label: "Prescripteurs" },
                { key: "risque", label: "Répartition risque" },
                { key: "organismes", label: "Par organisme" },
              ] as { key: Tab; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: médicaments ── */}
            {tab === "medicaments" && (
              <div className="space-y-5">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMedSort("qte")}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${medSort === "qte" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    Par quantité
                  </button>
                  <button
                    onClick={() => setMedSort("mont")}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${medSort === "mont" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    Par montant
                  </button>
                </div>

                {(() => {
                  const top = medSort === "qte" ? data.topMedQte : data.topMedMont;
                  const chartData = top.slice(0, 15).map((m) => ({
                    name: shortName(m.medicament),
                    value: medSort === "qte" ? m.total_qte : m.total_mont,
                  })).reverse();

                  return (
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                        <h3 className="font-semibold text-sm mb-4">
                          Top 15 médicaments — {medSort === "qte" ? "quantités dispensées" : "montant total (DA)"}
                        </h3>
                        <ResponsiveContainer width="100%" height={380}>
                          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => medSort === "mont" ? `${(v/1000).toFixed(0)}k` : String(v)} />
                            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => medSort === "mont" ? fmtDA(v) : `${v} unités`} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {chartData.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)] overflow-auto">
                        <h3 className="font-semibold text-sm mb-4">Détail — Top 20</h3>
                        <table className="w-full text-xs">
                          <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="text-left pb-2">#</th>
                              <th className="text-left pb-2">Médicament</th>
                              <th className="text-right pb-2">Qté</th>
                              <th className="text-right pb-2">Ordonn.</th>
                              <th className="text-right pb-2">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {top.map((m, i) => (
                              <tr key={i} className="hover:bg-muted/30">
                                <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                                <td className="py-1.5 pr-2">
                                  <div className="font-medium leading-tight">{m.medicament}</div>
                                  {m.nom_dci && m.nom_dci !== m.medicament && (
                                    <div className="text-muted-foreground text-[10px]">{m.nom_dci}</div>
                                  )}
                                </td>
                                <td className="py-1.5 text-right">{m.total_qte?.toLocaleString("fr-DZ")}</td>
                                <td className="py-1.5 text-right">{m.nb_prescriptions}</td>
                                <td className="py-1.5 text-right font-semibold">{fmtDA(m.total_mont)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Tab: prescripteurs ── */}
            {tab === "prescripteurs" && (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                  <h3 className="font-semibold text-sm mb-4">Top 15 prescripteurs — nombre d'ordonnances</h3>
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart
                      data={[...data.topPrescripteurs].slice(0,15).map(p => ({ name: shortName(p.prescripteur), value: p.nb_factures })).reverse()}
                      layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v} ordonnances`} />
                      <Bar dataKey="value" radius={[0,4,4,0]}>
                        {data.topPrescripteurs.slice(0,15).map((_,i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)] overflow-auto">
                  <h3 className="font-semibold text-sm mb-4">Détail prescripteurs</h3>
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="text-left pb-2">#</th>
                        <th className="text-left pb-2">Prescripteur</th>
                        <th className="text-right pb-2">Ordonn.</th>
                        <th className="text-right pb-2">CA total</th>
                        <th className="text-right pb-2">Moy.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.topPrescripteurs.map((p, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-1.5 pr-2 font-medium">{p.prescripteur}</td>
                          <td className="py-1.5 text-right">{p.nb_factures}</td>
                          <td className="py-1.5 text-right font-semibold">{fmtDA(p.total_ca)}</td>
                          <td className="py-1.5 text-right text-muted-foreground">{fmtDA(p.avg_ticket)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Tab: risque ── */}
            {tab === "risque" && (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                  <h3 className="font-semibold text-sm mb-4">Répartition par nature du risque</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={data.parRisque}
                        dataKey="nb"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={({ label, percent }) => `${label} ${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                      >
                        {data.parRisque.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString("fr-DZ")} factures`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)] overflow-auto">
                  <h3 className="font-semibold text-sm mb-4">Détail par risque</h3>
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="text-left pb-2">Risque</th>
                        <th className="text-right pb-2">Factures</th>
                        <th className="text-right pb-2">%</th>
                        <th className="text-right pb-2">CA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(() => {
                        const total = data.parRisque.reduce((s, r) => s + r.nb, 0);
                        return data.parRisque.map((r, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="py-2 pr-2">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLOURS[i % COLOURS.length] }} />
                                <span className="font-medium">{r.label}</span>
                              </span>
                            </td>
                            <td className="py-2 text-right">{r.nb.toLocaleString("fr-DZ")}</td>
                            <td className="py-2 text-right text-muted-foreground">{((r.nb / total) * 100).toFixed(1)}%</td>
                            <td className="py-2 text-right font-semibold">{fmtDA(r.ca)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Tab: organismes ── */}
            {tab === "organismes" && (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  {data.parOrganismeDetail.map((o) => (
                    <div key={o.organisme} className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm" style={{ color: ORG_COLOURS[o.organisme] ?? undefined }}>
                          {o.organisme}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <Row label="Ordonnances" value={o.nb_factures.toLocaleString("fr-DZ")} />
                        <Row label="Montant total" value={fmtDA(o.total_mont)} bold />
                        <Row label="Part organisme" value={fmtDA(o.total_as)} />
                        <Row label="Part patient" value={fmtDA(o.total_patient)} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
                  <h3 className="font-semibold text-sm mb-4">Répartition du montant par organisme</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.parOrganismeDetail} margin={{ left: 16, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="organisme" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmtDA(v)} />
                      <Legend />
                      <Bar dataKey="total_mont" name="Total prescrit" radius={[4,4,0,0]}>
                        {data.parOrganismeDetail.map((o) => <Cell key={o.organisme} fill={ORG_COLOURS[o.organisme] ?? "#90A4AE"} />)}
                      </Bar>
                      <Bar dataKey="total_as" name="Part organisme" radius={[4,4,0,0]} fill="#80CBC4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string;
  accent: "teal" | "green" | "blue" | "amber";
}) {
  const map = {
    teal:  "bg-teal-500/15 text-teal-600",
    green: "bg-green-500/15 text-green-700",
    blue:  "bg-blue-500/15 text-blue-700",
    amber: "bg-amber-500/15 text-amber-700",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${map[accent]}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`text-xs ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}
