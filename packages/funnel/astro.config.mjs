import node from '@astrojs/node'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const site = process.env.FUNNEL_PUBLIC_URL ?? 'http://localhost:4321'

// Páginas de marketing são pré-renderizadas (estáticas, prontas p/ CDN); as rotas
// dinâmicas (resultado, checkout, admin, /api/*) optam por SSR via
// `export const prerender = false`. Por isso `output: 'server'` + adapter Node
// standalone (roda no Bun via `bun ./dist/server/entry.mjs`).
export default defineConfig({
  output: 'server',
  // bodySizeLimit: o default do adapter é 1GB (!) — um POST JSON gigante seria
  // bufferizado em memória. 64KB cobre com folga o maior corpo legítimo
  // (checkout de cartão ≈ 2KB); excedente falha no parse → 400 BAD_REQUEST.
  adapter: node({ mode: 'standalone', bodySizeLimit: 64 * 1024 }),
  site,
  integrations: [
    react(),
    sitemap({
      // Mantém no sitemap só as páginas indexáveis (exclui as noindex/privadas).
      filter: (page) =>
        !/\/(admin|checkout|resultado|quiz|obrigado|api)(\/|$)/.test(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Pré-bundla deps que só são alcançadas por ilhas lazy (client:idle) ou import
    // dinâmico — senão o Vite as descobre "tarde", re-otimiza no meio da sessão e
    // devolve 504 "Outdated Optimize Dep" no chunk em voo (a ilha não hidrata).
    // Ver o gotcha "504 (Outdated Optimize Dep)" no CLAUDE.md.
    optimizeDeps: {
      include: [
        'zod',
        'motion/react',
        'payment-token-efi',
        // Deps de terceiros do @sistemazero/ui (consumido pelas ilhas do /admin):
        // pré-bundla p/ não disparar o churn de "504 Outdated Optimize Dep".
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
      ],
    },
  },
  server: { port: 4321, host: true },
})
