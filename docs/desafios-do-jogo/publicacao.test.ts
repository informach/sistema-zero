import { expect, test } from 'bun:test'
import { inventarioDeRepertorio } from './repertorio-local'

/**
 * C01b (30/10/2026): só pede publicação automática a atividade com todas as fontes na trilha e
 * sem bloco manual. A barreira C01a confere de novo no serviço, com o repertório do Members.
 */
/**
 * A43 (decisão da dona, 31/10/2026): o Vale e as Nuvens publicam como estão, porque os cursos do
 * Arquiteto e do Gênio que ensinam esses blocos chegam antes do lançamento oficial. A lista diz
 * exatamente o que cada um espera; um bloco novo sem fonte reprova (não se esconde aqui). A
 * barreira C01a do serviço continua conferindo na importação, com o repertório do Members.
 */
const GRUPO_E_LISTA = ['sz_g2d_add_to_group', 'sz_g2d_for_each_in_group']
const PROTEJA_OS_NINHOS = [
  ...GRUPO_E_LISTA,
  'sz_g2d_on_group_click',
  'sz_g2d_set_opacity',
  'sz_g2d_set_sprite_data',
  'sz_g2d_sprite_data',
  'sz_val_logic',
]
const ESPERAM_OS_CURSOS: Record<string, string[]> = {
  'vale-contagem-da-lista': [...GRUPO_E_LISTA, 'sz_g2d_set_opacity'],
  'vale-cinza-retirada': [...GRUPO_E_LISTA, 'sz_g2d_set_opacity'],
  'vale-proteja-os-ninhos': PROTEJA_OS_NINHOS,
  'vale-proteja-os-ninhos-ondas': PROTEJA_OS_NINHOS,
  'vale-proteja-os-ninhos-pontos': PROTEJA_OS_NINHOS,
  'vale-proteja-os-ninhos-lista': PROTEJA_OS_NINHOS,
  'nuvens-colheita-da-lista': GRUPO_E_LISTA,
}

test('publicação pedida só com todas as fontes na trilha, ou esperando os cursos registrados', () => {
  for (const d of inventarioDeRepertorio()) {
    if (!d.publicarAutomaticamente) continue
    const nome = `${d.publico}/${d.ilha}/${d.titulo}`
    const espera = ESPERAM_OS_CURSOS[d.slug.replace(/-adulto$/, '')] ?? []
    expect([nome, [...d.semFonteNaTrilha].sort()]).toEqual([nome, [...espera].sort()])
  }
})
