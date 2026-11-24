import { describe, expect, test } from 'bun:test'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import type { VersaoPublicada } from '@sistemazero/molda-cenarios-core/publicacao'
import { renderToStaticMarkup } from 'react-dom/server'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import type { PublicacoesDeCenariosHost } from '../src/oficina/publicacoes'
import Publicar from '../src/oficina/telas/Publicar'
import {
  type EstadoDaVolta,
  executarVolta,
  ListaDasVersoes,
  type ListaDeVersoes,
} from '../src/oficina/telas/VersoesDaIlha'

const CENARIO = '11111111-1111-4111-8111-111111111111'
const versao = (n: number, atual = false, cenario = CENARIO): VersaoPublicada => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  versao: n,
  fonte: { cenario, revisao: n + 4 },
  manifesto: { digest: String(n).repeat(64), bytes: 10 + n },
  publicadaEm: '2026-11-21T12:00:00.000Z',
  autorId: '33333333-3333-4333-8333-333333333333',
  atual,
})
const TRES: ListaDeVersoes = {
  tipo: 'pronto',
  versoes: [versao(3, true), versao(2), versao(1, false, 'outro-cenario-0001')],
}
const nada = () => {}
function desenhar(
  volta: EstadoDaVolta,
  opcoes: { lista?: ListaDeVersoes; bloqueado?: boolean } = {},
) {
  return renderToStaticMarkup(
    <ListaDasVersoes
      nomeDaIlha="Bosque dos Bichos"
      cenarioAberto={CENARIO}
      lista={opcoes.lista ?? TRES}
      volta={volta}
      bloqueado={opcoes.bloqueado ?? false}
      aoAbrir={nada}
      aoMarcar={nada}
      aoDesistir={nada}
      aoVoltar={nada}
      aoConferirDeNovo={nada}
    />,
  )
}
const contar = (html: string, trecho: string) => html.split(trecho).length - 1
/** O `<button …>` cujo texto começa com `rotulo`, com os atributos. */
const botao = (html: string, rotulo: string) =>
  html.match(new RegExp(`<button[^>]*>${rotulo}`))?.[0] ?? null

describe('versões publicadas na tela de publicar', () => {
  test('a lista marca a versão no ar e oferece voltar só às anteriores', () => {
    const html = desenhar({ tipo: 'parado' })
    expect(html).toMatch(/<section[^>]*aria-labelledby="[^"]+"/)
    expect(html).toContain('Versões publicadas nesta ilha')
    expect(contar(html, '<li ')).toBe(3)
    expect(contar(html, 'No ar')).toBe(1)
    expect(html).toMatch(/data-atual="true"[\s\S]*Versão 3/)
    expect(contar(html, 'Voltar para esta versão')).toBe(2)
    // O nome do botão diz qual versão volta, sem trocar o texto que a pessoa lê.
    expect(html).toContain('<span class="sr-only"> (versão 2)</span>')
    expect(html).toContain('deste cenário')
    expect(html).toContain('de outro cenário')
    expect(html).toContain('<time dateTime="2026-11-21T12:00:00.000Z">')
    expect(botao(html, 'Voltar para esta versão')).not.toContain('disabled=""')
    expect(html).not.toContain('—')
  })

  test('voltar pede o mesmo tique da publicação antes de agir', () => {
    const fechado = desenhar({ tipo: 'confirmando', id: versao(2).id, aceite: false })
    // O botão da linha vira a confirmação; a outra versão continua com o dela.
    expect(contar(fechado, 'Voltar para esta versão')).toBe(1)
    expect(fechado).toContain('type="checkbox"')
    expect(fechado).toContain('Confirmo voltar Bosque dos Bichos para o conteúdo da versão 2.')
    expect(fechado).toContain('Ele entra no ar como versão 4')
    expect(botao(fechado, 'Voltar agora')).toContain('disabled=""')
    expect(botao(fechado, 'Cancelar')).not.toContain('disabled=""')
    const marcado = desenhar({ tipo: 'confirmando', id: versao(2).id, aceite: true })
    expect(botao(marcado, 'Voltar agora')).not.toContain('disabled=""')
    expect(marcado).toMatch(/<input type="checkbox"[^>]*checked=""/)
  })

  test('mostra o andamento, o erro com nova tentativa e o recado de pronto', () => {
    const voltando = desenhar({ tipo: 'voltando', id: versao(2).id })
    expect(voltando).toMatch(/role="status"[^>]*>.*Voltando para a versão 2…/)
    expect(botao(voltando, 'Cancelar')).toContain('disabled=""')
    expect(botao(voltando, 'Voltar agora')).toContain('disabled=""')
    expect(botao(voltando, 'Voltar para esta versão')).toContain('disabled=""')
    expect(voltando).toContain('aria-busy="true"')

    const falhou = desenhar({
      tipo: 'erro',
      id: versao(2).id,
      mensagem: 'Sem conexão agora. Tente de novo.',
      mudou: false,
    })
    expect(falhou).toContain('<p role="alert" class="font-semibold text-mld-danger text-sm">')
    expect(falhou).toContain('Sem conexão agora. Tente de novo.')
    expect(botao(falhou, 'Tentar de novo')).not.toContain('disabled=""')

    const mudou = desenhar({
      tipo: 'erro',
      id: versao(2).id,
      mensagem: 'O destino mudou em outro lugar; confira a versão publicada para continuar.',
      mudou: true,
    })
    expect(mudou).toContain('Atualizar a lista')
    expect(mudou).not.toContain('Tentar de novo')

    const pronto = desenhar({ tipo: 'feito', de: 2, para: 4 })
    expect(pronto).toContain('Pronto! O conteúdo da versão 2 está no ar como versão 4.')
    expect(pronto).toMatch(/role="status" tabindex="-1"/i)
  })

  test('lista carregando, vazia, com erro ou com a publicação em andamento', () => {
    expect(desenhar({ tipo: 'parado' }, { lista: { tipo: 'carregando' } })).toContain(
      'Conferindo as versões…',
    )
    expect(desenhar({ tipo: 'parado' }, { lista: { tipo: 'pronto', versoes: [] } })).toContain(
      'Bosque dos Bichos ainda não tem versões publicadas.',
    )
    expect(
      desenhar({ tipo: 'parado' }, { lista: { tipo: 'erro', mensagem: 'A oficina não abriu' } }),
    ).toContain('<p role="alert" class="text-mld-danger text-sm">A oficina não abriu</p>')
    const publicando = desenhar({ tipo: 'parado' }, { bloqueado: true })
    expect(contar(publicando, 'disabled=""')).toBe(2)
  })
})

function pacote(fonte: { cenario: string; revisao: number; digest: string }, hora: number) {
  return {
    cena: lerCenaCompilada({
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Praça',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte,
      arquivos: [],
      entidades: [],
      nos: [],
      colisoes: [],
      aguas: [],
      caminhos: [],
      marcadores: [],
      texturas: [],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
      licencas: [],
      ambiente: { hora },
    }),
    arquivos: new Map(),
  } satisfies PacoteCompilado
}
const perfil = { tipo: 'arquipelago-v2', ilha: 'bosque' } as const
async function duasVersoes() {
  const host = criarHostEmMemoria({ equipe: true })
  const mundo = await host.criarMundo('equipe', 'Faísca'),
    c = await host.criarCenario(mundo.id, 'Praça')
  const preparo = await host.prepararExportacao(c.id, 0),
    fonte = { ...preparo.fonte, digest: preparo.digest }
  const porta = host.publicacoes!
  for (const [versaoEsperada, hora] of [
    [0, 12],
    [1, 18],
  ])
    await porta.publicar(pacote(fonte, hora), {
      perfil,
      versaoEsperada,
      operacaoId: crypto.randomUUID(),
    })
  const { versoes } = await porta.listarVersoes(perfil)
  return { host, porta, preparo, noAr: versoes[0]!, anterior: versoes[1]! }
}

describe('voltar para uma versão pela oficina', () => {
  test('a nova tentativa repete a mesma operação e a versão nova vem com o conteúdo escolhido', async () => {
    const b = await duasVersoes()
    const operacoes: string[] = []
    let falhar = true
    const porta: PublicacoesDeCenariosHost = {
      ...b.porta,
      async voltarParaVersao(destino, sinal) {
        operacoes.push(destino.operacaoId)
        if (falhar) {
          falhar = false
          throw Error('Sem conexão agora. Tente de novo.')
        }
        return b.porta.voltarParaVersao(destino, sinal)
      },
    }
    const alvo = { ilha: 'bosque' as const, versao: b.anterior, noAr: b.noAr }
    const primeira = await executarVolta(porta, alvo, null)
    expect(primeira.estado).toEqual({
      tipo: 'erro',
      id: b.anterior.id,
      mudou: false,
      mensagem: 'Sem conexão agora. Tente de novo.',
    })
    const segunda = await executarVolta(porta, alvo, primeira.operacao)
    expect(segunda).toEqual({ estado: { tipo: 'feito', de: 1, para: 3 }, operacao: null })
    expect(operacoes).toHaveLength(2)
    expect(operacoes[1]).toBe(operacoes[0]!)
    const { versoes } = await b.porta.listarVersoes(perfil)
    expect(versoes.map((v) => [v.versao, v.atual])).toEqual([
      [3, true],
      [2, false],
      [1, false],
    ])
    expect(versoes[0]!.manifesto).toEqual(b.anterior.manifesto)
    // Repetir com a lista antiga (a v2 no ar) é conflito: a tela pede a lista de novo.
    const vencida = await executarVolta(b.porta, alvo, null)
    expect(vencida.estado).toMatchObject({ tipo: 'erro', mudou: true })
  })

  test('a lista aparece logo abaixo da escolha da ilha, só para quem pode publicar', async () => {
    const b = await duasVersoes()
    const tarefa = {
      estado: { tipo: 'pronto', preparo: b.preparo },
      pendente: false,
      gerar: nada,
      publicar: async () => {},
      cancelar: nada,
      repetir: nada,
    } as unknown as Parameters<typeof Publicar>[0]['tarefa']
    const tela = (autorizado: boolean) =>
      renderToStaticMarkup(
        <Publicar
          host={b.host}
          tarefa={tarefa}
          autorizado={autorizado}
          aoFechar={nada}
          aoReabrir={nada}
          reabrindo={false}
        />,
      )
    const html = tela(true)
    const ilha = html.indexOf('Ilha do Arquipélago'),
      lista = html.indexOf('Versões publicadas nesta ilha'),
      publicar = html.indexOf('Publicar esta versão')
    expect(ilha).toBeGreaterThan(-1)
    expect(lista).toBeGreaterThan(ilha)
    expect(publicar).toBeGreaterThan(lista)
    expect(html).toContain('Conferindo as versões…')
    expect(tela(false)).not.toContain('Versões publicadas nesta ilha')
  })
})
