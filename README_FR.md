# Atlas Périodique 3D — V4 Musée

Cette version reprend les 118 racines et les 21 animations du GLB original dans une présentation sombre, avec modules métalliques, inscriptions françaises, reflets au sol et fiche de consultation.

## Ouvrir

Double-cliquer sur **serve.bat** : le navigateur ouvre automatiquement la bonne adresse locale. Le port 8084 est utilisé s'il est libre ; sinon, le lanceur choisit un autre port disponible. Garder la fenêtre du serveur ouverte. Python doit être installé. Le serveur écoute uniquement sur cette machine. Scripts, données, modèle et textures sont inclus ; la consultation ne dépend pas d'un service externe.

- Scène principale : /
- Comparaison avec l’image validée : /comparatif.html
- Variante avec architecture entièrement modélisée : /?gallery=3d

La vue principale associe un décor fixe préparé à partir de la cible et un tableau réellement rendu en 3D. Les reflets des cases, les sélections et les animations sont calculés en direct. Le décor fixe ne possède pas de parallaxe : cette version privilégie la composition frontale. La variante entièrement 3D permet de comparer ce choix, avec une fidélité photographique moindre.

## Explorer

- Cliquer sur une case pour consulter ses propriétés ; double-cliquer pour la rapprocher.
- Faire glisser le tableau pour une rotation limitée ; utiliser la molette pour zoomer.
- Rechercher par nom français, symbole ou numéro. Les accents sont facultatifs.
- Filtrer une famille avec la légende.
- Déployer, replier ou déplacer le curseur de l’animation. Les panneaux s’effacent pendant le déploiement.
- « Vue initiale » restaure la pose assemblée et le cadrage calculé.

Sur mobile, la fiche n’est pas ouverte au démarrage. Les petites inscriptions exigent un zoom ; la recherche fournit un accès direct aux éléments.

## Voir les éléments

Chaque fiche comporte désormais un visuel en haut à droite, synchronisé avec la sélection et la visite : 94 photographies et 24 schémas pour les 118 éléments. Cliquer sur ce visuel pour l’agrandir, lire sa description et consulter ses crédits et sa source. La visite se met en pause pendant la consultation ; Échap ferme l’aperçu.

Les photographies montrent des échantillons documentés : la légende précise notamment les tubes à décharge, les liquides refroidis, les surfaces oxydées ou les solutions. Lorsqu’une photographie fiable n’est pas retenue, un schéma propre à l’élément indique son symbole et son nombre de protons, sans prétendre montrer son apparence réelle. Tous les visuels sont inclus dans le dossier et fonctionnent sans connexion Internet. Leurs sources et licences figurent dans docs/SPECIMENS.md et assets/specimens.json.

## Visiter les 118 éléments

Le bouton **Visiter les 118** lance une visite dans l'ordre des numéros atomiques, de H (1) à Og (118). Le tableau reste assemblé et entièrement cadré. Chaque case s'avance légèrement et s'illumine pendant que sa fiche s'ouvre.

- **Pause visite / Reprendre la visite** : conserver le temps de lecture restant.
- **Précédent / Suivant** : parcourir les éléments manuellement ; la visite se met en pause.
- **Rapide, Normal, Lent** : 1,5, 3 ou 6 secondes par élément. Le dernier élément reste affiché à la fin ; Recommencer repart de H.
- Une sélection manuelle, un déplacement de caméra, un filtre ou une commande de déploiement interrompt la visite. La recherche, la présentation, une interaction avec la fiche et un changement d'onglet du navigateur la mettent en pause.
- Avec la préférence de mouvement réduit, les fiches et les surbrillances changent sans déplacement progressif des cases.

## Sources et transformations

Le fichier assets/periodic_table_v4.glb est conservé à l’identique : SHA-256 4D5895CD291B02C94A9E32106D4E3A9F5706C5B8303C1480616AB61C95802A82. La présentation utilise des coques et des textes neufs attachés aux racines animées ; les anciens maillages sont masqués. Les rangées sont espacées de 30 % supplémentaires sans étirer les lettres. Il ne s’agit donc pas du rendu inchangé du modèle d’origine.

Les 118 noms français proviennent des objets texte du fichier Blender original. Les propriétés sont une copie locale de la [table PubChem](https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON), récupérée le 19 septembre 2026. Les états prévus restent signalés comme tels ; les conditions expérimentales doivent être consultées dans la source. Applications et histoire sont rédigées pour Fe, Au et U ; les autres fiches renvoient à PubChem.

Voir docs/ENVIRONMENT-SOURCES.md pour les textures Poly Haven CC0, docs/ART-BACKPLATE.md pour le décor généré et docs/SPECIMENS.md pour les visuels des fiches. L’ancienne illustration du fer est conservée et documentée dans docs/IRON-ASSET.md ; la fiche utilise désormais une photographie. Three.js r170 est fourni sous licence MIT dans vendor/three.

## Vérification

26 tests automatisés réussis, ainsi que les 17 contrôles de la visite et les 7 contrôles des visuels dans Chromium, dont le parcours et le décodage des 118 images. Les mesures originales sont dans docs/GEOMETRIE.md ; les captures et les rapports navigateur sont dans docs/. Voir docs/VALIDATION.md pour les preuves et les limites.

La V3 précédente et son archive restent séparées et intactes.


