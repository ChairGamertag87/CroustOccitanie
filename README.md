# Bot Discord – CrousOccitanie

Un bot Discord en **JavaScript (discord.js v14)** conçu pour aider les étudiants toulousains en centralisant les informations clés des services de restauration du **CROUS Toulouse-Occitanie**.

## Pourquoi ce bot ?
Les étudiants consultent souvent plusieurs sites pour connaître les **restaurants universitaires (RU)** ouverts, leurs **horaires**, ou le **menu du jour**. Ce bot rassemble ces informations et les rend accessibles directement depuis un serveur Discord, via des **commandes slash** simples.

## Fonctionnalités principales
- **Liste des établissements** : RU, cafétérias et brasseries rattachés au CROUS Toulouse-Occitanie.
- **Horaires d’ouverture** : récupération et affichage des plages d’ouverture fournies par l’open data.
- **Menu du jour** : regroupé par **moment** (midi/soir) et par **type** (entrée/plat/dessert, etc.).
- **Recherche tolérante** : recherche floue sur le nom d’établissement (utile pour les fautes de frappe ou variantes d’orthographe).
- **Mise en cache** : pour des réponses rapides et limiter les appels aux sources.

## Commandes slash (aperçu)
- `/crous-restos` — Affiche la liste des établissements (filtre optionnel par type).
- `/crous-horaires nom:<texte>` — Donne les horaires, l’adresse et des infos utiles pour un établissement.
- `/crous-menu nom:<texte> [date:YYYY-MM-DD]` — Affiche le menu du jour (ou d’une date donnée si disponible).

## Sources des données
- **Open data CNOUS/MESR** (JSON) : liste des établissements, informations descriptives et horaires.
- **Flux menus CNOUS** (XML, par région) : menus quotidiens par établissement.
- **Fallback communautaire (optionnel)** : API **CROUStillant** si le flux officiel est incomplet pour une date donnée.

> Remarque : les informations peuvent varier selon les périodes (vacances universitaires, fermetures exceptionnelles). Le bot affiche ce que les sources publient au moment de la requête.

## Architecture (vue d’ensemble)
```
crous-tlse-bot/
├─ src/
│  └─ index.js            # logique du bot et commandes
├─ .env                   # variables d’environnement (non versionné)
├─ .env.example           # modèle des variables
├─ package.json           # métadonnées et scripts NPM
└─ README.md              # ce document
```

## Conception & choix techniques
- **discord.js v14** pour les interactions slash et les embeds.
- **Axios** pour les requêtes HTTP.
- **fast-xml-parser** pour la lecture des flux XML de menus.
- **Fuse.js** pour la recherche approximative d’établissement.
- **NodeCache** pour un cache mémoire simple (TTL configuré).

## Limites et évolutions possibles
- **Disponibilité des menus** : dépendante des flux officiels et de leur régularité de mise à jour.
- **Qualité des horaires** : certains établissements peuvent publier des horaires au format libre (moins structuré).
- **Améliorations** :
  - Autocomplétion des noms dans les options de commandes.
  - Persistance du cache (Redis) pour une exécution multi-instances.
  - Cartes/Localisation (coords → lien Maps) dans les réponses.
  - Gestion fine des périodes (fermetures, jours fériés, partiels).

## Public visé
- Associations étudiantes, BDE, serveurs d’écoles/UT, ou tout serveur Discord toulousain souhaitant offrir un accès rapide aux informations CROUS.

## Inspiration 
[Crousto](https://github.com/SolareFlame/CroustoV2) par SolareFlame
