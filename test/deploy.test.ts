import { describe, it, expect } from 'vitest'
import { generateEnvContent, generateBashScript, generateBatScript, platformLabel, scriptExt } from '../src/utils/deploy'

describe('Deploy Utils', () => {
  const dummyConfig = {
    DOMAIN: 'test.example.com',
    SUPABASE_URL: 'https://xyz.supabase.co',
    SUPABASE_ANON_KEY: 'anon_123',
    SUPABASE_SERVICE_ROLE_KEY: 'role_456',
    DATABASE_URL: 'postgres://db',
    DIRECT_URL: 'postgres://direct',
    S3_ACCESS_KEY_ID: 's3_id',
    S3_SECRET_ACCESS_KEY: 's3_secret',
    DISCORD_CLIENT_ID: 'disc_id',
    OAUTH2_DISCORD_CLIENT_SECRET: 'disc_sec',
    GITHUB_CLIENT_ID: 'gh_id',
    OAUTH2_GITHUB_CLIENT_SECRET: 'gh_sec',
    RESEND_API_KEY: 're_123',
    FROM_EMAIL: 'team@test.example.com',
    ALLOWED_EMAILS: '*',
    CLIENT_ID: 'bot_client',
    BOT_TOKEN: 'bot_token_secret',
    DEV_SERVER_ID: 'dev_server',
    GUILD_ID: 'guild_123',
  }

  it('should generate proper .env content with all secret keys', () => {
    const env = generateEnvContent(dummyConfig)
    expect(env).toContain('DOMAIN=test.example.com')
    expect(env).toContain('SUPABASE_ANON_KEY=anon_123')
    expect(env).toContain('BOT_TOKEN=bot_token_secret')
    expect(env).toContain('RESEND_API_KEY=re_123')
  })

  it('should generate bash script containing deploy commands and environment', () => {
    const env = generateEnvContent(dummyConfig)
    const script = generateBashScript('/var/deploy', '192.168.1.100', env)

    expect(script).toContain('#!/usr/bin/env bash')
    expect(script).toContain('DEPLOY_PATH="/var/deploy"')
    expect(script).toContain('IPV4="192.168.1.100"')
    expect(script).toContain('BOT_TOKEN=bot_token_secret')
    expect(script).toContain('rsync -avz')
  })

  it('should generate bat script for Windows environment', () => {
    const env = generateEnvContent(dummyConfig)
    const bat = generateBatScript('C:\\deploy', '192.168.1.100', env)

    expect(bat).toContain('@echo off')
    expect(bat).toContain('set DEPLOY_PATH=C:\\deploy')
    expect(bat).toContain('set IPV4=192.168.1.100')
    expect(bat).toContain('scp')
  })

  it('should return correct platform labels and script extensions', () => {
    expect(platformLabel('darwin').label).toBe('macOS')
    expect(scriptExt('darwin')).toBe('.sh')

    expect(platformLabel('win32').label).toBe('Windows')
    expect(scriptExt('win32')).toBe('.bat')

    expect(platformLabel('linux').label).toBe('Linux')
    expect(scriptExt('linux')).toBe('.sh')
  })
})
