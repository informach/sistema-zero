import { CATEGORY_COLORS, categoryShades } from '../theme'
import type { BlockDefinition } from './types'

/**
 * Categoria 🔊 Som do NÚCLEO — tocar os arquivos de áudio que a criança enviou,
 * em qualquer projeto web/Canvas, sem depender de extensão de jogo.
 *
 * ⚠️ Existe porque o núcleo não tinha áudio NENHUM: nem bipe, nem arquivo. Dava
 * para enviar um mp3 no painel "Imagens e sons" e não havia bloco para usá-lo
 * fora do Jogo 2D/3D e do Mundo 3D. Relato da dona do produto (08/2026).
 *
 * O código gerado chama `window.__szAudio` (ver `preview/audioBridge.ts`), que é
 * instalado em todo projeto pelo bootstrap do preview e escrito como
 * `public/sz-audio.js` no export. Os rótulos são IGUAIS aos do Jogo 2D, do Jogo
 * 3D e do Mundo 3D de propósito: é o mesmo gesto em todo lugar.
 */

const C = CATEGORY_COLORS.som

export const SOM_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_som_load',
    // Carregar não toca nada: prepara o arquivo e por isso não precisa de gesto.
    placement: 'start-only-command',
    message0: 'Carregar o som %1 do arquivo %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'moeda' },
      { type: 'field_asset_picker', name: 'ASSET', text: '', kind: 'audio' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Prepara um som do projeto (envie o arquivo com o botão "Enviar som", em "Imagens e sons") e dá um apelido a ele. Depois use "Tocar o som" com esse apelido. Faça no começo.',
  },
  {
    type: 'sz_som_play',
    placement: 'command',
    message0: 'Tocar o som %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'moeda', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Toca um som que você carregou, pelo apelido. Use quando algo acontecer.',
  },
  {
    type: 'sz_som_stop',
    placement: 'command',
    message0: 'Parar o som %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'moeda', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Para o som e volta ele para o começo.',
  },
  {
    type: 'sz_som_play_music',
    // `resource-creator`: dentro de um laço a faixa recomeçaria a cada quadro.
    placement: 'resource-creator',
    message0: 'Tocar a música %1 sem parar',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'musica', kind: 'sound' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Toca uma música sua de novo e de novo, sem parar. Só uma toca por vez: começar outra troca a que estava tocando. Repetir a mesma não recomeça do início.',
  },
  {
    type: 'sz_som_stop_music',
    placement: 'command',
    message0: 'Parar a música',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Desliga a música que estava tocando.',
  },
  {
    type: 'sz_som_volume',
    placement: 'command',
    message0: 'Pôr o volume em %1',
    args0: [{ type: 'input_value', name: 'LEVEL', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Volume de 0 (mudo) a 10 (bem alto). Vale para todos os sons do projeto.',
  },
]

export const SOM_GROUPS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🔊 Tocar',
    colour: C,
    types: ['sz_som_load', 'sz_som_play', 'sz_som_stop'],
  },
  {
    name: '🎵 Música e volume',
    colour: C,
    types: ['sz_som_play_music', 'sz_som_stop_music', 'sz_som_volume'],
  },
]

// IDENTIDADE: cada sub-grupo recebe um TOM da cor base da categoria, derivado
// claro→escuro (categoryShades) — os literais acima são placeholders.
const SOM_SHADES = categoryShades(CATEGORY_COLORS.som, SOM_GROUPS.length)
SOM_GROUPS.forEach((g, i) => {
  g.colour = SOM_SHADES[i] ?? CATEGORY_COLORS.som
})
const SOM_COLOUR_BY_TYPE = new Map<string, string>(
  SOM_GROUPS.flatMap((g) => g.types.map((t) => [t, g.colour] as const)),
)
for (const b of SOM_BLOCKS) {
  const colour = SOM_COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}
