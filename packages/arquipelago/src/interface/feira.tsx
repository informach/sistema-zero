import { GALERIA, type IdDaGaleria } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaGaleria, useGaleria } from '../estado/galeria'
import { PAINEL_DA_FEIRA, podeVerAparenciaNaFeira, vitrineDaSemana } from '../sistemas/feira'
import { salvamentoPausado } from '../sistemas/pausa'
import { type Avisar, CartaoDaGaleria } from './galeria'
import { InsumosDaFeira } from './insumos'
import { MINIATURA_DO_OBJETO } from './miniaturas'
import { VestuarioDaFesta } from './vestuario'

export function PainelDaFeira() {
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DA_FEIRA)
  return aberto ? <FeiraAberta /> : null
}
function FeiraAberta() {
  const { loja, plataforma } = useJogo()
  const galeria = lojaDaGaleria(loja, plataforma)
  const fechada = useGaleria(galeria, (s) => s.fechada)
  const carregando = useGaleria(galeria, (s) => s.carregando)
  const [vitrine, setVitrine] = useState(() => vitrineDaSemana(new Date()))
  const [aviso, avisar] = useState<Parameters<Avisar>[0]>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
    void galeria.getState().carregar()
    const timer = setInterval(
      () =>
        setVitrine((anterior) => {
          const atual = vitrineDaSemana(new Date())
          return atual?.semana === anterior?.semana ? anterior : atual
        }),
      60_000,
    )
    return () => clearInterval(timer)
  }, [galeria])
  return (
    <div className="arq-sobre">
      <section
        className="arq-menu arq-cartao arq-quadro arq-feira"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-feira-titulo"
      >
        <h2 ref={titulo} tabIndex={-1} id="arq-feira-titulo">
          Feira da Vila Doce
        </h2>
        <p className="arq-quadro-sub">
          Três aparências ganham destaque a cada semana. As outras continuam aqui pelo mesmo preço.
          Tudo que você comprou continua seu.
        </p>
        <p className="arq-caderno-explica">
          A aparência muda o visual. O projeto azul já funciona sem comprar.
        </p>
        {aviso && (
          <p role="status" className={`arq-aviso ${aviso.tom}`}>
            {aviso.texto}
          </p>
        )}
        {fechada && (
          <div>
            <p className="arq-aviso atencao">A galeria não carregou agora.</p>
            <button
              type="button"
              className="arq-botao leve"
              disabled={carregando}
              onClick={() => void galeria.getState().carregar()}
            >
              Tentar abrir a galeria
            </button>
          </div>
        )}
        {vitrine && (
          <>
            <h3 className="arq-menu-titulo">Destaques da semana</h3>
            <div className="arq-feira-itens">
              {vitrine.destaques.map((id) => (
                <ItemDaFeira key={id} id={id} avisar={avisar} />
              ))}
            </div>
            <details>
              <summary>Ver todas as outras aparências</summary>
              <div className="arq-feira-itens">
                {vitrine.demais.map((id) => (
                  <ItemDaFeira key={id} id={id} avisar={avisar} />
                ))}
              </div>
            </details>
          </>
        )}
        <InsumosDaFeira />
        <VestuarioDaFesta />
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          Voltar à Vila
        </button>
      </section>
    </div>
  )
}
function ItemDaFeira({ id, avisar }: { id: IdDaGaleria; avisar: Avisar }) {
  const item = GALERIA[id]
  const temProjeto = useEstado((s) => podeVerAparenciaNaFeira(id, s.salvamento.projetos))
  const pode = useEstado(
    (s) =>
      s.acesso.liberado &&
      !s.acesso.somenteLeitura &&
      !s.visita &&
      !s.tempoAcabou &&
      !s.tempoPausado &&
      !s.tempoSincronizando &&
      !salvamentoPausado(s.salvamentoSituacao),
  )
  return (
    <article aria-label={item.nome} className="arq-feira-item">
      <h4>{item.nome}</h4>
      {temProjeto && pode ? (
        <CartaoDaGaleria objeto={item.objeto} avisar={avisar} />
      ) : (
        <>
          <img src={MINIATURA_DO_OBJETO[item.objeto]} alt="" />
          <p>{item.preco} moedas.</p>
          <p>
            {temProjeto
              ? 'As compras estão pausadas agora.'
              : 'Esta aparência pode ser usada quando o projeto azul chegar à sua casa.'}
          </p>
        </>
      )}
    </article>
  )
}
