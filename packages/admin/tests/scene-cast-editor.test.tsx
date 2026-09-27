import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { isSceneCast, SCENE_FIGURES, type SceneActivity } from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SceneCastEditor } = await import('../src/components/editor/scene-cast-editor')

/**
 * O DESENHO do elenco no editor (Raio-X, lote 3, 16/09/2026).
 *
 * Cada papel ganhou a escolha da figura, com "Pelo nome" como padrão (sem `figure` no manifesto,
 * que é o caso de tudo o que já está publicado). O que dá para errar aqui é o editor PERDER a
 * figura: o `trocar` refazia o ator só com nome, gênero e plural.
 */
async function montar(inicial: SceneActivity) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let activity = inicial
  const render = () =>
    root.render(
      <SceneCastEditor
        activity={activity}
        onChange={(next) => {
          activity = next
          render()
        }}
      />,
    )
  await act(async () => render())
  const campo = <T extends Element>(seletor: string) => {
    const el = container.querySelector<T>(seletor)
    if (!el) throw new Error(`Faltou ${seletor}`)
    return el
  }
  return {
    get activity() {
      return activity
    },
    desenho: () => campo<HTMLSelectElement>('select[aria-label="Desenho de personagem"]'),
    /** O seletor do CENÁRIO é o primeiro select da tela (a pergunta mais alta: que jogo é este). */
    cenario: () => campo<HTMLSelectElement>('select'),
    async escrever(rotulo: string, texto: string) {
      const input = campo<HTMLInputElement>(`input[id$="-${rotulo}"]`)
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          input,
          texto,
        )
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    },
    /**
     * Letra a letra, como a mão faz: cada tecla ACRESCENTA ao que o campo mostra AGORA (que é o
     * valor guardado, porque o campo é controlado). Colar o nome inteiro de uma vez não pega o
     * defeito do review do lote 3.
     */
    async digitar(seletor: string, texto: string) {
      const input = campo<HTMLInputElement>(seletor)
      for (const letra of texto)
        await act(async () => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
            input,
            input.value + letra,
          )
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
    },
    async sair(seletor: string) {
      const input = campo<HTMLInputElement>(seletor)
      await act(async () => {
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
        input.dispatchEvent(new FocusEvent('blur'))
      })
    },
    async escolher(select: HTMLSelectElement, valor: string) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(
          select,
          valor,
        )
        select.dispatchEvent(new Event('change', { bubbles: true }))
      })
    },
    async fechar() {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

test('⭐ cada papel oferece o desenho, e "Pelo nome" diz o que o nome desenha', async () => {
  const e = await montar({ type: 'experimentation', scene: 'velocity' })
  try {
    // Sem ator, não há o que desenhar: a escolha fica fechada, como o gênero e o plural.
    expect(e.desenho().disabled).toBe(true)
    expect(e.desenho().selectedOptions[0]?.textContent).toBe('Pelo nome (Dino)')
    await e.escrever('hero', 'nave')
    expect(e.desenho().disabled).toBe(false)
    // O padrão NÃO grava `figure`: é o que mantém os manifestos iguais aos publicados.
    expect(e.activity.cast?.hero).toEqual({ name: 'nave', gender: 'm' })
    expect(e.desenho().selectedOptions[0]?.textContent).toBe('Pelo nome (Nave)')
    expect([...e.desenho().options].map((o) => o.value)).toEqual(['', ...SCENE_FIGURES])
  } finally {
    await e.fechar()
  }
})

test('⚠️⚠️ a figura escolhida sobrevive à troca do nome, e "Pelo nome" a tira', async () => {
  const e = await montar({ type: 'experimentation', scene: 'velocity' })
  try {
    await e.escrever('hero', 'Zé')
    await e.escolher(e.desenho(), 'pedra')
    expect(e.activity.cast?.hero?.figure).toBe('pedra')
    // Corrigir o nome não pode apagar a escolha em silêncio.
    await e.escrever('hero', 'Zezinho')
    expect(e.activity.cast?.hero).toEqual({ name: 'Zezinho', gender: 'm', figure: 'pedra' })
    expect(isSceneCast(e.activity.cast)).toBe(true)
    // A prévia diz o que vai para o palco, e em que mundo. ⚠️ Só os papéis que a `velocity`
    // desenha (review do lote 3): ela não desenha obstáculo nem cenário.
    expect(document.body.textContent).toContain('No palco: Pedra, em O Jogo do Meu Jeito (espaço).')
    await e.escolher(e.desenho(), '')
    expect(e.activity.cast?.hero).toEqual({ name: 'Zezinho', gender: 'm' })
    expect(document.body.textContent).toContain('No palco: Dino, em Corre Dino (floresta).')
  } finally {
    await e.fechar()
  }
})

test('⚠️⚠️ digitar "nave espacial" LETRA A LETRA guarda o espaço, e a figura sai do nome', async () => {
  // Review do lote 3: o nome era aparado a cada tecla, o espaço sumia antes da próxima letra e
  // ficava "naveespacial", que não diz figura nenhuma (o palco desenhava o Dino).
  const e = await montar({ type: 'experimentation', scene: 'velocity' })
  try {
    await e.digitar('input[id$="-hero"]', 'nave espacial ')
    expect(e.activity.cast?.hero?.name).toBe('nave espacial ')
    expect(e.desenho().selectedOptions[0]?.textContent).toBe('Pelo nome (Nave)')
    // Ao sair do campo, o espaço do fim sai e o do meio fica.
    await e.sair('input[id$="-hero"]')
    expect(e.activity.cast?.hero).toEqual({ name: 'nave espacial', gender: 'm' })
    // O plural também: "naves espaciais" não pode virar "navesespaciais".
    await e.digitar('input[aria-label="Plural de personagem"]', 'naves  espaciais ')
    await e.sair('input[aria-label="Plural de personagem"]')
    expect(e.activity.cast?.hero).toEqual({
      name: 'nave espacial',
      gender: 'm',
      plural: 'naves espaciais',
    })
    expect(isSceneCast(e.activity.cast)).toBe(true)
  } finally {
    await e.fechar()
  }
})

test('um espaço só no começo não cria o papel', async () => {
  const e = await montar({ type: 'experimentation', scene: 'velocity' })
  try {
    await e.digitar('input[id$="-hero"]', ' ')
    expect(e.activity.cast).toBeUndefined()
  } finally {
    await e.fechar()
  }
})

test('⚠️⚠️ a prévia só fala dos papéis que a cena DESENHA, e cena abstrata diz isso', async () => {
  const abstrata = await montar({
    type: 'experimentation',
    scene: 'symmetry',
    cast: { hero: { name: 'nave', gender: 'f' } },
  })
  try {
    expect(document.body.textContent).toContain(
      'Esta cena não desenha o elenco: mudam só os nomes nos textos.',
    )
    expect(document.body.textContent).not.toContain('No palco:')
  } finally {
    await abstrata.fechar()
  }
  const camadas = await montar({
    type: 'experimentation',
    scene: 'layers',
    cast: { hero: { name: 'pedra', gender: 'f' }, scenery: { name: 'chama', gender: 'f' } },
  })
  try {
    expect(document.body.textContent).toContain(
      'No palco: Pedra e Chama, em O Jogo do Meu Jeito (espaço).',
    )
    expect(document.body.textContent).not.toContain('senão a criança vê')
  } finally {
    await camadas.fechar()
  }
})

test('⚠️⚠️ espaço com um papel desenhado sem nome AVISA o professor', async () => {
  // `{obstacle: asteroide}` na `spawn` punha o Dino no céu de estrelas (review do lote 3).
  const soAsteroide = await montar({
    type: 'experimentation',
    scene: 'spawn',
    cast: { obstacle: { name: 'asteroide', gender: 'm' } },
  })
  try {
    expect(document.body.textContent).toContain(
      'No palco: Dino e Asteroide, em Desafio do Primeiro Jogo (espaço).',
    )
    expect(document.body.textContent).toContain(
      'Esta cena desenha o personagem. Com asteroide no elenco, dê um nome ao personagem (por exemplo, nave), senão a criança vê o Dino no espaço.',
    )
  } finally {
    await soAsteroide.fechar()
  }
  // Um cacto ESCRITO ao lado da nave também: ele é declarado, então o conserto é trocar.
  const naveECacto = await montar({
    type: 'experimentation',
    scene: 'lives',
    cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'cacto', gender: 'm' } },
  })
  try {
    expect(document.body.textContent).toContain(
      'Esta cena desenha o obstáculo como Cacto. Com nave no elenco, escolha outro nome ou desenho (por exemplo, asteroide), senão a criança vê um cacto no espaço.',
    )
  } finally {
    await naveECacto.fechar()
  }
  // A mesma nave numa cena que não desenha o obstáculo não avisa nada.
  const soNave = await montar({
    type: 'experimentation',
    scene: 'draw-loop',
    cast: { hero: { name: 'nave', gender: 'f' } },
  })
  try {
    expect(document.body.textContent).toContain(
      'No palco: Nave, em Desafio do Primeiro Jogo (espaço).',
    )
    expect(document.body.textContent).not.toContain('senão a criança vê')
  } finally {
    await soNave.fechar()
  }
})

test('a nota lista os nomes de cada figura a partir do core', async () => {
  const e = await montar({ type: 'experimentation', scene: 'velocity' })
  try {
    const texto = document.body.textContent ?? ''
    for (const nome of ['meteoro', 'rocha', 'laser', 'fogo', 'dinossauro', 'árvore', 'espaçonave'])
      expect({ nome, listado: texto.includes(nome) }).toEqual({ nome, listado: true })
    expect(texto).not.toContain('bala')
  } finally {
    await e.fechar()
  }
})

test('⭐⭐ o CENÁRIO: o professor escolhe o jogo, e "Pelo elenco" mostra o derivado', async () => {
  const e = await montar({ type: 'experimentation', scene: 'velocity' })
  try {
    // Sem elenco, a derivação dá o Corre Dino — e é isso que a opção em branco anuncia.
    expect(e.cenario().selectedOptions[0]?.textContent).toBe('Pelo elenco (Corre Dino (floresta))')
    expect(e.activity.cenario).toBeUndefined()

    await e.escolher(e.cenario(), 'gorilas')
    expect(e.activity.cenario).toBe('gorilas')
    expect(document.body.textContent).toContain('em Batalha de Gorilas (cidade)')

    // ⚠️ Voltar para "Pelo elenco" TIRA o campo, não grava o derivado: é o que mantém o manifesto
    // igual ao publicado quando o professor só olhou o seletor. Sem elenco e sem cenário não há o
    // que prever, e a prévia some junto — como já fazia antes deste campo existir.
    await e.escolher(e.cenario(), '')
    expect(e.activity.cenario).toBeUndefined()
    expect(e.cenario().selectedOptions[0]?.textContent).toBe('Pelo elenco (Corre Dino (floresta))')
    expect(document.body.textContent).not.toContain('No palco:')
  } finally {
    await e.fechar()
  }
})

test('⚠️ o cenário DECLARADO vence o elenco na prévia e no aviso', async () => {
  const e = await montar({ type: 'experimentation', scene: 'velocity' })
  try {
    // Com uma nave escrita, a derivação levaria ao Desafio; o campo manda no Corre Dino.
    await e.escrever('hero', 'nave')
    expect(document.body.textContent).toContain('em Desafio do Primeiro Jogo (espaço)')
    await e.escolher(e.cenario(), 'corre-dino')
    expect(document.body.textContent).toContain('em Corre Dino (floresta)')
    // O aviso do espaço some junto: ele existe para o cenário SEM chão.
    expect(document.body.textContent).not.toContain('senão a criança vê')

    // ⚠⚠ E a opção em branco segue anunciando o DERIVADO, não o que está escolhido: ela é a
    // prévia de "o que acontece se eu apagar isto". Lendo o cenário resolvido, ela dizia
    // "Pelo elenco (Corre Dino (floresta))" com uma nave no palco — e hoje os 38 blocos de cena
    // dos cursos declaram o campo, então este é o estado normal do seletor, não um canto.
    // (`options[0]` é a opção em branco; a SELECIONADA agora é o Corre Dino.)
    expect(e.cenario().options[0]?.textContent).toBe(
      'Pelo elenco (Desafio do Primeiro Jogo (espaço))',
    )
  } finally {
    await e.fechar()
  }
})
