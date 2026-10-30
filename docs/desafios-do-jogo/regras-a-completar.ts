import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ManifestoDeDesafiosSchema } from '../../packages/arquipelago-contracts/src/desafios'
import { blocosACompletar } from '../../packages/members/src/application/arquipelago/blocos-a-completar'
import { SERVER_BLOCK_CATALOG } from '../../packages/studio/src/blockly/blockCatalog'
import { ProjectDocumentError } from '../../packages/studio/src/core/projectDocument'
import { artefatoDeRepertorio } from './repertorio-local'

/** Ferramenta editorial local. Não lê cursos publicados nem dados de pessoas. */
export function relatorioDasRegras() {
  const inventario = artefatoDeRepertorio()
  const catalogo = new Map(SERVER_BLOCK_CATALOG.map((b) => [b.type, b]))
  return [...new Set(inventario.desafios.map((d) => d.ilha))].flatMap((ilha) =>
    (['kids', 'adulto'] as const).flatMap((publico) => {
      const pasta = ilha === 'vale-dos-dinos' ? 'vale' : ilha
      const arquivo = new URL(
        `./${pasta}/${pasta}${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      )
      const manifesto = ManifestoDeDesafiosSchema.parse(JSON.parse(readFileSync(arquivo, 'utf8')))
      return manifesto.desafios.map((d) => {
        const fonte = inventario.desafios.find((i) => i.slug === d.slug)!
        const inicial = d.conteudo.projetoInicial as { blocksState: unknown }
        const gabarito = d.conteudo.gabarito as { blocksState: unknown }
        let blocos: string[] | null = null
        let problema: string | null = null
        try {
          blocos = blocosACompletar(inicial.blocksState, gabarito.blocksState).filter((tipo) => {
            const b = catalogo.get(tipo)
            return b && b.contract.domain !== 'frame'
          })
        } catch (error) {
          if (!(error instanceof ProjectDocumentError)) throw error
          problema = error.message
        }
        return {
          slug: d.slug,
          publico,
          ilha,
          titulo: d.conteudo.titulo,
          problema,
          blocosDerivados: blocos,
          tiposJaPresentesMasAlterados:
            blocos?.filter((b) => fonte.tiposJaPresentes.includes(b)) ?? null,
          semFonteLocalNaTrilha:
            blocos?.filter(
              (bloco) =>
                !inventario.fontes.some(
                  (f) =>
                    f.posto <= fonte.posto &&
                    f.papel !== 'extra' &&
                    f.papel !== 'power' &&
                    f.blocos.includes(bloco),
                ),
            ) ?? null,
        }
      })
    }),
  )
}

if (import.meta.main) {
  const destino = new URL('./regras-a-completar.json', import.meta.url)
  await Bun.write(destino, `${JSON.stringify(relatorioDasRegras(), null, 2)}\n`)
  const child = Bun.spawn(['bunx', 'biome', 'format', '--write', fileURLToPath(destino)], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await child.exited) !== 0) throw Error('Não foi possível formatar o relatório de regras.')
}
