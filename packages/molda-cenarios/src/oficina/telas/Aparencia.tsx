import { ColorPicker } from '@sistemazero/molda/ui'
import {
  aplicarTexturaAosObjetos,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type InstanciaDeCenario,
  LIMITES_CENARIO_V2,
} from '@sistemazero/molda-cenarios-core/v2'
import { estaTrancado } from '@sistemazero/molda-cenarios-motor'
import { type JSX, useMemo, useState } from 'react'
import type { Biblioteca, CenariosHost, TexturaDeBiblioteca } from '../portas'
import { EscolherTextura } from './EscolherTextura'

/** Cor por instância: preserva a paleta e as texturas do acervo, com um passo por escolha. */
export function Aparencia({
  documento,
  selecao,
  executar,
  host,
  bibliotecas,
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  executar(comandos: ComandoDeCenario[]): void
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
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
        <TexturaDoObjeto
          key={
            excedeu
              ? 'selecao-excedida'
              : JSON.stringify(objetos.map((o) => [o.id, o.aparencia?.textura]))
          }
          documento={documento}
          objetos={objetos}
          host={host}
          bibliotecas={bibliotecas}
          executar={executar}
          trancado={trancado}
        />
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

function TexturaDoObjeto({
  documento,
  objetos,
  host,
  bibliotecas,
  executar,
  trancado,
}: {
  documento: DocumentoDeCenario
  objetos: readonly InstanciaDeCenario[]
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  executar(comandos: ComandoDeCenario[]): void
  trancado: boolean
}): JSX.Element {
  const valores = new Set(
    objetos.map((o) => (o.aparencia?.textura ? JSON.stringify(o.aparencia.textura) : '')),
  )
  const atual = valores.size === 1 ? objetos[0]?.aparencia?.textura : undefined
  const ref = documento.texturas?.find((t) => t.id === atual?.id)
  const [escolhendo, setEscolhendo] = useState(false)
  const [escolhida, setEscolhida] = useState<TexturaDeBiblioteca | null>(null)
  const [metros, setMetros] = useState(String(atual?.repeticaoMetros ?? 2))
  const [erro, setErro] = useState<string | null>(null)
  const metrosNumero = Number(metros)
  const valida = Number.isFinite(metrosNumero) && metrosNumero >= 0.1 && metrosNumero <= 100
  const mudou = Boolean(escolhida) || (Boolean(atual) && atual?.repeticaoMetros !== metrosNumero)
  const aplicar = (limpar: boolean) => {
    try {
      const entrada = limpar
        ? null
        : escolhida
          ? {
              id: escolhida.id,
              textura: escolhida.id,
              biblioteca: escolhida.bibliotecaId,
              digest: escolhida.digest,
              nome: escolhida.nome.slice(0, 120),
            }
          : (ref ?? null)
      executar(
        aplicarTexturaAosObjetos(
          documento,
          objetos.map((o) => o.id),
          entrada,
          metrosNumero,
        ),
      )
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui aplicar a textura')
    }
  }
  return (
    <div className="mcn-grupo">
      <p className="text-sm font-semibold text-mld-text">
        Textura:{' '}
        {escolhida?.nome ??
          ref?.nome ??
          (valores.size > 1 ? 'Várias na seleção' : 'Original do modelo')}
      </p>
      <button
        type="button"
        className="sz-tool-pill sz-tool-pill--outline"
        onClick={() => setEscolhendo(true)}
      >
        Escolher textura
      </button>
      {ref || escolhida ? (
        <>
          <label className="mcn-campo">
            Repetição da textura (m)
            <input
              type="number"
              min={0.1}
              max={100}
              step="any"
              value={metros}
              onChange={(e) => setMetros(e.target.value)}
              aria-invalid={!valida}
            />
          </label>
          <p className="text-sm text-mld-muted">
            Cada repetição ocupa essa medida na superfície. A textura substitui o acabamento
            original.
          </p>
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--outline"
            disabled={!mudou || !valida}
            onClick={() => aplicar(false)}
          >
            Aplicar textura
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="sz-tool-pill sz-tool-pill--outline"
        disabled={!objetos.some((o) => o.aparencia?.textura)}
        onClick={() => aplicar(true)}
      >
        Restaurar textura original
      </button>
      {erro ? (
        <p role="alert" className="text-sm text-mld-muted">
          {erro}
        </p>
      ) : null}
      {escolhendo && !trancado ? (
        <EscolherTextura
          host={host}
          bibliotecas={bibliotecas}
          aoFechar={() => setEscolhendo(false)}
          aoEscolher={(t) => {
            setEscolhida(t)
            setMetros(String(t.repeticaoMetros))
            setEscolhendo(false)
            setErro(null)
          }}
        />
      ) : null}
    </div>
  )
}
