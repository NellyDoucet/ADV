# ADRAR Formation — Design System

Système de design extrait du support de cours PDF **"Révisions Pourcentage"**
(`uploads/Révisions Pourcentage.pdf`), rédigé par Nelly Doucet pour **ADRAR Formation**,
un organisme de formation. Aucun autre document (codebase, Figma) n'a été fourni :
tout ce système est déduit des visuels du PDF (fond de diapositive, ruban décoratif,
logo, mise en page des cartes de contenu).

## Sources
- `uploads/Révisions Pourcentage.pdf` — 28 diapositives, thème "papier à petits carreaux"
  sur fond prune, logo ADRAR Formation en pied de page de titre.

## Index
- `styles.css` — point d'entrée, importe tous les tokens.
- `tokens/colors.css` — couleurs de base + alias sémantiques.
- `tokens/typography.css` — polices et échelle typographique.
- `tokens/spacing.css` — échelle d'espacement, rayons, ombres.
- `tokens/patterns.css` — motif "papier quadrillé" des cartes de contenu.
- `guidelines/` — spécimens (couleurs, typographie, espacement, texture de carte, logo).
- `components/core/ChapterBadge.*` — badge de numéro de chapitre (01, 02, 03...), répété
  4 fois dans le PDF comme marqueur de section.
- `assets/adrar-formation-logo.png` — logo extrait du PDF.

## FONDATIONS VISUELLES
- **Couleurs** : fond prune profond (`--color-plum`, #5F2756) sur toutes les diapositives,
  avec un ruban décoratif corail (#E14B56) en diagonale. Les cartes de contenu sont sur
  papier blanc cassé (`--color-paper`) avec une texture de grille fine ("papier à petits
  carreaux"). Le logo ADRAR Formation apporte 4 couleurs d'accent (bleu ciel, orange,
  rouge, vert) — à réserver à des touches ponctuelles, jamais comme fond dominant.
- **Typographie** : aucune police n'a pu être extraite du PDF (texte vectorisé/embarqué
  sans métadonnées de police lisibles). Substitution Google Fonts : **Poppins** (titres,
  grands numéros de chapitre, arrondi et amical) + **Source Sans 3** (corps de texte,
  lisible). À remplacer par les polices d'origine si l'utilisateur peut les fournir.
- **Formes** : grands rayons arrondis (22px) sur les cartes de contenu type "post-it/
  carnet". Ombre portée douce pour détacher la carte du fond prune.
- **Motifs** : grille fine (papier quadrillé) en fond de carte ; ruban de papier découpé
  en diagonale comme élément décoratif de la diapositive de titre.
- **Iconographie** : aucune icône dédiée dans le PDF, hors le logo du partenaire.
  Ne pas inventer de système d'icônes ; utiliser du texte ou des badges numérotés
  (voir `ChapterBadge`) pour la navigation entre sections.
- **Animation / interactions** : non applicable (support imprimé/diapositives statiques).

## CONTENU / TON
Support pédagogique en français, ton direct et pratique : définitions courtes,
exemples numériques concrets ("Si je mange la moitié d'un gâteau..."), rubriques
"Application" en fin de chapitre. Pas d'emoji. Vouvoiement neutre implicite (pas
d'adresse directe au lecteur).

## Cave​ats
- Les polices d'origine sont une hypothèse (substitution Google Fonts) — à confirmer.
- Le logo ADRAR Formation est un logo de partenaire réel : ne pas modifier ses couleurs
  ni le redessiner ; l'utiliser tel quel depuis `assets/`.
- Système volontairement minimal (pas de kit UI produit) : le PDF est un support de
  cours, pas une application — seuls les tokens CSS, les gabarits de carte et un badge
  de chapitre ont été construits.

## Pour itérer
Dites-moi si vous avez les polices originales du gabarit PowerPoint/Canva, ou d'autres
supports ADRAR Formation (autres PDF, logo vectoriel) pour affiner ce système.
