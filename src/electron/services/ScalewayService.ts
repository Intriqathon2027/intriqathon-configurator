import type { BrowserWindow } from 'electron'

export interface ScalewayCreateOptions {
  secretKey: string
  projectId: string
  sshPublicKey: string
  sshKeyName?: string
  zone?: string
  commercialType?: string
  /** Root volume size in GB. Omitted: the image's own default size. */
  rootVolumeGb?: number
}

/** Marketplace image flavours: local SSD (DEV1, GP1…) or block storage (POP2, PRO2…). */
export type ScalewayImageType = 'instance_local' | 'instance_sbs'

export interface ScalewayRootVolume {
  /** Bytes — Scaleway counts 1 GB as 10^9 bytes. */
  size: number
  volume_type: 'l_ssd' | 'sbs_volume'
}

/**
 * The root volume to ask for, given the image the type boots from. The volume
 * type has to follow the image: an SBS-only type such as POP2 refuses a local
 * volume, and the other way round. A local volume is also bounded by the
 * offer's own constraint (DEV1-M cannot hold more than 40 GB locally), so the
 * size is clamped into it rather than refused. `null` when nothing is known
 * enough to ask for — the image's default volume is then used, as before.
 */
export function rootVolumeFor(
  imageType: string | undefined,
  sizeGb: number | undefined,
  localConstraint?: { min_size?: number; max_size?: number },
): ScalewayRootVolume | null {
  if (!sizeGb || sizeGb <= 0) return null
  const volume_type =
    imageType === 'instance_sbs' ? 'sbs_volume' : imageType === 'instance_local' ? 'l_ssd' : null
  if (!volume_type) return null

  let size = Math.round(sizeGb * 1e9)
  if (volume_type === 'l_ssd' && localConstraint) {
    if (localConstraint.max_size && size > localConstraint.max_size) size = localConstraint.max_size
    if (localConstraint.min_size && size < localConstraint.min_size) size = localConstraint.min_size
  }
  return { size, volume_type }
}

interface ServerOffer {
  ncpus?: number
  ram?: number
  hourly_price?: number
  monthly_price?: number
  volumes_constraint?: { min_size?: number; max_size?: number }
}

interface LocalImage {
  id?: string
  type?: string
  zone?: string
  arch?: string
  compatible_commercial_types?: string[]
}

interface OfferLookup {
  /** False when Scaleway could not be asked — nothing is then known either way. */
  checked: boolean
  offer?: ServerOffer
  /** 'available' | 'scarce' | 'shortage', when Scaleway reports it. */
  availability?: string
}

export interface ScalewayLogEvent {
  message: string
  status: 'info' | 'running' | 'done' | 'error'
  progress?: number
}

export class ScalewayService {
  private isCancelled = false

  public cancel(): void {
    this.isCancelled = true
  }

  private log(win: BrowserWindow | null, message: string, status: ScalewayLogEvent['status'] = 'info', progress?: number): void {
    console.log(`[ScalewayService] [${status.toUpperCase()}] ${message}`)
    if (win && !win.isDestroyed()) {
      win.webContents.send('scaleway:log', { message, status, progress } satisfies ScalewayLogEvent)
    }
  }

  private formatScalewayError(status: number, rawBody: string, context: string): string {
    let parsedMessage = rawBody
    let errorType = ''
    let errorHelp = ''

    try {
      const parsed = JSON.parse(rawBody)
      if (parsed.message) {
        parsedMessage = parsed.message
      }
      if (parsed.type) {
        errorType = parsed.type
      }
      if (parsed.help) {
        errorHelp = ` (Hint: ${parsed.help})`
      }
      if (parsed.fields && typeof parsed.fields === 'object') {
        const fieldDetails = Object.entries(parsed.fields)
          .map(([k, v]) => {
            if (Array.isArray(v)) {
              return `${k}: ${v.map((item: any) => (typeof item === 'object' ? (item.message || JSON.stringify(item)) : item)).join(', ')}`
            }
            return `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`
          })
          .join(' ; ')
        if (fieldDetails) {
          parsedMessage += ` [Fields: ${fieldDetails}]`
        }
      }
    } catch {
      // keep rawBody
    }

    // A quota refusal comes back as a 403 too, but no key or IAM policy is at
    // fault: the Organization has used up what its account level allows.
    if (status === 403 && /quota/i.test(parsedMessage)) {
      return `[ERROR 403] Scaleway quota reached while: ${context}. Your Organization has no quota left for this resource: delete an unused instance of the same type, choose a smaller sizing profile, or raise the quota (Scaleway console → Organization → Quotas; validating your identity or contacting Support raises it). Detail: "${parsedMessage}"`
    }

    if (status === 401 || status === 403) {
      return `[ERROR ${status}] Access denied by Scaleway while: ${context}. Verify that your SCW_SECRET_KEY is correct (Step 1) and has the required IAM permissions. Detail: "${parsedMessage}"${errorHelp}`
    }

    if (status === 404) {
      return `[ERROR 404] Resource or Scaleway Project not found while: ${context}. Verify your project ID (SCW_DEFAULT_PROJECT_ID) in Step 1. Detail: "${parsedMessage}"`
    }

    if (status === 400) {
      return `[ERROR 400] Invalid parameter while: ${context}. Detail: "${parsedMessage}"${errorType ? ` (${errorType})` : ''}${errorHelp}`
    }

    return `[HTTP ERROR ${status}] Failed while: ${context}. Detail: "${parsedMessage}"${errorType ? ` (${errorType})` : ''}`
  }

  /**
   * Upload SSH key to Scaleway IAM if not already present
   */
  public async ensureSshKey(options: ScalewayCreateOptions, win: BrowserWindow | null): Promise<void> {
    const { secretKey, projectId, sshPublicKey, sshKeyName = 'intriqathon-key' } = options
    const normalizedKey = sshPublicKey.trim().split(/\s+/).slice(0, 2).join(' ')

    this.log(win, 'Checking for SSH key on Scaleway (IAM API)...', 'running', 15)

    let listRes: Response
    try {
      listRes = await fetch('https://api.scaleway.com/iam/v1alpha1/ssh-keys?page_size=100', {
        headers: {
          'X-Auth-Token': secretKey,
          'Content-Type': 'application/json',
        },
      })
    } catch (netErr: any) {
      const msg = `[NETWORK ERROR] Unable to contact Scaleway IAM API: ${netErr.message || String(netErr)}`
      this.log(win, msg, 'error')
      throw new Error(msg)
    }

    if (!listRes.ok) {
      const errBody = await listRes.text()
      const formatted = this.formatScalewayError(listRes.status, errBody, 'Checking IAM SSH keys')
      this.log(win, formatted, 'error')
      throw new Error(formatted)
    }

    const listData = await listRes.json()
    const existing = (listData.ssh_keys || []).find((k: any) => {
      const existingKey = (k.public_key || '').trim().split(/\s+/).slice(0, 2).join(' ')
      return existingKey === normalizedKey
    })

    if (existing) {
      this.log(win, `SSH key already registered on your Scaleway account (${existing.name}).`, 'info', 25)
      return
    }

    const finalKeyName = `${sshKeyName}-${Date.now().toString().slice(-4)}`
    this.log(win, `Adding SSH key ("${finalKeyName}") to Scaleway...`, 'running', 20)

    let createRes: Response
    try {
      createRes = await fetch('https://api.scaleway.com/iam/v1alpha1/ssh-keys', {
        method: 'POST',
        headers: {
          'X-Auth-Token': secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: finalKeyName,
          public_key: sshPublicKey.trim(),
          project_id: projectId,
        }),
      })
    } catch (netErr: any) {
      const msg = `[NETWORK ERROR] Unable to upload SSH key to Scaleway: ${netErr.message || String(netErr)}`
      this.log(win, msg, 'error')
      throw new Error(msg)
    }

    if (!createRes.ok) {
      const errBody = await createRes.text()
      if (createRes.status === 409 || errBody.toLowerCase().includes('already exist')) {
        this.log(win, 'SSH key already exists on Scaleway.', 'info', 30)
        return
      }
      const formatted = this.formatScalewayError(createRes.status, errBody, 'Adding IAM SSH key')
      this.log(win, formatted, 'error')
      throw new Error(formatted)
    }

    this.log(win, 'SSH key successfully added to your Scaleway account.', 'info', 30)
  }

  /**
   * Fetch every page of a Scaleway listing whose results are a map keyed by
   * commercial type (`/products/servers`, `/products/servers/availability`),
   * stopping as soon as `wanted` is found.
   */
  private async fetchServerMap<T>(url: string, secretKey: string, wanted: string): Promise<Record<string, T> | null> {
    const merged: Record<string, T> = {}
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}per_page=100&page=${page}`, {
        headers: { 'X-Auth-Token': secretKey, 'Content-Type': 'application/json' },
      })
      if (!res.ok) return null
      const data = await res.json()
      const servers: Record<string, T> = data.servers || {}
      Object.assign(merged, servers)
      const total = Number(res.headers.get('x-total-count') || 0)
      const keys = Object.keys(servers)
      if (wanted in merged || keys.length === 0 || (total > 0 && Object.keys(merged).length >= total)) break
    }
    return merged
  }

  /**
   * Whether the zone sells this type, and whether it has any in stock. A
   * missing type or a shortage is reported before anything is created, with
   * the profile named, rather than as a 400 halfway through the run.
   */
  private async lookupOffer(zone: string, commercialType: string, secretKey: string): Promise<OfferLookup> {
    try {
      const base = `https://api.scaleway.com/instance/v1/zones/${encodeURIComponent(zone)}/products/servers`
      const offers = await this.fetchServerMap<ServerOffer>(base, secretKey, commercialType)
      if (!offers) return { checked: false }
      const availability = await this.fetchServerMap<{ availability?: string }>(`${base}/availability`, secretKey, commercialType).catch(() => null)
      return {
        checked: true,
        offer: offers[commercialType],
        availability: availability?.[commercialType]?.availability,
      }
    } catch {
      return { checked: false }
    }
  }

  /**
   * Resolve the Ubuntu 24.04 image for the given zone and commercial type,
   * with its flavour — which decides the root volume type.
   */
  private async resolveUbuntuNobleImage(zone: string, commercialType: string): Promise<{ id: string; type?: string }> {
    const fallback = { id: '91cb8918-98c0-46ed-8c80-02cbd00b6a66', type: 'instance_local' } // fr-par-1 instance_local x86_64
    try {
      const res = await fetch(`https://api.scaleway.com/marketplace/v2/local-images?image_label=ubuntu_noble&zone=${encodeURIComponent(zone)}&per_page=100`)
      if (res.ok) {
        const data = await res.json()
        const images: LocalImage[] = data.local_images || []
        const compatible = images.filter(img =>
          Array.isArray(img.compatible_commercial_types) && img.compatible_commercial_types.includes(commercialType)
        )
        // Local storage first where the type takes it: it comes with the
        // instance, where a block volume is billed on top.
        const matched = compatible.find(img => img.type === 'instance_local') ?? compatible[0]
        if (matched?.id) return { id: matched.id, type: matched.type }

        const matchedLocal = images.find(img => img.zone === zone && img.arch === 'x86_64' && img.type === 'instance_local')
        if (matchedLocal?.id) return { id: matchedLocal.id, type: matchedLocal.type }
      }
    } catch {
      // fallback
    }
    return fallback
  }

  /**
   * Main method: creates an instance, powers it on, and retrieves the public IPv4
   */
  public async createInstance(options: ScalewayCreateOptions, win: BrowserWindow | null): Promise<{ ipv4: string; serverId: string; zone: string }> {
    this.isCancelled = false
    const zone = options.zone || 'fr-par-1'
    const commercialType = options.commercialType || 'DEV1-M'

    this.log(win, `Starting automated Scaleway configuration (Zone: ${zone})...`, 'running', 5)

    try {
      // 1. Ensure SSH key is uploaded
      await this.ensureSshKey(options, win)
      if (this.isCancelled) throw new Error('Operation cancelled by user')

      // 2. Check the type is sold, and in stock, in this zone
      this.log(win, `Checking ${commercialType} availability in ${zone}...`, 'running', 32)
      const lookup = await this.lookupOffer(zone, commercialType, options.secretKey)
      // Logged here: the catch below only logs messages not already tagged [ERROR].
      const offerError =
        lookup.checked && !lookup.offer
          ? `[ERROR] Instance type ${commercialType} is not offered in zone ${zone}. Choose another sizing profile.`
          : lookup.availability === 'shortage'
            ? `[ERROR] Instance type ${commercialType} is currently out of stock in zone ${zone}. Choose another sizing profile or retry later.`
            : null
      if (offerError) {
        this.log(win, offerError, 'error')
        throw new Error(offerError)
      }
      if (lookup.offer) {
        const ramGb = lookup.offer.ram ? Math.round(lookup.offer.ram / 1024 ** 3) : undefined
        // `monthly_price` comes back as 0 for some types: the hourly rate over
        // a 730-hour month is the figure that holds, and no figure beats a 0.
        const monthly = lookup.offer.monthly_price || (lookup.offer.hourly_price ?? 0) * 730
        const price = monthly > 0 ? ` — ~${monthly.toFixed(2)} €/month` : ''
        const stock = lookup.availability === 'scarce' ? ' (limited stock)' : ''
        this.log(win, `${commercialType}: ${lookup.offer.ncpus ?? '?'} vCPU / ${ramGb ?? '?'} GB RAM${price}${stock}.`, 'info', 34)
      } else {
        this.log(win, 'Could not read the Scaleway offer list — continuing without checking it.', 'info', 34)
      }
      if (this.isCancelled) throw new Error('Operation cancelled by user')

      // 3. Resolve image
      this.log(win, 'Looking up Ubuntu 24.04 LTS (Noble Numbat) system image...', 'running', 35)
      const image = await this.resolveUbuntuNobleImage(zone, commercialType)
      this.log(win, `Ubuntu 24.04 image identified: ${image.id}${image.type ? ` (${image.type})` : ''}`, 'info', 40)
      const rootVolume = rootVolumeFor(image.type, options.rootVolumeGb, lookup.offer?.volumes_constraint)

      // 4. Create server
      const volumeNote = rootVolume
        ? `, ${Math.round(rootVolume.size / 1e9)} GB ${rootVolume.volume_type === 'sbs_volume' ? 'block' : 'local'} storage`
        : ''
      this.log(win, `Creating instance (${commercialType}${volumeNote})...`, 'running', 45)

      const createPayload = {
        name: `intriqathon-${Date.now().toString().slice(-4)}`,
        project: options.projectId,
        commercial_type: commercialType,
        image: image.id,
        dynamic_ip_required: true,
        ...(rootVolume ? { volumes: { '0': rootVolume } } : {}),
      }

      let serverRes: Response
      try {
        serverRes = await fetch(`https://api.scaleway.com/instance/v1/zones/${zone}/servers`, {
          method: 'POST',
          headers: {
            'X-Auth-Token': options.secretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createPayload),
        })
      } catch (netErr: any) {
        const msg = `[NETWORK ERROR] Unable to contact Scaleway Instances API: ${netErr.message || String(netErr)}`
        this.log(win, msg, 'error')
        throw new Error(msg)
      }

      if (!serverRes.ok) {
        const errBody = await serverRes.text()
        const formatted = this.formatScalewayError(serverRes.status, errBody, `Creating server (${commercialType})`)
        this.log(win, formatted, 'error')
        throw new Error(formatted)
      }

      const serverData = await serverRes.json()
      const server = serverData.server
      const serverId = server.id

      this.log(win, `Instance created successfully (ID: ${serverId}, Name: ${server.name}).`, 'info', 55)

      // 5. Power on server
      this.log(win, 'Starting (poweron) instance...', 'running', 60)

      let actionRes: Response | null = null
      try {
        actionRes = await fetch(`https://api.scaleway.com/instance/v1/zones/${zone}/servers/${serverId}/action`, {
          method: 'POST',
          headers: {
            'X-Auth-Token': options.secretKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'poweron' }),
        })
      } catch (netErr: any) {
        this.log(win, `Poweron network warning: ${netErr.message || String(netErr)}`, 'info', 62)
      }

      if (actionRes && !actionRes.ok) {
        const errBody = await actionRes.text()
        this.log(win, `Startup notification: ${errBody}`, 'info', 65)
      }

      // 6. Poll for server status 'running' and IP
      this.log(win, 'Waiting for initialization and allocation of public IPv4...', 'running', 70)

      let ipv4 = server.public_ip?.address || ''
      let isRunning = server.state === 'running'
      let attempts = 0
      const maxAttempts = 60 // ~3 minutes

      while ((!isRunning || !ipv4) && attempts < maxAttempts) {
        if (this.isCancelled) {
          throw new Error('Operation cancelled by user')
        }

        await new Promise(r => setTimeout(r, 3000))
        attempts++

        try {
          const pollRes = await fetch(`https://api.scaleway.com/instance/v1/zones/${zone}/servers/${serverId}`, {
            headers: {
              'X-Auth-Token': options.secretKey,
              'Content-Type': 'application/json',
            },
          })

          if (pollRes.ok) {
            const pollData = await pollRes.json()
            const currentServer = pollData.server
            isRunning = currentServer.state === 'running'
            ipv4 = currentServer.public_ip?.address || ipv4

            const currentProgress = Math.min(70 + Math.floor((attempts / maxAttempts) * 25), 95)
            this.log(win, `Instance status: ${currentServer.state} (IP: ${ipv4 || 'allocation in progress'})...`, 'running', currentProgress)
          }
        } catch {
          // Poll retry
        }
      }

      if (!ipv4) {
        const msg = '[ERROR] Instance started but no public IPv4 was assigned after 3 minutes.'
        this.log(win, msg, 'error')
        throw new Error(msg)
      }

      this.log(win, `✓ Instance operational! Public IPv4 allocated: ${ipv4}`, 'done', 100)
      return { ipv4, serverId, zone }
    } catch (err: any) {
      const msg = err.message || String(err)
      if (!msg.startsWith('[ERROR') && !msg.startsWith('[ERREUR')) {
        this.log(win, `[ERROR] ${msg}`, 'error')
      }
      throw err
    }
  }
}
