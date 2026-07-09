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

  // Common
  'nav.saveAndNext': string
  'nav.previous': string
  'nav.step': string
  'nav.of': string
  'btn.copy': string
  'btn.copied': string
  'btn.openLink': string
  'btn.browse': string
  'btn.download': string
  'btn.downloadEnv': string
  'help.title': string
  'lang.fr': string
  'lang.en': string
  'app.title': string
  'app.subtitle': string
  'settings.title': string
  'settings.import': string
  'settings.export': string
  'settings.reset': string
  'settings.reset.confirm': string
  'toast.saved': string
  'toast.imported': string
  'toast.reset': string

  // Steps labels
  'step1.label': string
  'step2.label': string
  'step3.label': string
  'step4.label': string
  'step5.label': string
  'step6.label': string
  'step7.label': string
  'step8.label': string

  // Step 1
  'step1.title': string
  'step1.desc': string
  'step1.help.toast': string
  'step1.domain': string
  'step1.domain.hint': string
  'step1.domain.placeholder': string
  'step1.deployPath': string
  'step1.deployPath.hint': string
  'step1.deployPath.placeholder': string
  'step1.ipv4': string
  'step1.ipv4.hint': string
  'step1.ipv4.placeholder': string
  'step1.scaleway': string
  'step1.specs.title': string
  'step1.spec.cpu': string
  'step1.spec.ram': string
  'step1.spec.os': string
  'step1.spec.storage': string
  'step1.ssh.info': string

  // Step 2
  'step2.title': string
  'step2.desc': string
  'step2.supabase': string
  'step2.section.credentials': string
  'step2.supabaseUrl': string
  'step2.supabaseUrl.hint': string
  'step2.supabaseAnonKey': string
  'step2.supabaseAnonKey.hint': string
  'step2.supabaseServiceKey': string
  'step2.supabaseServiceKey.hint': string
  'step2.section.database': string
  'step2.databaseUrl': string
  'step2.databaseUrl.hint': string
  'step2.directUrl': string
  'step2.directUrl.hint': string
  'step2.section.s3': string
  'step2.s3AccessKey': string
  'step2.s3SecretKey': string

  // Step 3
  'step3.title': string
  'step3.desc': string
  'step3.section.discord': string
  'step3.discord.btn': string
  'step3.discord.callback': string
  'step3.discordClientId': string
  'step3.discordSecret': string
  'step3.section.github': string
  'step3.github.btn': string
  'step3.github.homepage': string
  'step3.github.callback': string
  'step3.githubClientId': string
  'step3.githubSecret': string

  // Step 4
  'step4.title': string
  'step4.desc': string
  'step4.resend.btn': string
  'step4.subdomain': string
  'step4.dns.title': string
  'step4.dns.type': string
  'step4.dns.host': string
  'step4.dns.answer': string
  'step4.dns.ttl': string
  'step4.resendKey': string
  'step4.fromEmail': string
  'step4.fromEmail.hint': string
  'step4.allowedEmails': string
  'step4.allowedEmails.hint': string
  'step4.warning': string

  // Step 5
  'step5.title': string
  'step5.desc': string
  'step5.discord.btn': string
  'step5.clientId': string
  'step5.clientId.hint': string
  'step5.botToken': string
  'step5.botToken.hint': string
  'step5.devServerId': string
  'step5.devServerId.hint': string
  'step5.guildId': string
  'step5.guildId.hint': string

  // Step 6
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

  // Step 7
  'step7.title': string
  'step7.desc': string
  'step7.sql.title': string
  'step7.realtime.title': string
  'step7.realtime.desc': string
  'step7.dataApi.title': string
  'step7.dataApi.desc': string
  'step7.auth.title': string
  'step7.auth.desc': string
  'step7.docker.title': string
  'step7.docker.desc': string

  // Step 8
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
