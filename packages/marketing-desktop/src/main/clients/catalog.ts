import type { Provider } from '../../shared/contracts'

export type ClientRelease = {
  provider: Provider
  version: string
  url: string
  bytes: number
  sha256: string
  archive: 'tar.gz' | 'binary'
  executable: string
}

// Curated together with the native protocol adapters. Integrity values come from the
// official release, not from renderer input or an unversioned download manifest.
export const clientReleases: Record<Provider, ClientRelease> = {
  codex: {
    provider: 'codex',
    version: '0.162.1',
    url: 'https://github.com/openai/codex/releases/download/rust-v0.162.1/codex-package-x86_64-pc-windows-msvc.tar.gz',
    bytes: 159746536,
    sha256: '3e993a82ff393f4530558dcaadb36bb4f0fd1ea7243e621348e40b469f900f6a',
    archive: 'tar.gz',
    executable: 'bin/codex.exe',
  },
  claude: {
    provider: 'claude',
    version: '2.1.299',
    url: 'https://downloads.claude.ai/claude-code-releases/2.1.299/win32-x64/claude.exe',
    bytes: 269231264,
    sha256: '295b49ec092f31a7de9c6ff286d9d8f120a4f029b9ad9a5ac0b12c35cbf4df2b',
    archive: 'binary',
    executable: 'claude.exe',
  },
}

export function supportsClientInstallation() {
  return process.platform === 'win32' && process.arch === 'x64'
}
