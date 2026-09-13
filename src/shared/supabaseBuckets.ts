/**
 * The five storage buckets the app reads and writes. Single source of truth for
 * the help walkthrough, the manual-configuration card and the automation that
 * creates them — shared between the renderer and the main process so the names
 * shown to the reader and the names actually created can never drift apart.
 */
export interface StorageBucket {
  name: string
  isPublic: boolean
  fr: string
  en: string
}

export const STORAGE_BUCKETS: StorageBucket[] = [
  { name: 'public_files', isPublic: true, fr: 'logo, logos partenaires, médias', en: 'logo, partner logos, media' },
  { name: 'annonces', isPublic: false, fr: 'pièces jointes des annonces', en: 'announcement attachments' },
  { name: 'users', isPublic: false, fr: 'photos de profil', en: 'profile pictures' },
  { name: 'submissions', isPublic: false, fr: 'livrables des équipes', en: 'project submissions' },
  { name: 'evaluations', isPublic: false, fr: "fichiers d'évaluation du jury", en: 'jury evaluation files' },
]
