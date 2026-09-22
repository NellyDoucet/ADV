/**
 * @startingPoint section="Components" subtitle="Marqueur de chapitre numéroté" viewport="700x160"
 */
export interface ChapterBadgeProps {
  /** Numéro de chapitre, format 2 chiffres (ex: "01") */
  number: string;
  /** Titre du chapitre, optionnel */
  label?: string;
}
