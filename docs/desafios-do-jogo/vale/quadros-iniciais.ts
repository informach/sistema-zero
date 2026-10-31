import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { JSStatement } from '../../../packages/studio/src/ir/schema'
import { PEDIDOS_DOS_MORADORES } from '../pedidos-dos-moradores'
import {
  at,
  baseDoQuadro,
  bin,
  check,
  each,
  eq,
  iff,
  inc,
  key,
  left,
  n,
  opacity,
  restart,
  right,
  set,
  space,
  up,
  v,
  wait,
} from '../quadros-compartilhados'
import { assetsDoVale } from './projetos'

export const QUADROS_INICIAIS_DO_VALE = [
  {
    slug: 'contagem-da-lista',
    titulo: 'Contagem da lista',
    linhas: ['Espaço conta os ninhos da lista.', 'Esquerda tira o terceiro. Direita põe de volta.'],
    texto:
      'A lista ninhos e o Para cada já estão prontos em Espaço. Antes dele, zere contados. Dentro dele, some um para cada ninho. A contagem precisa acompanhar a retirada e a volta do terceiro ninho. Contar outra vez não acumula o resultado anterior.',
    dica: 'Zere antes do Para cada, não dentro dele.',
  },
  {
    slug: 'cinza-retirada',
    titulo: 'Cinza retirada',
    linhas: ['Espaço retira a cinza dos três ninhos.', 'Todas as manchas precisam sumir.'],
    texto:
      'As três manchas estão na lista manchas. O Para cada já está pronto em Espaço. Dentro dele, deixe a opacidade da mancha da vez em zero. Os ninhos continuam visíveis. A lista pronta permite cuidar das três sem copiar a mesma ação.',
    dica: 'Dentro do Para cada, use a mancha da vez, não um nome fixo.',
  },
  {
    slug: 'folhas-bem-usadas',
    titulo: 'Folhas bem usadas',
    linhas: [
      'Esquerda, cima e direita escolhem o ninho.',
      'Espaço cobre. Cada ninho usa uma folha.',
    ],
    texto:
      'As setas escolhem o ninho 1, 2 ou 3. Complete Espaço: se ainda houver folhas, confira a marca do ninho escolhido. Quando ela for zero, marque 1, desconte uma folha e some um em cobertos. Cobrir o mesmo ninho de novo não gasta outra folha.',
    dica: 'Escolha, marca e estoque precisam concordar antes de consumir a folha.',
  },
  {
    slug: 'uma-onda-por-vez',
    titulo: 'Uma onda por vez',
    linhas: ['Espaço começa uma onda de cinza.', 'Espere ela terminar para começar outra.'],
    texto:
      'A animação da onda já está pronta. Complete Espaço: somente quando emOnda for zero, marque emOnda como 1 e some um em ondas. O laço libera outra onda ao terminar. Vários toques durante a passagem não devem criar outras ondas.',
    dica: 'A marca emOnda protege a passagem que ainda está acontecendo.',
  },
  {
    slug: 'rodada-conferida',
    titulo: 'Rodada conferida',
    linhas: ['Esquerda confere um ninho por vez.', 'Espaço fecha a rodada depois dos três.'],
    texto:
      'A seta esquerda já confere os ninhos e diminui restantes, sem passar de zero. Complete Espaço para fechar apenas quando restantes for zero e fechada também for zero. Marque fechada como 1 e some um em rodadas. Fechar outra vez não conta uma rodada nova.',
    dica: 'Terminou de conferir e ainda não fechou são duas condições diferentes.',
  },
] as const
export type QuadroInicialDoVale = 1 | 2 | 3 | 4 | 5
export function projetoDoQuadroVale(quadro: QuadroInicialDoVale, pronto: boolean) {
  const meta = QUADROS_INICIAIS_DO_VALE[quadro - 1]!
  const q = baseDoQuadro({
    id: `vale-${meta.slug}`,
    titulo: meta.titulo,
    linhas: meta.linhas,
    assets: assetsDoVale,
    fundo: 'vale',
    cor: '#173d33',
  })
  for (let i = 1; i <= 3; i++) {
    q.image(`ninho${i}`, 'ninho', 70 + (i - 1) * 200)
    // Só os quadros de lista (1 e 2) conferem a opacidade dos ninhos; os outros não a usam (C01b).
    if (quadro <= 2) q.start.push(opacity(`ninho${i}`, 100))
  }
  if (quadro === 1) {
    q.vars({ contados: 0 })
    q.start.push({ type: 'g2d:createGroup', varName: 'ninhos' })
    for (let i = 1; i <= 3; i++)
      q.start.push({ type: 'g2d:addToGroup', groupVar: 'ninhos', spriteVar: `ninho${i}` })
    q.events.push(
      key('ArrowLeft', [{ type: 'g2d:removeFromGroup', groupVar: 'ninhos', spriteVar: 'ninho3' }]),
      key('ArrowRight', [{ type: 'g2d:addToGroup', groupVar: 'ninhos', spriteVar: 'ninho3' }]),
      key('Space', [
        ...(pronto ? [set('contados', 0)] : []),
        each('ninhos', 'ninho', pronto ? [inc('contados')] : []),
      ]),
    )
    q.placar('Ninhos na lista:', 'contados')
  } else if (quadro === 2) {
    q.start.push({ type: 'g2d:createGroup', varName: 'manchas' })
    for (let i = 1; i <= 3; i++) {
      q.image(`mancha${i}`, 'cinza', 70 + (i - 1) * 200, 205, 96, 60)
      q.start.push(
        { type: 'g2d:addToGroup', groupVar: 'manchas', spriteVar: `mancha${i}` },
        opacity(`mancha${i}`, 100),
      )
    }
    q.events.push(key('Space', [each('manchas', 'mancha', pronto ? [opacity('mancha', 0)] : [])]))
  } else if (quadro === 3) {
    q.vars({ escolhido: 1, folhas: 3, cobertos: 0, cobertura1: 0, cobertura2: 0, cobertura3: 0 })
    q.events.push(
      key('ArrowLeft', [set('escolhido', 1)]),
      key('ArrowUp', [set('escolhido', 2)]),
      key('ArrowRight', [set('escolhido', 3)]),
    )
    const body: JSStatement[] = []
    for (let i = 1; i <= 3; i++) {
      body.push(
        iff(eq('escolhido', i), [
          iff(eq(`cobertura${i}`, 0), [
            set(`cobertura${i}`, 1),
            inc('folhas', -1),
            inc('cobertos'),
          ]),
        ]),
      )
      q.update.push(
        iff(eq(`cobertura${i}`, 1), [
          { type: 'g2d:setImage', spriteVar: `ninho${i}`, image: 'protegido' },
        ]),
      )
    }
    q.events.push(key('Space', pronto ? [iff(bin('>', v('folhas'), n(0)), body)] : []))
    q.placar('Folhas:', 'folhas', 380)
    q.placar('Ninhos cobertos:', 'cobertos', 417)
  } else if (quadro === 4) {
    q.vars({ ondas: 0, emOnda: 0, faltam: 90 })
    q.image('cinza', 'cinza', 20, 170, 600, 44)
    q.events.push(
      key('Space', pronto ? [iff(eq('emOnda', 0), [set('emOnda', 1), inc('ondas')])] : []),
    )
    q.update.push(
      iff(eq('emOnda', 1), [
        inc('faltam', -1),
        iff(eq('faltam', 0), [set('emOnda', 0), set('faltam', 90)]),
      ]),
    )
    // A cinza só aparece durante a onda (desenho condicionado, sem opacidade, C01b).
    q.soDesenharSe('cinza', eq('emOnda', 1))
    q.placar('Ondas:', 'ondas')
  } else {
    q.vars({ restantes: 3, fechada: 0, rodadas: 0 })
    q.events.push(
      key('ArrowLeft', [iff(bin('>', v('restantes'), n(0)), [inc('restantes', -1)])]),
      key(
        'Space',
        pronto
          ? [iff(eq('restantes', 0), [iff(eq('fechada', 0), [set('fechada', 1), inc('rodadas')])])]
          : [],
      ),
    )
    q.placar('Falta conferir:', 'restantes', 380)
    q.placar('Rodadas fechadas:', 'rodadas', 417)
  }
  return q.finish(pronto)
}
export function objetivosDoQuadroVale(
  quadro: QuadroInicialDoVale,
): SectionJavaScriptProjectCheck[] {
  const steps = quadro === 5 ? [left(), left(), left(), space()] : [space()]
  const path =
    quadro === 1
      ? 'contados'
      : quadro === 2
        ? 'mancha1.opacity'
        : quadro === 3
          ? 'cobertos'
          : quadro === 4
            ? 'ondas'
            : 'rodadas'
  const initial = quadro === 2 ? 1 : 0
  const final = quadro === 1 ? 3 : quadro === 2 ? 0 : 1
  const checks = [
    check(
      'acao',
      PEDIDOS_DOS_MORADORES[QUADROS_INICIAIS_DO_VALE[quadro - 1]!.slug]!.objetivo,
      steps,
      path,
      final,
      [at(0, path, initial)],
    ),
  ]
  if (quadro === 1)
    checks.push(
      check(
        'lista',
        'A contagem acompanha a lista e não acumula o resultado anterior.',
        [space(), space(), left(), space(), right(), right(), space()],
        'contados',
        3,
        [at(2, 'contados', 3), at(4, 'contados', 2)],
      ),
    )
  if (quadro === 2)
    checks.push(
      check(
        'todas',
        'Todas as manchas somem, e os ninhos continuam no lugar.',
        [space(), space()],
        'mancha3.opacity',
        0,
        [
          at(1, 'mancha1.opacity', 0),
          at(1, 'mancha2.opacity', 0),
          at(1, 'ninho1.opacity', 1),
          at(1, 'ninho2.opacity', 1),
          at(1, 'ninho3.opacity', 1),
        ],
      ),
    )
  if (quadro === 3)
    checks.push(
      check(
        'estoque',
        'Cada ninho usa uma folha, sem gastar outra no mesmo ninho.',
        [right(), space(), space(), up(), space(), left(), space(), space()],
        'cobertos',
        3,
        [
          at(2, 'cobertura3', 1),
          at(2, 'cobertura1', 0),
          at(3, 'folhas', 2),
          at(5, 'cobertura2', 1),
          at(7, 'folhas', 0),
        ],
      ),
    )
  if (quadro === 4)
    checks.push(
      check(
        'espera',
        'A onda termina antes da próxima começar.',
        [space(), space(), wait(1800), space()],
        'ondas',
        2,
        [at(2, 'ondas', 1), at(3, 'emOnda', 0)],
      ),
    )
  if (quadro === 5)
    checks.push(
      check(
        'fechamento',
        'Só a conferência completa fecha uma rodada, uma vez.',
        [space(), left(), space(), left(), left(), space(), space()],
        'rodadas',
        1,
        [at(1, 'rodadas', 0), at(3, 'rodadas', 0), at(6, 'fechada', 1)],
      ),
    )
  checks.push(restart(steps, path, final, initial))
  return checks
}
export function desafiosIniciaisDoVale(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DO_VALE.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoVale
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `vale-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'vale-dos-dinos',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // C01b: os quadros sem lista têm todas as fontes na trilha; os de lista (1 e 2) esperam o
      // ensino de listas e laço, que nos postos do Vale e das Nuvens é em JavaScript (C02).
      publicar: quadro >= 3,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        // A44: o pedido do morador; o texto técnico de antes vira a primeira dica.
        enunciado: PEDIDOS_DOS_MORADORES[meta.slug]!.pedido,
        dicas: [
          meta.texto,
          meta.dica,
          'Cenário, listas e desenho já estão prontos. Complete apenas as regras indicadas.',
        ],
        projetoInicial: projetoDoQuadroVale(quadro, false),
        gabarito: projetoDoQuadroVale(quadro, true),
        objetivos: objetivosDoQuadroVale(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete Enter para começar uma nova rodada do início.',
        },
        recompensa: {
          cor: true,
          atracao: `vale-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
