# V4 — vérification et comparaison

## Visuels des 118 fiches — 19 septembre 2026

94 photographies documentées et 24 schémas sont livrés localement, avec un visuel distinct pour chaque élément. La sélection manuelle et la visite mettent à jour la vignette au même emplacement dans la fiche de droite. L’aperçu agrandi donne la légende complète, les crédits, la licence et la source. Il met la visite en pause.

- 26 tests Node réussis : 11 caméra, 10 visite et 5 contrats de collection (118 identités, fichiers et signatures, SVG autonomes, textes accessibles, provenance et schémas identifiés).
- Parcours navigateur des 118 éléments : chaque image décodée et comparée à l’identité, au chemin, au texte alternatif et à la légende du manifeste. 7 contrôles intégrés réussis, rapport specimen-browser-validation.json.
- Ouverture et fermeture par bouton/Échap, retour du focus, crédits, pause de la visite, affichage 390 × 844, image retardée remplacée par une nouvelle sélection et image volontairement indisponible vérifiés.
- Aucun appel externe nécessaire, aucune erreur JavaScript ni requête échouée imprévue. Les essais de panne et de retard sont provoqués par le test. Les liens documentaires externes restent facultatifs.
- Les 17 contrôles précédents de la visite ont également été relancés après intégration du nouveau lecteur : tous réussis.
- Planches des 94 photographies inspectées ; captures Fe, He, Br, Og, fiche mobile et aperçu mobile enregistrées. Le contrôle mobile est une émulation Chromium, pas un essai sur téléphone physique.
- Le GLB original conserve son SHA-256. Les photographies ne prétendent pas montrer tous les éléments à température ambiante ; les conditions et les composés sont légendés. Les 24 schémas représentent le nombre de protons, pas l’apparence d’un échantillon.

## Visite des 118 éléments

La visite ajoutée sélectionne chaque élément de H à Og, ouvre sa fiche et avance légèrement sa case. La caméra conserve le cadrage d’ensemble. Pause/reprise, précédent/suivant et trois vitesses sont disponibles. La fin reste sur Og et propose de recommencer.

- 10 tests du contrôleur de visite réussis, dont le parcours complet des 118 numéros, les bornes, la pause, les interruptions et l’absence de rattrapage sautant des éléments.
- 11 tests existants de caméra également réussis.
- 17 contrôles navigateur intégrés réussis : progression H → He mesurée à 3 013 ms, navigation jusqu’à 118, fin/redémarrage, interactions avec les animations existantes, mouvement réduit et mobile 390 × 844.
- Aucune erreur JavaScript, aucun avertissement ni requête échouée durant ces contrôles. Rapport : tour-browser-validation.json ; captures : tour-desktop.png, tour-element-118.png, tour-mobile.png.
- La pause liée à un onglet masqué a été testée en simulant document.hidden et visibilitychange, sans changement d’onglet du système.
- Sur mobile pendant la visite, la fiche compacte reste sous le tableau et ses propriétés défilent.

## Périmètre

Rendu observé dans Chromium à 1536 × 1024 et comparé à la cible fournie. Vues 1920 × 1080 et 390 × 844 également capturées. Aucune publication externe effectuée.

La vue principale est hybride : décor fixe dérivé de la cible, tableau et reflets réels en 3D. La galerie entièrement modélisée reste accessible avec ?gallery=3d. Une capture frontale ne démontre pas de parallaxe du décor fixe et ne constitue pas une validation sur téléphone physique.

## Boucle visuelle

1. museum-pass-01.png : première intégration ; cases trop claires, baie simplifiée, reflet dédoublé.
2. museum-pass-03.png : inscriptions agrandies, faces plus sombres, textures et baie photographique, reflet flouté continu.
3. museum-pass-06.png : environnement de réflexion des tuiles, accents lumineux localisés, galerie entièrement 3D.
4. museum-pass-07.png : décor fixe extrait de la cible, avec tableau et reflets toujours calculés.
5. museum-final.png : accents Fe/Au/U ajustés et présentation retenue pour comparaison.

Les tuiles restent plus régulières et leurs reflets de bord moins variés que dans la cible générée. Les incohérences chimiques de cette image ne sont pas reproduites.

## Preuves

- GLB original : SHA-256 identique au fichier fourni.
- 118 racines, 21 clips, 118 noms français et 118 entrées PubChem ; numéros et symboles uniques.
- Caméra : huit coins du volume visible contenus dans la zone réservée. Axes mesurés, transformation native +90° autour de X, aucun miroir.
- 11 tests du calcul de caméra réussis avec node --test tests/camera-fit.test.mjs.
- 21 contrôles navigateur réussis ; aucune erreur, aucun avertissement et aucune requête échouée sur les chargements finaux. Détails dans browser-validation.json.
- Sélection Fe/Au, double-clic focus, 9 propriétés, onglets et clavier, recherche Étain/etain, filtre/recherche/raycast, poses 0/6,83/10, interruptions d’animation, redimensionnement, mobile et orbite vérifiés.
- Les panneaux s’effacent pendant le déploiement et leurs interactions sont restaurées au repli, y compris après fermeture/réouverture.
- Serveur local HTTP/1.1, TCP_NODELAY et blocs de 16 Ko : 144 transferts intègres testés, dont GLB, image et module JS, contrôlés par SHA-256.

## Données scientifiques et limites

Valeurs issues de la copie locale PubChem. Les densités conservent les petites valeurs sans arrondi fixe à quatre décimales. Les températures sont converties en degrés Celsius. L’état des éléments superlourds reste indiqué comme prévu. Les fiches He et C précisent respectivement la solidification sous pression et la sublimation à pression ambiante.

Les propriétés dépendent de leurs conditions de mesure ; chaque fiche renvoie à la source. Les rubriques Applications et Histoire sont détaillées pour Fe, Au et U uniquement. Pas de qualification Safari/Firefox ni de mesure de performance sur téléphone physique.
