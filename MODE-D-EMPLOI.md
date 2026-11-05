# BRAND GENIUS — mode d'emploi

Génère une identité de marque complète à partir d'un simple brief : un logo
vectoriel décliné en cinq variantes, une charte graphique exportable en PDF,
des mockups photo réalistes, un kit réseaux sociaux (photo de profil,
publications, story et statut WhatsApp, couvertures Facebook, LinkedIn et
YouTube) et des flyers prêts pour l'impression. Tout est en français, et les
abonnements se paient en FCFA avec SasPay.

## Lancer en local

**Prérequis :** Node.js 20 ou plus récent.

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Démarrer l'application :
   ```bash
   npm run dev
   ```
3. Ouvrir <http://localhost:3000>.

**Aucune configuration n'est nécessaire pour essayer.** L'application démarre en
mode local : les projets vivent en mémoire et les identités sont générées de
façon déterministe. Le tableau de bord, l'assistant de création, la charte, les
mockups et les exports fonctionnent tous avant d'avoir la moindre clé d'API.

> Si le port 3000 est déjà pris, Next choisit le suivant (3001, 3002…) et
> l'affiche dans le terminal. C'est normal.

## Configuration (optionnelle)

Copier `.env.example` vers `.env.local`, puis remplir seulement ce dont tu as
besoin. Les deux services sont indépendants : tu peux en configurer un, les
deux, ou aucun.

```bash
cp .env.example .env.local
```

| Variable | Ce que ça débloque |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Comptes, sauvegarde des projets, stockage des fichiers |
| `ANTHROPIC_API_KEY` | Stratégie, palette, typographie et dessin du logo par le modèle |
| `NEXT_PUBLIC_SITE_URL` | Liens de confirmation d'e-mail, retour après paiement et aperçus de partage |
| `SUPABASE_SERVICE_ROLE_KEY`, `SASPAY_SECRET_KEY`, `SASPAY_WEBHOOK_SECRET` | Abonnements payants avec SasPay (voir plus bas) |

### 1. Supabase — comptes et sauvegarde

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **Project settings → API**, copier l'URL et la clé `anon`.
3. Dans le **SQL editor**, exécuter `supabase/migrations/0001_init.sql`. Ça crée
   les tables, le bucket de fichiers `brand-assets` et les règles de sécurité.

La clé `anon` est publique par conception : c'est la RLS (row-level security)
qui protège les données, et chaque table refuse tout accès qui n'est pas celui
du propriétaire.

Sans ces variables, l'app tourne en mode local : pas de compte, pas de
sauvegarde, et tout repart à zéro au redémarrage du serveur.

### 2. Anthropic — génération par le modèle

1. Créer un compte sur [console.anthropic.com](https://console.anthropic.com).
2. Ajouter du crédit dans **Billing** (la clé ne fonctionne pas sans).
3. Créer une clé dans **API keys** et la coller dans `ANTHROPIC_API_KEY`.

⚠️ Cette clé est **serveur uniquement**. Ne jamais la préfixer par
`NEXT_PUBLIC_`, sinon elle part dans le navigateur et devient publique.

Sans cette clé, le générateur bascule sur un moteur déterministe qui dérive une
palette cohérente, un accord typographique et un monogramme géométrique à partir
du brief. Tout le reste — variantes, mockups, PDF — fonctionne à l'identique ;
seules les décisions créatives changent.

### 3. SasPay — abonnements payants

Les offres et leurs prix en FCFA sont dans `src/lib/billing/plans.ts` (Gratuit,
Pro 9 900 FCFA/mois ou 99 000 FCFA/an, Studio 29 900 FCFA/mois ou 299 000 FCFA/an).
Pour changer un prix, modifie ce fichier : la page Tarifs et le paiement
suivent automatiquement.

1. Dans le **SQL editor** de Supabase, exécuter `supabase/migrations/0002_billing.sql`
   (tables `payments`, `subscriptions`, `billing_events`).
2. Dans Supabase, **Project settings → API**, copier la clé `service_role` dans
   `SUPABASE_SERVICE_ROLE_KEY`.
3. Sur [app.saspay.me](https://app.saspay.me), section **Développeur**, créer une
   clé secrète et la mettre dans `SASPAY_SECRET_KEY` (commencer par `sk_test_…`).
4. Dans **Webhooks**, créer un webhook :
   - URL : `https://ton-site/api/saspay/webhook`
   - événements : `transaction.success` et `transaction.failed`
   - copier le secret de signature (affiché une seule fois) dans `SASPAY_WEBHOOK_SECRET`.
5. Redéployer le site.

⚠️ Ces trois clés sont **serveur uniquement** : jamais de préfixe `NEXT_PUBLIC_`,
jamais dans le code, jamais dans un message.

Comment ça marche : le client choisit une offre sur `/abonnement`, paie sur la
page SasPay (Mobile Money ou carte), puis revient sur `/abonnement/retour`. Le
serveur redemande le statut à SasPay avant d'activer l'offre ; le webhook fait
la même vérification, au cas où le client ferme la page. Comme SasPay ne fait
pas de prélèvement automatique, un abonnement est une période prépayée de
30 ou 365 jours ; un nouveau paiement prolonge la période en cours.

| Offre | Marques | Filigrane |
| --- | --- | --- |
| Gratuit | 1 | oui (PDF, kit, réseaux sociaux) |
| Pro | 10 | non |
| Studio | illimité | non |

## Autres commandes

```bash
npm test         # les tests (vitest)
npm run typecheck # vérification des types
npm run lint      # analyse du code
npm run build     # build de production
```

## Mettre en ligne

1. Pousser le dépôt sur GitHub.
2. Importer le projet sur [Vercel](https://vercel.com).
3. Reporter les variables d'environnement ci-dessus dans les réglages du projet.
4. Mettre `NEXT_PUBLIC_SITE_URL` à l'adresse déployée.
5. Dans Supabase, ajouter `<adresse-déployée>/auth/callback` à la liste des URL
   de redirection autorisées.

> **Une variable créée mais laissée vide n'est pas la même chose qu'une variable
> absente.** C'est le piège classique sur Vercel : le champ existe, il est vide,
> et l'application reçoit `""` au lieu de rien du tout.
>
> L'app gère maintenant les deux cas — une valeur vide, faite d'espaces, ou même
> un simple nom d'hôte collé sans `https://` sont tous ramenés à quelque chose
> d'utilisable, et le déploiement ne casse plus. Si `NEXT_PUBLIC_SITE_URL` n'est
> pas renseignée, l'adresse fournie par Vercel est utilisée automatiquement.
>
> Le plus simple reste malgré tout de **supprimer une variable dont tu ne te
> sers pas**, plutôt que de la laisser vide.

---

Pour les détails techniques — fonctionnement du pipeline, choix de direction
artistique, notes de sécurité — voir [README.md](README.md).
