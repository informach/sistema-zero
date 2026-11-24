import {
  type DocumentoDeCenario,
  indiceDaOrganizacao,
  LIMITES_ESPALHAMENTO,
} from '@sistemazero/molda-cenarios-core/v2'
import { ArrowLeft, Box, Paintbrush, X } from 'lucide-react'
import type { JSX } from 'react'
import { Capa } from '../pecas'
import type { usePincelDeObjetos } from '../usePincelDeObjetos'
import { CampoNumero } from './Painel'

export function Espalhar({
  documento,
  pincel,
  temSelecao,
  aoEscolherBiblioteca,
  aoPintar,
  aoTentar,
}: {
  documento: DocumentoDeCenario
  pincel: ReturnType<typeof usePincelDeObjetos>
  temSelecao: boolean
  aoEscolherBiblioteca(): void
  aoPintar(): void
  aoTentar(): void
}): JSX.Element {
  const p = pincel.parametros,
    indice = indiceDaOrganizacao(documento)
  return (
    <div className="mcn-painel-corpo">
      <button type="button" className="sz-tool-btn sz-tool-btn--sm" onClick={pincel.fechar}>
        <ArrowLeft aria-hidden="true" />
        Voltar à seleção
      </button>
      <fieldset className="mcn-grupo">
        <legend>Espalhar objetos</legend>
        <p className="text-sm text-mld-muted">
          Escolha até oito modelos ou variações. A prévia só vira parte do cenário quando você solta
          o traço.
        </p>
        <button
          type="button"
          className="sz-tool-btn"
          disabled={!pincel.configuracao || Boolean(pincel.configuracao.pausa)}
          onClick={aoPintar}
        >
          <Paintbrush aria-hidden="true" />
          Começar a pintar
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          onClick={aoEscolherBiblioteca}
        >
          Escolher na biblioteca
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={!temSelecao}
          onClick={pincel.usarSelecao}
        >
          Usar modelos da seleção
        </button>
        <ul aria-label="Modelos do pincel" className="mcn-pincel-modelos">
          {pincel.escolhas.map((e) => (
            <li key={e.chave}>
              <span className="mcn-pincel-miniatura">
                <Capa endereco={e.miniatura ?? null} reserva={<Box aria-hidden="true" />} />
              </span>
              <span title={e.prototipo.nome}>{e.prototipo.nome}</span>
              <button
                type="button"
                className="sz-tool-icon-btn"
                aria-label={`Retirar ${e.prototipo.nome} do pincel`}
                onClick={() => pincel.retirar(e.chave)}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {pincel.escolhas.length ? (
          <button type="button" className="sz-tool-btn sz-tool-btn--sm" onClick={pincel.limpar}>
            Limpar modelos do pincel
          </button>
        ) : (
          <p className="text-sm text-mld-muted">
            Toque nos modelos da gaveta ou escolha peças que já estão no cenário.
          </p>
        )}
      </fieldset>
      <fieldset className="mcn-grupo">
        <legend>Distribuição</legend>
        <CampoNumero
          rotulo="Raio do pincel"
          sufixo="m"
          valor={p.raio}
          min={0.2}
          max={100}
          passo={0.5}
          aoMudar={(v) => pincel.mudar('raio', v)}
        />
        <CampoNumero
          rotulo="Peças por 100 m²"
          valor={p.densidade}
          min={0.1}
          max={1000}
          passo={1}
          aoMudar={(v) => pincel.mudar('densidade', v)}
        />
        <CampoNumero
          rotulo="Afastamento mínimo"
          sufixo="m"
          valor={p.afastamento}
          min={0.1}
          max={100}
          passo={0.1}
          aoMudar={(v) => pincel.mudar('afastamento', v)}
        />
        <label className="mcn-marcar">
          <input
            type="checkbox"
            checked={p.evitarObjetos}
            onChange={(e) => pincel.mudar('evitarObjetos', e.target.checked)}
          />
          <span>Evitar sobreposição</span>
        </label>
        <label className="mcn-marcar">
          <input
            type="checkbox"
            checked={p.inclinar ?? false}
            onChange={(e) => pincel.mudar('inclinar', e.target.checked)}
          />
          <span>Inclinar com a encosta</span>
        </label>
        <p className="text-sm text-mld-muted">
          Reserva espaço com as medidas dos modelos. Desative para permitir que copas e vegetação se
          cruzem.
        </p>
      </fieldset>
      <fieldset className="mcn-grupo">
        <legend>Variação</legend>
        <CampoNumero
          rotulo="Variação do giro"
          sufixo="°"
          valor={(p.giro * 180) / Math.PI}
          min={0}
          max={180}
          passo={15}
          aoMudar={(v) => pincel.mudar('giro', (v * Math.PI) / 180)}
        />
        <CampoNumero
          rotulo="Tamanho mínimo"
          sufixo="×"
          valor={p.tamanhoMin}
          min={0.01}
          max={10}
          passo={0.05}
          aoMudar={(v) => pincel.mudar('tamanhoMin', v)}
        />
        <CampoNumero
          rotulo="Tamanho máximo"
          sufixo="×"
          valor={p.tamanhoMax}
          min={0.01}
          max={10}
          passo={0.05}
          aoMudar={(v) => pincel.mudar('tamanhoMax', v)}
        />
        <CampoNumero
          rotulo="Semente do pincel"
          valor={p.semente}
          min={0}
          max={0xffffffff}
          passo={1}
          aoMudar={(v) => pincel.mudar('semente', Math.round(v))}
        />
        <CampoNumero
          rotulo="Máximo por traço"
          valor={p.limite}
          min={1}
          max={LIMITES_ESPALHAMENTO.objetos}
          passo={1}
          aoMudar={(v) => pincel.mudar('limite', Math.round(v))}
        />
        <p className="text-sm text-mld-muted">
          A semente avança depois de cada traço. Use o mesmo número para repetir uma distribuição.
        </p>
      </fieldset>
      <fieldset className="mcn-grupo">
        <legend>Destino do plantio</legend>
        <label className="mcn-campo">
          <span>Pasta do plantio</span>
          <select
            value={p.grupo ?? ''}
            aria-label="Pasta do plantio"
            onChange={(e) => pincel.mudar('grupo', e.target.value || null)}
          >
            <option value="">Fora das pastas</option>
            {documento.grupos.map((g) => (
              <option
                key={g.id}
                value={g.id}
                disabled={indice.flags.get(g.id)?.bloqueado || indice.flags.get(g.id)?.oculto}
              >
                {g.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="mcn-campo">
          <span>Camada do plantio</span>
          <select
            value={p.camada ?? ''}
            aria-label="Camada do plantio"
            onChange={(e) => pincel.mudar('camada', e.target.value || null)}
          >
            <option value="">Sem camada</option>
            {documento.camadas?.map((c) => (
              <option key={c.id} value={c.id} disabled={c.bloqueado || c.oculto}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      {pincel.erro ? (
        <p className="text-sm font-semibold text-mld-danger" role="alert">
          {pincel.erro}
        </p>
      ) : null}
      {pincel.previa.erro && !pincel.configuracao?.pausa ? (
        <button type="button" className="sz-tool-btn" onClick={aoTentar}>
          Tentar carregar novamente
        </button>
      ) : null}
      {pincel.escolhas.length ? (
        <p className="text-sm text-mld-muted" role="status">
          {pincel.previa.pronta
            ? `${pincel.previa.quantidade} peças na prévia.`
            : 'Aproxime o pincel do chão para ver a prévia.'}
        </p>
      ) : null}
      {pincel.previa.saturou || pincel.previa.limiteDoTraco ? (
        <p className="text-sm text-mld-muted">
          O traço chegou ao limite. Solte para aplicar e comece outro para continuar.
        </p>
      ) : pincel.previa.faltouEspaco ? (
        <p className="text-sm text-mld-muted">
          Nem todas as peças couberam. Ajuste a densidade ou o afastamento se quiser outro
          resultado.
        </p>
      ) : null}
      <p className="text-sm text-mld-muted">
        Arraste no chão e solte para criar as peças. Escape cancela. Um traço inteiro ocupa um passo
        de desfazer.
      </p>
    </div>
  )
}
