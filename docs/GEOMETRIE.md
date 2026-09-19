# Géométrie et cadrage de la base V3

Ces mesures décrivent le GLB d’origine et la base V3 conservée. Dans la V4, les coques de présentation mesurent 15,967 × 10,806 × 0,544 unités au total ; l’espacement des rangées et les matériaux ont été refaits. Le binaire original reste identique. Voir README_FR.md pour cette distinction.

## Source et mesure

Le fichier original `periodic_table_v4.glb` fait **34 965 288 octets**. Son empreinte SHA-256 est :

`4D5895CD291B02C94A9E32106D4E3A9F5706C5B8303C1480616AB61C95802A82`

L’audit décode directement les blocs JSON/BIN et inspecte **826 657 positions de sommets** : 729 nœuds, 594 maillages, 118 éléments, 21 animations et aucune caméra embarquée. La hiérarchie contient des translations et des échelles, sans rotation de nœud.

## Axes établis par la géométrie

| Direction du tableau | Axe natif | Preuve mesurée |
| --- | --- | --- |
| Droite | +X | H : x = −7,565 ; He : x = +7,565 |
| Bas | +Z | H : z = −3 ; Li : z = −2,11 |
| Face avant | +Y | Face de la tuile H : y = 0,23 ; symbole : y = 0,245 à 0,251 ; verre devant ; dos vers y = −0,55 |

Le numéro atomique de H est à gauche et au-dessus du symbole, et son nom au-dessous. Ces repères confirment le sens de lecture indépendamment des dimensions globales.

La transformation vers le repère d’affichage est donc **une rotation X de +π/2** : `(x, y, z) → (x, −z, y)`. Le tableau présente alors sa droite vers +X, son haut vers +Y et sa face vers +Z. Le centrage porte sur `PT_PERIODIC_TABLE_ROOT`, sans modifier les transformations de ses couches animées.

## Dimensions et limites de cadrage

Dans les coordonnées natives, le tableau seul a pour limites :

- minimum : `(−8,697500 ; −0,650000 ; −4,375000)` ;
- maximum : `(+8,697500 ; +0,467000 ; +5,075000)`.

Après rotation et centrage, ses dimensions sont **17,395 × 9,450 × 1,117** (largeur × hauteur × profondeur), avec des limites de **±8,697500**, **±4,725000** et **±0,558500**.

Le sol `PT_StudioFloor`, large de 32 sur 24 unités, et les annotations extérieures sont exclus du calcul. Cadrer toute la scène inclurait ce décor et produirait un recul injustifié.

## Caméra mesurée dans la capture finale de cette passe

Les valeurs proviennent de `base-pass-03.json`, pour une fenêtre **1536 × 1024** :

| Paramètre | Valeur |
| --- | --- |
| Champ vertical / rapport largeur-hauteur | 28° / 1,5 |
| Position | `(1,112471 ; −0,606802 ; 34,360601)` |
| Cible | `(1,112471 ; −0,606802 ; 0)` |
| Verticale | `(0 ; 1 ; 0)` |
| Plans proche / lointain | 0,05 / 180 |

La visée reste strictement frontale. Son décalage commun en X/Y place le tableau dans la composition sans l’incliner. Le recul dépend des dimensions, du champ de vision et de l’espace réservé dans l’image.

La zone de référence retenue s’étend de **11,2 % à 80 %** en largeur et de **10,8 % à 82 %** en hauteur. Le tableau réellement projeté occupe **11,2 % à 80 %** et **18,37 % à 74,43 %**. Son rapport largeur/hauteur original, **1,841**, diffère de celui de cette zone, **1,449** : respecter la géométrie conserve donc des marges verticales. Cette passe valide le sens et mesure le cadrage ; elle ne démontre pas une reproduction identique de l’image cible ni une validation esthétique par l’utilisateur.

## Pose initiale

La pose importée est déjà assemblée ; la capture est réalisée à **t = 0**, animations figées. Les clips déplacent notamment le verre de y = 0,42 à 3,45 et les éléments de 0,15 à 2,30 dans le repère natif. Leur lecture introduirait l’éclatement et les annotations avant validation de cette base.
