import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  FileText, List, LayoutList, FlaskConical,
  Users, BookOpen, Download, Loader2, CalendarDays, X,
} from "lucide-react";
import {
  exportRapportFinancier,
  exportListeFactures,
  exportRecapBordereaux,
  exportTopMedicaments,
  exportRecapPrescripteurs,
  exportCatalogueMedicaments,
} from "@/lib/pdfExports";
import { toast } from "sonner";

type Card = {
  key: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  needsDates: boolean;
  fn: (a: string, b: string) => Promise<void>;
};

const CARDS: Card[] = [
  {
    key: "rapport",
    title: "Rapport financier",
    desc: "CA total, répartition par organisme, évolution mensuelle et créances en attente.",
    icon: FileText,
    accent: "teal",
    needsDates: true,
    fn: exportRapportFinancier,
  },
  {
    key: "factures",
    title: "Liste des factures",
    desc: "Toutes les factures de la période avec assuré, organisme, montant et état.",
    icon: List,
    accent: "blue",
    needsDates: true,
    fn: exportListeFactures,
  },
  {
    key: "bordereaux",
    title: "Récap. bordereaux",
    desc: "Bordereaux avec montants, virements, soldes et dates de dépôt.",
    icon: LayoutList,
    accent: "indigo",
    needsDates: true,
    fn: exportRecapBordereaux,
  },
  {
    key: "medicaments",
    title: "Top médicaments",
    desc: "Classement des 100 médicaments les plus prescrits : quantité, ordonnances, montant.",
    icon: FlaskConical,
    accent: "green",
    needsDates: true,
    fn: exportTopMedicaments,
  },
  {
    key: "prescripteurs",
    title: "Récap. prescripteurs",
    desc: "Tous les prescripteurs avec nombre d'ordonnances, CA et ticket moyen.",
    icon: Users,
    accent: "amber",
    needsDates: true,
    fn: exportRecapPrescripteurs,
  },
  {
    key: "catalogue",
    title: "Catalogue médicaments",
    desc: "Toute la base médicament : code, DCI, dosage, PPA, remboursable, stock.",
    icon: BookOpen,
    accent: "rose",
    needsDates: false,
    fn: async () => exportCatalogueMedicaments(),
  },
];

const ACCENT: Record<string, { bg: string; text: string; ring: string }> = {
  teal:   { bg: "bg-teal-500/15",  text: "text-teal-700",  ring: "ring-teal-400" },
  blue:   { bg: "bg-blue-500/15",  text: "text-blue-700",  ring: "ring-blue-400" },
  indigo: { bg: "bg-indigo-500/15",text: "text-indigo-700",ring: "ring-indigo-400" },
  green:  { bg: "bg-green-500/15", text: "text-green-700", ring: "ring-green-400" },
  amber:  { bg: "bg-amber-500/15", text: "text-amber-700", ring: "ring-amber-400" },
  rose:   { bg: "bg-rose-500/15",  text: "text-rose-700",  ring: "ring-rose-400" },
};

export default function ExportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${today.slice(0, 4)}-01-01`;

  const [dateDebut, setDateDebut] = useState(firstOfYear);
  const [dateFin, setDateFin] = useState(today);
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (card: Card) => {
    if (loading) return;
    setLoading(card.key);
    try {
      await card.fn(card.needsDates ? dateDebut : "", card.needsDates ? dateFin : "");
      toast.success(`${card.title} téléchargé`);
    } catch (e) {
      toast.error(`Erreur lors de la génération de « ${card.title} »`);
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const diffDays = dateDebut && dateFin
    ? Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000)
    : null;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exports PDF</h1>
          <p className="text-sm text-muted-foreground">
            Choisissez une période puis téléchargez les documents — données directes de la base.
          </p>
        </div>

        {/* ── Date range picker ── */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Période d'extraction</span>
            {diffDays !== null && diffDays >= 0 && (
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {diffDays} jour{diffDays !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-muted-foreground mb-1.5">Date de début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-muted-foreground mb-1.5">Date de fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Ce mois", fn: () => { const t = new Date(); setDateDebut(`${today.slice(0,7)}-01`); setDateFin(today); } },
                { label: "3 mois",  fn: () => { const d = new Date(); d.setMonth(d.getMonth()-3); setDateDebut(d.toISOString().slice(0,10)); setDateFin(today); } },
                { label: "6 mois",  fn: () => { const d = new Date(); d.setMonth(d.getMonth()-6); setDateDebut(d.toISOString().slice(0,10)); setDateFin(today); } },
                { label: "1 an",    fn: () => { setDateDebut(firstOfYear); setDateFin(today); } },
                { label: "Tout",    fn: () => { setDateDebut(""); setDateFin(""); } },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={p.fn}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {(dateDebut || dateFin) && (
              <button
                onClick={() => { setDateDebut(""); setDateFin(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Effacer
              </button>
            )}
          </div>

          {dateDebut && dateFin && (
            <p className="mt-3 text-xs text-muted-foreground">
              Les documents marqués <span className="font-medium text-foreground">Période requise</span> utiliseront
              la période sélectionnée. Le catalogue médicaments n'est pas filtré par date.
            </p>
          )}
        </div>

        {/* ── Export cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => {
            const a = ACCENT[card.accent];
            const isLoading = loading === card.key;
            return (
              <div
                key={card.key}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col shadow-[var(--shadow-soft)] hover:shadow-md transition-shadow"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${a.bg}`}>
                  <card.icon className={`w-5 h-5 ${a.text}`} />
                </div>

                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="font-semibold text-base leading-tight">{card.title}</h2>
                  {card.needsDates && (
                    <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Période
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{card.desc}</p>

                {card.needsDates && dateDebut && dateFin && (
                  <div className="mt-3 text-[11px] text-primary/80 bg-primary/8 rounded-lg px-2.5 py-1.5">
                    {dateDebut} → {dateFin}
                  </div>
                )}

                <button
                  onClick={() => run(card)}
                  disabled={!!loading}
                  className={`mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md
                    ${isLoading
                      ? "bg-muted text-muted-foreground cursor-wait"
                      : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/25"
                    }`}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…</>
                  ) : (
                    <><Download className="w-4 h-4" /> Télécharger PDF</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Récupération des données et génération du PDF en cours…
          </div>
        )}
      </div>
    </AppShell>
  );
}
