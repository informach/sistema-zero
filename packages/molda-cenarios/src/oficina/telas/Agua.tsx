import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  indiceDaOrganizacao,
} from '@sistemazero/molda-cenarios-core/v2'
import { Droplets, Eye, EyeOff, Trash2, Waves } from 'lucide-react'
import { useState } from 'react'
import { NOMES_AGUA } from '../agua-formulario'
import { comandosParaRemoverAgua } from '../agua-remocao'
import { useFerramentas } from '../faixas'
import { DialogoDeApagar } from '../pecas'
import type { useAgua } from '../useAgua'
import { AguaMaterial } from './AguaMaterial'
import { AguaPontos } from './AguaPontos'
import { CampoNumero } from './Painel'

export const FERRAMENTAS_AGUA = [
  ['mar', Waves],
  ['lago', Droplets],
  ['rio', Waves],
  ['represa', Waves],
  ['cachoeira', Droplets],
] as const
export function Agua({
  agua: t,
  documento,
  indisponivel,
  executar,
  aoCapturar,
  aoCopiar,
}: {
  agua: ReturnType<typeof useAgua>
  documento: DocumentoDeCenario
  indisponivel: boolean
  executar(comandos: ComandoDeCenario[]): boolean
  aoCapturar(): void
  aoCopiar(): void
}) {
  const { pode } = useFerramentas()
  const f = t.formulario,
    existente = t.agua,
    [apagando, setApagando] = useState<string | null>(null),
    organizacao = indiceDaOrganizacao(documento),
    geometriaEditavel = !existente || t.recalcular || f.tipo === 'cachoeira',
    nivelEditavel =
      geometriaEditavel ||
      f.tipo === 'mar' ||
      ((existente?.tipo === 'lago' || existente?.tipo === 'represa') && Boolean(existente.modelo))
  const numero = (
    campo: 'nivel' | 'largura' | 'profundidade' | 'correnteza' | 'folga' | 'giro',
    rotulo: string,
    min: number,
    max: number,
    desligado = false,
    sufixo = 'm',
  ) => (
    <CampoNumero
      {...{ rotulo, min, max, sufixo, desligado }}
      passo={0.1}
      valor={campo === 'giro' ? (f.giro * 180) / Math.PI : f[campo]}
      aoMudar={(v) => t.mudar(campo, campo === 'giro' ? (v * Math.PI) / 180 : v)}
    />
  )
  return (
    <div className="mcn-painel-corpo mcn-agua">
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
      {t.preparando ? (
        <p role="status" className="text-sm text-mld-muted">
          Preparando a prévia. Você pode cancelar sem guardar.
        </p>
      ) : null}
      {!t.aberto ? (
        <>
          <fieldset className="mcn-grupo" disabled={indisponivel}>
            <legend>
              <Waves aria-hidden="true" /> Água
            </legend>
            <p className="text-sm text-mld-muted">
              Crie um mar ou toque numa baixada para encher de água. Confira a prévia antes de
              guardar.
            </p>
            <div className="mcn-agua-acoes">
              {FERRAMENTAS_AGUA.map(([tipo, Icone]) => (
                <button
                  type="button"
                  className="sz-tool-btn"
                  key={tipo}
                  onClick={() => t.iniciar(tipo)}
                >
                  <Icone aria-hidden="true" />
                  {NOMES_AGUA[tipo]}
                </button>
              ))}
            </div>
          </fieldset>
          <section className="mcn-grupo" aria-label="Águas do cenário">
            <h3>Águas do cenário · {documento.aguas.length}</h3>
            {!documento.aguas.length ? (
              <p className="text-sm text-mld-muted">Ainda não há água neste cenário.</p>
            ) : null}
            {documento.aguas.map((a) => (
              <div key={a.id} className="mcn-agua-item">
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel || organizacao.flags.get(a.id)?.bloqueado}
                  onClick={() => t.editar(a.id)}
                >
                  {a.nome}
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel}
                  aria-label={`${a.oculto ? 'Mostrar' : 'Ocultar'} ${a.nome}`}
                  onClick={() =>
                    executar([{ tipo: 'agua.definir', agua: { ...a, oculto: !a.oculto } }])
                  }
                >
                  {a.oculto ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={indisponivel || organizacao.flags.get(a.id)?.bloqueado}
                  aria-label={`Apagar ${a.nome}`}
                  onClick={() => setApagando(a.id)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
                <label className="mcn-campo">
                  Camada de {a.nome}
                  <select
                    aria-label={`Camada de ${a.nome}`}
                    value={a.camada ?? ''}
                    disabled={indisponivel || organizacao.flags.get(a.id)?.bloqueado}
                    onChange={(e) =>
                      executar([
                        {
                          tipo: 'elementos.organizar',
                          ids: [a.id],
                          destino: { camada: e.target.value || null },
                        },
                      ])
                    }
                  >
                    <option value="">Sem camada</option>
                    {documento.camadas?.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.bloqueado}>
                        {c.nome}
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
              {existente ? 'Editar' : 'Criar'} · {NOMES_AGUA[f.tipo]}
            </legend>
            <label className="mcn-campo">
              Nome
              <input
                value={f.nome}
                maxLength={120}
                onChange={(e) => t.mudar('nome', e.target.value)}
              />
            </label>
            {['mar', 'lago', 'represa'].includes(f.tipo)
              ? numero('nivel', 'Nível da água', -10000, 10000, !nivelEditavel)
              : null}
            {['rio', 'represa', 'cachoeira'].includes(f.tipo)
              ? numero(
                  'largura',
                  f.tipo === 'represa' ? 'Largura da barragem' : 'Largura',
                  0.25,
                  f.tipo === 'represa' ? 512 : 200,
                  !geometriaEditavel,
                )
              : null}
            {f.tipo === 'rio' ? (
              <>
                {numero('profundidade', 'Profundidade do leito', 0.05, 200, !geometriaEditavel)}
                {numero('correnteza', 'Correnteza', 0, 10, false, 'm/s')}
                <label className="mcn-opcao-encaixe">
                  Suavizar curva
                  <input
                    type="checkbox"
                    checked={f.suave}
                    disabled={!geometriaEditavel}
                    onChange={(e) => t.mudar('suave', e.target.checked)}
                  />
                </label>
              </>
            ) : null}
            {f.tipo === 'represa'
              ? numero('folga', 'Altura acima da água', 0, 100, !geometriaEditavel)
              : null}
            {f.tipo === 'cachoeira' ? (
              numero('giro', 'Orientação', -360, 360, false, '°')
            ) : !pode('agua.aparencia') ? null : (
              <label className="mcn-opcao-encaixe">
                Permitir nado
                <input
                  type="checkbox"
                  checked={f.nado}
                  onChange={(e) => t.mudar('nado', e.target.checked)}
                />
              </label>
            )}
            {existente &&
            !t.recalcular &&
            (f.tipo === 'rio' ||
              f.tipo === 'represa' ||
              (existente.tipo === 'lago' && !existente.modelo)) ? (
              <>
                <p className="text-sm text-mld-muted">
                  Material, nome, nado e correnteza preservam o leito. Recalcular usa o relevo
                  atual; não desfaz escavações anteriores.
                  {f.tipo === 'rio' && !f.pontos.length
                    ? ' Este rio não tem pontos de controle originais. Escolha uma nova curva para recalcular.'
                    : ''}
                </p>
                <button type="button" className="sz-tool-btn" onClick={t.recalcularForma}>
                  Recalcular contorno ou leito
                </button>
              </>
            ) : null}
            {geometriaEditavel && f.tipo !== 'mar' ? (
              <>
                <p className="text-sm text-mld-muted">
                  {f.tipo === 'lago'
                    ? 'Escolha uma baixada. O nível precisa ficar acima do chão.'
                    : f.tipo === 'rio'
                      ? 'Escolha os pontos da nascente até a foz.'
                      : f.tipo === 'represa'
                        ? 'Escolha as duas pontas da barragem e depois um ponto a montante.'
                        : 'Escolha o topo e depois a base, abaixo do topo.'}
                </p>
                <button
                  type="button"
                  className="sz-tool-btn"
                  disabled={t.preparando}
                  onClick={() => {
                    if (t.capturando) t.pararCaptura()
                    else {
                      t.capturar()
                      aoCapturar()
                    }
                  }}
                >
                  {t.capturando ? 'Concluir pontos' : 'Escolher pontos no cenário'}
                </button>
                {t.capturando ? (
                  <p role="status" className="text-sm text-mld-muted">
                    Toque no chão. Arrastar gira a vista. Escape ou Cancelar encerra sem guardar.
                  </p>
                ) : null}
                <AguaPontos formulario={f} mudar={(pontos) => t.mudar('pontos', pontos)} />
              </>
            ) : null}
            {pode('agua.aparencia') ? (
              <AguaMaterial valor={f.aparencia} mudar={(a) => t.mudar('aparencia', a)} />
            ) : null}
            <button
              type="button"
              className="sz-tool-btn"
              disabled={t.preparando}
              onClick={() => void t.preparar()}
            >
              {t.preparando ? 'Preparando água…' : 'Ver prévia'}
            </button>
          </fieldset>
          {t.previa ? (
            <section className="mcn-grupo" aria-label="Resultado da água">
              <h3>Prévia · ainda não guardada</h3>
              {t.previa.operacao.resumo ? (
                <>
                  <p className="text-sm text-mld-muted">
                    {t.previa.operacao.resumo.area !== undefined
                      ? `Área estimada: ${t.previa.operacao.resumo.area.toFixed(1)} m². `
                      : ''}
                    {t.previa.operacao.resumo.volume !== undefined
                      ? `Volume estimado: ${t.previa.operacao.resumo.volume.toFixed(1)} m³. `
                      : ''}
                    Profundidade: {t.previa.operacao.resumo.profundidade.toFixed(2)} m. Estimativas
                    dependem da resolução do terreno.
                  </p>
                  {t.previa.operacao.resumo.transbordo ? (
                    <p className="text-sm text-mld-muted">
                      Teto de transbordo: {t.previa.operacao.resumo.transbordo.nivel.toFixed(2)} m.
                    </p>
                  ) : null}
                  {t.previa.operacao.resumo.vaza ? (
                    <label className="mcn-opcao-encaixe mcn-recusa">
                      A água alcança a borda do terreno. Conferi a prévia e quero guardar assim.
                      <input
                        type="checkbox"
                        checked={t.confirmouVazamento}
                        onChange={(e) => t.setConfirmouVazamento(e.target.checked)}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                className="sz-tool-btn sz-tool-btn--primary"
                disabled={
                  t.aplicando || Boolean(t.previa.operacao.resumo?.vaza && !t.confirmouVazamento)
                }
                onClick={() => void t.aplicar()}
              >
                {t.aplicando ? 'Guardando…' : 'Guardar água'}
              </button>
            </section>
          ) : null}
          {existente ? (
            <button
              type="button"
              className="sz-tool-btn"
              disabled={t.preparando || t.aplicando}
              onClick={aoCopiar}
            >
              Copiar água guardada
            </button>
          ) : null}
          {existente ? (
            <p className="text-sm text-mld-muted">
              A cópia conserva a água e seus parâmetros. O relevo não é copiado; confira o nível e o
              leito no destino.
            </p>
          ) : null}
          <button type="button" className="sz-tool-btn" disabled={t.aplicando} onClick={t.cancelar}>
            Cancelar edição da água
          </button>
        </>
      )}
      {apagando ? (
        <DialogoDeApagar
          titulo="Apagar água?"
          texto="A água será removida. Os objetos apoiados ficam na mesma posição. Você poderá desfazer."
          aoFechar={() => setApagando(null)}
          aoConfirmar={() => {
            if (!executar(comandosParaRemoverAgua(documento, apagando)))
              throw Error(
                'Não consegui remover esta água. Confira os objetos apoiados e tente novamente.',
              )
            setApagando(null)
          }}
        />
      ) : null}
    </div>
  )
}
