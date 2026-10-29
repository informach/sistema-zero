import { galeriaDoObjeto, type ObjetoDaCasa } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaGaleria, useGaleria } from '../estado/galeria'
import {
  aparenciasQueEleTem,
  DESAFIO_QUE_PAGA,
  estadoDoCartao,
  moedas,
  recadoDaCompra,
  usarAparencia,
} from '../sistemas/construcao/galeria'
import { MINIATURA_DO_OBJETO } from './miniaturas'

export type Avisar = (aviso: { tom: 'ok' | 'atencao'; texto: string } | null) => void

/** O que o cartão diz do saldo (nunca um número que o serviço não deu). */
function linhaDoSaldo(
  dados: { saldo: number | null; ilimitado: boolean } | null,
  fechada: boolean,
): string {
  if (!dados) return fechada ? 'A galeria não abriu agora.' : 'Abrindo a galeria…'
  if (dados.ilimitado) return 'Equipe: comprar não gasta moedas.'
  if (dados.saldo === null) return 'Seu saldo não carregou agora.'
  return `Você tem ${moedas(dados.saldo)}.`
}

/**
 * O cartão "Da galeria" (fase1-13, 29/10/2026), ao lado do Pinta e do Molda: a miniatura, o preço
 * e o saldo. Comprar pede confirmação; depois de pago, a aparência entra no lugar do holograma.
 * Sem saldo, o botão diz quanto falta e o cartão sugere um desafio.
 */
export function CartaoDaGaleria({ objeto, avisar }: { objeto: ObjetoDaCasa; avisar: Avisar }) {
  const { loja, plataforma } = useJogo()
  const galeria = lojaDaGaleria(loja, plataforma)
  const dados = useGaleria(galeria, (s) => s.dados)
  const fechada = useGaleria(galeria, (s) => s.fechada)
  const comprando = useGaleria(galeria, (s) => s.comprando)
  const projeto = useEstado((s) => s.salvamento.projetos[objeto])
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const [confirmando, setConfirmando] = useState(false)
  const botaoComprar = useRef<HTMLButtonElement>(null)
  const botaoConfirmar = useRef<HTMLButtonElement>(null)
  const voltarFoco = useRef(false)
  useEffect(() => {
    if (confirmando) botaoConfirmar.current?.focus()
    else if (voltarFoco.current) {
      voltarFoco.current = false
      botaoComprar.current?.focus()
    }
  }, [confirmando])
  const item = galeriaDoObjeto(objeto)[0]
  if (!projeto || !item) return null
  const estado = dados ? estadoDoCartao(item, dados, projeto) : null
  const ocupado = ferramentaAberta || comprando !== null

  const vestir = () =>
    loja.getState().mudar((s) => {
      const p = s.projetos[objeto]
      return p
        ? {
            ...s,
            projetos: {
              ...s.projetos,
              [objeto]: usarAparencia(p, { origem: 'galeria', id: item.id }),
            },
          }
        : s
    })

  async function comprar() {
    if (!item) return
    avisar(null)
    const r = await galeria.getState().comprar(item.id)
    setConfirmando(false)
    if (r.ok) {
      vestir()
      avisar({ tom: 'ok', texto: `Pronto. A ${item.nome} é sua e já está no lugar.` })
    } else avisar({ tom: 'atencao', texto: recadoDaCompra(r) })
  }

  return (
    <div className="arq-ferramenta arq-galeria">
      <img src={MINIATURA_DO_OBJETO[objeto]} alt="" />
      <b>Da galeria</b>
      <small>{`${item.nome}: ${moedas(item.preco)}`}</small>
      <small className="arq-galeria-saldo">{linhaDoSaldo(dados, fechada)}</small>
      {estado?.tipo === 'em-uso' ? <small className="arq-galeria-uso">Em uso</small> : null}
      {estado?.tipo === 'usar' ? (
        <button
          type="button"
          className="arq-botao"
          disabled={ocupado}
          onClick={() => {
            vestir()
            avisar({ tom: 'ok', texto: `A ${item.nome} voltou para o lugar.` })
          }}
        >
          Usar, já é sua
        </button>
      ) : null}
      {estado?.tipo === 'falta' ? (
        <>
          <button type="button" className="arq-botao" disabled>
            {`Faltam ${moedas(estado.falta)}`}
          </button>
          <small>{DESAFIO_QUE_PAGA}</small>
        </>
      ) : null}
      {estado?.tipo === 'comprar' && !confirmando ? (
        <button
          ref={botaoComprar}
          type="button"
          className="arq-botao"
          disabled={ocupado}
          onClick={() => setConfirmando(true)}
        >
          Comprar
        </button>
      ) : null}
      {estado?.tipo === 'comprar' && confirmando ? (
        <fieldset className="arq-galeria-confirma">
          <legend>{`Comprar a ${item.nome} por ${moedas(item.preco)}`}</legend>
          {estado.depois !== null ? <small>{`Sobram ${moedas(estado.depois)}.`}</small> : null}
          <div className="arq-galeria-acoes">
            <button
              ref={botaoConfirmar}
              type="button"
              className="arq-botao"
              disabled={ocupado}
              onClick={() => void comprar()}
            >
              {comprando ? 'Comprando…' : 'Comprar'}
            </button>
            <button
              type="button"
              className="arq-botao leve"
              disabled={comprando !== null}
              onClick={() => {
                voltarFoco.current = true
                setConfirmando(false)
              }}
            >
              Agora não
            </button>
          </div>
        </fieldset>
      ) : null}
    </div>
  )
}

/**
 * As aparências que ela já tem para este objeto (as feitas por ela e as da galeria pagas). Trocar
 * não cobra de novo. Só aparece quando há mais de uma para escolher.
 */
export function SuasAparencias({ objeto, avisar }: { objeto: ObjetoDaCasa; avisar: Avisar }) {
  const { loja, plataforma } = useJogo()
  const possuidas = useGaleria(lojaDaGaleria(loja, plataforma), (s) => s.dados?.possuidas)
  const projeto = useEstado((s) => s.salvamento.projetos[objeto])
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  if (!projeto) return null
  const opcoes = aparenciasQueEleTem(objeto, projeto, possuidas ?? [])
  if (opcoes.length < 2) return null
  return (
    <section className="arq-objeto-suas" aria-label="Suas aparências">
      <h3 className="arq-menu-titulo">Suas aparências</h3>
      <p className="arq-caderno-explica">Trocar entre as que você já tem não custa moeda.</p>
      <ul className="arq-objeto-itens">
        {opcoes.map((o) => (
          <li key={`${o.aparencia.origem}:${o.aparencia.id}`}>
            <button
              type="button"
              className="arq-botao leve"
              aria-pressed={o.emUso}
              disabled={ferramentaAberta}
              onClick={() => {
                if (o.emUso) return
                loja.getState().mudar((s) => {
                  const p = s.projetos[objeto]
                  return p
                    ? { ...s, projetos: { ...s.projetos, [objeto]: usarAparencia(p, o.aparencia) } }
                    : s
                })
                avisar({ tom: 'ok', texto: `Agora em uso: ${o.rotulo}.` })
              }}
            >
              {o.emUso ? `${o.rotulo}: em uso` : o.rotulo}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
