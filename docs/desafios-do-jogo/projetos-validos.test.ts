import { expect, test } from 'bun:test'
import { ManifestoDeDesafiosSchema } from '../../packages/arquipelago-contracts/src/desafios'
import { projectBlockTypes } from '../../packages/studio/src/core/projectDocumentGuards'

// O schema do manifesto não inspeciona o documento do Estúdio. A importação Blockly
// pode normalizar IDs repetidos, mas a análise do Members precisa recusar o documento.
for (const pasta of ['bosque', 'vila-doce', 'recife', 'pico', 'vale', 'nuvens'])
  for (const publico of ['kids', 'adulto']) {
    const manifesto = ManifestoDeDesafiosSchema.parse(
      await Bun.file(
        new URL(
          `./${pasta}/${pasta}${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
          import.meta.url,
        ),
      ).json(),
    )
    for (const desafio of manifesto.desafios)
      test(`${desafio.slug}: inicial e gabarito são documentos aceitos pelo leitor do Members`, () => {
        for (const nome of ['projetoInicial', 'gabarito'] as const) {
          const projeto = desafio.conteudo[nome] as { blocksState: unknown }
          expect(projectBlockTypes(projeto.blocksState).length, nome).toBeGreaterThan(0)
        }
      })
  }
