import { INSUMOS, type Insumo, precoDosInsumos } from '@sistemazero/arquipelago-contracts'
import { useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaGaleria } from '../estado/galeria'
import { ITENS } from '../sistemas/itens'
import { salvamentoPausado } from '../sistemas/pausa'

export function InsumosDaFeira() {
  const { fila, loja, plataforma } = useJogo()
  const pode = useEstado(
    (s) =>
      !s.acesso.somenteLeitura &&
      !s.visita &&
      !s.tempoAcabou &&
      !s.tempoPausado &&
      !s.tempoSincronizando &&
      !salvamentoPausado(s.salvamentoSituacao),
  )
  const [item, escolher] = useState<Insumo>('semente-alface')
  const [quantidade, contar] = useState(1)
  const [confirmar, confirmarCompra] = useState(false)
  const [ocupada, ocupar] = useState(false)
  const [erro, avisar] = useState<string | null>(null)
  const preco = precoDosInsumos({ item, quantidade })
  const nome = ITENS[item]?.nome ?? item
  async function comprar() {
    if (!fila || !pode || ocupada) return
    ocupar(true)
    avisar(null)
    try {
      const r = await fila.comprarInsumos(item, quantidade)
      confirmarCompra(false)
      loja
        .getState()
        .dizer(
          r.situacao === 'entregue'
            ? `${nome} chegou à mochila. Foram usadas ${r.moedas} moedas.`
            : r.situacao === 'saldo-insuficiente'
              ? 'Faltam moedas. Nenhum item foi comprado.'
              : 'A compra não foi aceita. Nenhum item foi entregue.',
        )
      await lojaDaGaleria(loja, plataforma).getState().carregar()
    } catch (e) {
      // A fila mantém o pedido e oferece retomada na tela de proteção, inclusive se
      // o painel da feira desmontar quando a compra pausar o jogo.
      loja.getState().dizer(e instanceof Error ? e.message : 'A compra aguarda confirmação.')
      avisar('A compra ainda não foi confirmada. Confira o aviso do salvamento.')
    } finally {
      ocupar(false)
    }
  }
  return (
    <section aria-labelledby="arq-insumos-titulo">
      <h3 id="arq-insumos-titulo" className="arq-menu-titulo">
        Sementes, ingredientes e iscas
      </h3>
      <p className="arq-caderno-explica">
        Comprar é opcional. A colheita devolve sementes, os pedidos dos moradores dão ingredientes e
        as iscas aparecem na horta e no píer.
      </p>
      <div className="arq-insumos-campos">
        <div>
          <label htmlFor="arq-insumo-item">Item</label>
          <select
            id="arq-insumo-item"
            value={item}
            disabled={ocupada}
            onChange={(e) => {
              escolher(e.target.value as Insumo)
              confirmarCompra(false)
            }}
          >
            {(Object.keys(INSUMOS) as Insumo[]).map((id) => (
              <option key={id} value={id}>
                {ITENS[id]?.nome ?? id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="arq-insumo-quantidade">Quantidade</label>
          <select
            id="arq-insumo-quantidade"
            value={quantidade}
            disabled={ocupada}
            onChange={(e) => {
              contar(Number(e.target.value))
              confirmarCompra(false)
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p>
        {quantidade} × {nome}. Total: {preco} moedas.
      </p>
      {erro && (
        <p role="status" className="arq-aviso atencao">
          {erro}
        </p>
      )}
      {confirmar ? (
        <div className="arq-menu-acoes">
          <button
            type="button"
            className="arq-botao"
            disabled={!pode || ocupada || !fila}
            onClick={() => void comprar()}
          >
            Confirmar compra por {preco} moedas
          </button>
          <button
            type="button"
            className="arq-botao leve"
            disabled={ocupada}
            onClick={() => confirmarCompra(false)}
          >
            Cancelar compra
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="arq-botao"
          disabled={!pode || !fila}
          onClick={() => confirmarCompra(true)}
        >
          Comprar ingredientes
        </button>
      )}
    </section>
  )
}
