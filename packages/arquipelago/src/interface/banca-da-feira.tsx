import {
  diaDeSaoPaulo,
  type ItensDaVenda,
  PRATOS_DA_FEIRA,
  PRATOS_POR_DIA_NA_FEIRA,
  precoNaFeira,
} from '@sistemazero/arquipelago-contracts'
import { useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaGaleria } from '../estado/galeria'
import { ITENS } from '../sistemas/itens'
import { salvamentoPausado } from '../sistemas/pausa'
import { VendaRecusadaNoServicoError } from '../sistemas/salvar'

/** O dia da última venda neste aparelho (só para a tela; quem decide é o serviço). */
const chaveDaVenda = (perfil: string) => `arquipelago:venda-do-dia:${perfil}`
function lerVendaDoDia(perfil: string): string | null {
  try {
    return localStorage.getItem(chaveDaVenda(perfil))
  } catch {
    return null
  }
}
function guardarVendaDoDia(perfil: string, dia: string) {
  try {
    localStorage.setItem(chaveDaVenda(perfil), dia)
  } catch {}
}

export const FALAS_DA_BANCA = {
  vendeu: (moedas: number) => `Vendido na banca. Você ganhou ${moedas} moedas.`,
  teto: 'Vendido na banca. O limite de moedas desta semana já foi alcançado.',
  pendente: 'Vendido na banca. As moedas ainda aguardam confirmação.',
  recusado:
    'Os pratos foram vendidos, mas não foi possível confirmar as moedas. Peça ajuda à equipe.',
  jaVendeu: 'A banca já vendeu hoje. Volte amanhã com mais pratos.',
} as const

/**
 * A banca da feira (§6.28, A22; a proposta: "Pão de queijo... vende bem na feira"): até cinco
 * pratos prontos por dia, pelo serviço, como a entrega de pedidos.
 */
export function BancaDaFeira() {
  const { fila, loja, plataforma } = useJogo()
  const inventario = useEstado((s) => s.salvamento.inventario)
  const pode = useEstado(
    (s) =>
      !s.acesso.somenteLeitura &&
      !s.visita &&
      !s.tempoAcabou &&
      !s.tempoPausado &&
      !s.tempoSincronizando &&
      !salvamentoPausado(s.salvamentoSituacao),
  )
  const hoje = diaDeSaoPaulo(new Date())
  const [vendeuHoje, marcarVenda] = useState(() => lerVendaDoDia(plataforma.perfil.id) === hoje)
  const [itens, escolher] = useState<Record<string, number>>({})
  const [ocupada, ocupar] = useState(false)
  const pratos = PRATOS_DA_FEIRA.filter((id) => (inventario[id] ?? 0) > 0)
  const total = Object.values(itens).reduce((s, n) => s + n, 0)
  const moedas = Object.entries(itens).reduce((s, [id, n]) => s + (precoNaFeira(id) ?? 0) * n, 0)
  const mudar = (id: string, mais: number) =>
    escolher((atual) => {
      const n = Math.max(0, Math.min(inventario[id] ?? 0, (atual[id] ?? 0) + mais))
      if (mais > 0 && total >= PRATOS_POR_DIA_NA_FEIRA) return atual
      const novo = { ...atual, [id]: n }
      if (n === 0) delete novo[id]
      return novo
    })
  async function vender() {
    if (!fila || !pode || ocupada || total === 0) return
    ocupar(true)
    try {
      const r = await fila.venderNaFeira(itens as ItensDaVenda)
      guardarVendaDoDia(plataforma.perfil.id, r.venda.dia)
      marcarVenda(true)
      escolher({})
      loja
        .getState()
        .dizer(
          r.pagamento === 'creditado'
            ? FALAS_DA_BANCA.vendeu(r.moedas)
            : r.pagamento === 'teto'
              ? FALAS_DA_BANCA.teto
              : r.pagamento === 'recusado'
                ? FALAS_DA_BANCA.recusado
                : FALAS_DA_BANCA.pendente,
        )
      await lojaDaGaleria(loja, plataforma).getState().carregar()
    } catch (e) {
      if (e instanceof VendaRecusadaNoServicoError && e.codigo === 'VENDA_REPETIDA') {
        guardarVendaDoDia(plataforma.perfil.id, hoje)
        marcarVenda(true)
        loja.getState().dizer(FALAS_DA_BANCA.jaVendeu)
      } else loja.getState().dizer(e instanceof Error ? e.message : 'A venda aguarda confirmação.')
      plataforma.relatarErro(e, 'vender-na-feira')
    } finally {
      ocupar(false)
    }
  }
  return (
    <section aria-labelledby="arq-banca-titulo">
      <h3 id="arq-banca-titulo" className="arq-menu-titulo">
        Banca da feira
      </h3>
      <p className="arq-caderno-explica">
        {`Venda até ${PRATOS_POR_DIA_NA_FEIRA} pratos prontos por dia. Cada um vale uma moeda; o pão de queijo vende bem e vale duas.`}
      </p>
      {vendeuHoje ? (
        <p className="arq-aviso ok">{FALAS_DA_BANCA.jaVendeu}</p>
      ) : pratos.length === 0 ? (
        <p className="arq-caderno-explica">Nenhum prato pronto na mochila. Cozinhe na bancada.</p>
      ) : (
        <>
          <ul className="arq-objeto-itens">
            {pratos.map((id) => {
              const nome = ITENS[id]?.nome ?? id
              const n = itens[id] ?? 0
              return (
                <li key={id} className="arq-banca-prato">
                  <span>{`${ITENS[id]?.emoji ?? ''} ${nome} (${precoNaFeira(id)} ${precoNaFeira(id) === 1 ? 'moeda' : 'moedas'})`}</span>
                  <button
                    type="button"
                    className="arq-botao leve"
                    aria-label={`Um ${nome.toLowerCase()} a menos`}
                    disabled={ocupada || n === 0}
                    onClick={() => mudar(id, -1)}
                  >
                    −
                  </button>
                  <output aria-label={`${nome} para vender`}>{n}</output>
                  <button
                    type="button"
                    className="arq-botao leve"
                    aria-label={`Um ${nome.toLowerCase()} a mais`}
                    disabled={
                      ocupada || n >= (inventario[id] ?? 0) || total >= PRATOS_POR_DIA_NA_FEIRA
                    }
                    onClick={() => mudar(id, 1)}
                  >
                    +
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="arq-botao"
            disabled={!pode || !fila || ocupada || total === 0}
            onClick={() => void vender()}
          >
            {total === 0
              ? 'Escolha os pratos'
              : `Vender ${total} ${total === 1 ? 'prato' : 'pratos'} por ${moedas} ${moedas === 1 ? 'moeda' : 'moedas'}`}
          </button>
        </>
      )}
    </section>
  )
}
