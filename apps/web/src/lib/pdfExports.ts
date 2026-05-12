import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtDA } from "./api";

const BASE = "/api-server/api/pharma";

async function fetchExport<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`Export API failed: ${r.status}`);
  return r.json() as Promise<T>;
}

const TEAL = [0, 137, 123] as [number, number, number];
const TEAL_LIGHT = [178, 223, 219] as [number, number, number];

function header(doc: jsPDF, title: string, subtitle: string, dateDebut?: string, dateFin?: string) {
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 210, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("PHARMACIE BELFEKROUN HADJAR", 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sidi Bel Abbès — Algérie", 14, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, 196, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, 196, 19, { align: "right" });
  if (dateDebut || dateFin) {
    const period = dateDebut && dateFin
      ? `Période : ${dateDebut} → ${dateFin}`
      : dateDebut ? `À partir du : ${dateDebut}`
      : `Jusqu'au : ${dateFin}`;
    doc.text(period, 196, 26, { align: "right" });
  }

  doc.setTextColor(0, 0, 0);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `JamilaPharm — Généré le ${new Date().toLocaleString("fr-DZ")} — Page ${i}/${pages}`,
      105, 292, { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
  }
}

// ── 1. Rapport financier ──────────────────────────────────────
export async function exportRapportFinancier(dateDebut: string, dateFin: string) {
  const d = await fetchExport<{
    synthese: { total_factures: number; ca_total: number; total_as: number; total_off: number; ticket_moyen: number };
    parOrganisme: { organisme: string; nb_factures: number; ca: number; part_org: number; part_patient: number }[];
    parMois: { mois: string; nb: number; ca: number; part_org: number }[];
    creances: { num_bord: string; organisme: string; date_depot: string; nb_fact: number; montant_attendu: number; montant_vire: number }[];
  }>("/export/rapport-financier", { dateDebut, dateFin });

  const doc = new jsPDF();
  header(doc, "Rapport Financier", `Généré le ${new Date().toLocaleDateString("fr-DZ")}`, dateDebut, dateFin);
  let y = 38;

  // Synthèse
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...TEAL);
  doc.text("1. Synthèse globale", 14, y); y += 2;
  doc.setTextColor(0, 0, 0);
  const s = d.synthese;
  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Nombre de factures", s.total_factures.toLocaleString("fr-DZ")],
      ["Chiffre d'affaires total", fmtDA(s.ca_total)],
      ["Part organisme (remboursé)", fmtDA(s.total_as)],
      ["Part patient", fmtDA(s.total_off)],
      ["Ticket moyen", fmtDA(s.ticket_moyen)],
    ],
    headStyles: { fillColor: TEAL },
    alternateRowStyles: { fillColor: TEAL_LIGHT },
    theme: "striped",
  });

  // Par organisme
  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...TEAL);
  doc.text("2. Répartition par organisme", 14, y); y += 2;
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: y,
    head: [["Organisme", "Factures", "CA Total", "Part Org.", "Part Patient"]],
    body: d.parOrganisme.map((o) => [o.organisme, o.nb_factures, fmtDA(o.ca), fmtDA(o.part_org), fmtDA(o.part_patient)]),
    headStyles: { fillColor: TEAL },
    theme: "striped",
  });

  // Par mois
  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...TEAL);
  doc.text("3. Évolution mensuelle du CA", 14, y); y += 2;
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: y,
    head: [["Mois", "Nb Factures", "CA Total", "Part Org."]],
    body: d.parMois.map((m) => [m.mois, m.nb, fmtDA(m.ca), fmtDA(m.part_org)]),
    headStyles: { fillColor: TEAL },
    theme: "striped",
  });

  // Créances
  if (d.creances.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...TEAL);
    doc.text("4. Créances en attente (bordereaux ouverts)", 14, y); y += 2;
    doc.setTextColor(0, 0, 0);
    const totalCreances = d.creances.reduce((s, c) => s + c.montant_attendu - c.montant_vire, 0);
    autoTable(doc, {
      startY: y,
      head: [["N° Bordereau", "Organisme", "Dépôt", "Factures", "Attendu", "Viré", "Solde"]],
      body: d.creances.map((c) => [
        c.num_bord, c.organisme, c.date_depot || "—", c.nb_fact,
        fmtDA(c.montant_attendu), fmtDA(c.montant_vire), fmtDA(c.montant_attendu - c.montant_vire),
      ]),
      headStyles: { fillColor: TEAL },
      theme: "striped",
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`Total créances à recevoir : ${fmtDA(totalCreances)}`, 14, y);
  }

  footer(doc);
  doc.save(`rapport-financier-${dateDebut || "all"}_${dateFin || "all"}.pdf`);
}

// ── 2. Liste des factures ─────────────────────────────────────
export async function exportListeFactures(dateDebut: string, dateFin: string) {
  const d = await fetchExport<{
    factures: { num_fact: string; date_fact: string; nom_assure: string; num_assure: string; organisme: string; mont_fact: number; mont_as: number; mont_off: number; etat: string; num_bord: string; prescripteur: string }[];
    totaux: { nb: number; ca: number; total_as: number };
  }>("/export/factures", { dateDebut, dateFin });

  const doc = new jsPDF({ orientation: "landscape" });
  header(doc, "Liste des Factures", `${d.totaux.nb} factures`, dateDebut, dateFin);

  autoTable(doc, {
    startY: 36,
    head: [["N° Fact.", "Date", "Assuré", "N° Assuré", "Organisme", "Mont. total", "Part Org.", "Part Pat.", "État", "N° Bord."]],
    body: d.factures.map((f) => [
      f.num_fact, f.date_fact, f.nom_assure || "—", f.num_assure,
      f.organisme, fmtDA(f.mont_fact), fmtDA(f.mont_as), fmtDA(f.mont_off),
      f.etat, f.num_bord,
    ]),
    headStyles: { fillColor: TEAL, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    theme: "striped",
    alternateRowStyles: { fillColor: [245, 250, 250] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(
    `Total : ${d.totaux.nb} factures · CA : ${fmtDA(d.totaux.ca)} · Part org. : ${fmtDA(d.totaux.total_as)}`,
    14, finalY
  );

  footer(doc);
  doc.save(`liste-factures-${dateDebut || "all"}_${dateFin || "all"}.pdf`);
}

// ── 3. Récap bordereaux ───────────────────────────────────────
export async function exportRecapBordereaux(dateDebut: string, dateFin: string) {
  const d = await fetchExport<{
    bordereaux: { num_bord: string; organisme: string; etat: string; date_ouverture: string; date_cloture: string; date_depot: string; nb_factures: number; mont_fact: number; mont_as: number; mont_vire: number }[];
  }>("/export/bordereaux", { dateDebut, dateFin });

  const doc = new jsPDF({ orientation: "landscape" });
  header(doc, "Récapitulatif Bordereaux", `${d.bordereaux.length} bordereau(x)`, dateDebut, dateFin);

  autoTable(doc, {
    startY: 36,
    head: [["N° Bord.", "Organisme", "État", "Ouverture", "Clôture", "Dépôt", "Factures", "Montant total", "Part Org.", "Viré", "Solde"]],
    body: d.bordereaux.map((b) => [
      b.num_bord, b.organisme, b.etat,
      b.date_ouverture || "—", b.date_cloture || "—", b.date_depot || "—",
      b.nb_factures,
      fmtDA(b.mont_fact), fmtDA(b.mont_as), fmtDA(b.mont_vire),
      fmtDA(b.mont_as - b.mont_vire),
    ]),
    headStyles: { fillColor: TEAL, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    theme: "striped",
  });

  const totCA = d.bordereaux.reduce((s, b) => s + b.mont_fact, 0);
  const totAs = d.bordereaux.reduce((s, b) => s + b.mont_as, 0);
  const totVire = d.bordereaux.reduce((s, b) => s + b.mont_vire, 0);
  const y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(`CA : ${fmtDA(totCA)} · Part org. : ${fmtDA(totAs)} · Viré : ${fmtDA(totVire)} · Solde : ${fmtDA(totAs - totVire)}`, 14, y);

  footer(doc);
  doc.save(`recap-bordereaux-${dateDebut || "all"}_${dateFin || "all"}.pdf`);
}

// ── 4. Top médicaments ────────────────────────────────────────
export async function exportTopMedicaments(dateDebut: string, dateFin: string) {
  const d = await fetchExport<{
    medicaments: { medicament: string; dci: string; dosage: string; nb_ordonnances: number; total_qte: number; total_mont: number; total_as: number; total_patient: number }[];
    globaux: { total_lignes: number; medics_distincts: number; total_mont: number };
  }>("/export/top-medicaments", { dateDebut, dateFin });

  const doc = new jsPDF({ orientation: "landscape" });
  header(doc, "Top Médicaments Prescrits", `${d.globaux.total_lignes} lignes · ${d.globaux.medics_distincts} médicaments distincts`, dateDebut, dateFin);

  let y = 38;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...TEAL);
  doc.text(`Montant total prescrit : ${fmtDA(d.globaux.total_mont)}`, 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["#", "Médicament", "DCI", "Dosage", "Ordonnances", "Quantité", "Mont. Total", "Part Org.", "Part Patient"]],
    body: d.medicaments.map((m, i) => [
      i + 1, m.medicament, m.dci, m.dosage,
      m.nb_ordonnances, m.total_qte.toLocaleString("fr-DZ"),
      fmtDA(m.total_mont), fmtDA(m.total_as), fmtDA(m.total_patient),
    ]),
    headStyles: { fillColor: TEAL, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    theme: "striped",
    alternateRowStyles: { fillColor: [245, 250, 250] },
  });

  footer(doc);
  doc.save(`top-medicaments-${dateDebut || "all"}_${dateFin || "all"}.pdf`);
}

// ── 5. Récap prescripteurs ────────────────────────────────────
export async function exportRecapPrescripteurs(dateDebut: string, dateFin: string) {
  const d = await fetchExport<{
    prescripteurs: { prescripteur: string; nb_factures: number; ca_total: number; ticket_moyen: number; total_as: number; premiere_date: string; derniere_date: string }[];
  }>("/export/prescripteurs", { dateDebut, dateFin });

  const doc = new jsPDF({ orientation: "landscape" });
  header(doc, "Récapitulatif Prescripteurs", `${d.prescripteurs.length} prescripteur(s)`, dateDebut, dateFin);

  autoTable(doc, {
    startY: 36,
    head: [["#", "Prescripteur", "Ordonnances", "CA Total", "Part Org.", "Ticket Moy.", "Première ord.", "Dernière ord."]],
    body: d.prescripteurs.map((p, i) => [
      i + 1, p.prescripteur, p.nb_factures,
      fmtDA(p.ca_total), fmtDA(p.total_as), fmtDA(p.ticket_moyen),
      p.premiere_date, p.derniere_date,
    ]),
    headStyles: { fillColor: TEAL, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    theme: "striped",
  });

  footer(doc);
  doc.save(`recap-prescripteurs-${dateDebut || "all"}_${dateFin || "all"}.pdf`);
}

// ── 6. Catalogue médicaments ──────────────────────────────────
export async function exportCatalogueMedicaments() {
  const d = await fetchExport<{
    medicaments: { code: string; nom_com: string; nom_dci: string; dosage: string; conditionnement: string; tarif_ref: number; remboursable: string; stock: number; pays: string; laboratoire: string }[];
  }>("/export/medicaments-catalogue", {});

  const doc = new jsPDF({ orientation: "landscape" });
  header(doc, "Catalogue Médicaments", `${d.medicaments.length} références`);

  autoTable(doc, {
    startY: 36,
    head: [["Code", "Médicament", "DCI", "Dosage", "Conditionnement", "Tarif Réf.", "Remb.", "Laboratoire"]],
    body: d.medicaments.map((m) => [
      m.code, m.nom_com || "—", m.nom_dci || "—", m.dosage || "—", m.conditionnement || "—",
      fmtDA(m.tarif_ref), m.remboursable, m.laboratoire || "—",
    ]),
    headStyles: { fillColor: TEAL, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    theme: "striped",
    alternateRowStyles: { fillColor: [245, 250, 250] },
  });

  footer(doc);
  doc.save(`catalogue-medicaments-${new Date().toISOString().slice(0, 10)}.pdf`);
}
