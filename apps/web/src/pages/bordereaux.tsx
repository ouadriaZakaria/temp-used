import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Loader2 } from "lucide-react";
import { api, fmtDA, type Bordereau, type Facture } from "@/lib/api";

export default function BordereauxPage() {
  const [centre, setCentre] = useState("all");
  const [statut, setStatut] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [list, setList] = useState<Bordereau[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailFacts, setDetailFacts] = useState<Facture[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.bordereaux({ centre, etat: statut, from, to })
      .then((r) => setList(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [centre, statut, from, to]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) { setDetailFacts([]); return; }
    setDetailLoading(true);
    api.bordereauFactures(selected)
      .then((r) => setDetailFacts(r.data))
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  }, [selected]);

  const detail = selected ? list.find((b) => b.num_bord === selected) : null;

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bordereaux</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${list.length} bordereau(x) — données réelles de la base pharmacie.`}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 grid gap-3 md:grid-cols-4">
          <Select value={centre} onValueChange={setCentre}>
            <SelectTrigger><SelectValue placeholder="Organisme" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous organismes</SelectItem>
              <SelectItem value="CNAS SBA">CNAS SBA</SelectItem>
              <SelectItem value="CASNOS SBA">CASNOS SBA</SelectItem>
              <SelectItem value="CNAS SBA (Ret.)">CNAS SBA (Ret.)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="O">Ouverts</SelectItem>
              <SelectItem value="F">Fermés/Clôturés</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Du" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Au" />
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : list.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <button
                key={b.num_bord}
                onClick={() => setSelected(b.num_bord === selected ? null : b.num_bord)}
                className={`text-left bg-card border rounded-2xl p-4 hover:border-primary/50 hover:shadow-[var(--shadow-soft)] transition-all ${b.num_bord === selected ? "border-primary/60 ring-1 ring-primary/20" : "border-border"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-muted-foreground font-semibold">{b.num_bord}</span>
                  <Badge variant={b.etat === "O" ? "default" : "secondary"} className={b.etat === "O" ? "bg-success/15 text-success hover:bg-success/15" : ""}>
                    {b.etat === "O" ? "Ouvert" : "Clôturé"}
                  </Badge>
                </div>
                <div className="text-lg font-bold">{fmtDA(b.mont_fact)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{fmtDA(b.mont_as)} part organisme • {b.nb_fact} facture(s)</div>
                <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                  <span className="font-medium text-foreground/70">{b.code_centre}</span>
                  <span>{b.mont_vir > 0 ? `✓ ${fmtDA(b.mont_vir)} viré` : b.date_depot ? b.date_depot : "—"}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {detail && (
          <div className="bg-card border-2 border-primary/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Détail bordereau {detail.num_bord}</h3>
              <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground">Fermer ✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
              <Field label="Organisme" value={detail.code_centre} />
              <Field label="Montant total" value={fmtDA(detail.mont_fact)} />
              <Field label="Part organisme" value={fmtDA(detail.mont_as)} />
              <Field label="Montant viré" value={detail.mont_vir > 0 ? fmtDA(detail.mont_vir) : "Non encore viré"} />
              <Field label="Date dépôt" value={detail.date_depot || "—"} />
              <Field label="Nb factures" value={String(detail.nb_fact)} />
              <Field label="Statut" value={detail.etat === "O" ? "Ouvert" : "Clôturé"} />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Factures de ce bordereau ({detailFacts.length})
            </div>
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement des factures…
              </div>
            ) : detailFacts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune facture trouvée.</p>
            ) : (
              <div className="divide-y divide-border max-h-64 overflow-auto rounded-xl border border-border">
                {detailFacts.map((f) => (
                  <div key={f.num_fact} className="px-3 py-2 flex gap-3 justify-between text-sm">
                    <span className="font-mono text-xs w-24 shrink-0">{f.num_fact}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{f.date_fact}</span>
                    <span className="truncate text-xs text-muted-foreground">{f.nom_assure}</span>
                    <span className="font-semibold text-xs shrink-0">{fmtDA(f.mont_fact)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
      <ScrollText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Aucun bordereau ne correspond à ces filtres.</p>
    </div>
  );
}
