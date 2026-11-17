import { ColorPicker } from '@sistemazero/molda/ui'
import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  LIMITES_CENARIO_V2,
} from '@sistemazero/molda-cenarios-core/v2'
import { estaTrancado } from '@sistemazero/molda-cenarios-motor'
import { type JSX, useMemo, useState } from 'react'

/** Cor por instância: preserva a paleta e as texturas do acervo, com um passo por escolha. */
export function Aparencia({
  documento,
  selecao,
  executar,
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  executar(comandos: ComandoDeCenario[]): void
}): JSX.Element {
  const { objetos, unica, excedeu, base, trancado } = useMemo(() => {
    const ids = new Set(selecao),
      objetos = documento.instancias.filter((o) => ids.has(o.id))
    const cores = new Set(objetos.map((o) => o.aparencia?.cor?.toLowerCase() ?? '#ffffff'))
    const unica = cores.size === 1 ? [...cores][0]! : null
    const excedeu = objetos.length > LIMITES_CENARIO_V2.comandos
    return {
      objetos,
      unica,
      excedeu,
      base: excedeu
        ? 'selecao-excedida'
        : JSON.stringify(objetos.map((o) => [o.id, o.aparencia?.cor ?? '#ffffff'])),
      trancado: excedeu || !objetos.length || objetos.some((o) => estaTrancado(documento, o)),
    }
  }, [documento, selecao])
  const [edicao, setEdicao] = useState<{ base: string; cor: string } | null>(null)
  const cor = edicao?.base === base ? edicao.cor : (unica ?? '#ffffff')
  const mudou = edicao?.base === base && cor !== unica
  const aplicar = () => {
    if (!mudou) return
    executar(
      objetos.map((o) => ({
        tipo: 'instancia.atualizar',
        id: o.id,
        alteracoes: { aparencia: { ...o.aparencia, cor } },
      })),
    )
    setEdicao(null)
  }
  return (
    <div className="mcn-painel-corpo">
      <fieldset className="mcn-grupo" disabled={trancado}>
        <legend>Aparência</legend>
        {excedeu ? (
          <p className="text-sm text-mld-muted">
            Escolha até {LIMITES_CENARIO_V2.comandos} objetos para editar a aparência.
          </p>
        ) : null}
        <div className="mcn-campo">
          <span>Tonalidade</span>
          <ColorPicker
            key={base}
            value={cor}
            disabled={trancado}
            onChange={(cor) => setEdicao({ base, cor })}
          />
        </div>
        {unica === null ? (
          <p className="text-sm text-mld-muted">A seleção tem tonalidades diferentes.</p>
        ) : null}
        <p className="text-sm text-mld-muted">
          A tonalidade combina com as cores originais do modelo.
        </p>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={!mudou}
          onClick={aplicar}
        >
          Aplicar tonalidade
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          onClick={() => {
            executar(
              objetos.map((o) => {
                const aparencia = { ...o.aparencia }
                delete aparencia.cor
                return { tipo: 'instancia.atualizar', id: o.id, alteracoes: { aparencia } }
              }),
            )
            setEdicao(null)
          }}
        >
          Restaurar cores originais
        </button>
      </fieldset>
    </div>
  )
}
