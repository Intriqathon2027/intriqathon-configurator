import type { BrowserWindow } from 'electron'

export interface ScalewayCreateOptions {
  secretKey: string
  projectId: string
  sshPublicKey: string
  sshKeyName?: string
  zone?: string
  commercialType?: string
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
   * Resolve Ubuntu 24.04 local image ID for the given zone and commercial type
   */
  private async resolveUbuntuNobleImage(zone: string, commercialType: string = 'DEV1-M'): Promise<string> {
    const fallbackImageId = '91cb8918-98c0-46ed-8c80-02cbd00b6a66' // fr-par-1 instance_local x86_64
    try {
      const res = await fetch(`https://api.scaleway.com/marketplace/v2/local-images?image_label=ubuntu_noble&zone=${encodeURIComponent(zone)}&per_page=100`)
      if (res.ok) {
        const data = await res.json()
        const images = data.local_images || []
        const matched = images.find((img: any) =>
          Array.isArray(img.compatible_commercial_types) && img.compatible_commercial_types.includes(commercialType)
        )
        if (matched?.id) return matched.id

        const matchedLocal = images.find((img: any) => img.zone === zone && img.arch === 'x86_64' && img.type === 'instance_local')
        if (matchedLocal?.id) return matchedLocal.id
      }
    } catch {
      // fallback
    }
    return fallbackImageId
  }

  /**
   * Main method: creates an instance, powers it on, and retrieves the public IPv4
   */
  public async createInstance(options: ScalewayCreateOptions, win: BrowserWindow | null): Promise<{ ipv4: string; serverId: string }> {
    this.isCancelled = false
    const zone = options.zone || 'fr-par-1'
    const commercialType = options.commercialType || 'DEV1-M'

    this.log(win, `Starting automated Scaleway configuration (Zone: ${zone})...`, 'running', 5)

    try {
      // 1. Ensure SSH key is uploaded
      await this.ensureSshKey(options, win)
      if (this.isCancelled) throw new Error('Operation cancelled by user')

      // 2. Resolve image
      this.log(win, 'Looking up Ubuntu 24.04 LTS (Noble Numbat) system image...', 'running', 35)
      const imageId = await this.resolveUbuntuNobleImage(zone, commercialType)
      this.log(win, `Ubuntu 24.04 image identified: ${imageId}`, 'info', 40)

      // 3. Create server
      this.log(win, `Creating instance (${commercialType})...`, 'running', 45)

      const createPayload = {
        name: `intriqathon-${Date.now().toString().slice(-4)}`,
        project: options.projectId,
        commercial_type: commercialType,
        image: imageId,
        dynamic_ip_required: true,
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

      // 4. Power on server
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

      // 5. Poll for server status 'running' and IP
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
      return { ipv4, serverId }
    } catch (err: any) {
      const msg = err.message || String(err)
      if (!msg.startsWith('[ERROR') && !msg.startsWith('[ERREUR')) {
        this.log(win, `[ERROR] ${msg}`, 'error')
      }
      throw err
    }
  }
}
