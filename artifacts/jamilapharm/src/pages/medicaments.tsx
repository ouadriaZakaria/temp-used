import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Pill, Loader2 } from "lucide-react";
import { api, fmtDA, type Medicament } from "@/lib/api";

export default function MedsPage() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Medicament[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.medicaments({ search: q })
      .then((r) => setList(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultation médicaments</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${list.length} médicament(s).`}
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, DCI ou code..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => (
              <div key={m.code} className="bg-card border border-border rounded-2xl p-4 hover:shadow-[var(--shadow-soft)] transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  {m.rupture ? (
                    <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">Rupture</Badge>
                  ) : m.stock < 30 ? (
                    <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/20">Stock faible</Badge>
                  ) : (
                    <Badge className="bg-success/15 text-success hover:bg-success/15">En stock</Badge>
                  )}
                </div>
                <h3 className="font-bold">{m.nom_com}</h3>
                <p className="text-xs text-muted-foreground">{m.nom_dci} • {m.dosage}</p>
                <p className="text-xs text-muted-foreground mb-3">{m.conditionnement}</p>
                <div className="flex items-end justify-between pt-3 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">PPA</div>
                    <div className="font-bold">{fmtDA(m.ppa)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground">Stock</div>
                    <div className="font-semibold">{m.stock}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground">Remb.</div>
                    <div className="font-semibold">{m.remboursable ? "Oui" : "Non"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
