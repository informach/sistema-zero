/**
 * Os objetivos do Poder "Inimigo que atira" (o Verificar projeto de cada etapa).
 *
 * O jogo confere, no executor de verdade: a inimiga só atira na partida, e os tiros que saem da tela
 * saem do grupo (sem a limpeza, o grupo cresce a cada 1,5 s). Nos blocos: o intervalo, a origem do
 * tiro na posição da inimiga, o encontro do tiro com a nave (o tiro sai e a nave perde uma vida) e a
 * limpeza. A vida que o tiro tira não pode ser conferida no jogo: as pedras também batem na nave, e
 * uma vida a menos não diz quem bateu. O reinício que limpa os tiros vem pronto (o `restart` do 2D e
 * o "Voltar ao início" do 3D recomeçam o jogo inteiro). Os objetivos de cada etapa somam os das
 * anteriores.
 */
import type {
  ProjectBlockPattern as Pattern,
  SectionProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import {
  caminho,
  comecar,
  comportamento,
  danoNaNave,
  encontroDaNave,
  esperar,
  g,
  relogio,
  soNaPartida,
  valor,
} from './construtor-poderes-criterios'
import { INIMIGO_ETAPAS, INIMIGO_REGRAS, type InimigoEtapa } from './inimigo-projeto'

export const ESPERAS_INIMIGO = { antes: 2200, tiro: 2600, limpeza: 9000 } as const

/** A criação do tiro inimigo no relógio (com a origem, quando pedida). */
function criacao(d: PoderDimensaoConstrutor, comOrigem: boolean): Pattern {
  if (d === '2d')
    return {
      blockType: 'sz_g2d_spawn_image_in_group',
      fields: { GROUP: 'tirosInimigos' },
      ...(comOrigem
        ? {
            inputBlocks: {
              X: {
                blockType: 'sz_math_arithmetic',
                inputBlocks: { A: { blockType: 'sz_g2d_center_x', fields: { SPRITE: 'inimiga' } } },
              },
            },
          }
        : {}),
    }
  return {
    blockType: 'sz_g3d_spawn_copy',
    fields: { GROUP: 'tirosInimigos' },
    ...(comOrigem
      ? { inputBlocks: { X: { blockType: 'sz_g3d_get_pos', fields: { OBJ: 'inimiga' } } } }
      : {}),
  }
}

export function inimigoChecks(
  d: PoderDimensaoConstrutor,
  etapa: InimigoEtapa,
): SectionProjectCheck[] {
  const n = INIMIGO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Inimigo que atira: ${etapa}`)
  const tem = (ate: InimigoEtapa) => n >= INIMIGO_ETAPAS.indexOf(ate)
  const r = INIMIGO_REGRAS
  const e = ESPERAS_INIMIGO
  const tiros = caminho.grupo(d, 'tirosInimigos')
  const checks: SectionProjectCheck[] = []

  if (tem('tiro')) {
    checks.push(
      comportamento(
        'tiros-so-na-partida',
        'Antes do Enter, a inimiga não atira; na partida, os tiros dela aparecem.',
        `Use um A cada ${String(r.intervalo).replace('.', ',')} segundos que cria o tiro no grupo tirosInimigos só quando o jogo está na partida.`,
        [esperar(e.antes), comecar, esperar(e.tiro)],
        valor(tiros, 'atLeast', 1),
        [{ afterStep: 1, expect: valor(tiros, 'equals', 0) }],
      ),
    )
    checks.push({
      id: 'intervalo-do-tiro',
      label: `A inimiga atira a cada ${String(r.intervalo).replace('.', ',')} segundos, no grupo tirosInimigos.`,
      hint: `Use o número ${String(r.intervalo)} no bloco A cada e crie o tiro no grupo tirosInimigos.`,
      rule: relogio(d, r.intervalo, [soNaPartida(d, [criacao(d, false)])]),
    })
  }

  if (tem('origem'))
    checks.push({
      id: 'tiro-sai-da-inimiga',
      label:
        d === '2d'
          ? 'O tiro nasce embaixo da inimiga: o x dele lê o centro x da inimiga.'
          : 'O tiro nasce na frente da inimiga: o x da cópia lê a posição x da inimiga.',
      hint:
        d === '2d'
          ? 'No x da criação do tiro, use o centro x do sprite inimiga menos 5; no y, a posição y da inimiga mais 52.'
          : 'No x da cópia do tiro, use a posição x do objeto inimiga.',
      rule: relogio(d, r.intervalo, [soNaPartida(d, [criacao(d, true)])]),
    })

  if (tem('dano'))
    checks.push({
      id: 'tiro-machuca',
      label:
        'No encontro da nave com um tiro inimigo: o tiro sai do grupo e a nave perde uma vida.',
      hint:
        d === '3d'
          ? 'Use Quando nave encostar em algum do grupo tirosInimigos, com a guarda da partida: tirar o tiro do grupo e machucar a nave tirando 1 de vida.'
          : 'Use Para cada sprite do grupo tirosInimigos que colidir com o sprite nave: tirar o tiro do grupo e machucar a nave.',
      rule: encontroDaNave(d, 'tirosInimigos', [
        { blockType: `sz_${g(d)}_remove_from_group`, fields: { GROUP: 'tirosInimigos' } },
        danoNaNave(d),
      ]),
    })

  if (tem('limpeza')) {
    checks.push(
      comportamento(
        'tiros-saem-da-tela',
        'Os tiros inimigos que saem da tela saem do grupo: ele não cresce sem parar.',
        d === '2d'
          ? 'No quadro do jogo, tire do grupo tirosInimigos quem sair da tela.'
          : 'No quadro, use No grupo tirosInimigos, tirar quem saiu, no eixo z, de -36 até 6.',
        // no 3D a nave vai para a borda: parada no meio, ela leva batidas até o fim de jogo, que
        // congela a contagem. Sem a limpeza, em 9 s nascem seis tiros e ficam todos no grupo; com
        // ela, no 3D um tiro vive 2,3 s (nunca há mais de dois no ar)
        d === '2d'
          ? [comecar, esperar(e.limpeza)]
          : [
              comecar,
              { action: 'press', key: 'ArrowRight', holdMs: 800 },
              esperar(e.limpeza - 800),
            ],
        valor(tiros, 'atMost', d === '2d' ? 3 : 2),
      ),
    )
    checks.push({
      id: 'limpeza-dos-tiros',
      label: 'O grupo tirosInimigos tira quem sai da tela.',
      hint:
        d === '2d'
          ? 'Use Tirar do grupo quem sair da tela, com o grupo tirosInimigos.'
          : 'Use No grupo tirar quem saiu, com o grupo tirosInimigos.',
      rule:
        d === '2d'
          ? {
              type: 'usesBlock',
              blockType: 'sz_g2d_prune_offscreen',
              fields: { GROUP: 'tirosInimigos' },
              area: 'loops',
            }
          : {
              type: 'usesBlock',
              blockType: 'sz_g3d_prune_area',
              fields: { GROUP: 'tirosInimigos' },
            },
    })
  }
  return checks
}
