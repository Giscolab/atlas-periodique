# Sources de l’environnement V4

L’architecture visible est construite en géométrie Three.js : murs, joints, vitrage, profondeur de baie, plafond, piliers, luminaires et sol. Une photographie panoramique de forêt est limitée à l’arrière-plan lointain de la baie, derrière le vitrage et les montants 3D. Aucune image de la cible n’est utilisée comme décor.

Les fichiers suivants sont distribués localement dans `assets/environment/`. Leur utilisation ne dépend pas d’un CDN au démarrage.

| Ressource | Auteur | Usage | Licence |
| --- | --- | --- | --- |
| [Concrete Wall 006](https://polyhaven.com/a/concrete_wall_006) | Charlotte Baglioni, Dario Barresi | Couleur, normales OpenGL et rugosité 1K des murs | CC0 |
| [Smooth Concrete Floor](https://polyhaven.com/a/smooth_concrete_floor) | Dimitrios Savva | Couleur, normales OpenGL et rugosité 1K du sol | CC0 |
| [Lebombo](https://polyhaven.com/a/lebombo) | Greg Zaal | HDRI 1K, éclairage et reflets seulement | CC0 |
| [Rainforest Trail](https://polyhaven.com/a/rainforest_trail) | Dimitrios Savva, Jarod Guest | Panorama HDRI 1K de la végétation lointaine, derrière la baie | CC0 |

[Licence officielle Poly Haven](https://polyhaven.com/license), vérifiée le 19 septembre 2026. Les URL exactes et tailles des huit fichiers téléchargés sont conservées dans `assets/environment/sources.json`.

La lumière ambiante HDR est préfiltrée par PMREM. Le fond de scène demeure sombre. Le reflet au sol est un rendu de la scène courante par le composant Three.js `Reflector` (MIT, Three.js 0.170.0), combiné au sol PBR avec une faible opacité, une distorsion de normale et un filtrage mipmap continu. Il suit donc le tableau et les mouvements de caméra ; ce n’est pas une copie peinte de la cible.

Les textures des parois répètent environ tous les 2,8 mètres ; celles du sol tous les 3,5 mètres. La colorimétrie anthracite, la rugosité, la force des normales et la réflexion du sol sont des choix de direction artistique de cette scène, non des mesures du lieu photographié.
