import type { RespostaSessaoTempo } from '@sistemazero/arquipelago-contracts'
import type { criarSessaoTempo } from './sessao-tempo'

type SessaoTempo = ReturnType<typeof criarSessaoTempo>

/** Coordena mudanças rápidas de visibilidade/menu sem liberar o jogo antes da sessão. */
export function criarGerenteTempo(opcoes: {
  sessao: SessaoTempo
  sincronizando: (valor: boolean) => void
  aoErro: (erro: unknown) => void
  inicialmenteAtivo?: boolean
}) {
  let desejado = opcoes.inicialmenteAtivo ?? true
  let revisao = 0
  let fechado = false

  function lidar(resultado: RespostaSessaoTempo | null, ativo: boolean) {
    if (ativo && resultado && ['expirada', 'substituida', 'encerrada'].includes(resultado.situacao))
      throw new Error('A sessão de tempo precisa ser retomada')
  }

  function falhar(erro: unknown) {
    if (!fechado) opcoes.aoErro(erro)
  }

  return {
    valida: () => !fechado && opcoes.sessao.valida(),
    atualizar(ativo: boolean): void {
      if (fechado || ativo === desejado) return
      desejado = ativo
      const minhaRevisao = ++revisao
      if (ativo) opcoes.sincronizando(true)
      const operacao = ativo ? opcoes.sessao.iniciar() : opcoes.sessao.pausar()
      void operacao
        .then((resultado) => lidar(resultado, ativo))
        .catch(falhar)
        .finally(() => {
          if (!fechado && minhaRevisao === revisao) opcoes.sincronizando(false)
        })
    },
    verificar(): boolean {
      if (!desejado || fechado) return false
      if (opcoes.sessao.valida()) return true
      // A concessão pode terminar exatamente no limite diário. Bloqueia a entrada
      // e pergunta ao servidor se o tempo acabou antes de apresentar um erro.
      opcoes.sincronizando(true)
      const minhaRevisao = ++revisao
      void opcoes.sessao
        .pulsar()
        .then(async (resultado) => {
          if (fechado || !desejado || minhaRevisao !== revisao) return
          // Uma concessão pode vencer na virada do dia sem esgotar o novo limite.
          if (resultado.situacao === 'expirada') {
            lidar(await opcoes.sessao.iniciar(), true)
          } else lidar(resultado, true)
        })
        .catch(falhar)
        .finally(() => {
          if (!fechado && minhaRevisao === revisao) opcoes.sincronizando(false)
        })
      return false
    },
    pulsar(): void {
      if (!desejado || fechado) return
      void opcoes.sessao
        .pulsar()
        .then((resultado) => lidar(resultado, true))
        .catch(falhar)
    },
    async recuperar(): Promise<void> {
      if (fechado) throw new Error('Controle de tempo encerrado')
      const resultado = await opcoes.sessao.recuperar()
      if (resultado?.situacao === 'substituida') throw new Error('O jogo foi aberto em outra aba')
    },
    async encerrar(): Promise<void> {
      if (fechado) return
      fechado = true
      revisao++
      await opcoes.sessao.encerrar()
    },
  }
}
