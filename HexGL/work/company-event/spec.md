# Spécification — Personnalisation événementielle ACME de l'écran d'accueil HexGL

Sources : `formation/tickets/company-event.md` (source de vérité du besoin), `formation/identite/charte_graphique_acme.pdf` et `formation/identite/logo.png` (contraintes d'identité), `docs/architecture.md` (état actuel).

## 1. Contexte et objectif

ACME veut utiliser HexGL lors d'un événement d'entreprise. L'écran d'accueil actuel (écran `step-1`) affiche le titre « HexGL by BKcore », un fond flouté de la ville et un menu bleu/orange (Start, Controls, Quality, HUD, Credits). Rien n'y évoque ACME.

**Objectif** : l'écran d'accueil doit afficher l'identité ACME (logo, nom, message d'accueil, couleurs de la charte) de façon sobre et maintenable. **Le gameplay reste strictement inchangé.**

## 2. Exigences fonctionnelles

- **EF1 — Logo** : le logo ACME fourni (`logo.png`) est visible sur l'écran d'accueil, sans déformation (ratio d'origine 2172×724 conservé), sans recoloration, sans ombre ni contour.
- **EF2 — Nom de l'entreprise** : le nom « ACME » apparaît sur l'écran d'accueil, au moins via le message d'accueil et le logo.
- **EF3 — Message d'accueil** : le texte exact « Bienvenue au ACME Racing Challenge » est affiché (formulation de référence de la charte, reprise telle quelle). Le sous-titre « Une expérience événementielle aux couleurs de la marque. » est affiché, comme dans l'intention visuelle de la charte.
- **EF4 — Bouton de démarrage** : le libellé du bouton de lancement devient « DÉMARRER LA COURSE ».
- **EF5 — Couleurs** : l'écran d'accueil utilise la palette de la charte (voir §5). Le fond principal est sombre ; violet, bleu électrique et cyan servent d'accents. Le dégradé événementiel `#7628FF → #315BFF` est autorisé.
- **EF6 — Élément HexGL/BKcore** : le visuel de titre « HexGL by BKcore » et le fond actuel (`bg.jpg`) ne figurent plus sur l'écran d'accueil ; ils sont remplacés par un fond sombre de marque.
- **EF7 — Menu** : les options Controls, Quality, HUD et Credits restent présentes, fonctionnelles et en anglais ; seule leur apparence (couleurs) s'aligne sur la charte.
- **EF8 — Crédits** : l'accès à Credits est conservé (attribution des auteurs du jeu et des assets).

## 3. Comportements attendus

- Au chargement de la page, l'écran d'accueil montre : logo ACME, message d'accueil, sous-titre, bouton « DÉMARRER LA COURSE », puis les options du menu.
- Le survol des éléments du menu reste perceptible ; les couleurs de survol proviennent de la palette ACME (et non plus de l'orange/bleu HexGL).
- Le clic sur le bouton de démarrage déclenche exactement le même enchaînement qu'aujourd'hui (écran d'aide aux contrôles → chargement → course).
- Le changement des options (contrôles, qualité, HUD), les paramètres d'URL et le retour au menu depuis la fin de course se comportent comme avant.
- La course, le HUD en course, les contrôles, la physique, l'audio et l'écran de fin de course ne présentent aucune différence.
- Le branding ne s'étend pas au-delà de l'écran d'accueil.

## 4. Contraintes

- **Identité (charte)** : logo sans déformation, avec une zone de respiration, sans couleur hors palette, sans ombre ni contour, jamais sur un fond qui le rend illisible.
- **Sobriété** : pas d'effets complexes supplémentaires ; intégration simple et maintenable. Aucun nouvel effet d'animation n'est ajouté.
- **Typographie** : sans-serif lisible ; aucune nouvelle dépendance webfont. La police existante (BebasNeue) est conservée tant qu'elle reste lisible et cohérente avec la charte.
- **Lisibilité** : tout texte de l'écran d'accueil reste lisible sur son fond (contraste suffisant, blanc ou gris clair sur fond sombre).
- **Technique** : projet legacy sans build ; pas de `package.json`, pas de nouveau framework (règles du projet). Les assets ACME sont servis en local, sans dépendance réseau supplémentaire.
- **Responsive** : l'écran reste utilisable du bureau à l'écran mobile/tactile (le jeu supporte déjà le tactile).
- **Tests** : les tests ne figent pas le branding (logo, couleurs, textes) ; ils n'utilisent pas WebGL.

## 5. Décisions de conception déjà imposées

| Sujet | Décision |
|---|---|
| Source de vérité | Le ticket `company-event.md` ; la charte et le logo contraignent le rendu |
| Périmètre visuel | Écran d'accueil uniquement |
| Message d'accueil | « Bienvenue au ACME Racing Challenge » (verbatim) |
| Libellé du bouton | « DÉMARRER LA COURSE » |
| Logo sur fond sombre | Le logo fourni (fond transparent, texte bleu nuit, pas de variante claire) est posé **tel quel sur un cartouche clair** (blanc `#FFFFFF` ou gris clair `#E6E8EE`) avec zone de respiration, au sein du fond principal sombre. Aucune recoloration |
| Fond | Sombre, `#08090D` |
| Palette | Noir profond `#08090D` (fond), violet `#7628FF` (accent marque), bleu électrique `#315BFF` (accent digital), cyan `#00C4E8` (accent secondaire), blanc `#FFFFFF` (texte), gris clair `#E6E8EE` (surfaces secondaires) |
| Dégradé événementiel | `#7628FF → #315BFF` |
| Titre « HexGL by BKcore » et fond `bg.jpg` | Retirés de l'accueil |
| Langue du menu | Message et bouton en français ; Controls / Quality / HUD / Credits inchangés (anglais) |
| Métadonnées de page | `<title>`, balises `og:*`/description, favicon : hors périmètre |
| Crédits | Conservés |

## 6. Cas limites et gestion des erreurs

- **Logo introuvable ou non chargé** : l'écran reste utilisable ; le nom « ACME » apparaît toujours via le message d'accueil, et le bouton de démarrage fonctionne.
- **Tailles d'écran** : sur écran étroit (mobile portrait) ou très large, le logo n'est ni rogné ni étiré, et le menu n'est pas chevauché par le logo ou le message.
- **Texte long** : le message d'accueil peut passer sur deux lignes sans masquer le bouton ni le menu.
- **Appareils tactiles** : le démarrage se fait toujours au toucher.
- **WebGL indisponible** : comportement actuel inchangé (le bouton renvoie vers la page d'aide WebGL) ; l'écran d'accueil ACME s'affiche quand même.
- **Contraste** : aucun texte en gris moyen sur fond gris moyen ; le fond principal n'est jamais gris moyen dominant.
- **Régression de gameplay** : toute différence en course (HUD, contrôles, rendu 3D) par rapport à la référence est un défaut.

## 7. Hors périmètre

- Gameplay, physique, circuit, vaisseau, HUD en course, contrôles, audio.
- Écrans d'aide aux contrôles (`step-2`), de chargement (`step-3`), de fin de course (`step-5`) et contenu de la page Credits (seul l'accès est conservé).
- Métadonnées de page, favicon, icônes d'application, manifest, cache applicatif, Google Analytics.
- Traduction du reste du menu et de l'interface.
- Création d'une variante claire du logo, ou modification du fichier logo.
- Correction des anomalies listées dans `docs/architecture.md` §6.
- Nouveau framework, build ou dépendance de test.

## 8. Critères d'acceptation

| # | Critère | Validation |
|---|---|---|
| CA1 | Le logo ACME est visible sur l'écran d'accueil, ratio conservé, sans ombre ni contour, lisible (sur cartouche clair) | Visuelle, comparaison à `formation/tests/captures/01-ecran-accueil.png` (avant) et à la charte |
| CA2 | Le texte « Bienvenue au ACME Racing Challenge » est affiché exactement | Visuelle ; texte du DOM |
| CA3 | Le bouton affiche « DÉMARRER LA COURSE » et lance le jeu comme avant | Manuelle : clic → aide → chargement → course |
| CA4 | Les couleurs de l'accueil sont uniquement celles de la palette ACME ; le fond est sombre | Visuelle ; inspection des couleurs |
| CA5 | Plus aucune mention ni visuel « HexGL by BKcore » sur l'accueil ; Credits reste accessible | Visuelle |
| CA6 | Controls, Quality, HUD, Credits fonctionnent (cycle des valeurs, ouverture/fermeture des crédits) | Manuelle |
| CA7 | Rendu correct sur grande largeur et sur largeur mobile (logo non déformé ni rogné, pas de chevauchement) | Visuelle à plusieurs tailles |
| CA8 | Course, HUD en course et écran de fin identiques à la référence (`formation/tests/captures/02-jeu-en-cours.png`) | Comparaison visuelle ; partie complète |
| CA9 | La suite QUnit existante passe (code retour `0`) ; aucun test n'impose le branding | `formation\tests\ci-chrome.bat` |
| CA10 | Aucune nouvelle dépendance (webfont, framework, `package.json`) ni requête réseau ajoutée | Revue du diff et de l'onglet réseau |
