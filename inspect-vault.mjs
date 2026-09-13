#!/usr/bin/env node
/**
 * Diagnostic en LECTURE SEULE du coffre.
 *
 * N'ecrit rien, ne modifie rien. Affiche uniquement les champs qui decident de
 * l'etat « vert » de la carte Supabase ; aucun autre champ n'est affiche. Le
 * mot de passe est saisi sans echo, n'est ni stocke ni transmis nulle part.
 *
 *   node inspect-vault.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const VAULT = path.join(
  os.homedir(), 'Library', 'Application Support',
  'intriqathon-configurator', 'vault.enc',
)

const INTERESTING = [
  'SUPABASE_PROJECT_MODE',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_SELECTED_PROJECT_REF',
  'SUPABASE_CREATED_PROJECT_REF',
  'SUPABASE_PROJECT_NAME',
  'SUPABASE_ORG_SLUG',
]

/** Saisie masquee : chaque caractere frappe s'affiche en etoile. */
function askPassword(prompt) {
  return new Promise((resolve, reject) => {
    process.stdout.write(prompt)
    const stdin = process.stdin
    if (!stdin.isTTY) {
      reject(new Error('Ce script doit etre lance dans un terminal interactif.'))
      return
    }
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let value = ''
    const onData = char => {
      if (char === '\r' || char === '\n' || char === '\u0004') {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(value)
        return
      }
      if (char === '\u0003') {               // Ctrl-C
        stdin.setRawMode(false)
        process.stdout.write('\n')
        process.exit(130)
      }
      if (char === '\u007f' || char === '\b') {
        if (value.length > 0) {
          value = value.slice(0, -1)
          process.stdout.write('\b \b')
        }
        return
      }
      value += char
      process.stdout.write('*')
    }
    stdin.on('data', onData)
  })
}

if (!fs.existsSync(VAULT)) {
  console.error(`Coffre introuvable : ${VAULT}`)
  process.exit(1)
}

const payload = JSON.parse(fs.readFileSync(VAULT, 'utf8'))
const password = await askPassword('Mot de passe du coffre : ')

const key = crypto.pbkdf2Sync(
  password, Buffer.from(payload.salt, 'hex'), payload.kdfIterations, 32, 'sha512',
)
const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'))
decipher.setAuthTag(Buffer.from(payload.tag, 'hex'))

let plain
try {
  plain = decipher.update(payload.ciphertext, 'hex', 'utf8') + decipher.final('utf8')
} catch {
  console.error('\nMot de passe incorrect, ou coffre corrompu.')
  process.exit(1)
}

const cfg = JSON.parse(plain)

console.log('\n=== Champs qui decident du vert de la carte Supabase ===\n')
for (const k of INTERESTING) {
  const present = Object.prototype.hasOwnProperty.call(cfg, k)
  console.log(`  ${k.padEnd(32)} ${present ? JSON.stringify(cfg[k]) : '(absent du coffre)'}`)
}

const mode = cfg.SUPABASE_PROJECT_MODE ?? 'existing'
const created = cfg.SUPABASE_CREATED_PROJECT_REF ?? ''
const selected = cfg.SUPABASE_SELECTED_PROJECT_REF ?? ''
const enVigueur = mode === 'create' ? created : selected

console.log('\n=== Verdict ===\n')
console.log(`  mode enregistre       : ${mode}`)
console.log(`  reference en vigueur  : ${enVigueur ? JSON.stringify(enVigueur) : '(aucune)'}`)
console.log(`  jeton / mot de passe  : ${cfg.SUPABASE_ACCESS_TOKEN ? 'present' : 'absent'} / ${cfg.SUPABASE_DB_PASSWORD ? 'present' : 'absent'}`)
console.log(`  carte verte attendue  : ${enVigueur && cfg.SUPABASE_ACCESS_TOKEN && cfg.SUPABASE_DB_PASSWORD ? 'OUI' : 'non'}`)

if (mode === 'create' && created) {
  console.log('')
  console.log('  >> Le coffre affirme qu\'un projet a ete CREE par le configurateur :')
  console.log(`     ${JSON.stringify(created)}`)
  console.log('     Si ce projet n\'existe pas sur votre compte Supabase, c\'est')
  console.log('     cette valeur stockee qui rend la carte verte, et aucune')
  console.log('     correction de la logique ne peut la contredire.')
}

console.log(`\n(${Object.keys(cfg).length} champs au total dans le coffre ; les autres ne sont pas affiches.)`)
