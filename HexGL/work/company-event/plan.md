# Plan — Branding ACME de l'écran d'accueil HexGL

## 1. Objectif

Afficher l'identité ACME (logo, message d'accueil, sous-titre, bouton « DÉMARRER LA COURSE », palette) sur l'écran `step-1`, avec **toutes les valeurs de marque dans un seul fichier de configuration**. Gameplay, écrans 2 à 5 et `launch.js` restent inchangés. Spec : `work/company-event/spec.md`.

## 2. État actuel et architecture concernée

- `index.html` : `#step-1` = `#global` (fond `bg.jpg`, animé) + `#title` (image `title.png`, animée) + `#menucontainer > #menu` (`#start`, `#s-controlType`, `#s-quality`, `#s-hud`, `#s-godmode` masqué, `#s-credits`).
- `css/multi.css` : fond (l. 58-81), titre (l. 83-104), menu `#4190bb` + survol `#f66439` (l. 115-154), `#start` orange (l. 156-163). Police BebasNeue via `css/fonts.css`.
- `launch.js` (compilé de `launch.coffee`) : n'accède qu'aux **IDs** `start`, `s-*`, `step-*`, `credits`. Il ne réécrit `#start` que si WebGL est absent (« WebGL is not supported! »). Aucune dépendance au texte ni aux classes de style → on peut changer libellés et styles sans le modifier.
- Tests : `formation/tests/index.html` charge `Utils.js`, `Timer.js`, `ImageData.js` + `browser-tests.js` (QUnit local, 20 tests environ). Commande : `& ".\formation\tests\ci-chrome.bat"` (code `0` attendu).
- Assets ACME existants : `formation/identite/logo.png` (2172×724, fond transparent, texte bleu nuit), `charte_graphique_acme.pdf`.

## 3. Approche technique (minimale)

Un **fichier de config JS** + un **petit script d'application** qui remplit le DOM et pose des variables CSS ; le CSS existant est **surchargé par un bloc scopé** plutôt que modifié.

1. `branding/branding.config.js` — unique point d'édition (données seules, `window.HEXGL_BRANDING = {...}`).
2. `branding/branding.js` — JS ES5 simple, sans `.coffee` associé (pas de compilation à maintenir). Expose `bkcore.Branding.apply(doc, config)` : écrit textes et logo dans le DOM, pose les variables CSS sur `documentElement`, ajoute la classe `brand-acme` sur `#step-1`. Tolérant : élément absent ou config absente → no-op ; logo en erreur (`onerror`) → cartouche masqué.
3. `branding/branding.css` — règles scopées `#step-1.brand-acme …` utilisant `var(--brand-…)`. Chargé après `multi.css`. Masque `#title` et remplace le fond de `#global` ; supprime les animations de l'accueil pour rester sobre (aucun nouvel effet). Les anciennes règles `multi.css` restent intactes.
4. `index.html` : ajout dans `#step-1` d'un bloc statique (cartouche logo `<img>`, `<h1>` message, `<p>` sous-titre) laissé vide, plus 3 balises (`<link>` du CSS, `<script>` config, `<script>` branding) et un appel `bkcore.Branding.apply(document, window.HEXGL_BRANDING)` **avant** `launch.js` (même exécution synchrone, donc sans flash de l'ancien contenu).
5. Libellé du bouton : `Start` → rempli par la config dans `#start`. `launch.js` ne le réécrit que sans WebGL (comportement existant conservé).

## 4. Fichiers et modules impactés

| Fichier | Nature |
|---|---|
| `branding/branding.config.js` | **nouveau** — données de marque |
| `branding/branding.js` | **nouveau** — `bkcore.Branding.apply` |
| `branding/branding.css` | **nouveau** — styles scopés `.brand-acme` |
| `branding/logo.png` | **copie** de `formation/identite/logo.png` (fichier source non modifié) |
| `index.html` | modif. limitée à `#step-1` + 3 balises + 1 appel (le `<head>`/métadonnées inchangés, hors périmètre) |
| `formation/tests/index.html`, `browser-tests.js` | ajout d'un `<script>` et d'un module de tests |
| `css/multi.css`, `launch.js/.coffee`, `bkcore/**`, `bkcore.coffee/**` | **inchangés** |

## 5. Structure des données de branding

```js
window.HEXGL_BRANDING = {
  name: "ACME",
  logo: { src: "branding/logo.png", alt: "ACME", ratio: "2172/724" },
  welcome: "Bienvenue au ACME Racing Challenge",
  subtitle: "Une expérience événementielle aux couleurs de la marque.",
  startLabel: "DÉMARRER LA COURSE",
  colors: {
    background: "#08090D", violet: "#7628FF", blue: "#315BFF", cyan: "#00C4E8",
    text: "#FFFFFF", surface: "#E6E8EE",
    gradient: ["#7628FF", "#315BFF"]
  }
};
```

Les clés de `colors` deviennent `--brand-background`, `--brand-violet`, etc. Le survol du menu utilise cyan / violet ; le bouton utilise le dégradé.

## 6. Décisions techniques principales

- **Config JS plutôt que JSON** : un `fetch` JSON échoue en `file://` et ajoute une requête asynchrone ; un `<script>` est synchrone, sans serveur ni réseau.
- **Pas de CoffeeScript pour le nouveau code** : évite d'ajouter une paire `.coffee/.js` et de choisir une version de compilateur ; le projet n'a pas de build.
- **Surcharge scopée plutôt qu'édition de `multi.css`** : réversible (retirer la classe ou le `<link>` restitue l'ancien rendu) et diff minimal.
- **Variables CSS** (`--brand-*`) : une seule source de couleurs, pas de duplication de hex dans le CSS.
- **Logo sur cartouche clair** (`#FFFFFF`/`#E6E8EE`) avec zone de respiration, `max-width: 100%` + `height: auto` (ratio préservé, aucune recoloration).
- **Pas de modification de `launch.js`** : le câblage par IDs suffit, donc zéro risque sur le flux step-1 → 2 → 3 → 4.
- **Police BebasNeue conservée**, aucune webfont ajoutée.

## 7. Risques et compatibilité

- **Ordre des scripts** : `branding.js` doit s'exécuter avant `launch.js` mais n'a pas besoin de `bkcore.Utils` ; vérifier que `bkcore` est défini (`window.bkcore = window.bkcore || {}`).
- **Contraste / fond gris moyen** : les anciens dégradés blancs semi-transparents de `#menu div` (multi.css l. 141-147) deviennent gris sur fond sombre → à neutraliser dans `branding.css`.
- **Texte du menu à `scaleY(0.8)`** et `text-shadow` blanc hérités : à désactiver (charte : pas d'ombre, notamment sur le logo).
- **Mobile / écran étroit** : logo et message en flux normal au-dessus du menu (pas de `position:absolute` qui chevauche) ; menu en `bottom:10%` existant → tester 360 px de large.
- **Message sur 2 lignes** : conteneur à hauteur libre, `overflow` géré.
- **Navigateurs anciens** sans variables CSS : hors cible (le jeu requiert WebGL, donc navigateur récent).
- **Fichiers non gérés** : `cache.appcache`/`manifest.webapp` obsolètes, hors périmètre ; le logo n'y est pas ajouté.
- **Hors périmètre respecté** : `<title>`, `og:*`, favicon, analytics, Credits (accès conservé).

## 8. Stratégie de tests et de vérification

**Automatique (QUnit existant, sans WebGL, sans nouvelle dépendance)** — ajouter `../../branding/branding.js` dans `formation/tests/index.html` et un module dans `browser-tests.js`, sur le modèle des modules existants (fixture `#qunit-fixture`) :
- `apply` applique à un DOM factice les valeurs d'une config **de test** (pas la config réelle → le branding n'est pas figé).
- `apply` pose les variables CSS issues de `colors`.
- `apply` ne lève pas d'erreur si config absente ou éléments manquants.
- Logo en erreur → cartouche masqué.
- Le statut `pass` exige `count >= 4` : toujours satisfait.

Commande : `& ".\formation\tests\ci-chrome.bat"` depuis `HexGL/` → code `0` ; sinon lire `formation/tests/rapport_erreur.html`.

**Manuelle / visuelle** (critères CA1-CA10 de la spec) :
- Ouvrir `index.html` via un serveur statique (README : `python -m http.server 8080`) ; comparer à `formation/tests/captures/01-ecran-accueil.png` et à la charte.
- Cliquer Start → aide → chargement → course ; Controls / Quality / HUD cyclent ; Credits s'ouvre et se ferme.
- Tailles : 1920 px, 768 px, 360 px ; simuler WebGL absent et logo manquant.
- Comparer la course à `formation/tests/captures/02-jeu-en-cours.png` ; onglet Réseau : aucune requête externe ajoutée.
- `git diff --stat` : aucun fichier `bkcore*/`, `launch.*`, `libs/` touché ; aucun `package.json`.

## 9. Plan d'implémentation (5 petites étapes)

1. **Config + logo** : créer `branding/branding.config.js`, copier le logo. *(aucun effet visible)*
2. **Module d'application + tests** : écrire `branding/branding.js` (`apply`) et son module QUnit ; lancer `ci-chrome.bat` → `0`. *(toujours sans effet visuel car non branché)*
3. **Markup** : dans `index.html`, ajouter les éléments statiques de `#step-1`, les balises `<script>` et l'appel `apply` avant `launch.js`. Vérifier que textes et variables CSS sont posés (DOM).
4. **Styles** : écrire `branding/branding.css` (fond sombre, cartouche logo, message, bouton dégradé, menu et survols palette, responsive, masquage de `#title`) ; contrôle visuel desktop et mobile.
5. **Vérification complète** : vérifier les modifications après chaque étape. Aucun commit entre chaque étape. Il sera réalisé après la validation finale.

**Retour arrière** : retirer les 3 balises et l'appel dans `index.html` (ou `git revert`) restaure l'accueil d'origine ; `multi.css`, `bg.jpg` et `title.png` n'ont pas été touchés.
