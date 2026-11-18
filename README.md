# DicoNouchi

Dictionnaire Nouchi–Français, application web installable (PWA), sans backend ni API distante.

## Prérequis
- Node.js LTS installé
- npm
- Visual Studio Code (recommandé)

## Installation
```bash
npm install
npm run dev
```
Ouvrir http://localhost:3000

## Production
```bash
npm run build
```
Le site statique est généré dans `out/`. Héberger le contenu de `out/` sur un hébergement HTTPS.

## Hors connexion
Le Service Worker est enregistré en production uniquement. Il met en cache l'interface, les images et les ressources consultées. Les fichiers audio de prononciation sont mis en cache après leur première écoute. Tester après un premier chargement complet en ligne, puis activer le mode avion.

## Fonctionnalités
- Dictionnaire Nouchi–Français avec recherche, catégories en cartes, favoris et historique.
- Prononciation audio intégrée pour chaque entrée (fichiers audio locaux), sans dépendre de la voix de l'appareil.
- Interface optimisée, fluide et illustrée, avec mode sombre.
- Export des données personnelles (favoris, historique) en JSON.

## Données
- Dictionnaire : `data/dictionary.js`
- Métadonnées des catégories : `data/categoryMeta.js`
- Prononciations audio intégrées : `public/audio/*.mp3`
- Images et illustrations : `public/images/`
- Favoris, historique et thème : LocalStorage du navigateur.

## Important sur le contenu linguistique
Les entrées du dictionnaire sont des exemples de démonstration. Elles ne constituent pas une base lexicographique exhaustive ni une validation académique. Faire relire les définitions, prononciations, variantes et exemples par des locuteurs du Nouchi avant toute publication.

## Limites de la version
- Les données personnelles sont locales à ce navigateur et ne sont pas synchronisées entre appareils.
- Pour une compatibilité PWA maximale, prévoir des icônes PNG 192x192 et 512x512 en complément, puis tester l'installation sur Android et iOS.
