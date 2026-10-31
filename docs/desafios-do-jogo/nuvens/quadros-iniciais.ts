import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { JSStatement } from '../../../packages/studio/src/ir/schema'
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
  restart,
  right,
  set,
  space,
  up,
  v,
} from '../quadros-compartilhados'
import { assetsDoNuvens } from './projetos'

export const QUADROS_INICIAIS_DAS_NUVENS = [
  {
    slug: 'reserva-de-agua',
    titulo: 'Reserva de água',
    linhas: ['Esquerda guarda uma água. Espaço gasta uma.', 'A reserva comporta até três.'],
    texto:
      'Complete a seta esquerda para guardar uma água se agua for menor que 3. Complete Espaço para gastar uma se agua for maior que zero. A reserva não transborda e não fica negativa. O desenho já acompanha o que está guardado.',
    dica: 'Conferir antes de somar ou gastar conserva os dois limites.',
  },
  {
    slug: 'luz-na-medida',
    titulo: 'Luz na medida',
    linhas: ['As setas mudam a luz. Espaço tenta crescer.', 'A flor cresce com luz entre 1 e 3.'],
    texto:
      'As setas já diminuem e aumentam luz. Complete Espaço para somar um em crescimento apenas quando luz for maior que zero e menor que 4. Não cresça com luz zero nem com luz acima da faixa. São os limites desta brincadeira, não uma regra de cultivo real.',
    dica: 'Uma condição confere o mínimo e a outra confere o máximo.',
  },
  {
    slug: 'canteiros-livres',
    titulo: 'Canteiros livres',
    linhas: [
      'Esquerda, cima e direita escolhem o canteiro.',
      'Espaço planta somente no canteiro vazio.',
    ],
    texto:
      'As setas escolhem um dos três canteiros. Complete Espaço para mudar a marca plantado do escolhido de zero para 1 e somar um em plantas, somente quando ele estiver vazio. Plantar de novo no mesmo lugar não cria outra planta nem muda os outros canteiros.',
    dica: 'Cada canteiro conserva a própria marca de ocupação.',
  },
  {
    slug: 'dois-recursos',
    titulo: 'Dois recursos',
    linhas: ['Esquerda traz água. Direita traz adubo.', 'Espaço usa um de cada para produzir.'],
    texto:
      'As setas já abastecem agua e adubo. Complete Espaço: quando os dois forem maiores que zero, gaste um de cada e some um em producao. Sem um dos recursos, espere sem consumir o outro. Cada toque simula um passo desta pequena produção.',
    dica: 'Os dois recursos são usados juntos. Só comece quando ambos estiverem disponíveis.',
  },
  {
    slug: 'colheita-da-lista',
    titulo: 'Colheita da lista',
    linhas: [
      'Espaço colhe as três flores da lista.',
      'Uma flor colhida sai da lista e não conta de novo.',
    ],
    texto:
      'A lista flores já tem três plantas prontas. O Para cada está montado em Espaço. Dentro dele, some um em colhidas e destrua a flor da vez. O motor retira a flor do grupo. Apertar novamente não soma flores que já saíram da lista.',
    dica: 'Percorra a lista e use a flor da vez nas duas ações.',
  },
] as const
export type QuadroInicialDasNuvens = 1 | 2 | 3 | 4 | 5
export function projetoDoQuadroNuvens(quadro: QuadroInicialDasNuvens, pronto: boolean) {
  const meta = QUADROS_INICIAIS_DAS_NUVENS[quadro - 1]!
  const q = baseDoQuadro({
    id: `nuvens-${meta.slug}`,
    titulo: meta.titulo,
    linhas: meta.linhas,
    assets: assetsDoNuvens,
    fundo: 'jardim',
    cor: '#392b64',
  })
  if (quadro === 1) {
    q.vars({ agua: 0 })
    for (let i = 1; i <= 3; i++) {
      q.image(`reserva${i}`, 'muda', 70 + (i - 1) * 200)
      q.update.push(
        iff(
          bin('>', v('agua'), n(i - 1)),
          [{ type: 'g2d:setImage', spriteVar: `reserva${i}`, image: 'muda' }],
          [{ type: 'g2d:setImage', spriteVar: `reserva${i}`, image: 'muda-cinza' }],
        ),
      )
    }
    q.events.push(
      key('ArrowLeft', pronto ? [iff(bin('<', v('agua'), n(3)), [inc('agua')])] : []),
      key('Space', pronto ? [iff(bin('>', v('agua'), n(0)), [inc('agua', -1)])] : []),
    )
    q.placar('Água na reserva:', 'agua')
  } else if (quadro === 2) {
    q.vars({ luz: 0, crescimento: 0 })
    q.image('planta', 'muda', 270, 210, 96, 120)
    q.events.push(
      key('ArrowLeft', [inc('luz', -1)]),
      key('ArrowRight', [inc('luz')]),
      key(
        'Space',
        pronto
          ? [iff(bin('>', v('luz'), n(0)), [iff(bin('<', v('luz'), n(4)), [inc('crescimento')])])]
          : [],
      ),
    )
    q.update.push(
      iff(bin('>', v('crescimento'), n(0)), [
        { type: 'g2d:setImage', spriteVar: 'planta', image: 'flor' },
      ]),
    )
    q.placar('Luz:', 'luz', 390)
    q.placar('Crescimento:', 'crescimento', 425)
  } else if (quadro === 3) {
    q.vars({ escolhido: 1, plantas: 0, plantado1: 0, plantado2: 0, plantado3: 0 })
    q.events.push(
      key('ArrowLeft', [set('escolhido', 1)]),
      key('ArrowUp', [set('escolhido', 2)]),
      key('ArrowRight', [set('escolhido', 3)]),
    )
    const body: JSStatement[] = []
    for (let i = 1; i <= 3; i++) {
      q.image(`planta${i}`, 'muda', 70 + (i - 1) * 200)
      q.update.push(
        iff(
          eq(`plantado${i}`, 1),
          [{ type: 'g2d:setImage', spriteVar: `planta${i}`, image: 'muda' }],
          [{ type: 'g2d:setImage', spriteVar: `planta${i}`, image: 'muda-cinza' }],
        ),
      )
      body.push(
        iff(eq('escolhido', i), [
          iff(eq(`plantado${i}`, 0), [set(`plantado${i}`, 1), inc('plantas')]),
        ]),
      )
    }
    q.events.push(key('Space', pronto ? body : []))
    q.placar('Plantas:', 'plantas')
  } else if (quadro === 4) {
    q.vars({ agua: 0, adubo: 0, producao: 0 })
    q.image('planta', 'muda', 270, 210, 96, 120)
    q.events.push(
      key('ArrowLeft', [inc('agua')]),
      key('ArrowRight', [inc('adubo')]),
      key(
        'Space',
        pronto
          ? [
              iff(bin('>', v('agua'), n(0)), [
                iff(bin('>', v('adubo'), n(0)), [
                  inc('agua', -1),
                  inc('adubo', -1),
                  inc('producao'),
                ]),
              ]),
            ]
          : [],
      ),
    )
    q.update.push(
      iff(bin('>', v('producao'), n(0)), [
        { type: 'g2d:setImage', spriteVar: 'planta', image: 'flor' },
      ]),
    )
    q.placar('Água:', 'agua', 355)
    q.placar('Adubo:', 'adubo', 390)
    q.placar('Produção:', 'producao', 425)
  } else {
    q.vars({ colhidas: 0 })
    q.start.push({ type: 'g2d:createGroup', varName: 'flores' })
    for (let i = 1; i <= 3; i++) {
      q.image(`flor${i}`, 'flor', 70 + (i - 1) * 200, 210, 96, 120)
      q.start.push({ type: 'g2d:addToGroup', spriteVar: `flor${i}`, groupVar: 'flores' })
    }
    q.events.push(
      key('Space', [
        each(
          'flores',
          'flor',
          pronto ? [inc('colhidas'), { type: 'g2d:destroySprite', spriteVar: 'flor' }] : [],
        ),
      ]),
    )
    q.placar('Flores colhidas:', 'colhidas')
  }
  return q.finish(pronto)
}
export function objetivosDoQuadroNuvens(
  quadro: QuadroInicialDasNuvens,
): SectionJavaScriptProjectCheck[] {
  const steps =
    quadro === 1
      ? [left(), left(), space()]
      : quadro === 2
        ? [right(), space()]
        : quadro === 4
          ? [left(), right(), space()]
          : [space()]
  const path =
    quadro === 1
      ? 'agua'
      : quadro === 2
        ? 'crescimento'
        : quadro === 3
          ? 'plantas'
          : quadro === 4
            ? 'producao'
            : 'colhidas'
  const final = quadro === 5 ? 3 : 1
  const checks = [
    check('acao', 'Complete a ação indicada para esta rodada.', steps, path, final, [
      at(0, path, 0),
    ]),
  ]
  if (quadro === 1)
    checks.push(
      check(
        'limites',
        'A reserva não transborda nem fica negativa.',
        [space(), left(), left(), left(), left(), space(), space(), space(), space()],
        'agua',
        0,
        [at(1, 'agua', 0), at(5, 'agua', 3), at(6, 'agua', 2), at(8, 'agua', 0)],
      ),
    )
  if (quadro === 2)
    checks.push(
      check(
        'faixa',
        'Só a faixa de luz de 1 a 3 permite crescer.',
        [space(), right(), space(), right(), right(), space(), right(), space(), left(), space()],
        'crescimento',
        3,
        [at(1, 'crescimento', 0), at(6, 'crescimento', 2), at(8, 'crescimento', 2)],
      ),
    )
  if (quadro === 3)
    checks.push(
      check(
        'ocupacao',
        'O plantio ocupa só o escolhido e não duplica plantas.',
        [right(), space(), space(), up(), space(), left(), space()],
        'plantas',
        3,
        [at(2, 'plantado3', 1), at(2, 'plantado1', 0), at(3, 'plantas', 1), at(5, 'plantado2', 1)],
      ),
    )
  if (quadro === 4)
    checks.push(
      check(
        'recursos',
        'Produzir usa os dois recursos e não gasta nada se falta um.',
        [left(), space(), right(), space(), space(), right(), space()],
        'producao',
        1,
        [
          at(2, 'agua', 1),
          at(2, 'producao', 0),
          at(4, 'agua', 0),
          at(4, 'adubo', 0),
          at(7, 'adubo', 1),
        ],
      ),
    )
  if (quadro === 5)
    checks.push(
      check(
        'retirada',
        'A lista fica vazia e não permite colher de novo.',
        [space(), space()],
        'colhidas',
        3,
        [at(1, 'flores.items.length', 0)],
      ),
    )
  checks.push(restart(steps, path, final))
  return checks
}
export function desafiosIniciaisDasNuvens(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DAS_NUVENS.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDasNuvens
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `nuvens-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'nuvens',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // C01b: os quadros sem lista têm todas as fontes na trilha; a Colheita da lista (5) espera o
      // ensino de listas e laço, que nas Nuvens é em JavaScript (C02).
      publicar: quadro <= 4,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        enunciado: meta.texto,
        dicas: [
          meta.dica,
          'Cenário, listas e desenho já estão prontos. Complete apenas as regras indicadas.',
        ],
        projetoInicial: projetoDoQuadroNuvens(quadro, false),
        gabarito: projetoDoQuadroNuvens(quadro, true),
        objetivos: objetivosDoQuadroNuvens(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete Enter para começar uma nova rodada do início.',
        },
        recompensa: {
          cor: true,
          atracao: `nuvens-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
