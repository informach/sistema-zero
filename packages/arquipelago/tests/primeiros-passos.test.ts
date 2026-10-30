import { describe, expect, test } from 'bun:test'
import { VOZ_ADULTA } from '../src/adulto/voz-adulta'
import { VOZ_KIDS } from '../src/interface/voz'
import {
  type ContextoDaDica,
  DICAS,
  IDS_DAS_DICAS,
  lerMarcaDasDicas,
  podeMostrar,
} from '../src/sistemas/dicas'
import {
  anelDoPasso,
  carimbosDoFim,
  comoComeca,
  cumpriu,
  deveComecarSozinho,
  type Entrada,
  frasesDaPlanta,
  IDS_DOS_PASSOS,
  indiceDoPasso,
  type Leitura,
  lerMarca,
  PASSO_FINAL,
  PASSOS,
  passoQueVale,
  voltarAoConstruir,
} from '../src/sistemas/primeiros-passos'

const LEITURA: Leitura = {
  portaNova: false,
  pedido: 'porta',
  temGeladeira: false,
  geladeiraPosta: false,
  comodoNovo: false,
  portaNoComodo: false,
  construindo: false,
  menuAberto: false,
  alvo: null,
  andou: 0,
  girou: 0,
  pulou: 0,
  obra: null,
}
const ler = (parte: Partial<Leitura>): Leitura => ({ ...LEITURA, ...parte })
const ENTRADAS: Entrada[] = ['teclado', 'toque', 'controle']
const i = indiceDoPasso

/** As regras dos textos da casa: sem travessão, sem exclamação, sem começar perguntando. */
function confereTexto(t: string) {
  expect(t.length).toBeGreaterThan(0)
  expect(t).not.toMatch(/[—!]/)
  expect(t).not.toMatch(/^[^.]*\?/)
}

describe('o roteiro dos primeiros passos', () => {
  test('23 falas em 6 capítulos, na ordem da proposta', () => {
    expect(PASSOS.map((p) => p.id)).toEqual([...IDS_DOS_PASSOS])
    expect(PASSOS).toHaveLength(23)
    const capitulos = PASSOS.map((p) => p.capitulo)
    expect(capitulos[0]).toBe(1)
    expect(capitulos.at(-1)).toBe(6)
    for (let k = 1; k < capitulos.length; k++)
      expect(capitulos[k]!).toBeGreaterThanOrEqual(capitulos[k - 1]!)
  })

  test('toda fala segue as regras dos textos, em todo jeito de jogar e nos dois públicos', () => {
    for (const voz of [VOZ_KIDS, VOZ_ADULTA])
      for (const entrada of ENTRADAS)
        for (const semente of [null, 'alface', 'tomate', 'milho'] as const)
          for (const p of PASSOS)
            confereTexto(p.fala({ entrada, nome: 'Lia', semente, falaDoMapa: voz.passos.mapa }))
  })

  test('a primeira fala chama pelo nome e se apresenta', () => {
    const fala = PASSOS[0]!.fala({ entrada: 'teclado', nome: 'Lia', semente: null, falaDoMapa: '' })
    expect(fala).toStartWith('Oi, Lia. Eu sou o Zappy.')
  })

  test('o texto e a tecla mudam com o jeito de jogar', () => {
    const andar = PASSOS[i('andar')]!
    const textos = ENTRADAS.map((entrada) =>
      andar.fala({ entrada, nome: 'Lia', semente: null, falaDoMapa: '' }),
    )
    expect(new Set(textos).size).toBe(3)
    expect(andar.tarefa?.teclas?.teclado).toEqual(['W', 'A', 'S', 'D'])
    expect(anelDoPasso(PASSOS[i('pular')]!, 'toque')).toBe('pular')
    expect(anelDoPasso(PASSOS[i('pular')]!, 'teclado')).toBeNull()
  })

  test('a planta da horta dá o nome e o tempo de verdade, com o gênero certo', () => {
    expect(frasesDaPlanta('alface')).toEqual({
      cresce: 'A alface cresce de verdade, em uns três minutos.',
      pronta: 'A alface ficou pronta.',
    })
    expect(frasesDaPlanta('milho').cresce).toBe('O milho cresce de verdade, em uns oito minutos.')
    expect(frasesDaPlanta('tomate').pronta).toBe('O tomate ficou pronto.')
  })

  test('a geladeira pede um cômodo novo, e a fala diz isso (no quarto ela não vai)', () => {
    const fala = PASSOS[i('escolha')]!.fala({
      entrada: 'teclado',
      nome: '',
      semente: null,
      falaDoMapa: '',
    })
    expect(fala).toContain('cômodo novo, fora do quarto')
  })
})

describe('o que conta como feito', () => {
  test('andar, olhar e pular só contam fazendo de verdade', () => {
    expect(cumpriu(i('andar'), ler({ andou: 1.9 }))).toBe(false)
    expect(cumpriu(i('andar'), ler({ andou: 2 }))).toBe(true)
    expect(cumpriu(i('olhar'), ler({ girou: 0.5 }))).toBe(false)
    expect(cumpriu(i('olhar'), ler({ girou: 0.8 }))).toBe(true)
    expect(cumpriu(i('pular'), ler({ pulou: 1 }))).toBe(true)
  })

  test('a porta: chegar perto, depois abrir', () => {
    expect(cumpriu(i('porta-perto'), ler({ alvo: 'porta-nova' }))).toBe(true)
    expect(cumpriu(i('porta-usar'), ler({ alvo: 'porta-nova' }))).toBe(false)
    expect(cumpriu(i('porta-usar'), ler({ portaNova: true, pedido: 'plantar' }))).toBe(true)
  })

  test('a horta segue a etapa do primeiro pedido', () => {
    expect(cumpriu(i('plantar'), ler({ portaNova: true, pedido: 'plantar' }))).toBe(false)
    expect(cumpriu(i('plantar'), ler({ portaNova: true, pedido: 'regar' }))).toBe(true)
    expect(cumpriu(i('regar'), ler({ portaNova: true, pedido: 'crescer' }))).toBe(true)
    expect(cumpriu(i('colher'), ler({ temGeladeira: true, pedido: null }))).toBe(true)
  })

  test('ler e fechar não conta: as falas sem tarefa não se cumprem sozinhas', () => {
    for (const id of ['oi', 'barrinhas', 'mochila', 'mapa', 'geladeira', 'fim'] as const)
      expect(cumpriu(i(id), ler({ andou: 9, pulou: 9, girou: 9, menuAberto: true }))).toBe(false)
  })
})

describe('o caminho entre as falas', () => {
  test('o que o jogo já tem vira lembrete, não tarefa', () => {
    const feita = ler({ portaNova: true, pedido: 'plantar' })
    expect(comoComeca(i('porta-perto'), feita)).toBe('lembrete')
    expect(comoComeca(i('porta-usar'), feita)).toBe('lembrete')
    expect(comoComeca(i('plantar'), feita)).toBe('fala')
  })

  test('a espera da planta só aparece enquanto ela cresce', () => {
    expect(passoQueVale(i('crescer'), ler({ pedido: 'crescer' }))).toBe(i('crescer'))
    expect(passoQueVale(i('crescer'), ler({ pedido: 'colher' }))).toBe(i('barrinhas'))
    expect(passoQueVale(i('explorar'), ler({ pedido: 'colher' }))).toBe(i('colher'))
  })

  test('a colheita espera a planta amadurecer', () => {
    const colher = PASSOS[i('colher')]!
    expect(colher.esperar?.(ler({ pedido: 'crescer' }))).toBe(false)
    expect(colher.esperar?.(ler({ pedido: 'colher' }))).toBe(true)
  })

  test('"Depois" pula a obra e vai para o fim; "Fazer agora" passa por ela', () => {
    const depois = ler({ temGeladeira: true, pedido: null, obra: 'depois' })
    expect(passoQueVale(i('construir'), depois)).toBe(PASSO_FINAL)
    const agora = ler({ temGeladeira: true, pedido: null, obra: 'agora' })
    expect(passoQueVale(i('construir'), agora)).toBe(i('construir'))
    expect(cumpriu(i('construir'), { ...agora, construindo: true })).toBe(true)
    expect(cumpriu(i('parede'), { ...agora, construindo: true, comodoNovo: true })).toBe(true)
    expect(cumpriu(i('objetos'), { ...agora, construindo: true, geladeiraPosta: true })).toBe(true)
  })

  test('saindo do Construir no meio da obra, a fala volta a pedir o Construir', () => {
    const fora = ler({ temGeladeira: true, pedido: null, obra: 'agora', construindo: false })
    expect(voltarAoConstruir(i('parede'), fora)).toBe(i('construir'))
    expect(voltarAoConstruir(i('objetos'), fora)).toBe(i('construir'))
    expect(voltarAoConstruir(i('parede'), { ...fora, construindo: true })).toBe(i('parede'))
  })

  test('a geladeira já posta pula a escolha e a obra', () => {
    const posta = ler({ temGeladeira: true, pedido: null, geladeiraPosta: true })
    expect(passoQueVale(i('escolha'), posta)).toBe(i('geladeira'))
  })

  test('o fim mostra o que ela já sabe; Construir só com a geladeira posta', () => {
    expect(carimbosDoFim(false)).not.toContain('Construir')
    expect(carimbosDoFim(true)).toContain('Construir')
  })
})

describe('quem vê sozinho', () => {
  const base = { temGeladeira: false, jogoNovo: false, somenteLeitura: false, visitando: false }
  test('quem nunca começou e ainda não tem a geladeira', () => {
    expect(deveComecarSozinho({ ...base, marca: undefined })).toBe(true)
    expect(deveComecarSozinho({ ...base, marca: undefined, temGeladeira: true })).toBe(false)
  })
  test('parado no meio continua; pulado ou feito só pelo menu', () => {
    expect(deveComecarSozinho({ ...base, marca: { situacao: 'andando', passo: 'regar' } })).toBe(
      true,
    )
    expect(deveComecarSozinho({ ...base, marca: { situacao: 'pulado', passo: 'regar' } })).toBe(
      false,
    )
    expect(deveComecarSozinho({ ...base, marca: { situacao: 'feito', passo: 'fim' } })).toBe(false)
  })
  test('sem armazenamento, só num jogo novo; nunca no suporte nem na casa do irmão', () => {
    expect(deveComecarSozinho({ ...base, marca: null })).toBe(false)
    expect(deveComecarSozinho({ ...base, marca: null, jogoNovo: true })).toBe(true)
    expect(deveComecarSozinho({ ...base, marca: undefined, somenteLeitura: true })).toBe(false)
    expect(deveComecarSozinho({ ...base, marca: undefined, visitando: true })).toBe(false)
  })
  test('a marca guardada estranha conta como ausente', () => {
    expect(lerMarca('{"situacao":"andando","passo":"regar"}')).toEqual({
      situacao: 'andando',
      passo: 'regar',
    })
    expect(lerMarca('{"situacao":"voando","passo":"regar"}')).toBeUndefined()
    expect(lerMarca('{"situacao":"feito","passo":"nadar"}')).toBeUndefined()
    expect(lerMarca('nada')).toBeUndefined()
    expect(lerMarca(null)).toBeUndefined()
  })
})

describe('as dicas de primeira vez', () => {
  const contexto = (parte: Partial<ContextoDaDica> = {}): ContextoDaDica => ({
    entrada: 'teclado',
    barcoDeCasa: true,
    vilaAberta: false,
    temLanterna: false,
    energiaBaixa: false,
    temCama: true,
    falaDoCurso: VOZ_KIDS.passos.curso,
    ...parte,
  })

  test('as quatro da proposta (Quadro, barco, Lumis, primeira noite), com as falas certas', () => {
    expect(DICAS.quadro.falas(contexto())).toHaveLength(3)
    expect(DICAS['quadro-painel'].falas(contexto())).toHaveLength(1)
    expect(DICAS.barco.falas(contexto())).toHaveLength(2)
    expect(DICAS['barco-chegada'].falas(contexto())).toHaveLength(1)
    expect(DICAS.lanterna.falas(contexto())).toHaveLength(1)
    expect(DICAS.borrao.falas(contexto())).toHaveLength(2)
    expect(DICAS.lumi.falas(contexto())).toHaveLength(2)
  })

  test('todas as falas seguem as regras dos textos', () => {
    for (const entrada of ENTRADAS)
      for (const id of IDS_DAS_DICAS)
        for (const c of [
          contexto({ entrada }),
          contexto({ entrada, barcoDeCasa: false, vilaAberta: true }),
          contexto({ entrada, vilaAberta: true, temLanterna: true }),
          contexto({ entrada, energiaBaixa: true }),
        ])
          for (const f of DICAS[id].falas(c)) confereTexto(f.texto)
  })

  test('o barco diz para onde vai, conforme o porto', () => {
    expect(DICAS.barco.falas(contexto())[0]?.texto).toContain('até o Recife Coral')
    expect(DICAS.barco.falas(contexto({ barcoDeCasa: false }))[0]?.texto).toContain(
      'de volta para a sua ilha',
    )
  })

  test('a primeira noite: uma fala sempre e só mais uma, a que combina', () => {
    const so = DICAS.noite.falas(contexto())
    expect(so).toHaveLength(1)
    expect(so[0]?.texto).toContain('uns quatro minutos')
    expect(
      DICAS.noite.falas(contexto({ vilaAberta: true, temLanterna: true }))[1]?.texto,
    ).toContain('Leve a lanterna')
    expect(DICAS.noite.falas(contexto({ vilaAberta: true }))[1]?.texto).toContain('Bento')
    const cansada = DICAS.noite.falas(contexto({ vilaAberta: true, energiaBaixa: true }))
    expect(cansada).toHaveLength(2)
    expect(cansada[1]?.texto).toContain('cama')
    expect(DICAS.noite.falas(contexto({ energiaBaixa: true, temCama: false }))).toHaveLength(1)
  })

  test('uma vez só, e nunca com as dicas desligadas', () => {
    const nada = { vistas: [], desligadas: false }
    expect(podeMostrar('barco', nada, [])).toBe(true)
    expect(podeMostrar('barco', nada, ['barco'])).toBe(false)
    expect(podeMostrar('barco', { vistas: ['barco'], desligadas: false }, [])).toBe(false)
    expect(podeMostrar('barco', { vistas: [], desligadas: true }, [])).toBe(false)
  })

  test('o que fica no aparelho volta limpo', () => {
    expect(lerMarcaDasDicas('{"vistas":["barco","barco","voar"],"desligadas":true}')).toEqual({
      vistas: ['barco'],
      desligadas: true,
    })
    expect(lerMarcaDasDicas('quebrado')).toEqual({ vistas: [], desligadas: false })
  })
})
