export type Language = 'fr' | 'en'

export type TranslationKeys = {
  // Landing
  'landing.title': string
  'landing.subtitle': string
  'landing.team': string
  'landing.btn.new': string
  'landing.btn.resume': string
  'landing.btn.import': string
  'landing.prompt.title': string
  'landing.prompt.desc': string
  'landing.prompt.export': string
  'landing.prompt.discard': string
  'landing.prompt.cancel': string
  'landing.recent.title': string
  'landing.recent.launch': string
  'landing.recent.empty': string
  'landing.recent.remove': string
  'landing.recent.notFound': string

  // Common
  'nav.saveAndNext': string
  'nav.previous': string
  'nav.step': string
  'nav.of': string
  'btn.copy': string
  'btn.copied': string
  'btn.openLink': string
  'btn.learnMore': string
  'btn.browse': string
  'btn.download': string
  'btn.downloadEnv': string
  'help.title': string
  'help.flow.open': string
  'lang.fr': string
  'lang.en': string
  'app.title': string
  'app.subtitle': string
  'settings.title': string
  'settings.theme': string
  'settings.textSize': string
  'settings.textSize.reset': string
  'settings.theme.light': string
  'settings.theme.system': string
  'settings.theme.dark': string
  'settings.import': string
  'settings.export': string
  'settings.reset': string
  'settings.reset.confirm': string
  'toast.saved': string
  'toast.imported': string
  'toast.reset': string

  // Steps labels (5 steps)
  'step1.label': string
  'step2.label': string
  'step3.label': string
  'step4.label': string
  'step5.label': string

  // =============================================
  // Account Creation (Step 1)
  // =============================================
  'accountCreation.title': string
  'accountCreation.desc': string
  'accountCreation.help.toast': string

  // Supabase
  'accountCreation.supabase.title': string
  'accountCreation.supabase.pat': string
  'accountCreation.supabase.pat.path': string
  'accountCreation.supabase.pat.hint': string
  'accountCreation.supabase.s3AccessKey': string
  'accountCreation.supabase.s3AccessKey.path': string
  'accountCreation.supabase.s3AccessKey.hint': string
  'accountCreation.supabase.s3SecretKey': string
  'accountCreation.supabase.s3SecretKey.path': string
  'accountCreation.supabase.s3SecretKey.hint': string

  // Resend
  'accountCreation.resend.title': string
  'accountCreation.resend.apiKey': string
  'accountCreation.resend.apiKey.path': string
  'accountCreation.resend.apiKey.hint': string

  // Spaceship
  'accountCreation.spaceship.title': string
  'accountCreation.spaceship.domain': string
  'accountCreation.spaceship.domain.hint': string
  'accountCreation.spaceship.domain.placeholder': string
  'accountCreation.spaceship.apiKey': string
  'accountCreation.spaceship.apiKey.path': string
  'accountCreation.spaceship.apiKey.hint': string
  'accountCreation.spaceship.apiSecret': string
  'accountCreation.spaceship.apiSecret.path': string
  'accountCreation.spaceship.apiSecret.hint': string

  // Scaleway
  'accountCreation.scaleway.title': string
  'accountCreation.scaleway.secretKey': string
  'accountCreation.scaleway.secretKey.path': string
  'accountCreation.scaleway.secretKey.hint': string
  'accountCreation.scaleway.projectId': string
  'accountCreation.scaleway.projectId.path': string
  'accountCreation.scaleway.projectId.hint': string
  'accountCreation.scaleway.deployPath': string
  'accountCreation.scaleway.deployPath.hint': string
  'accountCreation.scaleway.deployPath.placeholder': string

  // =============================================
  // API Configuration (Step 2)
  // =============================================
  'apiConfig.title': string
  'apiConfig.desc': string
  'apiConfig.btnStart': string
  'apiConfig.btnCancel': string
  'apiConfig.status.done': string
  'apiConfig.status.running': string
  'apiConfig.status.error': string
  'apiConfig.manualConfig': string

  // Supabase API config
  'apiConfig.supabase.desc': string
  'apiConfig.supabase.helpHint': string
  'apiConfig.supabase.url': string
  'apiConfig.supabase.url.path': string
  'apiConfig.supabase.url.hint': string
  'apiConfig.supabase.anonKey': string
  'apiConfig.supabase.anonKey.path': string
  'apiConfig.supabase.anonKey.hint': string
  'apiConfig.supabase.serviceKey': string
  'apiConfig.supabase.serviceKey.path': string
  'apiConfig.supabase.serviceKey.hint': string
  'apiConfig.supabase.databaseUrl': string
  'apiConfig.supabase.databaseUrl.path': string
  'apiConfig.supabase.databaseUrl.hint': string
  'apiConfig.supabase.directUrl': string
  'apiConfig.supabase.directUrl.path': string
  'apiConfig.supabase.directUrl.hint': string
  'apiConfig.supabase.fromEmail': string
  'apiConfig.supabase.fromEmail.hint': string
  'apiConfig.supabase.allowedEmails': string
  'apiConfig.supabase.allowedEmails.hint': string

  // Spaceship API config
  'apiConfig.spaceship.desc': string
  'apiConfig.spaceship.helpHint': string
  'apiConfig.spaceship.ipv4': string
  'apiConfig.spaceship.ipv4.path': string
  'apiConfig.spaceship.ipv4.hint': string

  // Scaleway API config
  'apiConfig.scaleway.desc': string
  'apiConfig.scaleway.helpHint': string

  // Resend API config
  'apiConfig.resend.desc': string
  'apiConfig.resend.helpHint': string

  // =============================================
  // Step 3 — OAuth2 + Discord Bot
  // =============================================
  'step4.dns.title': string
  'step4.dns.type': string
  'step4.dns.host': string
  'step4.dns.answer': string
  'step4.dns.ttl': string
  'step4.subdomain': string
  'step4.warning': string
  'step1.specs.title': string
  'step1.spec.cpu': string
  'step1.spec.ram': string
  'step1.spec.os': string
  'step1.spec.storage': string
  'step7.sql.title': string
  'step7.realtime.title': string
  'step7.realtime.desc': string
  'step7.dataApi.title': string
  'step7.dataApi.desc': string
  'step7.auth.title': string
  'step7.auth.desc': string
  'step7.docker.title': string
  'step7.docker.desc': string

  'step3.title': string
  'step3.desc': string
  'step3.section.discord': string
  'step3.discord.callback': string
  'step3.discordClientId': string
  'step3.discordClientId.path': string
  'step3.discordClientId.hint': string
  'step3.discordSecret': string
  'step3.discordSecret.path': string
  'step3.discordSecret.hint': string
  'step3.section.github': string
  'step3.github.homepage': string
  'step3.github.callback': string
  'step3.githubClientId': string
  'step3.githubClientId.path': string
  'step3.githubClientId.hint': string
  'step3.githubSecret': string
  'step3.githubSecret.path': string
  'step3.githubSecret.hint': string

  // Discord Bot (integrated into step3)
  'step3.section.bot': string
  'step3.botClientId': string
  'step3.botClientId.path': string
  'step3.botClientId.hint': string
  'step3.botToken': string
  'step3.botToken.path': string
  'step3.botToken.hint': string
  'step3.devServerId': string
  'step3.devServerId.path': string
  'step3.devServerId.hint': string
  'step3.guildId': string
  'step3.guildId.hint': string

  // =============================================
  // Step 6 — SSH Deploy (now step 4, keys kept as step6.*)
  // =============================================
  'step6.title': string
  'step6.desc': string
  'step6.tab.auto': string
  'step6.tab.manual': string
  'step6.preview': string
  'step6.commands.title': string
  'step6.cmd.cd': string
  'step6.cmd.rsync': string
  'step6.cmd.scp': string
  'step6.cmd.ssh': string
  'step6.cmd.cdRemote': string
  'step6.cmd.chmod': string
  'step6.cmd.install': string
  'step6.label.mac': string
  'step6.label.windows': string
  'step6.auto.title': string
  'step6.auto.deployPath': string
  'step6.auto.browse': string
  'step6.auto.pathLabel': string
  'step6.auto.btnStart': string
  'step6.auto.btnCancel': string
  'step6.auto.status.idle': string
  'step6.auto.status.running': string
  'step6.auto.status.completed': string
  'step6.auto.status.error': string
  'step6.auto.status.cancelled': string
  'step6.dialog.auth.title': string
  'step6.dialog.auth.username': string
  'step6.dialog.auth.password': string
  'step6.dialog.auth.submit': string
  'step6.dialog.confirm.title': string
  'step6.dialog.confirm.yes': string
  'step6.dialog.confirm.no': string
  'step6.dialog.choice.title': string
  'step6.dialog.choice.submit': string
  'step6.auto.info.title': string
  'step6.auto.info.desc': string
  'step6.auto.info.step1': string
  'step6.auto.info.step2': string
  'step6.auto.info.step3': string
  'step6.auto.info.step4': string

  // =============================================
  // Step 8 — Site Config (now step 5, keys kept as step8.*)
  // =============================================
  'step8.title': string
  'step8.desc': string
  'step8.config.btn': string
  'step8.site.btn': string
  'step8.tip': string
  'step8.tip2': string
}

export type Translations = {
  [K in Language]: TranslationKeys
}
