import { useEffect, useMemo, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosConvidados, podeReceberMoradores, useConvidados } from '../estado/convidados'
import { diaDe } from '../sistemas/moradores'
import {
  encontroNaCasa,
  NOMES_DOS_CONVIDADOS,
  PAINEL_DOS_CONVIDADOS,
} from '../sistemas/visitas-dos-moradores'

export function PainelDosConvidados() {
  const { loja, plataforma } = useJogo()
  const estado = lojaDosConvidados(loja)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DOS_CONVIDADOS)
  const salvamento = useEstado((s) => s.salvamento)
  const quarto = useEstado((s) => s.quarto)
  const jornada = useEstado((s) => s.jornada)
  const pode = useEstado((s) => podeReceberMoradores(s) && s.dentroDeCasa)
  const convidados = useConvidados(estado, (s) => s.convidados)
  const tipo = useConvidados(estado, (s) => s.tipo)
  const titulo = useRef<HTMLHeadingElement>(null)
  const opcoes = useMemo(
    () =>
      ['visita', 'festa'].map((tipo) => ({
        tipo: tipo as 'visita' | 'festa',
        resultado: encontroNaCasa(
          salvamento,
          quarto,
          jornada,
          plataforma.perfil.id,
          diaDe(new Date()),
          tipo as 'visita' | 'festa',
        ),
      })),
    [salvamento, quarto, jornada, plataforma.perfil.id],
  )
  useEffect(() => {
    if (aberto) titulo.current?.focus({ preventScroll: true })
  }, [aberto])
  if (!aberto) return null
  const explicacao = {
    pronto: 'Há espaço para receber.',
    casa: 'Abra a porta nova da casa para receber visitas.',
    aconchego: 'Arrume um cômodo com mais variedade, luz ou plantas.',
    amizade: 'Converse com os moradores nas ilhas para conhecer quem pode visitar.',
    espaco: 'Deixe um espaço livre no cômodo e um caminho desde a porta.',
  }
  return (
    <div className="arq-sobre">
      <section
        className="arq-menu arq-cartao arq-quadro arq-convidados"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-convidados-titulo"
      >
        <h2 ref={titulo} tabIndex={-1} id="arq-convidados-titulo">
          Moradores em casa
        </h2>
        <p className="arq-quadro-sub">
          Um cômodo com 12 pontos de aconchego recebe uma visita. Com 22, você pode reunir até três
          moradores. Cada pessoa vem depois que você a conhece.
        </p>
        {!pode && <p className="arq-aviso atencao">Entre na sua casa para receber os moradores.</p>}
        <p role="status">
          {convidados.length
            ? `Na casa: ${convidados.map((c) => NOMES_DOS_CONVIDADOS[c.quem]).join(', ')}.`
            : tipo === 'descanso'
              ? 'A casa está em descanso. Você pode convidar outra vez.'
              : 'As visitas chegam quando há espaço e você está perto de casa.'}
        </p>
        <ul className="arq-quadro-lista">
          {opcoes.map((o) => (
            <li className="arq-quadro-cartao" key={o.tipo}>
              <div>
                <h3>{o.tipo === 'visita' ? 'Receber uma visita' : 'Festa em casa'}</h3>
                <p>
                  {o.resultado.pontos} pontos no cômodo mais aconchegante.{' '}
                  {explicacao[o.resultado.motivo]}
                </p>
              </div>
              <button
                type="button"
                className="arq-botao"
                disabled={!pode || o.resultado.motivo !== 'pronto'}
                onClick={() => {
                  if (estado.getState().convidar(o.tipo, plataforma.perfil.id))
                    loja.getState().abrirPainel(null)
                }}
              >
                {o.tipo === 'visita' ? 'Receber visita' : 'Começar festa'}
              </button>
            </li>
          ))}
        </ul>
        <p className="arq-quadro-sub">
          As conversas e os presentes seguem o mesmo limite de cada dia. Construir ou sair da ilha
          encerra a presença. Nada da sua amizade se perde.
        </p>
        <div className="arq-menu-acoes">
          <button
            type="button"
            className="arq-botao leve"
            onClick={() => estado.getState().dispensar()}
          >
            Descansar das visitas
          </button>
          <button
            type="button"
            className="arq-botao leve"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </section>
    </div>
  )
}
