import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { api, fmtDA, type Facture } from "@/lib/api";

export default function FacturesPage() {
  const [search, setSearch] = useState("");
  const [centre, setCentre] = useState("all");
  const [etat, setEtat] = useState("all");
  const [date, setDate] = useState("");
  const [data, setData] = useState<{ total: number; data: Facture[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.factures({ search, centre, etat, date, limit: "300" })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, centre, etat, date]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const list = data?.data ?? [];
  const totalList = list.reduce((a, f) => a + f.mont_fact, 0);
  const totalAs = list.reduce((a, f) => a + f.mont_as, 0);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Factures</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${data?.total ?? 0} facture(s) — ${fmtDA(totalList)} total • ${fmtDA(totalAs)} part organisme`}
            {!loading && data && list.length < data.total && (
              <span className="ml-2 text-muted-foreground/60">(300 affichées sur {data.total})</span>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-4 grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="N° facture, nom assuré..." className="pl-9" />
          </div>
          <Select value={centre} onValueChange={setCentre}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous organismes</SelectItem>
              <SelectItem value="CNAS SBA">CNAS SBA</SelectItem>
              <SelectItem value="CASNOS SBA">CASNOS SBA</SelectItem>
              <SelectItem value="CNAS SBA (Ret.)">CNAS SBA (Ret.)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={etat} onValueChange={setEtat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous états</SelectItem>
              <SelectItem value="P">Signées / Payées</SelectItem>
              <SelectItem value="N">En attente</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
            </div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Aucun résultat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-medium">N° Facture</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Assuré</th>
                    <th className="text-left p-3 font-medium">Organisme</th>
                    <th className="text-right p-3 font-medium">Montant total</th>
                    <th className="text-right p-3 font-medium">Part organisme</th>
                    <th className="text-center p-3 font-medium">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((f) => (
                    <tr key={f.num_fact} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{f.num_fact}</td>
                      <td className="p-3 text-xs">{f.date_fact}</td>
                      <td className="p-3">
                        <div className="font-medium text-xs leading-tight">{f.nom_assure}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{f.num_assure}</div>
                      </td>
                      <td className="p-3 text-xs">{f.code_centre}</td>
                      <td className="p-3 text-right font-semibold text-xs">{fmtDA(f.mont_fact)}</td>
                      <td className="p-3 text-right text-xs text-muted-foreground">{fmtDA(f.mont_as)}</td>
                      <td className="p-3 text-center">
                        <Badge className={f.etat === "P" ? "bg-success/15 text-success hover:bg-success/15 text-[10px]" : "bg-warning/20 text-warning-foreground hover:bg-warning/20 text-[10px]"}>
                          {f.etat === "P" ? "Signée" : "En attente"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
