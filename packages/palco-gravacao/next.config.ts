import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

/**
 * O palco de gravação monta a aula com o código do Kids (o alias `@/` aponta para
 * `packages/community-kids/src`): a mesma configuração de pacotes, de Three.js e de segurança,
 * sem a rota Pro, a Área dos Pais nem o Arquipélago, que não existem aqui.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.join(here, '..', '..')
const kidsDir = path.join(here, '..', 'community-kids')
// Uma cópia só do Three.js no bundle, a do Kids, como no próprio Kids.
const threePackageRoot = path.dirname(
  path.dirname(createRequire(path.join(kidsDir, 'package.json')).resolve('three')),
)
const isDev = process.env.NODE_ENV !== 'production'

/** A mesma CSP estrita das aulas do Kids (ver `community-kids/next.config.ts`). */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "frame-src 'self' blob: https://www.youtube-nocookie.com https://player.vimeo.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "media-src 'self' blob: data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  `script-src 'self' 'unsafe-inline' data: https: 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const nextConfig: NextConfig = {
  deploymentId: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  serverExternalPackages: ['sharp'],
  transpilePackages: [
    '@sistemazero/ui',
    '@sistemazero/member-shell',
    '@sistemazero/arquipelago-contracts',
    '@sistemazero/avatar-quarto',
    '@sistemazero/studio',
    '@sistemazero/pensa',
    '@sistemazero/pinta',
    '@sistemazero/molda',
    'three',
  ],
  turbopack: {
    root: monorepoRoot,
    resolveAlias: { three: '../community-kids/node_modules/three' },
  },
  webpack(config) {
    config.resolve.alias = { ...config.resolve.alias, three: threePackageRoot }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          ...(isDev
            ? []
            : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
        ],
      },
    ]
  },
}

export default nextConfig
