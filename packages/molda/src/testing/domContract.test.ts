import { describe, expect, test } from 'bun:test'
import { screen, within } from '@testing-library/react'
import {
  accessibleName,
  controlInventory,
  openDisclosure,
  openEveryDisclosure,
  reachableControls,
} from './domContract'

function render(html: string): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  return host
}

describe('costuras do redesenho da interface', () => {
  /**
   * ⚠️⚠️ A premissa de TODO o redesenho, conferida aqui e não suposta: recolher um controle
   * num `<details>` fechado é invisível para a consulta por papel. É o que permite
   * hierarquizar sem tocar em nenhuma das ~1085 consultas da oficina — e é o que obriga a
   * prova de visibilidade a viver no Playwright, nunca aqui.
   */
  test('o happy-dom NÃO esconde um details fechado: teste de unidade não vê hierarquização', () => {
    const host = render(`
      <details><summary>Mais jeitos de escolher</summary>
        <button type="button">Inverter a escolha</button>
      </details>`)
    const details = host.querySelector('details')
    expect(details?.open).toBe(false)
    // Fechado, e mesmo assim alcançável pela consulta: por isso um lote de layout não mexe
    // em teste nenhum, e por isso teste verde não prova que a criança vê o botão.
    expect(within(host).getByRole('button', { name: 'Inverter a escolha' })).toBeDefined()
    expect(controlInventory(host)).toContain('button: Inverter a escolha')
  })

  test('o atributo hidden, esse sim, tira do alcance: é como o inspetor recolhe sem desmontar', () => {
    const host = render(`
      <aside hidden><button type="button">Peças e grupos</button></aside>
      <button type="button">Abrir</button>`)
    // O contrato do WorkspaceInspector: some do alcance, mas o nó continua montado.
    expect(host.querySelector('aside button')).not.toBeNull()
    expect(controlInventory(host)).toEqual(['button: Abrir'])
  })

  test('abrir uma revelação pelo resumo dispara o toggle que monta o painel preguiçoso', () => {
    const host = render(`
      <details><summary>Conferir a malha</summary><p>corpo</p></details>`)
    let toggles = 0
    host.querySelector('details')?.addEventListener('toggle', () => {
      toggles += 1
    })
    const details = openDisclosure(host, 'Conferir a malha')
    expect(details.open).toBe(true)
    // ⚠️ MEDIDO: são DOIS eventos, não um. O happy-dom dispara `toggle` sozinho ao mudar
    // `open`, e o motorista dispara o segundo — igual aos 44 lugares que abrem revelação
    // hoje. Montar painel é idempotente; a régua aqui é "o evento chegou", não "chegou uma
    // vez", porque mudar isso mudaria o comportamento provado de todos eles.
    expect(toggles).toBe(2)
    // Abrir de novo não redispara: o motorista, esse sim, é idempotente.
    openDisclosure(host, 'Conferir a malha')
    expect(toggles).toBe(2)
    expect(() => openDisclosure(host, 'Não existe')).toThrow('Nenhuma revelação')
  })

  test('abrir todas também abre painel recolhido, que é aria-expanded e não details', () => {
    const host = render(`
      <section>
        <button type="button" aria-expanded="false" aria-controls="c">Cores</button>
        <div id="c" hidden><button type="button">Apagar cor</button></div>
      </section>`)
    // O painel recolhido do `Panel` esconde com o atributo `hidden`: fora do alcance.
    expect(controlInventory(host)).toEqual(['button: Cores'])
    host.querySelector('button')?.addEventListener('click', () => {
      host.querySelector('button')?.setAttribute('aria-expanded', 'true')
      host.querySelector('#c')?.removeAttribute('hidden')
    })
    expect(openEveryDisclosure(host)).toBe(1)
    expect(controlInventory(host)).toContain('button: Apagar cor')
  })

  test('abrir todas alcança as aninhadas, que só existem depois de a mãe abrir', () => {
    const host = render(`
      <details><summary>Fora</summary>
        <details><summary>Dentro</summary>
          <button type="button">Fundo</button>
        </details>
      </details>`)
    expect(openEveryDisclosure(host)).toBe(2)
    expect([...host.querySelectorAll('details')].every((item) => item.open)).toBe(true)
  })

  /**
   * O que torna a adoção de ícones barata: `ToolButton` põe o rótulo em `aria-label`, então o
   * inventário não muda quando o texto vira glifo.
   */
  test('o nome sai igual com texto ou com ícone, porque vem do aria-label', () => {
    const comTexto = render('<button type="button">Duplicar</button>')
    const comIcone = render('<button type="button" aria-label="Duplicar"><svg /></button>')
    expect(controlInventory(comTexto)).toEqual(controlInventory(comIcone))
  })

  test('o nome vem do label associado, do label que embrulha e do aria-labelledby', () => {
    const host = render(`
      <label for="passo">Passo do movimento</label><select id="passo" name="passo"></select>
      <label><input type="checkbox" name="grade" />Mostrar grade</label>
      <h2 id="t">Peças e propriedades</h2><section aria-labelledby="t"><input name="n" /></section>`)
    expect(accessibleName(host.querySelector('select') as Element)).toBe('Passo do movimento')
    expect(accessibleName(host.querySelector('input[type=checkbox]') as Element)).toBe(
      'Mostrar grade',
    )
    expect(accessibleName(host.querySelector('section') as Element)).toBe('Peças e propriedades')
  })

  test('o inventário distingue papel, some com repetido e marca o que está desligado', () => {
    const host = render(`
      <button type="button">Agrupar</button>
      <fieldset disabled><button type="button">Apagar</button></fieldset>
      <input type="number" name="x" aria-label="X" />
      <input type="range" name="fps" aria-label="Velocidade" />
      <input type="search" name="busca" aria-label="Procurar" />
      <select name="clipe" aria-label="Movimento"></select>`)
    expect(controlInventory(host)).toEqual([
      'button: Agrupar',
      'button: Apagar [desligado]',
      'combobox: Movimento',
      'searchbox: Procurar',
      'slider: Velocidade',
      'spinbutton: X',
    ])
    // `<fieldset disabled>` é a trava atômica do gesto: o inventário lê o grupo, não o botão.
    expect(reachableControls(host).find((c) => c.name === 'Apagar')?.disabled).toBe(true)
  })

  test('a ordem no DOM não muda o inventário: é conjunto, e reordenar é o que o redesenho faz', () => {
    const antes = render(
      '<button type="button">Voltar</button><button type="button">Levar</button>',
    )
    const inventarioAntes = controlInventory(antes)
    const depois = render(
      '<button type="button">Levar</button><nav><button type="button">Voltar</button></nav>',
    )
    expect(controlInventory(depois)).toEqual(inventarioAntes)
  })

  test('some do inventário quem não tem nome, para não virar ruído', () => {
    const host = render('<button type="button"><svg /></button><input type="hidden" name="id" />')
    expect(controlInventory(host)).toEqual([])
    expect(screen.queryAllByRole('button')).toHaveLength(1)
  })
})
