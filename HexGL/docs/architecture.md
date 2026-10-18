# HexGL — Architecture (état actuel)

Document descriptif de l'état actuel du projet. Il ne contient ni recommandation, ni plan de correction. Les chemins sont relatifs au dossier `HexGL/` (racine du jeu dans le dépôt).

## 1. Stack et points d'entrée

### Stack

| Couche | Contenu |
|---|---|
| Langage | JavaScript ES5 (global, sans modules ni bundler), CoffeeScript 1.x précompilé |
| Rendu | WebGL via **Three.js** (`libs/Three.dev.js`, ~383 Ko ; `libs/Three.r53.js` présent mais non chargé par le jeu) |
| Post-traitement | `libs/postprocessing/*` (EffectComposer, RenderPass, BloomPass, ShaderPass, MaskPass…), `libs/ShaderExtras.js`, shaders maison `bkcore/threejs/Shaders.js` |
| Entrées | clavier, tactile, gamepad, orientation (mobile), Leap Motion (`libs/leap-0.4.1.min.js`) |
| Audio | Web Audio API (`AudioContext`) avec repli `<audio>` |
| Divers | `libs/Stats.js`, `libs/DAT.GUI.min.js`, `libs/Detector.js`, Google Analytics (`ga.js`, ID `UA-26274524-4`) |
| Build | Aucun : pas de `package.json`, pas de gestionnaire de dépendances dans `HexGL/`. Les `.js` de `bkcore.coffee/` et `launch.js` sont des sorties CoffeeScript versionnées à côté de leurs `.coffee`. Le code de `branding/` est du JS ES5 écrit à la main, sans `.coffee` associé |
| Serveur | Statique uniquement (README : `python -m SimpleHTTPServer` ; équivalent Python 3 : `python -m http.server 8080` depuis `HexGL/`) ; `.htaccess` ne déclare que des types MIME `.webapp` / `.appcache` |
| Licence | MIT (README) ; en-têtes de plusieurs fichiers : CC BY-NC 3.0 |

### Points d'entrée

- **`index.html`** : page unique du jeu. Contient le HTML des 5 écrans (dont le bloc de branding ACME de `step-1`, voir §3), l'extrait Google Analytics, la feuille `branding/branding.css` et la liste ordonnée des `<script>`.
- **`launch.js`** (compilé depuis `launch.coffee`) : script de lancement, dernier chargé. Il câble le menu et instancie `bkcore.hexgl.HexGL`.
- **`formation/tests/index.html`** : point d'entrée des tests QUnit (indépendant du jeu).
- `manifest.webapp` / `package.webapp` / `cache.appcache` : déclarations Firefox OS / cache applicatif (voir §5).
- `libs/Editor.html` : éditeur tiers autonome, non lié au jeu.

## 2. Flux principal de lancement

Écrans définis dans `index.html` : `step-1` (menu), `step-2` (aide contrôles), `step-3` (chargement), `step-4` (jeu), `step-5` (fin de course), plus `credits`.

1. **Chargement de la page** : les scripts sont chargés de façon synchrone, dans l'ordre : libs Three/postprocessing → contrôleurs → `Timer`, `ImageData`, `Utils` → `RenderManager`, `Shaders`, `Particles`, `Loader` → `Audio` → `HUD`, `RaceData`, `ShipControls`, `ShipEffects`, `CameraChase`, `Gameplay` → `tracks/Cityscape` → `HexGL` → `branding/branding.config.js` → `branding/branding.js` → appel inline `bkcore.Branding.apply(document, window.HEXGL_BRANDING)` → `launch.js`. Chaque fichier s'enregistre dans l'espace de noms global `bkcore`.
1 bis. **`bkcore.Branding.apply`** (synchrone, avant `launch.js`, donc sans affichage préalable de l'ancien contenu) : écrit le message d'accueil, le sous-titre, le libellé de `#start` et le logo dans le DOM, pose les variables CSS `--brand-*` sur `<html>` et ajoute la classe `brand-acme` à `#step-1`. Config ou élément absent : aucune action, sans erreur.
2. **`launch.js` (exécution immédiate)** :
   - lit les paramètres d'URL via `bkcore.Utils.getURLParameter` (`controlType`, `quality`, `hud`, `godmode`) ;
   - initialise les 4 options du menu (contrôles : clavier/tactile/Leap/gamepad ; qualité 0–3, défaut 3 ; HUD ; godmode — l'entrée de menu godmode est `display:none`) ;
   - teste WebGL (`hasWebGL`) : sinon le bouton de démarrage (`#start`) affiche « WebGL is not supported! » et renvoie vers `get.webgl.org`. `launch.js` ne lit ni ne dépend du libellé de `#start` : il s'appuie uniquement sur les IDs `start`, `s-*`, `step-*` et `credits`.
3. **Clic sur le bouton de démarrage (`#start`, libellé issu de la config de branding)** : masque `step-1`, affiche `step-2` avec l'image `css/help-<controlType>.png`.
4. **Clic sur `step-2`** : affiche `step-3` et appelle `init(controlType, quality, hud, godmode)`.
5. **`init()`** crée `new bkcore.hexgl.HexGL({... track: 'Cityscape', difficulty: 0 ...})`, l'expose en `window.hexGL`, puis appelle `hexGL.load({onLoad, onError, onProgress})`.
   - Le constructeur `HexGL` règle la taille (divisée par 2 si qualité 0), crée le `THREE.WebGLRenderer` (`initRenderer`), le `RenderManager`, et écoute `Échap` (→ `reset()`).
6. **`HexGL.load`** → `Cityscape.load(opts, quality)` → `bkcore.threejs.Loader.load(...)` : charge textures, cube map, géométries JSON, analyseurs d'image (`collision.png`, `height.png`), images HUD et sons. Qualité < 2 → `textures/` ; sinon → `textures.full/` (avec cartes speculaires/normales). `onProgress` met à jour `#progressbar`.
7. **`onLoad`** : `hexGL.init()` (`initHUD` → `Cityscape.buildMaterials` → `Cityscape.buildScenes` → `initGameComposer`), puis `step-3` masqué, `step-4` affiché, `hexGL.start()`.
8. **`HexGL.start`** : `RenderManager.setCurrent("game")`, démarre la boucle `requestAnimationFrame` (`update` → `Gameplay.update` + `RenderManager.renderCurrent`), puis `initGameplay()` (création de `Gameplay`, `gameplay.start()`, lecture des sons `bg` et `wind`).
9. **Boucle de jeu** : le callback de rendu enregistré par `Cityscape.buildScenes` (scène `"game"`) met à jour `ShipControls`, `ShipEffects`, `CameraChase`, rend via l'`EffectComposer`, met à jour le HUD et la couleur de vignette (rouge si bouclier < 20 %).
10. **`Gameplay`** : machine à états par `step` (compte à rebours 3-2-1-Go → `step 4` mode `timeattack` → `step 100` fin). Détection de tours par checkpoints lus dans le pixel de `collision.png` sous le vaisseau. 3 tours.
11. **Fin de course** : `onFinish` → `shipControls.terminate()` + `HexGL.displayScore` ; avec `gameover` (`#step-5`) fourni par `launch.js`, affiche le temps et masque le conteneur de jeu, retour via `window.location.reload()` au clic.

## 3. Modules, fichiers et assets

### Code applicatif (`bkcore/`, ~3 850 lignes)

| Fichier | Rôle | Lignes |
|---|---|---|
| `bkcore/hexgl/HexGL.js` | Façade du jeu : options, renderer, composer, HUD, score, difficulté (`tweakShipControls`) | 446 |
| `bkcore/hexgl/ShipControls.js` | Physique du vaisseau, entrées (clavier/tactile/gamepad/orientation/Leap), collisions, hauteur, boost | 806 |
| `bkcore/hexgl/Gameplay.js` | Chronométrage, compte à rebours, tours, checkpoints, résultat | 230 |
| `bkcore/hexgl/HUD.js` | HUD dessiné en canvas 2D (vitesse, bouclier, temps, tours, messages) | 269 |
| `bkcore/hexgl/ShipEffects.js` | Booster, lumière, particules d'étincelles/nuages | 186 |
| `bkcore/hexgl/CameraChase.js` | Caméra de poursuite et mode orbite | 72 |
| `bkcore/hexgl/RaceData.js` | Enregistrement / relecture de trajectoires (replay) | 98 |
| `bkcore/hexgl/Ladder.js` | Classement distant (non chargé par `index.html`) | 51 |
| `bkcore/hexgl/tracks/Cityscape.js` | Définition du circuit : ressources, matériaux, scènes, checkpoints, spawn | 521 |
| `bkcore/threejs/Loader.js` | Chargeur multi-ressources avec progression | 259 |
| `bkcore/threejs/RenderManager.js` | Gestion de plusieurs scènes/caméras et de la boucle de rendu | 131 |
| `bkcore/threejs/Shaders.js` | Shaders GLSL (normal, normalV, hexvignette…) | 949 |
| `bkcore/threejs/Particles.js` | Système de particules (version chargée par le jeu) | 190 |
| `bkcore/threejs/Preloader.js` | Préchargeur 3D `CanvasRenderer` (non chargé par `index.html`) | 150 |
| `bkcore/Audio.js` | Wrapper Web Audio / `<audio>` : `addSound`, `play`, `stop`, `volume`, panner | 141 |

### Code issu de CoffeeScript (`bkcore.coffee/`)

Chaque fichier existe en `.coffee` (source) et `.js` (sortie versionnée, chargée par le navigateur) :

| Fichier | Rôle |
|---|---|
| `Utils.js` | `createNormalMaterial`, `projectOnScreen`, `getURLParameter`, `getOffsetTop`, `scrollTo`, `updateClass`, `request` (XHR), `isTouchDevice` |
| `Timer.js` | Chronomètre (`start`, `pause`, `update`, `getElapsedTime`) et statiques `msToTime`, `msToTimeString`, `zfill` |
| `ImageData.js` | Chargement d'image + accès pixel (`getPixel`, `getPixelBilinear`, `getPixelF`, `getPixelFBilinear`) |
| `controllers/TouchController.js`, `OrientationController.js`, `GamepadController.js` | Contrôleurs d'entrée (`bkcore.controllers.*`) |
| `threejs/Particles.js` | Autre implémentation de `bkcore.threejs.Particles` (+ `Particle`), non chargée par `index.html` |
| `tests.html` | Page de test CoffeeScript historique (charge `Timer.js`, `ImageData.js`, `Three.r53.js`, sans assertions) |

### Branding de l'écran d'accueil (`branding/`)

Personnalisation ACME de `step-1` (spécification : `work/company-event/spec.md`, plan : `work/company-event/plan.md`). Le gameplay et les écrans 2 à 5 ne sont pas concernés.

| Fichier | Rôle |
|---|---|
| `branding/branding.config.js` | **Point unique de configuration** : `window.HEXGL_BRANDING` (données seules) : `name`, `logo` (`src`, `alt`, `ratio`), `welcome`, `subtitle`, `startLabel`, `colors` |
| `branding/branding.js` | `bkcore.Branding.apply(doc, config)` : remplit le DOM, pose les variables CSS, ajoute la classe `brand-acme` à `#step-1` |
| `branding/branding.css` | Règles scopées sur `#step-1.brand-acme`, chargées après `css/multi.css` (qui n'est pas modifié) ; n'utilisent que `var(--brand-*)` |
| `branding/logo.png` | Copie identique de `formation/identite/logo.png` (2172×724, fond transparent) |

- **Contrat avec `index.html`** : `apply` cherche les IDs `step-1`, `start`, `brand-logo-box`, `brand-logo`, `brand-welcome` et `brand-subtitle`. Un ID absent est ignoré sans erreur : le contenu correspondant n'est alors simplement pas affiché.
- **Variables CSS** : chaque clé de `colors` devient `--brand-<clé>` (`background`, `violet`, `blue`, `cyan`, `text`, `surface`). La clé `gradient` (tableau de deux couleurs) devient `--brand-gradient: linear-gradient(to right, <début>, <fin>)`.
- **Logo** : posé tel quel sur un cartouche `--brand-surface`, ratio conservé (`width: 100%; height: auto`, `aspect-ratio` issu de la config). Si l'image ne charge pas (`onerror`), le cartouche est masqué ; le message et le bouton restent affichés.
- **Effet sur l'accueil** : `#title` (`title.png`) masqué, fond `bg.jpg` remplacé par la couleur `--brand-background`, animations de `#global` et `#title` désactivées, menu et bouton recolorés (survol en cyan, bouton en dégradé).
- **Réversibilité** : retirer la classe `brand-acme` ou le `<link>` vers `branding.css` restitue l'accueil d'origine ; `css/multi.css`, `bg.jpg` et `title.png` restent en place.

### Assets

- `geometries/` (1,3 Mo) : modèles JSON Three.js (`.js`) — vaisseau `feisar`, `booster`, `bonus/base`, circuit `cityscape` (track, scrapers1/2, start, startbanner, bonus/speed) et un circuit `edge/track.js` non référencé par le code.
- `textures/` (4,2 Mo, basse qualité) et `textures.full/` (5,3 Mo, haute qualité) : même arborescence — `bonus`, `hud`, `particles`, `ships`, `skybox/dawnclouds`, `tracks/cityscape` (dont `collision.png` et `height.png`).
- `audio/` (2,1 Mo) : `bg.ogg`, `boost.ogg`, `crash.ogg`, `destroyed.ogg`, `wind.ogg` (+ `LICENSE`). Seul le format `.ogg` est fourni.
- `css/` (1,7 Mo) : `multi.css`, `fonts.css`, `touchcontroller.css`, police BebasNeue (eot/svg/ttf/woff), images d'aide `help-0..3.png`, `title.png`, `bg.jpg`, images mobiles (`title.png` et `bg.jpg` ne sont plus affichés sur l'accueil mais restent versionnés).
- `replays/cityscape-casual/bkcore.replay.json` : trajectoire enregistrée (tableaux `[temps, x, y, z, qx, qy, qz, qw]`).
- Racine : `favicon.png`, `icon_{32,64,128,256}.png`, `package.zip`.
- `formation/` : `identite/charte_graphique_acme.pdf` et `identite/logo.png`, `tickets/company-event.md` (ticket de personnalisation ACME), `tests/` (QUnit, voir §5 ; captures de référence dans `tests/captures/`).
- `work/company-event/` : `spec.md` (spécification de la personnalisation ACME) et `plan.md` (plan d'implémentation).

## 4. Dépendances et zones legacy à risque

### Dépendances

- **Three.js (version ancienne, ~r53 / « dev »)** : API aujourd'hui retirée utilisée partout : `THREE.ImageUtils.loadTexture`, `uniforms[...].texture`, `ShaderUtils.lib`, `THREE.Sprite({...})`, `geometry.computeTangents()`, `lerpSelf`/`slerpSelf`, `renderer.physicallyBasedShading`, `mesh.flipSided`/`doubleSided`, `CubeGeometry`, `JSONLoader`.
- Les shaders et le post-traitement dépendent du format interne de cette version de Three.
- Leap Motion (`leap-0.4.1`), GA (`ga.js` en HTTP/HTTPS), Facebook/Twitter (URL de partage dans `HexGL.displayScore`) : services externes historiques.
- `index.html` référence des URL absolues vers `hexgl.bkcore.com` (favicon, `og:image`, `og:url`). `<title>`, `description`, `og:*` et favicon portent toujours « HexGL by BKcore » : le branding ACME ne concerne que le contenu de `step-1`.

### Zones legacy à risque

- **Espace de noms global et ordre des scripts** : tout repose sur `window.bkcore` et l'ordre des balises `<script>` ; aucune gestion de modules. `branding.config.js` puis `branding.js` doivent précéder l'appel `bkcore.Branding.apply`, lui-même placé avant `launch.js`.
- **Spécificité CSS de `css/multi.css`** : les règles génériques `#menu div` (fond en dégradé blanc, `text-shadow`, `scaleY(0.8)`, survol `scaleY(1.1)`) et `#start:hover { color … !important }` l'emportent sur des sélecteurs simples. Les surcharges de `branding/branding.css` utilisent des sélecteurs plus spécifiques (`#step-1.brand-acme #menu div`, `#step-1.brand-acme #menu #start`) et `!important` pour le survol de `#start`.
- **Mise en page de `step-1` avec la classe `brand-acme`** : `#step-1` devient un conteneur flex à défilement vertical, `#global` passe en `position: fixed`, `#menucontainer` passe en flux normal (au lieu de `position: absolute; bottom: 10%`). `html, body` ont `overflow: hidden`, d'où le défilement porté par `#step-1`.
- **Double arborescence `bkcore/` vs `bkcore.coffee/`** : `Timer`, `ImageData`, `Utils` sont dans `bkcore.coffee/` mais exposés sous `bkcore.*` ; deux fichiers `Particles.js` coexistent.
- **Sources `.coffee` et sorties `.js` versionnées côte à côte** ; versions de compilateur différentes selon les fichiers (1.4.0, 1.6.3, 1.7.1).
- **`ShipControls.js` (806 lignes)** : physique, entrées multiples et collisions mêlées dans un seul constructeur ; couplé à `HexGL` (`ctx`), à `THREE` et aux `ImageData` de collision/hauteur.
- **`Cityscape.js`** : mélange données de circuit, chargement, matériaux, construction de scène, boucle de rendu (callback `ctx.manager.add("game", …)`) et pilotage de composants via `this.objects`.
- **`HexGL.js`** : couplage fort avec le DOM (`document.getElementById("finish*")`), `localStorage`, `Ladder`, réseaux sociaux.
- **Communication par chaînes/IDs** : ressources adressées par noms de chaînes (`"track.cityscape.diffuse"`…) ; `Loader.get` renvoie `null` + `console.warn` si inconnu.
- **Dépendance à la résolution** : constantes `2048.0 / 6000.0` répétées (`pixelRatio`, `collisionPixelRatio`, `heightPixelRatio`), spawn `-1134*2, 387, -443*2` codés en dur.
- **Qualités / plateformes** : commentaires « desktop/mobile + quality » indiquant une logique de qualité réécrite (HexGL.js l. 36-43) ; seuils `quality > 2`, `< 2`, `> 0` dispersés.
- **Codes de contrôle** : `controlType` 0 clavier, 1 tactile, 2 Leap, 3 gamepad (menu de `launch.js`) ; `ShipControls` gère aussi `4` (orientation), absent du menu.
- **Audio** : `AudioContext` + `createPanner`/`setPosition` (API dépréciées), `noteOn/noteOff`, seuls les `.ogg` fournis.

## 5. Fonctions et modules testables automatiquement

### Tests QUnit existants (`formation/tests/`)

- `index.html` : charge `vendor/qunit-2.26.0.js/.css`, puis `../../bkcore.coffee/Utils.js`, `Timer.js`, `ImageData.js`, `../../branding/branding.js` et `browser-tests.js`. Aucun autre script du jeu, ni Three.js. Redirige vers lui-même avec `?hexgl_poc=ok` si le paramètre est absent.
- `browser-tests.js` : 5 modules, 25 tests :
  - `HexGL — bkcore.Utils` (4) : `updateClass` ajoute / supprime une classe ; `getOffsetTop` additionne les décalages parent/enfant (objets simulés) ; `getURLParameter` lit `hexgl_poc` (valeur attendue `"ok"` si présent dans l'URL, sinon `null`… voir §6) ;
  - `HexGL — bkcore.Utils (cas limites)` (3), `HexGL — bkcore.Timer` (7), `HexGL — bkcore.ImageData (lecture de pixels)` (6) ;
  - `HexGL — bkcore.Branding` (5) : `apply` écrit textes et logo, pose les variables CSS, ne fait rien sans config, ignore les éléments manquants, masque le cartouche si le logo est en erreur. Ces tests travaillent sur un document isolé (`document.implementation.createHTMLDocument`) avec une config de test : ils ne dépendent ni de WebGL ni des valeurs de marque réelles, qui peuvent donc changer sans les casser.
  - `QUnit.done` écrit `data-test-count`, `data-test-failures`, `data-test-status` sur `<html>` ; le statut est `pass` si aucun échec **et** `count >= 4`.
- `ci-chrome.bat` (97 l.) / `ci-chrome.sh` (75 l.) : lancent Chrome/Chromium/Edge en headless, codes de sortie 0 (réussi), 1 (échec), 2 (impossible), rapport `rapport_erreur.html` généré uniquement en cas d'erreur.
- `.github/workflows/hexgl-browser-tests.yml` (sous `formation/tests/`) : job `windows-latest` appelant `HexGL\formation\tests\ci-chrome.bat` ; `README.md` indique de le placer à la racine du dépôt.

### Couverture actuelle

Sont couverts : `Utils.updateClass`, `Utils.getOffsetTop`, `Utils.getURLParameter`, `Timer` (statiques et instance), `ImageData` (`getPixel`, `getPixelBilinear`, `getPixelF`) et `Branding.apply`.

### Limites de la vérification hors navigateur complet

- Le rendu de l'accueil et les interactions (survol, clics, cycle des options, Credits) ne sont pas couverts par QUnit : ils se contrôlent dans un navigateur, en comparant aux captures de `formation/tests/captures/` (`01-ecran-accueil.png` : accueil d'origine, avant branding ; `02-jeu-en-cours.png` : course).
- En Chrome headless (swiftshader), le chargement du jeu s'arrête à ~97,7 % de la barre de progression, avec ou sans le branding (constaté aussi sur l'`index.html` d'origine). Une course complète ne peut donc se vérifier que dans un navigateur réel.

### Fonctions/modules testables sans WebGL ni rendu

Candidats sans dépendance à Three.js ni au GPU, d'après le code actuel :

| Module / fonction | Nature | Remarques |
|---|---|---|
| `bkcore.Timer.msToTime`, `msToTimeString`, `zfill` | Fonctions pures statiques | Aucune dépendance |
| `bkcore.Timer` (instance : `start`, `pause`, `update`, `getElapsedTime`) | Basée sur `Date` | Horloge système non injectée |
| `bkcore.ImageData.getPixel`, `getPixelBilinear`, `getPixelF`, `getPixelFBilinear` | Calcul sur `this.pixels` | Le constructeur charge une `Image` ; `pixels` peut être affecté directement (`{width,height,data}`) |
| `bkcore.Utils.getURLParameter`, `getOffsetTop`, `updateClass`, `isTouchDevice`, `request` | DOM / `window` | Déjà partiellement testés ; `request` utilise `XMLHttpRequest` |
| `bkcore.controllers.GamepadController.isCompatible` / `updateAvailable` | Dépend de `navigator.getGamepads` | `navigator` simulable |
| `bkcore.controllers.OrientationController`, `TouchController` | Dépendent d'événements DOM / `window` | Chargés sans Three.js |
| `bkcore.hexgl.Ladder.displayLadder` | Manipulation DOM + `Timer` | Voir anomalies (références à `bkcore.Ladder`) |
| `bkcore.hexgl.RaceData` (`tick`, `export`, `import`, `reset`) | Données + `THREE.Vector3/Quaternion` au constructeur | Nécessite Three.js (`THREE` doit exister) |
| `bkcore.hexgl.Gameplay` (compte à rebours, `checkPoint`, `end`, `simu`) | Logique d'état | Dépend de `bkcore.Timer`, `RaceData` (donc `THREE`), d'un `shipControls` et d'un `analyser.getPixel` simulables |
| `bkcore.threejs.Loader.get` / `loaded` / `updateState` | Logique de progression | Le constructeur crée un `THREE.JSONLoader` |
| `bkcore.threejs.RenderManager` (`add`, `get`, `remove`, `setCurrent`) | Logique de registre | Dépend d'un `renderer` simulable et de `window.perfNow` |
| `HexGL.tweakShipControls` | Affectation de paramètres selon `difficulty` / `godmode` | Fonction appelée sur un objet de composants ; sa lecture n'exige pas WebGL si invoquée via prototype avec un contexte simulé |

### Non testable automatiquement en l'état

- `HexGL` constructeur / `initRenderer` / `initGameComposer` (créent `THREE.WebGLRenderer`).
- `ShipControls.update`, `collisionCheck`, `heightCheck` (dépendent de maps pixel, de Three et du temps).
- `Cityscape.load/buildScenes`, `Shaders.js`, `HUD.js` (canvas), `Audio.js` (réseau + Web Audio), `Preloader.js`.
- `launch.js` : IIFE qui s'exécute au chargement et manipule directement le DOM de `index.html`.

## 6. Bugs, dettes et anomalies remarquables

Constats issus de la lecture du code ; aucun n'a été corrigé.

### Anomalies probables (erreurs à l'exécution ou comportements incorrects)

1. **`HexGL.js` l. 228 — `JSON.Stringify`** (majuscule) : `JSON.Stringify` n'existe pas (`JSON.stringify`) → `TypeError` dans la branche « nouveau record local ».
2. **`HexGL.js` l. 222-228, 236, 273 — clé `t`** : `t = this.track` est un objet ; les clés `localStorage['score-'+t+'-'+d]` deviennent `score-[object Object]-casual`. `Gameplay.start` lit en mode replay la clé `race-<track.name>-replay` (`race-Cityscape-replay`) → clés d'écriture et de lecture différentes.
3. **`HexGL.js` l. 236, 273 et `Ladder.js`** : `displayScore` et `Ladder.displayLadder` utilisent `bkcore.hexgl.Ladder.global[t][d]` ; `Ladder.js` lit/écrit `bkcore.Ladder.global` (espace de noms inexistant) ; `Ladder.js` n'est pas chargé par `index.html` ; `Ladder.load` appelle l'URL `"nothing"`. Ces chemins ne sont atteints que si `gameover` est `null` (non le cas avec `launch.js`, qui renvoie avant).
4. **`Gameplay.js` mode `replay`** : `self.end(self.result.REPLAY)` — `self.result` est un nombre ; l'objet est `self.results` → `undefined.REPLAY`. En mode `replay`, `Gameplay.start` retourne `false` sans lancer de timer en cas d'échec d'import ; `HexGL.reset` ne gère pas ce retour.
5. **`RaceData.js` — `tick`** : le compteur incrémenté est `this.rate` (au lieu de `this.rateState`) ; `rateState` reste à 1 donc chaque appel enregistre un point, et `rate` croît sans borne.
6. **`RaceData.js` — `applyInterpolated`** : lit `this.data[this.seek]` avant le test `this.seek < 0` ; au premier ou dernier point, `teleport` est appelé puis le code continue vers `next = this.data[this.seek+1]` (pas de `return` après « no interpolation »), `next` peut être `undefined` quand `seek == last`.
7. **`Gameplay.js` — `modes.timeattack`** : utilise `this.timer` (et `this.maxLaps`) alors que `this` dépend de l'appel (`.call(this)` dans `update`) ; fonctionne uniquement parce que `update` appelle avec `.call(this)`.
8. **`Gameplay.js` — `checkPoint`** : lit `analyser.pixels` ; avant fin de chargement de l'image, `ImageData.getPixel` renvoie `{r:0,g:0,b:0,a:0}`.
9. **`Gameplay.simu`** : méthode de débogage laissée dans le code (temps de tours codés en dur `92300, 91250, 90365`), non appelée par le jeu.
10. **`Loader.js` — `loadSound(src, name, loop)`** : accepte trois arguments mais `Loader.load` passe `usePanner` en quatrième ; `usePanner` est ignoré par `Loader` donc `Audio.addSound` reçoit `usePanner === undefined` (panner jamais utilisé via le loader).
11. **`Loader.updateState`** : appelle `loadCallback` chaque fois que `loaded == total`, y compris quand `state` est `false` (initialisation) si `total == 0`, et peut être appelé plusieurs fois ; les erreurs de chargement de sons, de géométries et de cube map ne déclenchent pas `errorCallback`.
12. **`Audio.js` — `addSound`** : `var audio` est déclaré deux fois ; en cas d'échec de décodage, `callback` n'est jamais appelé donc le chargement ne se termine jamais (la barre de progression reste bloquée).
13. **`Ladder.displayLadder`** : condition `!bkcore.Ladder.global[track][mode] == undefined` (toujours `false`) ; variable `m` calculée mais non utilisée ; boucle sur `l.length-1`.
14. **`Utils.request`** : boucle `0 <= _ref` sur `XMLHttpFactories.length` avec `<=` (dépassement d'index → `TypeError` capturé) ; `url += "?" + qdata` répété dans la boucle d'itération ; envoi de `qdata` même en GET.
15. **`Utils.projectOnScreen`** : utilise `mat.n44`, `mat.n14`… (API Matrix4 de Three ancien) ; `mat.multiply(a, b)` à deux arguments ancienne signature.
16. **`ImageData.getPixelF`** : `c.r + c.g*255 + c.b*255*255` (base 255, au lieu de 256).
17. **`Timer.msToTime`** : propriété `ms` dupliquée dans l'objet retourné ; `ms` (reste modulo 1000) n'est pas arrondi.
18. **`launch.js`** : la valeur de `godmode` passée à `HexGL` est `0` ou `1` (entier) ; `hud` est comparé à `1` ; `quality` par défaut 3 y compris sur mobile.
19. **`HexGL.js` constructeur** : `this.a = window.location.href` ; commentaire `//if(this.a[15] == "o")` désactivé dans `start()` (reliquat d'une vérification de domaine).
20. **`Cityscape.load` (qualité haute)** : `console.log('HIGH')` en production ; nombreux `console.log` dans `Loader`/`ShipControls` (`GAMEOVER`), `RaceData.import`, `launch.js`.
21. **`ShipControls.js` l. ~174** : `if(Leap == null)` lèverait `ReferenceError` si `Leap` n'est pas défini (testé après chargement de `leap-0.4.1.min.js`).

### Incohérences de configuration et de packaging

- **`cache.appcache`** liste `bkcore/Timer.js`, `bkcore/ImageData.js`, `bkcore/Utils.js` (inexistants : les fichiers sont dans `bkcore.coffee/`) et omet `bkcore/Audio.js`, `GamepadController.js`, `libs/leap-0.4.1.min.js`, `audio/*`, `launch.js`, `textures.full/*`. Les textures référencées correspondent à `textures/`.
- **`manifest.webapp`** : `launch_path: /index-mobile.html`, fichier absent du dépôt.
- **`index.html`** : le menu godmode est masqué (`display:none`) mais initialisé par `launch.js` ; `favicon`/`og:image` pointent vers des URL absolues externes ; analytics Google (`UA-…`, Universal Analytics, `ga.js` historique).
- **Fichiers non utilisés par `index.html`** : `Ladder.js`, `Preloader.js`, `bkcore.coffee/threejs/Particles.js`, `libs/Three.r53.js`, `libs/Editor.html` et `Editor_files/`, `geometries/tracks/edge/track.js`, `package.zip`, `textures/checker.png`.
- **`.gitignore` racine du dépôt** ignore `.DS_Store` et `/HexGL/formation/tests/rapport_erreur.html` ; le workflow CI se trouve dans `HexGL/formation/tests/.github/workflows/` (et non à la racine du dépôt), donc non pris en compte par GitHub Actions dans cette position.
- **Licences** : README « MIT » ; en-têtes sources « CC BY-NC 3.0 » dans de nombreux fichiers (`HexGL.js`, `Gameplay.js`, `Cityscape.js`…) ; `RenderManager.js` « MIT ».
- **Qualité du dépôt** : dossier `etapes/` à la racine du dépôt (hors `HexGL/`) contenant des livrables de TP (docs, tests Node `A3-figer-les-comportements`, workflows `B10`) sans lien d'exécution avec le jeu.

### Particularités des tests existants

- Test `getURLParameter` : le paramètre `hexgl_poc` est ajouté par la redirection de `index.html` ; l'attendu dépend de `window.location.search` (la variable `url` calculée n'est pas utilisée).
- Le statut `pass` exige `count >= 4` (valeur codée en dur).
- `Utils.URLParameters` est un cache statique remis à `null` par le test.
- Aucun test ne couvre les contrôleurs, `Gameplay`, `RaceData`, `Loader`, `RenderManager`, `Audio`, `HexGL`, `ShipControls`, `launch.js`.
