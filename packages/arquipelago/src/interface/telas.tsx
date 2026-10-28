import type { Acesso } from '@sistemazero/arquipelago-contracts'

export function TelaCarregando() {
  return (
    <div className="arq-tela" role="status">
      <div>
        <div className="arq-zappy" />
        <h1>Acendendo o Arquipélago</h1>
        <p>O Zappy está trazendo a sua casa e o seu avatar.</p>
      </div>
    </div>
  )
}

const MOTIVOS: Record<NonNullable<Acesso['motivo']>, string> = {
  desligado: 'O Arquipélago Vagalume ainda não abriu. A equipe avisa quando chegar a sua vez.',
  'fora-da-lista':
    'O Arquipélago Vagalume ainda não abriu para todo mundo. A equipe avisa quando chegar a sua vez.',
  'publico-desligado': 'O Arquipélago Vagalume ainda não chegou nesta comunidade.',
}

export function TelaBloqueado({
  motivo,
  aoVoltar,
}: {
  motivo: NonNullable<Acesso['motivo']>
  aoVoltar: () => void
}) {
  return (
    <div className="arq-tela">
      <div>
        <div className="arq-zappy" />
        <h1>Quase lá</h1>
        <p>{MOTIVOS[motivo]}</p>
        <button type="button" className="arq-botao" onClick={aoVoltar}>
          Voltar para a plataforma
        </button>
      </div>
    </div>
  )
}

export function TelaDescanso({ aoVoltar }: { aoVoltar: () => void }) {
  return (
    <div className="arq-tela">
      <div>
        <div className="arq-zappy" />
        <h1>Hora de descansar</h1>
        <p>
          O tempo livre de hoje no Arquipélago acabou. A sua casa e a sua horta esperam por você
          amanhã.
        </p>
        <button type="button" className="arq-botao" onClick={aoVoltar}>
          Voltar para a plataforma
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
  return (
    <div className="arq-tela" role="alert">
      <div>
        <div className="arq-zappy" />
        <h1>O Arquipélago não abriu agora</h1>
        <p>{mensagem ?? 'Não conseguimos carregar o jogo. Tente de novo daqui a pouco.'}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="arq-botao" onClick={aoTentar}>
            Tentar de novo
          </button>
          <button type="button" className="arq-botao leve" onClick={aoVoltar}>
            Voltar para a plataforma
          </button>
        </div>
      </div>
    </div>
  )
}
