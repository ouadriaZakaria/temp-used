import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

const CENTRE_CASE = (col = "code_centre") => `CASE ${col}
  WHEN '12209' THEN 'CNAS SBA'
  WHEN '92209' THEN 'CNAS SBA (Ret.)'
  WHEN '22200' THEN 'CASNOS SBA'
  WHEN '82200' THEN 'CASNOS SBA'
  WHEN '12210' THEN 'CNAS SBA'
  ELSE COALESCE(${col}, '?')
END`;

router.get("/dashboard", async (_req, res) => {
  try {
    const { rows: kpis } = await pool.query(
      "SELECT cle, valeur FROM kpi_cache"
    );
    const kpiMap: Record<string, number> = {};
    kpis.forEach((r: { cle: string; valeur: string }) => {
      kpiMap[r.cle] = parseFloat(r.valeur);
    });

    const { rows: monthly } = await pool.query(`
      WITH max_date AS (SELECT MAX(date_fact) AS d FROM facture)
      SELECT
        to_char(date_fact, 'YYYY-MM') AS mois,
        ROUND(SUM(mont_fact)::numeric, 2) AS ca,
        ROUND(SUM(mont_as)::numeric, 2) AS cas,
        COUNT(*)::int AS n
      FROM facture, max_date
      WHERE date_fact >= (max_date.d - INTERVAL '11 months' - (EXTRACT(DAY FROM max_date.d) - 1) * INTERVAL '1 day')::date
        AND date_fact <= max_date.d
      GROUP BY 1
      ORDER BY 1
    `);

    const { rows: pie } = await pool.query(`
      WITH max_date AS (SELECT MAX(date_fact) AS d FROM facture)
      SELECT
        ${CENTRE_CASE()} AS organisme,
        ROUND(SUM(mont_fact)::numeric, 2) AS montant
      FROM facture, max_date
      WHERE date_fact >= (max_date.d - INTERVAL '11 months' - (EXTRACT(DAY FROM max_date.d) - 1) * INTERVAL '1 day')::date
        AND date_fact <= max_date.d
      GROUP BY code_centre
      ORDER BY montant DESC
    `);

    const { rows: bSummary } = await pool.query(`
      SELECT
        COUNT(DISTINCT b.num_bord) FILTER (WHERE b.etat='O')::int AS ouverts,
        ROUND(COALESCE(SUM(f.mont_as) FILTER (WHERE b.etat='O'), 0)::numeric, 2) AS total_ouvert
      FROM bordereau b
      LEFT JOIN facture f ON f.num_bord = b.num_bord
    `);

    const { rows: fSummary } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        ROUND(SUM(mont_fact)::numeric, 2) AS ca,
        ROUND(SUM(mont_as)::numeric, 2) AS verse
      FROM facture
    `);

    res.json({
      kpis: {
        ca12mois: kpiMap["ca12mois"] ?? 0,
        verse: kpiMap["verse"] ?? 0,
        restant: kpiMap["restant"] ?? 0,
        dettes_fournisseurs: kpiMap["dettes_fournisseurs"] ?? 0,
      },
      monthlyData: monthly.map((r: { mois: string; ca: string; cas: string; n: number }) => ({
        mois: r.mois,
        ca: parseFloat(r.ca),
        cas: parseFloat(r.cas),
        n: r.n,
      })),
      pieData: pie.map((r: { organisme: string; montant: string }) => ({
        organisme: r.organisme,
        montant: parseFloat(r.montant),
      })),
      bordereaux: {
        ouverts: bSummary[0]?.ouverts ?? 0,
        totalOuvert: parseFloat(bSummary[0]?.total_ouvert ?? "0"),
      },
      factures: {
        total: fSummary[0]?.total ?? 0,
        ca: parseFloat(fSummary[0]?.ca ?? "0"),
        verse: parseFloat(fSummary[0]?.verse ?? "0"),
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/factures", async (req, res) => {
  try {
    const { search, centre, etat, date, page = "1", limit = "200" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (search) {
      conditions.push(`(f.num_fact ILIKE $${i} OR f.num_assure ILIKE $${i} OR b.nom ILIKE $${i} OR b.prenom ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    if (centre && centre !== "all") {
      conditions.push(`f.code_centre = $${i}`);
      params.push(centre);
      i++;
    }
    if (etat && etat !== "all") {
      conditions.push(`f.etat = $${i}`);
      params.push(etat);
      i++;
    }
    if (date) {
      conditions.push(`f.date_fact::date = $${i}`);
      params.push(date);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM facture f
       LEFT JOIN beneficiaire b ON b.num_assure = f.num_assure AND b.rang_ad = f.rang_ad
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const { rows } = await pool.query(
      `SELECT f.num_fact,
              to_char(f.date_fact, 'YYYY-MM-DD') AS date_fact,
              f.num_assure,
              COALESCE(TRIM(b.nom) || ' ' || TRIM(b.prenom), f.num_assure) AS nom_assure,
              f.code_centre,
              ${CENTRE_CASE("f.code_centre")} AS organisme,
              f.mont_fact::float, f.mont_as::float, f.mont_off::float,
              f.etat, f.num_bord, f.prescripteur, f.risque
       FROM facture f
       LEFT JOIN beneficiaire b ON b.num_assure = f.num_assure AND b.rang_ad = f.rang_ad
       ${where}
       ORDER BY f.date_fact DESC NULLS LAST, f.num_fact DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ total, data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/bordereaux", async (req, res) => {
  try {
    const { centre, etat, from, to } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (centre && centre !== "all") {
      conditions.push(`b.code_centre = $${i++}`);
      params.push(centre);
    }
    if (etat && etat !== "all") {
      conditions.push(`b.etat = $${i++}`);
      params.push(etat);
    }
    if (from) {
      conditions.push(`b.date_depot_ftp >= $${i++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`b.date_depot_ftp <= $${i++}`);
      params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT
         b.num_bord,
         ${CENTRE_CASE("b.code_centre")} AS code_centre,
         b.etat,
         b.mont_vir::float,
         to_char(b.date_depot_ftp, 'YYYY-MM-DD') AS date_depot,
         to_char(b.date_cloture, 'YYYY-MM-DD') AS date_cloture,
         to_char(b.date_ouverture, 'YYYY-MM-DD') AS date_ouverture,
         COUNT(f.num_fact)::int AS nb_fact,
         COALESCE(SUM(f.mont_fact), 0)::float AS mont_fact,
         COALESCE(SUM(f.mont_as), 0)::float AS mont_as
       FROM bordereau b
       LEFT JOIN facture f ON f.num_bord = b.num_bord
       ${where}
       GROUP BY b.num_bord, b.code_centre, b.etat, b.mont_vir, b.date_depot_ftp, b.date_cloture, b.date_ouverture
       ORDER BY b.date_depot_ftp DESC NULLS LAST, b.num_bord DESC`,
      params
    );

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/bordereaux/:num/factures", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.num_fact, to_char(f.date_fact,'YYYY-MM-DD') AS date_fact,
              f.num_assure,
              COALESCE(TRIM(b.nom) || ' ' || TRIM(b.prenom), f.num_assure) AS nom_assure,
              f.code_centre,
              ${CENTRE_CASE("f.code_centre")} AS organisme,
              f.mont_fact::float, f.mont_as::float, f.mont_off::float,
              f.etat, f.prescripteur, f.risque
       FROM facture f
       LEFT JOIN beneficiaire b ON b.num_assure = f.num_assure AND b.rang_ad = f.rang_ad
       WHERE f.num_bord = $1
       ORDER BY f.date_fact DESC`,
      [req.params.num]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/medicaments", async (req, res) => {
  try {
    const { search } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (search) {
      conditions.push(`(nom_com ILIKE $${i} OR nom_dci ILIKE $${i} OR num_enr ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT num_enr AS code, nom_com, nom_dci, dosage, conditionnement,
              tarif_ref::float,
              CASE remboursable WHEN 'O' THEN true ELSE false END AS remboursable,
              pays, laboratoire, code_sp, generic
       FROM medicament ${where}
       ORDER BY nom_com
       LIMIT 500`,
      params
    );

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/statistiques", async (_req, res) => {
  try {
    const { rows: monthly } = await pool.query(`
      SELECT
        to_char(date_fact, 'YYYY-MM') AS mois,
        ROUND(SUM(mont_fact)::numeric, 2) AS ca,
        ROUND(SUM(mont_as)::numeric, 2) AS cas,
        COUNT(*)::int AS n,
        ROUND(AVG(mont_fact)::numeric, 2) AS avg_ticket,
        ROUND(COALESCE(SUM(mont_fact) FILTER (WHERE code_centre IN ('12209','12210')), 0)::numeric, 2) AS cnas,
        ROUND(COALESCE(SUM(mont_fact) FILTER (WHERE code_centre IN ('22200','82200')), 0)::numeric, 2) AS casnos,
        ROUND(COALESCE(SUM(mont_fact) FILTER (WHERE code_centre = '92209'), 0)::numeric, 2) AS cnas_ret
      FROM facture
      WHERE date_fact IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `);

    const { rows: totals } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_factures,
        ROUND(SUM(mont_fact)::numeric, 2) AS total_ca,
        ROUND(AVG(mont_fact)::numeric, 2) AS avg_ticket
      FROM facture
    `);

    res.json({
      monthly: monthly.map((r: Record<string, string | number>) => ({
        mois: r.mois,
        ca: parseFloat(String(r.ca || 0)),
        cas: parseFloat(String(r.cas || 0)),
        n: r.n,
        avg_ticket: parseFloat(String(r.avg_ticket || 0)),
        "CNAS SBA": parseFloat(String(r.cnas || 0)),
        "CASNOS SBA": parseFloat(String(r.casnos || 0)),
        "CNAS (Ret.)": parseFloat(String(r.cnas_ret || 0)),
      })),
      totals: {
        totalFactures: totals[0]?.total_factures ?? 0,
        totalCa: parseFloat(totals[0]?.total_ca ?? "0"),
        avgTicket: parseFloat(totals[0]?.avg_ticket ?? "0"),
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/analyse", async (_req, res) => {
  try {
    const { rows: topMedQte } = await pool.query(`
      SELECT
        COALESCE(m.nom_com, d.num_enr) AS medicament,
        m.nom_dci,
        m.dosage,
        COUNT(DISTINCT d.num_fact)::int AS nb_prescriptions,
        SUM(d.qte)::float AS total_qte,
        ROUND(SUM(d.mont)::numeric,2)::float AS total_mont,
        ROUND(SUM(d.mont_as)::numeric,2)::float AS total_as
      FROM detail_fact d
      LEFT JOIN medicament m ON m.num_enr = d.num_enr
      GROUP BY d.num_enr, m.nom_com, m.nom_dci, m.dosage
      ORDER BY total_qte DESC
      LIMIT 20
    `);

    const { rows: topMedMont } = await pool.query(`
      SELECT
        COALESCE(m.nom_com, d.num_enr) AS medicament,
        m.nom_dci,
        ROUND(SUM(d.mont)::numeric,2)::float AS total_mont,
        ROUND(SUM(d.mont_as)::numeric,2)::float AS total_as,
        SUM(d.qte)::float AS total_qte,
        COUNT(DISTINCT d.num_fact)::int AS nb_prescriptions
      FROM detail_fact d
      LEFT JOIN medicament m ON m.num_enr = d.num_enr
      GROUP BY d.num_enr, m.nom_com, m.nom_dci
      ORDER BY total_mont DESC
      LIMIT 20
    `);

    const { rows: parRisque } = await pool.query(`
      SELECT
        CASE risque
          WHEN '1' THEN 'Maladie ordinaire'
          WHEN '2' THEN 'Maternité'
          WHEN '3' THEN 'Accident de travail'
          WHEN '4' THEN 'Maladie professionnelle'
          ELSE COALESCE(risque, 'Non renseigné')
        END AS label,
        COUNT(*)::int AS nb,
        ROUND(SUM(mont_fact)::numeric,2)::float AS ca
      FROM facture
      GROUP BY risque
      ORDER BY nb DESC
    `);

    const { rows: topPrescripteurs } = await pool.query(`
      SELECT
        prescripteur,
        COUNT(*)::int AS nb_factures,
        ROUND(SUM(mont_fact)::numeric,2)::float AS total_ca,
        ROUND(AVG(mont_fact)::numeric,2)::float AS avg_ticket
      FROM facture
      WHERE prescripteur IS NOT NULL AND prescripteur <> ''
      GROUP BY prescripteur
      ORDER BY nb_factures DESC
      LIMIT 15
    `);

    const { rows: globaux } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_lignes,
        COUNT(DISTINCT num_enr)::int AS medics_distincts,
        COUNT(DISTINCT num_fact)::int AS factures_avec_detail,
        ROUND(SUM(mont)::numeric,2)::float AS total_mont,
        ROUND(SUM(mont_as)::numeric,2)::float AS total_as,
        ROUND(AVG(qte)::numeric,3)::float AS qte_moy
      FROM detail_fact
    `);

    const { rows: pharmaInfo } = await pool.query(`
      SELECT code_ps, nom_pharmacie, nom, prenom, adresse, num_tel, code_centre
      FROM parametre LIMIT 1
    `);

    const { rows: parOrganismeDetail } = await pool.query(`
      SELECT
        ${CENTRE_CASE("f.code_centre")} AS organisme,
        COUNT(DISTINCT d.num_fact)::int AS nb_factures,
        ROUND(SUM(d.mont)::numeric,2)::float AS total_mont,
        ROUND(SUM(d.mont_as)::numeric,2)::float AS total_as,
        ROUND(SUM(d.mont_pharm)::numeric,2)::float AS total_patient
      FROM detail_fact d
      JOIN facture f ON f.num_fact = d.num_fact
      GROUP BY f.code_centre
      ORDER BY total_mont DESC
    `);

    res.json({
      globaux: globaux[0],
      topMedQte,
      topMedMont,
      parRisque,
      topPrescripteurs,
      parOrganismeDetail,
      pharmaInfo: pharmaInfo[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/tresorerie", async (_req, res) => {
  try {
    const { rows: restant } = await pool.query(`
      SELECT
        ${CENTRE_CASE("b.code_centre")} AS organisme,
        b.num_bord,
        to_char(b.date_depot_ftp, 'YYYY-MM-DD') AS date_depot,
        to_char(b.date_cloture, 'YYYY-MM-DD') AS date_cloture,
        COUNT(f.num_fact)::int AS nb_fact,
        COALESCE(SUM(f.mont_as), 0)::float AS montant_attendu,
        b.mont_vir::float AS montant_vire
      FROM bordereau b
      LEFT JOIN facture f ON f.num_bord = b.num_bord
      WHERE b.etat = 'O'
      GROUP BY b.num_bord, b.code_centre, b.mont_vir, b.date_depot_ftp, b.date_cloture
      ORDER BY montant_attendu DESC
    `);

    const { rows: parOrganisme } = await pool.query(`
      SELECT
        ${CENTRE_CASE("b.code_centre")} AS organisme,
        COUNT(b.num_bord)::int AS nb_bords,
        COALESCE(SUM(f.mont_as), 0)::float AS montant_attendu,
        COALESCE(SUM(b.mont_vir), 0)::float AS montant_vire
      FROM bordereau b
      LEFT JOIN facture f ON f.num_bord = b.num_bord
      WHERE b.etat = 'O'
      GROUP BY b.code_centre
      ORDER BY montant_attendu DESC
    `);

    const { rows: dettes } = await pool.query(`
      SELECT
        id, nom, adresse, telephone,
        montant_du::float,
        to_char(date_echeance, 'YYYY-MM-DD') AS date_echeance,
        actif
      FROM fournisseur
      WHERE actif = true AND montant_du > 0
      ORDER BY date_echeance ASC
    `);

    const { rows: livraisons } = await pool.query(`
      SELECT
        l.id, l.reference,
        to_char(l.date_livraison, 'YYYY-MM-DD') AS date_livraison,
        l.montant_ht::float, l.montant_ttc::float,
        l.statut_paiement,
        to_char(l.date_paiement, 'YYYY-MM-DD') AS date_paiement,
        l.nb_articles,
        f.nom AS fournisseur
      FROM livraison_fournisseur l
      JOIN fournisseur f ON f.id = l.fournisseur_id
      ORDER BY l.date_livraison DESC
      LIMIT 20
    `);

    const totalDettes = dettes.reduce((s: number, r: { montant_du: number }) => s + r.montant_du, 0);
    const totalRestant = restant.reduce((s: number, r: { montant_attendu: number }) => s + r.montant_attendu, 0);

    res.json({
      restant: { total: totalRestant, details: restant, parOrganisme },
      dettes: { total: totalDettes, details: dettes },
      livraisons,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const CENTRE = CENTRE_CASE();

router.get("/export/rapport-financier", async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query as Record<string, string>;
    const conds: string[] = [];
    if (dateDebut) conds.push(`date_fact >= '${dateDebut}'`);
    if (dateFin)   conds.push(`date_fact <= '${dateFin}'`);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : "";
    const andFilter = conds.length ? `AND ${conds.join(' AND ')}` : "";

    const { rows: synthese } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_factures,
        ROUND(SUM(mont_fact)::numeric,2)::float AS ca_total,
        ROUND(SUM(mont_as)::numeric,2)::float AS total_as,
        ROUND(SUM(mont_off)::numeric,2)::float AS total_off,
        ROUND(AVG(mont_fact)::numeric,2)::float AS ticket_moyen
      FROM facture ${where}
    `);

    const { rows: parOrganisme } = await pool.query(`
      SELECT
        ${CENTRE} AS organisme,
        COUNT(*)::int AS nb_factures,
        ROUND(SUM(mont_fact)::numeric,2)::float AS ca,
        ROUND(SUM(mont_as)::numeric,2)::float AS part_org,
        ROUND(SUM(mont_off)::numeric,2)::float AS part_patient
      FROM facture ${where}
      GROUP BY code_centre ORDER BY ca DESC
    `);

    const { rows: parMois } = await pool.query(`
      SELECT
        to_char(date_fact,'YYYY-MM') AS mois,
        COUNT(*)::int AS nb,
        ROUND(SUM(mont_fact)::numeric,2)::float AS ca,
        ROUND(SUM(mont_as)::numeric,2)::float AS part_org
      FROM facture ${where}
      GROUP BY 1 ORDER BY 1
    `);

    const { rows: creances } = await pool.query(`
      SELECT
        b.num_bord,
        ${CENTRE_CASE("b.code_centre")} AS organisme,
        to_char(b.date_depot_ftp,'YYYY-MM-DD') AS date_depot,
        COUNT(f.num_fact)::int AS nb_fact,
        ROUND(COALESCE(SUM(f.mont_as),0)::numeric,2)::float AS montant_attendu,
        COALESCE(b.mont_vir,0)::float AS montant_vire
      FROM bordereau b
      LEFT JOIN facture f ON f.num_bord=b.num_bord ${andFilter}
      WHERE b.etat='O'
      GROUP BY b.num_bord,b.code_centre,b.mont_vir,b.date_depot_ftp
      ORDER BY montant_attendu DESC
    `);

    res.json({ synthese: synthese[0], parOrganisme, parMois, creances });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.get("/export/factures", async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query as Record<string, string>;
    const conds: string[] = [];
    if (dateDebut) conds.push(`f.date_fact >= '${dateDebut}'`);
    if (dateFin)   conds.push(`f.date_fact <= '${dateFin}'`);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : "";

    const { rows } = await pool.query(`
      SELECT
        f.num_fact,
        to_char(f.date_fact,'YYYY-MM-DD') AS date_fact,
        COALESCE(TRIM(b.nom) || ' ' || TRIM(b.prenom), f.num_assure) AS nom_assure,
        f.num_assure,
        ${CENTRE} AS organisme,
        ROUND(f.mont_fact::numeric,2)::float AS mont_fact,
        ROUND(f.mont_as::numeric,2)::float AS mont_as,
        ROUND(f.mont_off::numeric,2)::float AS mont_off,
        CASE f.etat WHEN 'P' THEN 'Payé' WHEN 'N' THEN 'En attente' ELSE COALESCE(f.etat,'?') END AS etat,
        COALESCE(f.num_bord,'—') AS num_bord,
        f.prescripteur,
        CASE f.risque
          WHEN '1' THEN 'Maladie'
          WHEN '2' THEN 'Maternité'
          WHEN '3' THEN 'AT'
          WHEN '4' THEN 'MP'
          ELSE f.risque
        END AS risque
      FROM facture f
      LEFT JOIN beneficiaire b ON b.num_assure = f.num_assure AND b.rang_ad = f.rang_ad
      ${where}
      ORDER BY f.date_fact DESC
      LIMIT 5000
    `);

    const { rows: totaux } = await pool.query(`
      SELECT COUNT(*)::int AS nb,
        ROUND(SUM(mont_fact)::numeric,2)::float AS ca,
        ROUND(SUM(mont_as)::numeric,2)::float AS total_as
      FROM facture ${where.replace(/f\./g, "")}
    `);

    res.json({ factures: rows, totaux: totaux[0] });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.get("/export/bordereaux", async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query as Record<string, string>;
    const conds: string[] = [];
    if (dateDebut) conds.push(`b.date_cloture >= '${dateDebut}'`);
    if (dateFin)   conds.push(`b.date_cloture <= '${dateFin}'`);
    const andWhere = conds.length ? `AND ${conds.join(' AND ')}` : "";

    const { rows } = await pool.query(`
      SELECT
        b.num_bord,
        ${CENTRE_CASE("b.code_centre")} AS organisme,
        CASE b.etat WHEN 'O' THEN 'Ouvert' WHEN 'F' THEN 'Clôturé' ELSE COALESCE(b.etat,'?') END AS etat,
        to_char(b.date_ouverture,'YYYY-MM-DD') AS date_ouverture,
        to_char(b.date_cloture,'YYYY-MM-DD') AS date_cloture,
        to_char(b.date_depot_ftp,'YYYY-MM-DD') AS date_depot,
        COUNT(f.num_fact)::int AS nb_factures,
        ROUND(COALESCE(SUM(f.mont_fact),0)::numeric,2)::float AS mont_fact,
        ROUND(COALESCE(SUM(f.mont_as),0)::numeric,2)::float AS mont_as,
        COALESCE(b.mont_vir,0)::float AS mont_vire
      FROM bordereau b
      LEFT JOIN facture f ON f.num_bord=b.num_bord
      WHERE 1=1 ${andWhere}
      GROUP BY b.num_bord,b.code_centre,b.etat,b.date_ouverture,b.date_cloture,b.date_depot_ftp,b.mont_vir
      ORDER BY b.date_cloture DESC NULLS LAST, b.num_bord DESC
    `);

    res.json({ bordereaux: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.get("/export/top-medicaments", async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query as Record<string, string>;
    const conds: string[] = [];
    if (dateDebut) conds.push(`f.date_fact >= '${dateDebut}'`);
    if (dateFin)   conds.push(`f.date_fact <= '${dateFin}'`);
    const andWhere = conds.length ? `AND ${conds.join(' AND ')}` : "";

    const { rows } = await pool.query(`
      SELECT
        COALESCE(m.nom_com, d.num_enr) AS medicament,
        COALESCE(m.nom_dci,'') AS dci,
        COALESCE(m.dosage,'') AS dosage,
        COUNT(DISTINCT d.num_fact)::int AS nb_ordonnances,
        ROUND(SUM(d.qte)::numeric,0)::float AS total_qte,
        ROUND(SUM(d.mont)::numeric,2)::float AS total_mont,
        ROUND(SUM(d.mont_as)::numeric,2)::float AS total_as,
        ROUND(SUM(d.mont_pharm)::numeric,2)::float AS total_patient
      FROM detail_fact d
      LEFT JOIN medicament m ON m.num_enr = d.num_enr
      LEFT JOIN facture f ON f.num_fact = d.num_fact
      WHERE 1=1 ${andWhere}
      GROUP BY d.num_enr, m.nom_com, m.nom_dci, m.dosage
      ORDER BY total_qte DESC
      LIMIT 100
    `);

    const { rows: globaux } = await pool.query(`
      SELECT COUNT(*)::int AS total_lignes,
        COUNT(DISTINCT d.num_enr)::int AS medics_distincts,
        ROUND(SUM(d.mont)::numeric,2)::float AS total_mont
      FROM detail_fact d
      LEFT JOIN facture f ON f.num_fact = d.num_fact
      WHERE 1=1 ${andWhere}
    `);

    res.json({ medicaments: rows, globaux: globaux[0] });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.get("/export/prescripteurs", async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query as Record<string, string>;
    const conds: string[] = ["prescripteur IS NOT NULL", "prescripteur <> ''"];
    if (dateDebut) conds.push(`date_fact >= '${dateDebut}'`);
    if (dateFin)   conds.push(`date_fact <= '${dateFin}'`);
    const where = `WHERE ${conds.join(' AND ')}`;

    const { rows } = await pool.query(`
      SELECT
        prescripteur,
        COUNT(*)::int AS nb_factures,
        ROUND(SUM(mont_fact)::numeric,2)::float AS ca_total,
        ROUND(AVG(mont_fact)::numeric,2)::float AS ticket_moyen,
        ROUND(SUM(mont_as)::numeric,2)::float AS total_as,
        to_char(MIN(date_fact),'YYYY-MM-DD') AS premiere_date,
        to_char(MAX(date_fact),'YYYY-MM-DD') AS derniere_date
      FROM facture ${where}
      GROUP BY prescripteur
      ORDER BY nb_factures DESC
    `);

    res.json({ prescripteurs: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.get("/export/medicaments-catalogue", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        num_enr AS code,
        nom_com,
        nom_dci,
        dosage,
        conditionnement,
        ROUND(COALESCE(tarif_ref, 0)::numeric,2)::float AS tarif_ref,
        CASE remboursable WHEN 'O' THEN 'Oui' ELSE 'Non' END AS remboursable,
        pays,
        laboratoire
      FROM medicament
      ORDER BY nom_com
      LIMIT 10000
    `);
    res.json({ medicaments: rows });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.get("/creances", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.num_bord,
        ${CENTRE_CASE("b.code_centre")} AS organisme,
        b.etat,
        b.mont_vir::float AS montant_vire,
        COUNT(f.num_fact)::int AS nb_fact,
        ROUND(COALESCE(SUM(f.mont_fact), 0)::numeric, 2)::float AS montant_total,
        ROUND(COALESCE(SUM(f.mont_as), 0)::numeric, 2)::float AS montant_attendu,
        to_char(MIN(f.date_fact), 'YYYY-MM-DD') AS premiere_facture,
        to_char(MAX(f.date_fact), 'YYYY-MM-DD') AS derniere_facture,
        GREATEST(0, EXTRACT(DAY FROM NOW() - MIN(f.date_fact))::int) AS age_jours
      FROM bordereau b
      LEFT JOIN facture f ON f.num_bord = b.num_bord
      WHERE b.etat = 'O'
      GROUP BY b.num_bord, b.code_centre, b.etat, b.mont_vir
      ORDER BY montant_attendu DESC
    `);

    const total = rows.reduce((s: number, r: { montant_attendu: number }) => s + r.montant_attendu, 0);
    const totalFactures = rows.reduce((s: number, r: { montant_total: number }) => s + r.montant_total, 0);
    res.json({ data: rows, total, totalFactures });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/creances/:num/factures", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.num_fact, to_char(f.date_fact,'YYYY-MM-DD') AS date_fact,
              f.num_assure,
              COALESCE(TRIM(b.nom) || ' ' || TRIM(b.prenom), f.num_assure) AS nom_assure,
              ${CENTRE_CASE("f.code_centre")} AS organisme,
              f.mont_fact::float, f.mont_as::float, f.mont_off::float,
              f.etat, f.prescripteur,
              CASE f.risque
                WHEN '1' THEN 'Maladie'
                WHEN '2' THEN 'Maternité'
                WHEN '3' THEN 'AT'
                WHEN '4' THEN 'MP'
                ELSE COALESCE(f.risque,'—')
              END AS risque_label
       FROM facture f
       LEFT JOIN beneficiaire b ON b.num_assure = f.num_assure AND b.rang_ad = f.rang_ad
       WHERE f.num_bord = $1
       ORDER BY f.date_fact DESC`,
      [req.params.num]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/versements", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        v.id, v.num_bord,
        v.montant::float,
        to_char(v.date_versement, 'YYYY-MM-DD') AS date_versement,
        v.reference_virement,
        v.organisme,
        COUNT(f.num_fact)::int AS nb_fact,
        ROUND(COALESCE(SUM(f.mont_as),0)::numeric,2)::float AS montant_factures
      FROM versement_cnas v
      LEFT JOIN facture f ON f.num_bord = v.num_bord
      GROUP BY v.id, v.num_bord, v.montant, v.date_versement, v.reference_virement, v.organisme
      ORDER BY v.date_versement DESC
      LIMIT 20
    `);
    const total = rows.reduce((s: number, r: { montant: number }) => s + r.montant, 0);
    res.json({ data: rows, total });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
