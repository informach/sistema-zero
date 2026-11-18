import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  indiceDaOrganizacao,
  type VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import type { EstadoDosCaminhos } from '@sistemazero/molda-cenarios-motor'
import {
  BrickWall,
  Cable,
  Copy,
  Eye,
  EyeOff,
  Fence,
  Route,
  Spline,
  Square,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { NOMES_CAMINHO } from '../caminho-formulario'
import { comandosParaRemoverCaminho } from '../caminho-remocao'
import { DialogoDeApagar } from '../pecas'
import type { Biblioteca, CenariosHost } from '../portas'
import type { useCaminhos } from '../useCaminhos'
import { CaminhoAcabamento } from './CaminhoAcabamento'
import { CaminhoParametros } from './CaminhoParametros'
import { CaminhoPontos } from './CaminhoPontos'
import { CampoNumero } from './Painel'

export const FERRAMENTAS_CAMINHOS = [
  ['trilha', Route],
  ['praca', Square],
  ['estrada', Spline],
  ['cerca', Fence],
  ['muro', BrickWall],
  ['ponte', Cable],
] as const

export function Caminhos({
  caminhos: t,
  documento,
  host,
  bibliotecas,
  indisponivel,
  executar,
  aoCapturar,
  aoEscolherModelo,
  aoCopiar,
  fonte,
  estado,
  medir,
}: {
  caminhos: ReturnType<typeof useCaminhos>
  documento: DocumentoDeCenario
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  indisponivel: boolean
  executar(comandos: ComandoDeCenario[]): boolean
  aoCapturar(): void
  aoEscolherModelo(): void
  aoCopiar(id: string): void
  fonte?: FonteDeAlturas
  estado: EstadoDosCaminhos
  medir(id: string): VolumeDeComposicao | null
}) {
  const [apagando, setApagando] = useState<string | null>(null),
    c = t.rascunho,
    indice = indiceDaOrganizacao(documento),
    existente = c ? documento.caminhos.find((p) => p.id === c.id) : null,
    falhas = estado.falhas.filter((f) => !c || f.id === c.id),
    avisos = estado.avisos.filter((f) => c && f.id === c.id)
  return (
    <div className="mcn-painel-corpo mcn-caminhos">
      {t.erro ? (
        <p role="alert" className="mcn-recusa">
          {t.erro}
        </p>
      ) : null}
      {falhas.map((f) => (
        <p key={f.id} role="alert" className="mcn-recusa">
          {f.nome}: {f.mensagem}
        </p>
      ))}
      {t.mensagem ? (
        <p role="status" className="text-sm text-mld-muted">
          {t.mensagem}
        </p>
      ) : null}
      {t.preparando ? (
        <p role="status" className="text-sm text-mld-muted">
          Preparando o caminho. Você pode cancelar sem guardar.
        </p>
      ) : null}
      {!c ? (
        <>
          <fieldset className="mcn-grupo" disabled={indisponivel}>
            <legend>
              <Route aria-hidden="true" /> Caminhos
            </legend>
            <p className="text-sm text-mld-muted">
              Desenhe no chão ou use coordenadas. Confira o piso, as curvas e os apoios antes de
              guardar.
            </p>
            <div className="mcn-caminho-acoes">
              {FERRAMENTAS_CAMINHOS.map(([tipo, Icone]) => (
                <button
                  key={tipo}
                  type="button"
                  className="sz-tool-btn"
                  onClick={() => {
                    t.iniciar(tipo)
                    aoCapturar()
                  }}
                >
                  <Icone aria-hidden="true" />
                  {NOMES_CAMINHO[tipo]}
                </button>
              ))}
            </div>
          </fieldset>
          <section className="mcn-grupo" aria-label="Caminhos do cenário">
            <h3>Caminhos do cenário · {documento.caminhos.length}</h3>
            {!documento.caminhos.length ? (
              <p className="text-sm text-mld-muted">Ainda não há caminhos neste cenário.</p>
            ) : null}
            {documento.caminhos.map((p) => (
              <div key={p.id} className="mcn-caminho-item">
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel || indice.flags.get(p.id)?.bloqueado}
                  onClick={() => t.editar(p.id)}
                >
                  {p.nome}
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel || indice.flags.get(p.id)?.bloqueado}
                  aria-label={`${p.oculto ? 'Mostrar' : 'Ocultar'} ${p.nome}`}
                  onClick={() =>
                    executar([{ tipo: 'caminho.definir', caminho: { ...p, oculto: !p.oculto } }])
                  }
                >
                  {p.oculto ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel}
                  aria-label={`Copiar ${p.nome}`}
                  onClick={() => aoCopiar(p.id)}
                >
                  <Copy aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel || indice.flags.get(p.id)?.bloqueado}
                  aria-label={`Apagar ${p.nome}`}
                  onClick={() => setApagando(p.id)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
                <label className="mcn-campo">
                  Camada de {p.nome}
                  <select
                    value={p.camada ?? ''}
                    disabled={indisponivel || indice.flags.get(p.id)?.bloqueado}
                    onChange={(e) =>
                      executar([
                        {
                          tipo: 'elementos.organizar',
                          ids: [p.id],
                          destino: { camada: e.target.value || null },
                        },
                      ])
                    }
                  >
                    <option value="">Sem camada</option>
                    {documento.camadas?.map((g) => (
                      <option key={g.id} value={g.id} disabled={g.bloqueado}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          <fieldset className="mcn-grupo" disabled={t.aplicando || indisponivel}>
            <legend>
              {existente ? 'Editar' : 'Criar'} · {NOMES_CAMINHO[c.tipo]}
            </legend>
            <label className="mcn-campo">
              Nome
              <input
                value={c.nome}
                maxLength={120}
                onChange={(e) => t.mudar({ ...c, nome: e.target.value })}
              />
            </label>
            <CaminhoParametros valor={c} mudar={t.mudar} {...(fonte ? { fonte } : {})} />
            {c.tipo === 'estrada' ? (
              <details className="mcn-grupo" open>
                <summary>Molde do terreno</summary>
                {existente ? (
                  <label className="mcn-opcao-encaixe">
                    Moldar o terreno novamente
                    <input
                      type="checkbox"
                      checked={t.recalcular}
                      onChange={(e) => t.setRecalcular(e.target.checked)}
                    />
                  </label>
                ) : null}
                <p className="text-sm text-mld-muted">
                  {existente && !t.recalcular
                    ? 'O relevo atual será preservado. Ative a moldagem para ajustar o leito à nova curva.'
                    : 'A prévia molda uma cópia do relevo. Caminho e terreno são guardados juntos.'}{' '}
                  Recalcular usa o campo atual; não desfaz cortes anteriores.
                </p>
                <fieldset disabled={!t.recalcular} className="mcn-caminho-molde">
                  <legend className="sr-only">Parâmetros do molde da estrada</legend>
                  <CampoNumero
                    rotulo="Largura de transição da estrada"
                    valor={c.molde?.borda ?? c.largura / 2}
                    min={0}
                    max={512}
                    passo={0.25}
                    sufixo="m"
                    aoMudar={(borda) => t.mudar({ ...c, molde: { ...c.molde, borda } })}
                  />
                  <CampoNumero
                    rotulo="Deslocamento do leito"
                    valor={c.molde?.deslocamento ?? 0}
                    min={-2000}
                    max={2000}
                    passo={0.05}
                    sufixo="m"
                    aoMudar={(deslocamento) =>
                      t.mudar({ ...c, molde: { ...c.molde, deslocamento } })
                    }
                  />
                  <CampoNumero
                    rotulo="Suavização do perfil"
                    valor={c.molde?.suavizacao ?? 0}
                    min={0}
                    max={8192}
                    passo={1}
                    sufixo="m"
                    aoMudar={(suavizacao) => t.mudar({ ...c, molde: { ...c.molde, suavizacao } })}
                  />
                </fieldset>
              </details>
            ) : null}
            <CaminhoPontos caminhos={t} aoCapturar={aoCapturar} />
            <CaminhoAcabamento
              key={c.id}
              caminhos={t}
              host={host}
              bibliotecas={bibliotecas}
              aoEscolherModelo={aoEscolherModelo}
              medir={medir}
            />
            <button
              type="button"
              className="sz-tool-btn"
              disabled={t.preparando}
              onClick={() => void t.preparar()}
            >
              {t.preparando ? 'Preparando caminho…' : 'Ver prévia'}
            </button>
          </fieldset>
          {t.previa ? (
            <section className="mcn-grupo" aria-label="Resultado do caminho">
              <h3>Prévia · ainda não guardada</h3>
              <p className="text-sm text-mld-muted">
                Comprimento: {t.previa.operacao.resumo.comprimento.toFixed(2)} m.
                {t.previa.operacao.resumo.area !== undefined
                  ? ` Área: ${t.previa.operacao.resumo.area.toFixed(2)} m².`
                  : ''}
                {t.previa.operacao.resumo.maiorVao !== undefined
                  ? ` Vão do perfil das cabeceiras: ${t.previa.operacao.resumo.maiorVao.toFixed(2)} m.`
                  : ''}
              </p>
              {[
                ...new Set([...t.previa.operacao.resumo.avisos, ...avisos.map((a) => a.mensagem)]),
              ].map((a) => (
                <p key={a} className="text-sm text-mld-muted">
                  {a}
                </p>
              ))}
              <button
                type="button"
                className="sz-tool-btn sz-tool-btn--primary"
                disabled={t.aplicando || indisponivel || falhas.length > 0}
                onClick={() => void t.aplicar()}
              >
                {t.aplicando ? 'Guardando…' : 'Guardar caminho'}
              </button>
            </section>
          ) : null}
          {existente ? (
            <button
              type="button"
              className="sz-tool-btn"
              disabled={t.preparando || t.aplicando}
              onClick={() => aoCopiar(existente.id)}
            >
              Copiar caminho guardado
            </button>
          ) : null}
          <button type="button" className="sz-tool-btn" disabled={t.aplicando} onClick={t.cancelar}>
            Cancelar edição do caminho
          </button>
        </>
      )}
      {apagando ? (
        <DialogoDeApagar
          titulo="Apagar caminho?"
          texto="Os objetos apoiados ficam na mesma posição. O terreno moldado permanece. Você poderá desfazer a remoção."
          aoFechar={() => setApagando(null)}
          aoConfirmar={() => {
            if (!executar(comandosParaRemoverCaminho(documento, apagando, fonte)))
              throw Error('Não consegui remover o caminho. Confira os objetos apoiados.')
            setApagando(null)
          }}
        />
      ) : null}
    </div>
  )
}
