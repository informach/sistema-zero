import type { ExtensionExample } from '#extensions'
import { cssDeclarationsRecord, type JSStatement } from '#ir'

function isBeginnerPeriodicLoop(
  statement: JSStatement,
): statement is Extract<JSStatement, { type: 'g2d:everyFrames' | 'g2d:everySeconds' }> {
  return statement.type === 'g2d:everyFrames' || statement.type === 'g2d:everySeconds'
}

/**
 * Migra os exemplos antigos em que “A cada N” vivia dentro do quadro principal.
 * A cadência vira uma raiz própria; quando estava dentro de um `se`, o corpo
 * conserva essa condição (por exemplo, só criar asteroide durante “jogando”).
 */
function liftBeginnerPeriodicLoops(loops: JSStatement[]): JSStatement[] {
  const lifted: JSStatement[] = []
  const roots = loops.map((root) => {
    if (root.type !== 'g2d:updateEachFrame') return root
    const body = root.body.flatMap((statement): JSStatement[] => {
      if (isBeginnerPeriodicLoop(statement)) {
        lifted.push(statement)
        return []
      }
      if (statement.type !== 'if') return [statement]
      const then = statement.then.flatMap((child): JSStatement[] => {
        if (!isBeginnerPeriodicLoop(child)) return [child]
        lifted.push({
          ...child,
          body: [{ type: 'if', cond: structuredClone(statement.cond), then: child.body }],
        })
        return []
      })
      return [{ ...statement, then }]
    })
    return { ...root, body }
  })
  return [...roots, ...lifted]
}

function accessibleGameDescription(example: ExtensionExample): string {
  const descriptions: Record<string, string> = {
    'Pegue a moeda': 'Encoste na moeda para fazer pontos. Use as setas para andar.',
    'Aventura com câmera': 'Colete 4 moedas. Use as setas para explorar o caminho.',
    'Plataforma com inimigos':
      'Derrote os inimigos e faça pontos. Use as setas para andar e pular; Espaço atira.',
    'Jogo desenhado por código': 'Pegue as moedas. Use as setas para andar.',
    'Cenário do meu desenho':
      'O seu desenho vira o fundo do jogo. Use as setas para andar na frente dele.',
  }
  const tailoredDescription = descriptions[example.name]
  if (tailoredDescription) return tailoredDescription
  return example.description ?? `Jogo 2D: ${example.name}`
}

/**
 * Todos os cartões ensinam o mesmo caminho que a criança usa nas aulas: um
 * “Ao iniciar” prepara o palco implícito; eventos e loops ficam nas áreas próprias.
 * O canvas deixa de ser uma peça escondida no HTML do exemplo.
 */
export function beginnerGameExample(example: ExtensionExample): ExtensionExample {
  const canvas = example.ir.html.find(
    (node): node is Extract<(typeof example.ir.html)[number], { type: 'canvas' }> =>
      node.type === 'canvas',
  )
  if (!canvas || typeof canvas.width !== 'number' || typeof canvas.height !== 'number') {
    throw new Error(`O exemplo “${example.name}” precisa declarar o tamanho do palco`)
  }
  const canvasRule = example.ir.css.find(
    (entry) => 'selector' in entry && entry.selector === 'canvas',
  )
  const background =
    canvasRule && 'declarations' in canvasRule
      ? (cssDeclarationsRecord(canvasRule.declarations).background ?? '#11172a')
      : '#11172a'
  const startId = `exemplo-${example.name.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}`
  return {
    ...example,
    ir: {
      ...example.ir,
      html: example.ir.html.filter((node) => node !== canvas),
      version: 2,
      behavior: {
        // ⚠️ Repassar 🧩 Meus moldes é obrigatório: este wrapper RECONSTRÓI o
        // behavior campo a campo, então esquecer a chave apagaria em silêncio
        // as figuras e os tipos de inimigo de todos os exemplos iniciantes.
        molds: example.ir.behavior.molds ?? [],
        start: [
          {
            type: 'g2d:setupStage',
            width: canvas.width,
            height: canvas.height,
            bg: background,
            __id: startId,
          },
          {
            type: 'g2d:setStageDescription',
            description: accessibleGameDescription(example),
            __id: `${startId}-descricao`,
          },
          ...example.ir.behavior.start,
        ],
        events: example.ir.behavior.events,
        loops: liftBeginnerPeriodicLoops(example.ir.behavior.loops),
      },
    },
  }
}

export const EXAMPLE_HERO_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg=='
export const EXAMPLE_HERO_WALK_SHEET =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAxMjggMzIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMzIiIGZpbGw9Im5vbmUiLz48ZyBmaWxsPSIjMjU2M2ViIiBzdHJva2U9IiNmZGU2OGEiIHN0cm9rZS13aWR0aD0iMyI+PGNpcmNsZSBjeD0iMTYiIGN5PSI5IiByPSI2IiBmaWxsPSIjZmRlNjhhIi8+PHBhdGggZD0iTTE2IDE1djltMC01LTcgNW03LTUgNyA1bS03IDAtNSA3bTUtNyA1IDciLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjkiIHI9IjYiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNNDggMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggMy04IDRtOC00IDcgNyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik04MCAxNXY5bTAtNS03IDVtNy01IDcgNW0tNyA1LTUgMm01LTcgNSAzIi8+PGNpcmNsZSBjeD0iMTEyIiBjeT0iOSIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxwYXRoIGQ9Ik0xMTIgMTV2OW0wLTUtOCAybTgtMiA4IDJtLTggNS03IDVtNy03IDggNCIvPjwvZz48L3N2Zz4='
export const EXAMPLE_TILESET_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDY0IDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzMzQxNTUiLz48cGF0aCBkPSJNMCA4aDMyTTAgMTZoMzJNMCAyNGgzMiIgc3Ryb2tlPSIjNDc1NTY5Ii8+PHJlY3QgeD0iMzIiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzdjM2FlZCIvPjxwYXRoIGQ9Ik0zMiA4aDMyTTMyIDE2aDMyTTMyIDI0aDMyTTQwIDB2OG0xNiAwdjhtLTE2IDB2OG0xNiAwdjgiIHN0cm9rZT0iI2M0YjVmZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+'
export const EXAMPLE_HOUSE_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMTAiIGhlaWdodD0iODYiIHZpZXdCb3g9IjAgMCAxMTAgODYiPjxwYXRoIGZpbGw9IiM3YzJkMTIiIGQ9Ik00IDM4IDU1IDNsNTEgMzV2NDVINHoiLz48cGF0aCBmaWxsPSIjZmI5MjNjIiBkPSJNMTUgMzloODB2NDRIMTV6Ii8+PHJlY3QgZmlsbD0iIzdjM2FlZCIgeD0iNDciIHk9IjUyIiB3aWR0aD0iMjAiIGhlaWdodD0iMzEiIHJ4PSIyIi8+PHJlY3QgZmlsbD0iI2JhZTZmZCIgeD0iMjMiIHk9IjQ5IiB3aWR0aD0iMTciIGhlaWdodD0iMTciLz48cmVjdCBmaWxsPSIjYmFlNmZkIiB4PSI3NCIgeT0iNDkiIHdpZHRoPSIxNyIgaGVpZ2h0PSIxNyIvPjwvc3ZnPg=='
/**
 * Cenário 32x24 do exemplo "Cenário do meu desenho": céu, sol, montanhas e chão.
 * Minúsculo de propósito (o mesmo tamanho que sai do Pinta em pixel art) para
 * mostrar que o motor AMPLIA sem borrar e cobre a tela inteira.
 */
export const EXAMPLE_BACKDROP_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDMyIDI0Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIGZpbGw9IiM3ZGQzZmMiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjUiIHI9IjMiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNMCAxNiBMNyA5IEwxMyAxNiBaIiBmaWxsPSIjOTRhM2I4Ii8+PHBhdGggZD0iTTExIDE2IEwxOSA3IEwyNyAxNiBaIiBmaWxsPSIjY2JkNWUxIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSI4IiBmaWxsPSIjNGFkZTgwIi8+PHJlY3QgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxIiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+'
export const EXAMPLE_TREE_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1NCIgaGVpZ2h0PSI3MCIgdmlld0JveD0iMCAwIDU0IDcwIj48cmVjdCBmaWxsPSIjODU0ZDBlIiB4PSIyMiIgeT0iMzgiIHdpZHRoPSIxMSIgaGVpZ2h0PSIzMiIgcng9IjMiLz48Y2lyY2xlIGZpbGw9IiMxNjY1MzQiIGN4PSIxOCIgY3k9IjMwIiByPSIxNyIvPjxjaXJjbGUgZmlsbD0iIzE1ODAzZCIgY3g9IjM3IiBjeT0iMzEiIHI9IjE2Ii8+PGNpcmNsZSBmaWxsPSIjMjJjNTVlIiBjeD0iMjgiIGN5PSIxNyIgcj0iMTciLz48L3N2Zz4='
