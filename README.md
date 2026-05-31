# JamilaPharm — Supervision Pharmacie

Tableau de bord de gestion pour la **Pharmacie BELFEKROUN HADJAR** (Sidi Bel Abbès).  
Stack : React + Vite (frontend) · Node.js + Express (backend) · PostgreSQL (base de données).

---

## Prérequis

- **Node.js v22** (obligatoire)
- **pnpm** — `npm install -g pnpm`
- **PostgreSQL** installé et en cours d'exécution

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/ouadriaZakaria/temp-used
cd temp-used
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Créer la base de données et restaurer les données

Décompresser le fichier zip (PowerShell) :

```bash
Expand-Archive -Path apps/api/database/dump.sql.zip -DestinationPath apps/api/database/
```

Créer la base et restaurer :

```bash
psql -U postgres -c "CREATE DATABASE pharm_merou;"
psql -U postgres -d pharm_merou < apps/api/database/dump.sql
```

### 4. Configurer les variables d'environnement

Créer le fichier `apps/api/.env` :

```env
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/pharm_merou
NODE_ENV=development
```

Créer le fichier `apps/web/.env` :

```env
VITE_API_URL=
```

> Laisser `VITE_API_URL` vide — le proxy Vite gère les appels API automatiquement en développement.

---

## Lancer le projet

Ouvrir **deux terminaux** :

**Terminal 1 — Backend (port 3000) :**

```bash
cd apps/api
pnpm dev
```

**Terminal 2 — Frontend (port 5173) :**

```bash
cd apps/web
pnpm dev
```

Puis ouvrir : [http://localhost:5173](http://localhost:5173)

---

## Structure du projet

```
temp-used/
├── apps/
│   ├── api/                        → Serveur Express (API REST)
│   │   ├── src/routes/pharma.ts    → Toutes les routes API
│   │   └── database/dump.sql.zip   → Sauvegarde compressée de la base de données
│   └── web/                        → Interface React + Vite
│       ├── src/pages/              → Pages de l'application
│       ├── src/lib/api.ts          → Client API
│       └── vite.config.ts          → Config proxy vers le backend
├── packages/
│   ├── db/                         → Schéma Drizzle ORM
│   └── api-zod/                    → Types et validation Zod
```

---

## Pages disponibles

| Page | URL | Description |
|------|-----|-------------|
| Tableau de bord | `/` | KPIs, CA mensuel, répartition par organisme |
| Bordereaux | `/bordereaux` | Liste et détail des bordereaux CNAS/CASNOS |
| Factures | `/factures` | Toutes les factures avec filtres |
| Statistiques | `/statistiques` | Analyse mensuelle et par organisme |
| Médicaments | `/medicaments` | Catalogue des médicaments |
| Trésorerie | `/tresorerie` | Créances, dettes fournisseurs, livraisons |
| Créances | `/creances` | Bordereaux ouverts en attente de virement |
| Analyse | `/analyse` | Top médicaments, prescripteurs, risques |
| Exports PDF | `/exports` | Génération de rapports PDF |

---

## Mettre à jour la base de données

Si vous modifiez les données et voulez pousser une nouvelle sauvegarde :

```bash
pg_dump -U postgres --no-owner --no-acl pharm_merou > apps/api/database/dump.sql
Compress-Archive -Path apps/api/database/dump.sql -DestinationPath apps/api/database/dump.sql.zip -Force
git add apps/api/database/dump.sql.zip
git commit -m "update database dump"
git push
```