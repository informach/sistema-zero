import type { CaminhoDeCenario, FonteDeAlturas } from '@sistemazero/molda-cenarios-core/v2'
import { useFerramentas } from '../faixas'
import { CampoNumero } from './Painel'

export function CaminhoParametros({
  valor: c,
  mudar,
  fonte,
}: {
  valor: CaminhoDeCenario
  mudar(c: CaminhoDeCenario): void
  fonte?: FonteDeAlturas
}) {
  const { pode } = useFerramentas()
  return (
    <>
      <CampoNumero
        rotulo={c.tipo === 'cerca' || c.tipo === 'muro' ? 'Espessura lateral' : 'Largura'}
        valor={c.largura}
        min={0.05}
        max={100}
        passo={0.1}
        sufixo="m"
        aoMudar={(largura) => mudar({ ...c, largura })}
      />
      {c.tipo !== 'ponte' ? (
        <>
          {pode('caminhos.curvas') ? (
            <label className="mcn-opcao-encaixe">
              Curva suave
              <input
                type="checkbox"
                checked={c.suave ?? false}
                onChange={(e) => mudar({ ...c, suave: e.target.checked })}
              />
            </label>
          ) : null}
          {c.tipo !== 'praca' ? (
            <label className="mcn-opcao-encaixe">
              Circuito fechado
              <input
                type="checkbox"
                checked={c.fechada ?? false}
                onChange={(e) => mudar({ ...c, fechada: e.target.checked })}
              />
            </label>
          ) : null}
        </>
      ) : null}
      {c.tipo === 'cerca' || c.tipo === 'muro' ? (
        <>
          <CampoNumero
            rotulo="Altura"
            valor={c.altura}
            min={0.05}
            max={100}
            passo={0.1}
            sufixo="m"
            aoMudar={(altura) => mudar({ ...c, altura })}
          />
          <CampoNumero
            rotulo="Comprimento de referência do módulo"
            valor={c.comprimentoDoModulo}
            min={0.05}
            max={200}
            passo={0.1}
            sufixo="m"
            aoMudar={(comprimentoDoModulo) => mudar({ ...c, comprimentoDoModulo })}
          />
        </>
      ) : null}
      {c.tipo === 'ponte' ? (
        <details className="mcn-grupo" open>
          <summary>Cabeceiras e estrutura</summary>
          <label className="mcn-opcao-encaixe">
            Cabeceiras no terreno
            <input
              type="checkbox"
              checked={!c.cotas}
              disabled={!c.cotas && (c.pontos.length !== 2 || !fonte)}
              onChange={(e) => {
                const novo = { ...c }
                if (e.target.checked) delete novo.cotas
                else
                  novo.cotas = {
                    de: fonte!(c.pontos[0]!.x, c.pontos[0]!.z),
                    ate: fonte!(c.pontos[1]!.x, c.pontos[1]!.z),
                  }
                mudar(novo)
              }}
            />
          </label>
          {c.cotas
            ? (['de', 'ate'] as const).map((lado, i) => (
                <CampoNumero
                  key={lado}
                  rotulo={`Altura da cabeceira ${i === 0 ? 'A' : 'B'}`}
                  valor={c.cotas![lado]}
                  min={-100000}
                  max={100000}
                  passo={0.1}
                  sufixo="m"
                  aoMudar={(v) => mudar({ ...c, cotas: { ...c.cotas!, [lado]: v } })}
                />
              ))
            : null}
          {!c.acabamento ? (
            <>
              <CampoNumero
                rotulo="Espessura do tabuleiro"
                valor={c.espessura}
                min={0.05}
                max={5}
                passo={0.05}
                sufixo="m"
                aoMudar={(espessura) => mudar({ ...c, espessura })}
              />
              <label className="mcn-opcao-encaixe">
                Guardas laterais
                <input
                  type="checkbox"
                  checked={c.guardas}
                  onChange={(e) => mudar({ ...c, guardas: e.target.checked })}
                />
              </label>
              {c.guardas ? (
                <CampoNumero
                  rotulo="Altura das guardas"
                  valor={c.alturaDaGuarda}
                  min={0.1}
                  max={5}
                  passo={0.1}
                  sufixo="m"
                  aoMudar={(alturaDaGuarda) => mudar({ ...c, alturaDaGuarda })}
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-mld-muted">
              O tabuleiro e as guardas seguem a peça escolhida. Confira as cabeceiras com o avatar.
            </p>
          )}
          <label className="mcn-opcao-encaixe">
            Criar pilares
            <input
              type="checkbox"
              checked={Boolean(c.pilares)}
              disabled={!c.pilares && c.largura < 0.125}
              onChange={(e) => {
                const novo = { ...c }
                if (e.target.checked)
                  novo.pilares = {
                    espacamento: 6,
                    largura: Math.max(0.05, Math.min(0.25, c.largura / 5)),
                  }
                else delete novo.pilares
                mudar(novo)
              }}
            />
          </label>
          {c.pilares ? (
            <>
              <CampoNumero
                rotulo="Espaçamento dos pilares"
                valor={c.pilares.espacamento}
                min={0.5}
                max={200}
                passo={0.5}
                sufixo="m"
                aoMudar={(espacamento) => mudar({ ...c, pilares: { ...c.pilares!, espacamento } })}
              />
              <CampoNumero
                rotulo="Largura dos pilares"
                valor={c.pilares.largura}
                min={0.05}
                max={10}
                passo={0.05}
                sufixo="m"
                aoMudar={(largura) => mudar({ ...c, pilares: { ...c.pilares!, largura } })}
              />
              <CampoNumero
                rotulo="Afastamento lateral dos pilares"
                valor={
                  c.pilares.afastamentoLateral ?? Math.max(0, (c.largura - c.pilares.largura) / 3)
                }
                min={0}
                max={50}
                passo={0.05}
                sufixo="m"
                aoMudar={(afastamentoLateral) =>
                  mudar({ ...c, pilares: { ...c.pilares!, afastamentoLateral } })
                }
              />
              <button
                type="button"
                className="sz-tool-btn"
                disabled={c.pilares.afastamentoLateral === undefined}
                onClick={() => {
                  const p = { ...c.pilares! }
                  delete p.afastamentoLateral
                  mudar({ ...c, pilares: p })
                }}
              >
                Usar afastamento automático
              </button>
            </>
          ) : null}
        </details>
      ) : null}
      {c.acabamento || ['cerca', 'muro', 'ponte'].includes(c.tipo) ? (
        <label className="mcn-opcao-encaixe">
          Colisão da geometria
          <input
            type="checkbox"
            checked={c.colisao !== 'nenhuma'}
            onChange={(e) => mudar({ ...c, colisao: e.target.checked ? 'malha' : 'nenhuma' })}
          />
        </label>
      ) : null}
      {!c.acabamento && (c.tipo === 'trilha' || c.tipo === 'estrada' || c.tipo === 'praca') ? (
        <p className="text-sm text-mld-muted">O piso simples usa a colisão do próprio terreno.</p>
      ) : null}
    </>
  )
}
