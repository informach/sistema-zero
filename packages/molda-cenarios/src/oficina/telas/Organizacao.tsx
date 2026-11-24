import {
  agruparElementos,
  alterarElemento,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  indiceDaOrganizacao,
  raizesDaSelecao,
} from '@sistemazero/molda-cenarios-core/v2'
import { ArrowLeft, FolderPlus, Pencil, Ungroup } from 'lucide-react'
import { type JSX, useMemo, useState } from 'react'
import { novoIdAleatorio } from '../acoes'
import { DialogoDeNome } from '../pecas'
import { Arvore } from './Arvore'
import { Camadas } from './Camadas'

export function Organizacao({
  documento,
  selecao,
  selecionar,
  executar,
  aoDetalhes,
  somarSelecao = false,
  alvo,
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  selecionar(ids: readonly string[], alvo?: string | null): void
  executar(comandos: ComandoDeCenario[]): boolean
  aoDetalhes(): void
  somarSelecao?: boolean
  alvo: string | null
}): JSX.Element {
  const indice = useMemo(() => indiceDaOrganizacao(documento), [documento])
  const [aba, setAba] = useState<'arvore' | 'camadas'>('arvore')
  const [busca, setBusca] = useState('')
  const [janela, setJanela] = useState<'pasta' | 'nome' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const atual = alvo ? indice.entidades.get(alvo) : undefined
  const flags = atual ? indice.flags.get(atual.id) : undefined
  const ids =
    atual && indice.grupos.has(atual.id)
      ? [atual.id]
      : selecao.length
        ? [...selecao]
        : atual
          ? [atual.id]
          : []
  const acao = (preparar: () => ComandoDeCenario[]): boolean => {
    try {
      const ok = executar(preparar())
      if (ok) setErro(null)
      return ok
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui organizar a escolha')
      return false
    }
  }
  const mover = (ids: readonly string[], grupo: string | null) =>
    acao(() => [
      { tipo: 'elementos.organizar', ids: raizesDaSelecao(documento, ids), destino: { grupo } },
    ])
  const escolher = (id: string, somar: boolean) => {
    const descendentes = indice.descendentesSelecionaveis(id),
      conjunto = new Set(selecao)
    if (!somar && !somarSelecao) {
      selecionar(descendentes, id)
    } else {
      const retirar = descendentes.length
        ? descendentes.every((id) => conjunto.has(id))
        : alvo === id
      for (const id of descendentes)
        if (retirar) conjunto.delete(id)
        else conjunto.add(id)
      const nova = [...conjunto]
      selecionar(nova, retirar ? (nova.length === 1 ? nova[0]! : null) : id)
    }
  }
  return (
    <div>
      <div className="mcn-painel-corpo">
        <button type="button" className="sz-tool-pill sz-tool-pill--outline" onClick={aoDetalhes}>
          <ArrowLeft aria-hidden="true" />
          Voltar aos detalhes
        </button>
        <fieldset className="sz-tool-chips" aria-label="Organização do cenário">
          <button
            type="button"
            className="sz-tool-chip"
            aria-pressed={aba === 'arvore'}
            onClick={() => setAba('arvore')}
          >
            Objetos
          </button>
          <button
            type="button"
            className="sz-tool-chip"
            aria-pressed={aba === 'camadas'}
            onClick={() => setAba('camadas')}
          >
            Camadas
          </button>
        </fieldset>
      </div>
      {aba === 'camadas' ? (
        <Camadas documento={documento} selecao={ids} executar={executar} />
      ) : (
        <>
          <div className="mcn-painel-corpo">
            <label className="mcn-campo">
              Buscar objetos e pastas
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => setJanela('pasta')}
            >
              <FolderPlus aria-hidden="true" />
              Criar pasta
            </button>
            <label className="mcn-campo">
              Mover escolhidos para pasta
              <select
                className="sz-tool-select"
                aria-label="Mover escolhidos para pasta"
                value=""
                disabled={!ids.length}
                onChange={(e) => {
                  if (e.target.value)
                    mover(ids, e.target.value === 'raiz' ? null : e.target.value.slice(6))
                }}
              >
                <option value="" disabled>
                  Escolha o destino
                </option>
                <option value="raiz">Fora das pastas</option>
                {documento.grupos.map((g) => (
                  <option
                    key={g.id}
                    value={`grupo:${g.id}`}
                    disabled={indice.flags.get(g.id)?.bloqueado}
                  >
                    {g.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Arvore
            documento={documento}
            indice={indice}
            busca={busca}
            selecao={selecao}
            alvo={alvo}
            escolher={escolher}
            mover={mover}
            alterar={(id, a) => acao(() => alterarElemento(documento, id, a))}
          />
          {atual ? (
            <div className="mcn-painel-corpo">
              <p className="truncate font-semibold text-sm" title={atual.nome}>
                {atual.nome}
              </p>
              {flags?.bloqueioHerdado ? (
                <p className="text-sm text-mld-muted">Trancado pela pasta ou camada.</p>
              ) : null}
              {flags?.ocultacaoHerdada ? (
                <p className="text-sm text-mld-muted">Oculto pela pasta ou camada.</p>
              ) : null}
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline"
                disabled={flags?.bloqueado}
                onClick={() => setJanela('nome')}
              >
                <Pencil aria-hidden="true" />
                Renomear escolhido
              </button>
              {indice.grupos.has(atual.id) ? (
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--outline"
                  disabled={flags?.bloqueado}
                  onClick={() => {
                    acao(() => [{ tipo: 'grupo.remover', id: atual.id, desagrupar: true }])
                  }}
                >
                  <Ungroup aria-hidden="true" />
                  Desagrupar pasta
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
      {erro ? (
        <p role="alert" className="mcn-painel-corpo text-sm text-mld-danger">
          {erro}
        </p>
      ) : null}
      {janela ? (
        <DialogoDeNome
          titulo={janela === 'pasta' ? 'Criar pasta' : 'Renomear escolhido'}
          inicial={janela === 'pasta' ? 'Nova pasta' : (atual?.nome ?? '')}
          acao={janela === 'pasta' ? 'Criar pasta' : 'Guardar nome'}
          aoFechar={() => setJanela(null)}
          aoConfirmar={(nome) => {
            const id = novoIdAleatorio()
            const ok = acao(() =>
              janela === 'nome' && atual
                ? alterarElemento(documento, atual.id, { nome })
                : ids.length
                  ? agruparElementos(documento, ids, id, nome)
                  : [
                      {
                        tipo: 'grupo.definir',
                        grupo: { id, nome, grupo: null, bloqueado: false, oculto: false },
                      },
                    ],
            )
            if (!ok) throw Error('Não consegui alterar a pasta. Confira a mensagem da oficina.')
            if (janela === 'pasta') selecionar(selecao, id)
          }}
        />
      ) : null}
    </div>
  )
}
