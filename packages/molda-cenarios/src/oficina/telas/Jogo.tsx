import {
  alteracoesDaCamera,
  cameraDoMarcador,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  indiceDaOrganizacao,
  medidasDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco } from '@sistemazero/molda-cenarios-motor'
import {
  Box,
  Camera,
  Circle,
  Flag,
  Focus,
  MapPin,
  PersonStanding,
  Route,
  Ruler,
  Spline,
  Sun,
} from 'lucide-react'
import { useState } from 'react'
import { mudarApoioDoMarcador, NOMES_JOGO, tipoDoMarcador } from '../jogo-formulario'
import type { useJogo } from '../useJogo'
import { CampoVetor } from './CamposDoJogo'
import { MarcadorParametros } from './MarcadorParametros'
import { MarcadorPontos } from './MarcadorPontos'
import { CampoNumero } from './Painel'
import { Propriedades } from './Propriedades'

export const FERRAMENTAS_JOGO = [
  ['inicio', Flag],
  ['ponto', MapPin],
  ['caixa', Box],
  ['esfera', Circle],
  ['poligono', Spline],
  ['rota', Route],
  ['camera', Camera],
  ['regua', Ruler],
  ['escala', PersonStanding],
] as const
export const FERRAMENTAS_LUZ = [
  ['pontual', Sun],
  ['foco', Focus],
] as const

export function Jogo({
  jogo: t,
  documento,
  selecao,
  indisponivel,
  fonte,
  palco,
  aoSelecionar,
  aoCapturar,
  alturaDoAvatar,
  apenasLuzes = false,
}: {
  jogo: ReturnType<typeof useJogo>
  documento: DocumentoDeCenario
  selecao: readonly string[]
  indisponivel: boolean
  fonte?: FonteDeAlturas
  palco: Palco | null
  aoSelecionar(id: string): void
  aoCapturar(): void
  alturaDoAvatar(): number
  apenasLuzes?: boolean
}) {
  const [busca, setBusca] = useState(''),
    [pagina, setPagina] = useState(0),
    m = t.rascunho,
    escolhido = selecao.length === 1 ? documento.marcadores.find((p) => p.id === selecao[0]) : null,
    indice = indiceDaOrganizacao(documento),
    todos = documento.marcadores.filter(
      (p) =>
        (!apenasLuzes || p.configuracao?.tipo === 'luz') &&
        p.nome.toLocaleLowerCase().includes(busca.toLocaleLowerCase()),
    ),
    inicio = Math.min(pagina, Math.max(0, Math.ceil(todos.length / 50) - 1)) * 50
  const tentar = (acao: () => void) => {
    try {
      acao()
    } catch (erro) {
      t.informarErro(erro instanceof Error ? erro.message : 'Não consegui usar esta vista.')
    }
  }
  let medida: string | null = null
  if (m?.configuracao?.tipo === 'regua' || m?.configuracao?.tipo === 'rota') {
    try {
      medida = `${medidasDoMarcador(documento, m, fonte).total.toFixed(2)} m`
    } catch {
      /* A prévia apresenta a validação detalhada. */
    }
  }
  return (
    <div className="mcn-painel-corpo mcn-jogo">
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
      {!m ? (
        <>
          <h3>{apenasLuzes ? 'Luzes locais' : 'Preparar a exploração'}</h3>
          <p className="text-sm text-mld-muted">
            {apenasLuzes
              ? 'Ilumine um lugar com uma luz pontual ou um foco.'
              : 'Marque entradas, áreas e percursos. As guias ajudam a montar e ficam fora do Testar.'}
          </p>
          <div className="mcn-caminho-acoes">
            {(apenasLuzes ? FERRAMENTAS_LUZ : FERRAMENTAS_JOGO).map(([tipo, Icone]) => (
              <button
                key={tipo}
                type="button"
                className="sz-tool-btn"
                disabled={indisponivel}
                onClick={() => t.iniciar(tipo)}
              >
                <Icone aria-hidden="true" />
                {NOMES_JOGO[tipo]}
              </button>
            ))}
          </div>
          {escolhido ? (
            <section className="mcn-grupo" aria-label="Marcador escolhido">
              <h3>{escolhido.nome}</h3>
              <p className="text-sm text-mld-muted">
                {NOMES_JOGO[tipoDoMarcador(escolhido)]} · use Mover e Girar no palco, ou abra os
                parâmetros.
              </p>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--primary"
                disabled={indisponivel || indice.flags.get(escolhido.id)?.bloqueado}
                onClick={() => t.editar(escolhido.id)}
              >
                Editar marcador
              </button>
              {indice.flags.get(escolhido.id)?.bloqueado ? (
                <p className="text-sm text-mld-muted">
                  Este elemento está trancado. Use a organização para destrancá-lo.
                </p>
              ) : null}
            </section>
          ) : null}
          <details className="mcn-grupo" open>
            <summary>Marcadores do cenário · {todos.length}</summary>
            <label className="mcn-campo">
              Buscar marcadores
              <input
                type="search"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setPagina(0)
                }}
              />
            </label>
            {todos.slice(inicio, inicio + 50).map((p) => (
              <div className="mcn-caminho-item" key={p.id}>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel}
                  aria-pressed={selecao.includes(p.id)}
                  onClick={() => aoSelecionar(p.id)}
                >
                  {p.nome}
                </button>
                <small className="text-mld-muted">
                  {NOMES_JOGO[tipoDoMarcador(p)]}
                  {indice.flags.get(p.id)?.oculto ? ' · oculto' : ''}
                  {indice.flags.get(p.id)?.bloqueado ? ' · trancado' : ''}
                </small>
              </div>
            ))}
            {!todos.length ? (
              <p className="text-sm text-mld-muted">Nenhum marcador encontrado.</p>
            ) : null}
            {todos.length > 50 ? (
              <div className="mcn-caminho-acoes">
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={inicio === 0}
                  onClick={() => setPagina(inicio / 50 - 1)}
                >
                  Anteriores
                </button>
                <span>
                  {inicio + 1}–{Math.min(inicio + 50, todos.length)} de {todos.length}
                </span>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={inicio + 50 >= todos.length}
                  onClick={() => setPagina(inicio / 50 + 1)}
                >
                  Próximos
                </button>
              </div>
            ) : null}
          </details>
        </>
      ) : (
        <>
          <h3>{NOMES_JOGO[tipoDoMarcador(m)]}</h3>
          <fieldset className="mcn-grupo" disabled={t.aplicando || t.preparando || indisponivel}>
            <legend className="sr-only">Editar marcador</legend>
            <label className="mcn-campo">
              Nome do marcador
              <input
                value={m.nome}
                maxLength={120}
                onChange={(e) => t.mudar({ ...m, nome: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="sz-tool-btn"
              aria-pressed={t.colocando}
              onClick={() => {
                t.colocar()
                aoCapturar()
              }}
            >
              Colocar no cenário
            </button>
            {t.colocando ? (
              <p role="status" className="text-sm text-mld-muted">
                Toque no lugar desejado. A altura acima da superfície será preservada.
              </p>
            ) : null}
            <CampoVetor
              rotulo="Posição"
              valor={m.posicao}
              aoMudar={(posicao) => t.mudar({ ...m, posicao })}
            />
            <label className="mcn-opcao">
              <input
                type="checkbox"
                checked={m.noChao}
                onChange={(e) =>
                  tentar(() => {
                    t.mudar(mudarApoioDoMarcador(documento, m, e.target.checked, fonte))
                  })
                }
              />
              Acompanhar o chão
            </label>
            <p className="text-sm text-mld-muted">
              {m.noChao
                ? 'Y é a distância vertical acima do terreno.'
                : 'Y é a altura absoluta no mundo.'}
            </p>
            <CampoNumero
              rotulo="Giro do marcador"
              valor={Number(((m.giro * 180) / Math.PI).toFixed(3))}
              sufixo="°"
              passo={15}
              aoMudar={(giro) => t.mudar({ ...m, giro: (giro * Math.PI) / 180 })}
            />
            <MarcadorParametros
              marcador={m}
              mudar={t.mudar}
              alturaDoAvatar={alturaDoAvatar}
              capturarCamera={() =>
                tentar(() => {
                  if (palco)
                    t.mudar({
                      ...m,
                      ...alteracoesDaCamera(documento, m, palco.capturarCamera(), fonte),
                    })
                })
              }
              verCamera={() =>
                tentar(() => palco?.restaurarCamera(cameraDoMarcador(documento, m, fonte)))
              }
            />
            <MarcadorPontos key={`pontos/${m.id}`} jogo={t} aoCapturar={aoCapturar} />
            {medida ? <p className="text-sm text-mld-muted">Comprimento medido: {medida}</p> : null}
            <details className="mcn-grupo">
              <summary>Associação e organização</summary>
              <label className="mcn-campo">
                Objeto associado
                <select
                  value={m.objeto ?? ''}
                  onChange={(e) => t.mudar({ ...m, objeto: e.target.value || null })}
                >
                  <option value="">Nenhum</option>
                  {[...documento.instancias, ...(documento.montagens ?? [])].map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-mld-muted">
                Associação é uma referência; mover o objeto não arrasta o marcador.
              </p>
              <label className="mcn-campo">
                Camada do marcador
                <select
                  value={m.camada ?? ''}
                  onChange={(e) => t.mudar({ ...m, camada: e.target.value || null })}
                >
                  <option value="">Sem camada</option>
                  {documento.camadas?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
            </details>
            <Propriedades
              key={`propriedades/${m.id}`}
              valor={m.propriedades}
              aoGuardar={(propriedades) => t.mudar({ ...m, propriedades })}
              rotuloAcao="Usar propriedades no rascunho"
            />
            <button type="button" className="sz-tool-btn" onClick={() => void t.preparar()}>
              Ver prévia do marcador
            </button>
          </fieldset>
          {t.preparando ? <p role="status">Preparando marcador…</p> : null}
          {t.previa ? (
            <section className="mcn-grupo" aria-label="Prévia do marcador">
              <h3>Prévia · ainda não guardada</h3>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--primary"
                disabled={t.aplicando || indisponivel}
                onClick={() => void t.aplicar()}
              >
                {t.aplicando ? 'Guardando…' : 'Guardar marcador'}
              </button>
            </section>
          ) : null}
          <button type="button" className="sz-tool-btn" disabled={t.aplicando} onClick={t.cancelar}>
            Cancelar edição do marcador
          </button>
        </>
      )}
    </div>
  )
}
