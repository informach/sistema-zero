import {
  type DocumentoDeCenario,
  LIMITES_REGIOES,
  vizinhasSugeridas,
} from '@sistemazero/molda-cenarios-core/v2'
import { LayoutGrid } from 'lucide-react'
import type { JSX } from 'react'
import {
  alternarVizinha,
  encaixarRegiao,
  medidasDaRegiao,
  problemasDaRegiao,
  regiaoComMedidas,
} from '../regioes-formulario'
import type { useRegioes } from '../useRegioes'
import { CampoNumero } from './Painel'

/**
 * O painel da ferramenta Regiões, dentro da aba Jogo (lote 7 da conclusão, 22/11/2026). Só
 * aparece com o interruptor das regiões ligado pelo host (`recursos().regioes`) e com a faixa
 * `jogo.regioes` liberada. As regiões viram, no Estúdio, o bloco "Quando entrar na região".
 */
export function Regioes({
  regioes: t,
  documento,
  indisponivel,
  aoCapturar,
}: {
  regioes: ReturnType<typeof useRegioes>
  documento: DocumentoDeCenario
  indisponivel: boolean
  aoCapturar(): void
}): JSX.Element {
  const r = t.rascunho,
    todas = documento.regioes ?? [],
    nomeDe = (id: string) => todas.find((q) => q.id === id)?.nome ?? id
  if (!r)
    return (
      <section className="mcn-grupo mcn-regioes" aria-label="Regiões">
        <h3>Regiões</h3>
        <p className="text-sm text-mld-muted">
          Divida o cenário em lugares com nome (Vila, Floresta, Caverna). No Estúdio, o jogo carrega
          a região onde o personagem está e as vizinhas, e o bloco "Quando entrar na região" usa
          estes nomes.
        </p>
        {t.erro ? (
          <p role="alert" className="mcn-recusa">
            {t.erro}
          </p>
        ) : null}
        {t.mensagem ? (
          <p role="status" className="text-sm text-mld-muted">
            {t.mensagem}
          </p>
        ) : null}
        <button
          type="button"
          className="sz-tool-btn"
          aria-pressed={t.criando}
          disabled={indisponivel || todas.length >= LIMITES_REGIOES.max}
          onClick={() => {
            if (t.criando) t.cancelar()
            else {
              t.iniciarCriacao()
              aoCapturar()
            }
          }}
        >
          <LayoutGrid aria-hidden="true" />
          Nova região
        </button>
        {t.criando ? (
          <p role="status" className="text-sm text-mld-muted">
            Toque em dois cantos opostos da região no chão.
          </p>
        ) : null}
        {todas.length ? (
          <ul className="mcn-regioes-lista">
            {todas.map((q) => {
              const m = medidasDaRegiao(q)
              return (
                <li key={q.id} className="mcn-caminho-item">
                  <button
                    type="button"
                    className="sz-tool-btn"
                    disabled={indisponivel || t.criando}
                    onClick={() => t.editar(q.id)}
                  >
                    {q.nome}
                  </button>
                  <small className="text-mld-muted">
                    {m.largura} m por {m.comprimento} m
                    {q.vizinhas.length ? ` · vizinha de ${q.vizinhas.map(nomeDe).join(', ')}` : ''}
                  </small>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-mld-muted">Nenhuma região ainda.</p>
        )}
      </section>
    )

  const m = medidasDaRegiao(r),
    problemas = problemasDaRegiao(documento, r),
    sugeridas = new Set(vizinhasSugeridas(todas, r.caixa, r.id).map((q) => q.id)),
    outras = todas.filter((q) => q.id !== r.id),
    existe = todas.some((q) => q.id === r.id)
  return (
    <section className="mcn-grupo mcn-regioes" aria-label="Editar região">
      <h3>{existe ? 'Editar região' : 'Nova região'}</h3>
      {t.erro ? (
        <p role="alert" className="mcn-recusa">
          {t.erro}
        </p>
      ) : null}
      <fieldset className="mcn-grupo" disabled={t.aplicando || t.preparando || indisponivel}>
        <legend className="sr-only">Dados da região</legend>
        <label className="mcn-campo">
          Nome da região
          <input
            value={r.nome}
            maxLength={LIMITES_REGIOES.nome}
            onChange={(ev) => t.mudar({ ...r, nome: ev.target.value })}
          />
        </label>
        <CampoNumero
          rotulo="Largura"
          valor={m.largura}
          sufixo="m"
          passo={1}
          aoMudar={(largura) => t.mudar(regiaoComMedidas(documento, r, largura, m.comprimento))}
        />
        <CampoNumero
          rotulo="Comprimento"
          valor={m.comprimento}
          sufixo="m"
          passo={1}
          aoMudar={(comprimento) => t.mudar(regiaoComMedidas(documento, r, m.largura, comprimento))}
        />
        <div className="mcn-caminho-acoes">
          <button
            type="button"
            className="sz-tool-btn"
            aria-pressed={t.movendoCantos}
            onClick={() => {
              t.moverCantos(!t.movendoCantos)
              if (!t.movendoCantos) aoCapturar()
            }}
          >
            Mover os cantos
          </button>
          <button
            type="button"
            className="sz-tool-btn"
            disabled={!outras.length}
            onClick={() => t.mudar(encaixarRegiao(documento, r))}
          >
            Encaixar na vizinha
          </button>
        </div>
        {t.movendoCantos ? (
          <p role="status" className="text-sm text-mld-muted">
            Arraste um canto no chão. A região continua retangular.
          </p>
        ) : null}
        {outras.length ? (
          <fieldset className="mcn-grupo">
            <legend>Vizinhas (até {LIMITES_REGIOES.vizinhas})</legend>
            <p className="text-sm text-mld-muted">
              As vizinhas carregam junto, para o caminho entre elas não piscar.
            </p>
            {outras.map((q) => (
              <label key={q.id} className="mcn-opcao">
                <input
                  type="checkbox"
                  checked={r.vizinhas.includes(q.id)}
                  onChange={(ev) => t.mudar(alternarVizinha(r, q.id, ev.target.checked))}
                />
                {q.nome}
                {sugeridas.has(q.id) && !r.vizinhas.includes(q.id) ? ' (encosta nesta)' : ''}
              </label>
            ))}
          </fieldset>
        ) : null}
        {problemas.length ? (
          <ul className="mcn-recusa" aria-label="O que falta acertar">
            {problemas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="sz-tool-btn"
          disabled={problemas.length > 0}
          onClick={() => void t.preparar()}
        >
          Ver prévia da região
        </button>
      </fieldset>
      {t.preparando ? <p role="status">Preparando a região…</p> : null}
      {t.previa ? (
        <section className="mcn-grupo" aria-label="Prévia da região">
          <h3>Prévia · ainda não guardada</h3>
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary"
            disabled={t.aplicando || indisponivel}
            onClick={() => void t.aplicar()}
          >
            {t.aplicando ? 'Guardando…' : 'Guardar região'}
          </button>
        </section>
      ) : null}
      <div className="mcn-caminho-acoes">
        <button type="button" className="sz-tool-btn" disabled={t.aplicando} onClick={t.cancelar}>
          Cancelar
        </button>
        {existe ? (
          <button
            type="button"
            className="sz-tool-btn mcn-regioes-apagar"
            disabled={t.aplicando || indisponivel}
            onClick={() => t.apagar(r.id)}
          >
            Apagar região
          </button>
        ) : null}
      </div>
    </section>
  )
}
