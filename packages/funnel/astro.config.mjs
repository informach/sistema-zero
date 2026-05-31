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
  adapter: node({ mode: 'standalone' }),
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
  },
  server: { port: 4321, host: true },
})
