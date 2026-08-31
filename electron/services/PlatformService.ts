export const PlatformService = {
  getPlatform(): NodeJS.Platform {
    return process.platform
  },
  isWindows(): boolean {
    return process.platform === 'win32'
  },
}
