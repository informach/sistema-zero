import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { salvamentoPausado } from '../sistemas/pausa'
import type { FilaDeSalvamento } from '../sistemas/salvar'

export function SalvamentoDoJogo({ fila }: { fila: FilaDeSalvamento }) {
  const { plataforma } = useJogo()
  const situacao = useEstado((s) => s.salvamentoSituacao)
  const dialogo = useRef<HTMLDialogElement>(null)
  const [ocupado, setOcupado] = useState(false)
  const bloqueado = salvamentoPausado(situacao)
  useEffect(() => {
    const atual = dialogo.current
    if (bloqueado && atual && !atual.open) atual.showModal()
    return () => {
      if (atual?.open) atual.close()
    }
  }, [bloqueado])
  const executar = async (acao: () => Promise<void>) => {
    setOcupado(true)
    try {
      await acao()
    } catch (erro) {
      plataforma.relatarErro(erro, 'recuperar-salvamento')
    } finally {
      setOcupado(false)
    }
  }
  const baixar = () => {
    const url = URL.createObjectURL(new Blob([fila.copiaLocal()], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'arquipelago-progresso-deste-aparelho.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  if (situacao === 'offline')
    return (
      <div className="arq-dica" role="status">
        Seu progresso está guardado neste aparelho. Vamos enviá-lo quando a conexão voltar.
      </div>
    )
  if (!bloqueado) return null
  return (
    <dialog
      ref={dialogo}
      className="arq-tela arq-modal-salvamento"
      aria-labelledby="arq-salvamento-titulo"
      onCancel={(e) => e.preventDefault()}
    >
      <div>
        <div className="arq-zappy" aria-hidden="true" />
        <h1 id="arq-salvamento-titulo">
          {situacao === 'confirmando'
            ? 'Vamos confirmar seu pedido'
            : situacao === 'conflito'
              ? 'Seu jogo mudou em outro aparelho'
              : 'Vamos proteger seu progresso'}
        </h1>
        <p>
          {situacao === 'confirmando'
            ? 'Seu pedido está guardado. Vamos conferir o resultado sem repetir a entrega nem a cobrança. Você pode tentar novamente ou voltar depois.'
            : situacao === 'conflito'
              ? 'As duas versões têm mudanças diferentes. Escolha qual quer continuar. A outra versão será substituída. Você pode baixar uma cópia deste aparelho antes de escolher.'
              : situacao === 'recusado'
                ? 'O serviço não aceitou o salvamento. Seu progresso está guardado neste aparelho. Tente novamente ou baixe uma cópia antes de voltar para a plataforma.'
                : 'Não conseguimos guardar o jogo neste aparelho. Pausamos para evitar perder mudanças. Tente novamente ou baixe uma cópia antes de sair.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {situacao === 'conflito' ? (
            <>
              <button
                type="button"
                className="arq-botao"
                disabled={ocupado}
                onClick={() => void executar(() => fila.resolver('local'))}
              >
                Continuar com este aparelho
              </button>
              <button
                type="button"
                className="arq-botao leve"
                disabled={ocupado}
                onClick={() => void executar(() => fila.resolver('remoto'))}
              >
                Usar a versão online
              </button>
            </>
          ) : (
            <button
              type="button"
              className="arq-botao"
              disabled={ocupado}
              onClick={() =>
                void executar(() =>
                  situacao === 'confirmando' ? fila.retomarOperacoes() : fila.salvarAgora(),
                )
              }
            >
              Tentar novamente
            </button>
          )}
          <button type="button" className="arq-botao leve" onClick={baixar}>
            Baixar cópia deste aparelho
          </button>
          <button
            type="button"
            className="arq-botao leve"
            disabled={ocupado}
            onClick={() => plataforma.voltarParaPlataforma()}
          >
            Voltar para a plataforma
          </button>
        </div>
      </div>
    </dialog>
  )
}
