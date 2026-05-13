// const BASE = "/api-server/api/pharma";// this is the cause of the problem in ghoulelm code
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/pharma";

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  }
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`API ${path} failed: ${r.status}`);
  return r.json() as Promise<T>;
}

export type Facture = {
  num_fact: string;
  date_fact: string;
  num_assure: string;
  nom_assure: string;
  code_centre: string;
  mont_fact: number;
  mont_as: number;
  mont_off: number;
  etat: "P" | "N";
  num_bord: string | null;
};

export type Bordereau = {
  num_bord: string;
  code_centre: string;
  etat: "O" | "F";
  mont_vir: number;
  date_depot: string | null;
  nb_fact: number;
  mont_fact: number;
  mont_as: number;
};

export type Medicament = {
  code: string;
  nom_com: string;
  nom_dci: string;
  dosage: string;
  conditionnement: string;
  ppa: number;
  tarif_ref: number;
  remboursable: boolean;
  stock: number;
  rupture: boolean;
};

export type MonthlyRow = {
  mois: string;
  ca: number;
  cas: number;
  n: number;
  avg_ticket?: number;
  "CNAS SBA"?: number;
  "CASNOS SBA"?: number;
  "CNAS (Ret.)"?: number;
};

export type DashboardData = {
  kpis: { ca12mois: number; verse: number; restant: number; dettes_fournisseurs: number };
  monthlyData: MonthlyRow[];
  pieData: { organisme: string; montant: number }[];
  bordereaux: { ouverts: number; totalOuvert: number };
  factures: { total: number; ca: number; verse: number };
};

export const api = {
  dashboard: () => get<DashboardData>("/dashboard"),
  factures: (p: Record<string, string>) => get<{ total: number; data: Facture[] }>("/factures", p),
  bordereaux: (p: Record<string, string>) => get<{ data: Bordereau[] }>("/bordereaux", p),
  bordereauFactures: (num: string) => get<{ data: Facture[] }>(`/bordereaux/${encodeURIComponent(num)}/factures`),
  medicaments: (p: Record<string, string>) => get<{ data: Medicament[] }>("/medicaments", p),
  statistiques: () => get<{ monthly: MonthlyRow[]; totals: { totalFactures: number; totalCa: number; avgTicket: number } }>("/statistiques"),
};

export const fmtDA = (n: number) =>
  new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(n) + " DA";
