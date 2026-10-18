# HexGL — notes pour Claude

Jeu de course WebGL legacy (JavaScript global + CoffeeScript précompilé, sans build). Voir `docs/architecture.md`.

## Tests

Suite QUnit sans Node.js, dans `formation/tests/` (`index.html` + `browser-tests.js`, QUnit en local dans `vendor/`).

Commande de test (depuis le dossier `HexGL/`) :

- Windows (PowerShell) : `& ".\formation\tests\ci-chrome.bat"`
- Windows (CMD) : `formation\tests\ci-chrome.bat`
- Linux : `bash formation/tests/ci-chrome.sh`
- Manuel : ouvrir `formation/tests/index.html` dans un navigateur.

Codes de retour : `0` TESTS_REUSSIS, `1` TESTS_ECHOUES, `2` TESTS_IMPOSSIBLES. En cas d'échec, consulter `formation/tests/rapport_erreur.html` (ignoré par Git).

Pour tester un nouveau module : ajouter son `<script>` dans `formation/tests/index.html` et ses tests dans `formation/tests/browser-tests.js`. Ne pas lancer le jeu ni dépendre de WebGL dans les tests.

Les captures visuelles de référence (écran d’accueil et jeu en cours) sont conservées dans formation/tests/captures/. Les utiliser pour vérifier le rendu après les modifications graphiques.

## Règles

- Pas de `package.json`, ni de `npm test`, ni de nouveau framework de test.
- Les tests ne figent pas le branding (logo, couleurs, textes) destiné à être modifié.
- Ne pas utiliser ni consulter le dossier `../etapes/` : il contient les corrigés de la formation.