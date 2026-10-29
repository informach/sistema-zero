import type { Acesso } from '@sistemazero/arquipelago-contracts'
import { useVoz } from './voz'

export function TelaCarregando() {
  const voz = useVoz()
  return (
    <div className="arq-tela" role="status">
      <div>
        <div className="arq-zappy" />
        <h1>{voz.carregando.titulo}</h1>
        <p>{voz.carregando.texto}</p>
      </div>
    </div>
  )
}

export function TelaBloqueado({
  motivo,
  aoVoltar,
}: {
  motivo: NonNullable<Acesso['motivo']>
  aoVoltar: () => void
}) {
  const voz = useVoz()
  return (
    <div className="arq-tela">
      <div>
        <div className="arq-zappy" />
        <h1>{voz.bloqueado.titulo}</h1>
        <p>{voz.bloqueado.motivos[motivo]}</p>
        <button type="button" className="arq-botao" onClick={aoVoltar}>
          {voz.voltar}
        </button>
      </div>
    </div>
  )
}

export function TelaDescanso({ aoVoltar }: { aoVoltar: () => void }) {
  const voz = useVoz()
  return (
    <div className="arq-tela">
      <div>
        <div className="arq-zappy" />
        <h1>{voz.descanso.titulo}</h1>
        <p>{voz.descanso.texto}</p>
        <button type="button" className="arq-botao" onClick={aoVoltar}>
          {voz.voltar}
        </button>
      </div>
    </div>
  )
}

export function TelaErro({
  aoTentar,
  aoVoltar,
  mensagem,
}: {
  aoTentar: () => void
  aoVoltar: () => void
  mensagem?: string
}) {
  const voz = useVoz()
  return (
    <div className="arq-tela" role="alert">
      <div>
        <div className="arq-zappy" />
        <h1>{voz.erro.titulo}</h1>
        <p>{mensagem ?? voz.erro.texto}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="arq-botao" onClick={aoTentar}>
            Tentar de novo
          </button>
          <button type="button" className="arq-botao leve" onClick={aoVoltar}>
            {voz.voltar}
          </button>
        </div>
      </div>
    </div>
  )
}
