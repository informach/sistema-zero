import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Playground LOCAL da oficina de cenários (não é deployado). Roda sem servidor nenhum: os
// dados ficam em memória. Para a demonstração ter modelos de verdade, serve os GLBs do acervo
// local (`output/molda-cenarios/acervo`, fora do Git), quando a pasta existe nesta máquina.
const aqui = import.meta.dirname
const ACERVO = resolve(aqui, '../../../../output/molda-cenarios/acervo')

function acervoLocal(): Plugin {
  return {
    name: 'sz-acervo-local',
    configureServer(servidor) {
      servidor.middlewares.use('/acervo', (pedido, resposta, seguir) => {
        const nome = decodeURIComponent((pedido.url ?? '/').split('?')[0]!.slice(1))
        if (nome === 'lista.json') {
          const arquivos = existsSync(ACERVO)
            ? readdirSync(ACERVO).filter((arquivo) => arquivo.endsWith('.glb'))
            : []
          resposta.setHeader('content-type', 'application/json')
          resposta.end(JSON.stringify(arquivos))
          return
        }
        // Só nomes simples de arquivo .glb: nada de subir de pasta.
        if (!/^[\w.-]+\.glb$/.test(nome)) return seguir()
        const caminho = resolve(ACERVO, nome)
        if (!existsSync(caminho)) return seguir()
        resposta.setHeader('content-type', 'model/gltf-binary')
        resposta.setHeader('content-length', String(statSync(caminho).size))
        createReadStream(caminho).pipe(resposta)
      })
    },
  }
}

export default defineConfig({
  root: aqui,
  plugins: [react(), tailwindcss(), acervoLocal()],
  server: { host: '127.0.0.1', port: 4541, strictPort: true },
  optimizeDeps: {
    // Os ensaios importam o compilador por URLs calculadas no navegador. O scanner não
    // enxerga essas URLs no HTML; uma descoberta tardia pode recarregar a página em uso.
    entries: [
      'index.html',
      // O gerador do jogo E importa este módulo por `import('/qa-jogo-e.ts')`; sem ele aqui, o
      // exportador GLTF do three era descoberto tarde e, num servidor sem cache (o CI), o Vite
      // respondia 504 ao import dinâmico.
      'qa-jogo-e.ts',
      '../../../molda-cenarios-core/src/compilar/index.ts',
      '../../../molda-cenarios-motor/src/compilar/index.ts',
      '../../../molda-cenarios-motor/src/teste/colisoes.ts',
    ],
    exclude: [
      '@sistemazero/molda',
      '@sistemazero/molda-cenarios-core',
      '@sistemazero/molda-cenarios-motor',
    ],
  },
})
