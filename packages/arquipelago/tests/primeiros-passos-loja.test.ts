import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, type Plataforma } from '@sistemazero/arquipelago-contracts'
import { criarLoja } from '../src/estado/loja'
import { lojaDosPassos, PAINEL_DOS_PASSOS } from '../src/estado/primeiros-passos'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import {
  INICIO_DA_OBRA,
  ISSO_MS,
  indiceDoPasso,
  LEMBRETE_MS,
  type Leitura,
  PASSO_FINAL,
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
const ler = (parte: Partial<Leitura> = {}): Leitura => ({ ...LEITURA, ...parte })
const i = indiceDoPasso

function montar() {
  const plataforma = criarPlataformaFalsa() as Plataforma
  const loja = criarLoja({
    salvamento: criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z')),
    jornada: 1,
    quarto: { theme: 'padrao', placedItems: [] } as never,
    avatar: { slots: {} },
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
    } as never,
    aoMudar: () => {},
  })
  return { loja, passos: lojaDosPassos(loja, plataforma) }
}

describe('a loja dos primeiros passos', () => {
  test('começa no oi; fala sem tarefa avança no X', () => {
    const { passos } = montar()
    passos.getState().comecar(ler(), 'recomecar')
    expect(passos.getState()).toMatchObject({ situacao: 'andando', indice: 0, fase: 'fala' })
    passos.getState().fechar(ler())
    expect(passos.getState().indice).toBe(i('andar'))
  })

  test('tarefa feita mostra "Isso." e a próxima fala chega sozinha', () => {
    const { passos } = montar()
    passos.getState().comecar(ler(), 'recomecar')
    passos.getState().fechar(ler())
    passos.getState().relogio(ler({ andou: 2.5 }), 1000)
    expect(passos.getState().fase).toBe('isso')
    passos.getState().relogio(ler({ andou: 2.5 }), 1000 + ISSO_MS - 1)
    expect(passos.getState().indice).toBe(i('andar'))
    passos.getState().relogio(ler({ andou: 2.5 }), 1000 + ISSO_MS)
    expect(passos.getState()).toMatchObject({ indice: i('olhar'), fase: 'fala', aberta: true })
  })

  test('o X numa fala com tarefa só recolhe a fala; a tarefa continua', () => {
    const { passos } = montar()
    passos.getState().comecar(ler(), 'recomecar')
    passos.getState().fechar(ler())
    passos.getState().fechar(ler())
    expect(passos.getState()).toMatchObject({ indice: i('andar'), aberta: false })
    passos.getState().reabrir()
    expect(passos.getState().aberta).toBe(true)
  })

  test('o que o jogo já tem vira lembrete e segue sozinho', () => {
    const { passos } = montar()
    passos.setState({ indice: i('pular') })
    const feita = ler({ portaNova: true, pedido: 'plantar', pulou: 1 })
    passos.getState().comecar(feita, 'continuar')
    passos.getState().relogio(feita, 1)
    passos.getState().relogio(feita, 1 + ISSO_MS)
    expect(passos.getState()).toMatchObject({ indice: i('porta-perto'), fase: 'lembrete' })
    const agora = Date.now()
    passos.getState().relogio(ler({ portaNova: true, pedido: 'plantar' }), agora + LEMBRETE_MS)
    expect(passos.getState().indice).toBe(i('porta-usar'))
  })

  test('pular guarda onde parou; continuar volta dali', () => {
    const { passos } = montar()
    passos.setState({ indice: i('regar') })
    passos.getState().comecar(ler({ portaNova: true, pedido: 'regar' }), 'continuar')
    passos.getState().pular()
    expect(passos.getState()).toMatchObject({ situacao: 'pulado', indice: i('regar') })
    passos.getState().comecar(ler({ portaNova: true, pedido: 'regar' }), 'continuar')
    expect(passos.getState()).toMatchObject({ situacao: 'andando', indice: i('regar') })
  })

  test('"Depois" leva ao fim; o X do fim termina e solta as falas seguradas', () => {
    const { loja, passos } = montar()
    const l = ler({ portaNova: true, pedido: null, temGeladeira: true })
    passos.setState({ indice: i('escolha') })
    passos.getState().comecar(l, 'continuar')
    passos
      .getState()
      .adiar('Chegou o projeto azul: planta de interior. Ponha em casa no modo Construir.')
    passos.getState().escolherObra('depois', l)
    expect(passos.getState()).toMatchObject({ indice: PASSO_FINAL, obraPendente: true })
    loja.getState().abrirPainel(PAINEL_DOS_PASSOS)
    passos.getState().fechar(l)
    expect(passos.getState().situacao).toBe('feito')
    expect(loja.getState().painelAberto).toBeNull()
    expect(loja.getState().dica?.texto).toContain('planta de interior')
  })

  test('a obra deixada para depois volta no Construir e termina na geladeira', () => {
    const { passos } = montar()
    passos.setState({ situacao: 'feito', obraPendente: true })
    const construindo = ler({
      portaNova: true,
      pedido: null,
      temGeladeira: true,
      construindo: true,
    })
    passos.getState().retomarObra(construindo)
    expect(passos.getState()).toMatchObject({
      situacao: 'andando',
      indice: INICIO_DA_OBRA,
      soObra: true,
    })
    passos.getState().relogio({ ...construindo, obra: 'agora', comodoNovo: true }, 1)
    passos.getState().relogio({ ...construindo, obra: 'agora', comodoNovo: true }, 1 + ISSO_MS)
    expect(passos.getState().indice).toBe(i('porta-do-comodo'))
    const comPorta = {
      ...construindo,
      obra: 'agora' as const,
      comodoNovo: true,
      portaNoComodo: true,
    }
    passos.getState().relogio(comPorta, 5)
    passos.getState().relogio(comPorta, 5 + ISSO_MS)
    expect(passos.getState().indice).toBe(i('objetos'))
    const posta = { ...comPorta, geladeiraPosta: true }
    passos.getState().relogio(posta, 10)
    passos.getState().relogio(posta, 10 + ISSO_MS)
    expect(passos.getState().indice).toBe(i('pronto'))
    const viver = { ...posta, construindo: false }
    passos.getState().relogio(viver, 20)
    expect(passos.getState().indice).toBe(i('geladeira'))
    passos.getState().fechar(viver)
    expect(passos.getState()).toMatchObject({
      situacao: 'feito',
      obraPendente: false,
      soObra: false,
    })
  })

  test('as dicas entram na fila uma vez, passam fala a fala e ficam vistas', () => {
    const { passos } = montar()
    expect(passos.getState().pedirDica('barco')).toBe(true)
    expect(passos.getState().pedirDica('barco')).toBe(false)
    passos.getState().proximaFalaDaDica(2)
    expect(passos.getState().falaDaDica).toBe(1)
    passos.getState().proximaFalaDaDica(2)
    expect(passos.getState().fila).toHaveLength(0)
    expect(passos.getState().dicas.vistas).toEqual(['barco'])
    expect(passos.getState().pedirDica('barco')).toBe(false)
    passos.getState().reverDica('barco')
    expect(passos.getState().fila[0]).toEqual({ id: 'barco', rever: true })
  })

  test('desligar as dicas esvazia a fila (o rever do menu continua)', () => {
    const { passos } = montar()
    passos.getState().pedirDica('noite')
    passos.getState().reverDica('barco')
    passos.getState().ligarDicas(false)
    expect(passos.getState().fila).toEqual([{ id: 'barco', rever: true }])
    expect(passos.getState().pedirDica('lanterna')).toBe(false)
    passos.getState().ligarDicas(true)
    expect(passos.getState().pedirDica('lanterna')).toBe(true)
  })
})
