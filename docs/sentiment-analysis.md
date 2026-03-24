# Sentiment Analysis

Ce système analyse le sentiment des issues GitHub en utilisant Claude API.

## Configuration

1. Copier le fichier `.env.example` en `.env`:
```bash
cp .env.example .env
```

2. Ajouter votre clé API Anthropic dans `.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-votre-clé-ici
```

Obtenir une clé sur: https://console.anthropic.com/

## Structure des fichiers

Après restructuration, chaque issue a son propre dossier:

```
data/input/issues/2015/06/5729/
├── issue.json        # Données originales de l'issue
└── sentiment.json    # Analyse de sentiment (généré)
```

### Format sentiment.json

```json
{
  "primary": "negative",
  "emotions": ["confusion", "frustration"],
  "score": 0.82
}
```

**Champs:**
- `primary`: Sentiment principal - `"positive"`, `"negative"`, ou `"neutral"`
- `emotions`: Liste de 0-2 émotions détectées parmi:
  - `joy`: Joie, enthousiasme, excitement
  - `gratitude`: Remerciements, appréciation
  - `confusion`: Incompréhension, besoin de clarification
  - `frustration`: Blocage, problèmes techniques
  - `disappointment`: Déception, tristesse
- `score`: Niveau de confiance de l'analyse (0.0 à 1.0)

## Utilisation

### Analyser les sentiments

```bash
yarn run input:sentiment
```

Cette commande:
1. Lit tous les fichiers `data/input/issues/**/*/issue.json`
2. Pour chaque issue, analyse le `title` + `body`
3. Crée un fichier `sentiment.json` à côté de chaque `issue.json`
4. Affiche une barre de progression
5. Skip les issues qui ont déjà un `sentiment.json`

### Rate Limiting

Le script respecte automatiquement la limite de 50 requêtes/minute de l'API Claude.
Pour ~357 issues (2015), le traitement prend environ 10 minutes.

### Coût

Avec Claude Haiku:
- ~357 issues = ~$0.50 USD
- Prix par issue: ~$0.0014

## Modification des données sources

Après restructuration des issues (5729.json → 5729/issue.json), le script `scripts/output/issues.js` a été mis à jour pour lire le nouveau pattern dans `lib/helpers/issue.js`:

```javascript
// Ancien: './**/*.json'
// Nouveau: './**/*/issue.json'
```

## Statistiques

Après exécution, le script affiche:
- Nombre d'issues analysées
- Nombre d'issues skippées (déjà traitées)
- Nombre d'erreurs
- Distribution des sentiments (positive/negative/neutral)

## Exemples de résultats

**Bug report** (frustration):
```json
{
  "primary": "negative",
  "emotions": ["frustration", "confusion"],
  "score": 0.85
}
```

**Feature request** (enthousiasme):
```json
{
  "primary": "positive",
  "emotions": ["joy"],
  "score": 0.78
}
```

**Documentation technique** (neutre):
```json
{
  "primary": "neutral",
  "emotions": [],
  "score": 0.92
}
```
