// ============================================================================
// Progression d'un job de déploiement.
//
// Les phases n'ont rien de comparable en durée : la connexion prend une
// seconde, l'installation distante plusieurs minutes. Une progression en
// index/total faisait bondir la barre à 50 % puis la laissait figée pendant
// tout le `docker compose build`. On pondère donc chaque phase, et on avance
// à l'intérieur d'une phase quand on dispose d'un signal.
// ============================================================================

export const DEPLOY_WEIGHTS = { connect: 5, upload: 30, prepare: 5, install: 60 }
export const RESTART_WEIGHTS = { connect: 20, restart: 80 }

/**
 * Jalons repérables dans la sortie de install_hackathon.sh, avec leur
 * avancement au sein de la phase d'installation. C'est notre propre script :
 * ces marqueurs font partie du contrat, pas d'une heuristique sur du texte
 * arbitraire.
 */
// Les classes de caractères sur les accents couvrent le cas d'un serveur dont
// la locale dégrade la sortie UTF-8 du script.
export const INSTALL_MILESTONES: { pattern: RegExp; fraction: number }[] = [
  { pattern: /Installation de Docker/i, fraction: 0.05 },
  { pattern: /Docker (?:est d[ée]j[àa] )?install[ée]/i, fraction: 0.15 },
  { pattern: /CONFIGURATION DU DOMAINE/i, fraction: 0.20 },
  { pattern: /Configuration du Proxy Caddy/i, fraction: 0.25 },
  { pattern: /Nettoyage des anciens conteneurs/i, fraction: 0.35 },
  { pattern: /Lancement de l'application/i, fraction: 0.45 },
  { pattern: /Installation termin[ée]/i, fraction: 1 },
]

/**
 * Avancement global 0–100, pondéré et strictement monotone.
 *
 * `creep` avance très légèrement à chaque ligne de sortie sans jamais
 * atteindre le jalon suivant : pendant une phase muette de plusieurs minutes,
 * la barre bouge au lieu de paraître bloquée, mais ne ment jamais en
 * dépassant l'étape réellement atteinte.
 */
export class PhaseProgress {
  private base = 0
  private weight = 0
  private sub = 0
  private readonly emit: (percent: number) => void

  constructor(emit: (percent: number) => void) {
    this.emit = emit
  }

  enter(weight: number): void {
    this.base += this.weight
    this.weight = weight
    this.sub = 0
    this.emit(Math.round(this.base))
  }

  advance(fraction: number): void {
    const next = Math.max(this.sub, Math.min(1, fraction))
    if (next === this.sub) return
    this.sub = next
    this.emit(Math.round(this.base + this.weight * next))
  }

  creep(ceiling: number, stepSize = 0.004): void {
    this.advance(Math.min(this.sub + stepSize, Math.max(this.sub, ceiling - 0.01)))
  }

  get fraction(): number {
    return this.sub
  }
}

/**
 * Avance dans la phase d'installation d'après les jalons du script distant.
 *
 * Les motifs sont TOUS évalués avant de décider de grignoter : sortir de la
 * boucle dès le premier jalon non atteint empêcherait à jamais de reconnaître
 * les suivants, et `creep` — qui plafonne sous le jalon visé — ne pourrait
 * jamais franchir ce plafond. La barre resterait figée jusqu'à la fin du job.
 */
export function trackInstallProgress(line: string, progress: PhaseProgress): void {
  let matched = -1
  for (const milestone of INSTALL_MILESTONES) {
    if (milestone.pattern.test(line)) {
      matched = Math.max(matched, milestone.fraction)
    }
  }

  if (matched >= 0) {
    progress.advance(matched)
    return
  }

  // Aucun jalon sur cette ligne : on grignote vers le prochain non atteint.
  const next = INSTALL_MILESTONES.find((m) => m.fraction > progress.fraction)
  progress.creep(next ? next.fraction : 1)
}
