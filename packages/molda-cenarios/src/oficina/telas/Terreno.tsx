import { ColorPicker } from '@sistemazero/molda/ui'
import { passoDoTerreno, relevoCabeNoEstudio } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type BaseDeTerreno,
  BaseDeTerrenoSchema,
  type CamadaDeSolo,
  type DocumentoDeCenario,
  FAMILIA_DA_FERRAMENTA,
  FERRAMENTAS_DE_TERRENO,
  type ParametrosDeTerreno,
  type ReceitaDeTerreno,
  type RegraDeChao,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  ArrowDown,
  ArrowUp,
  Circle,
  Mountain,
  Paintbrush,
  SlidersHorizontal,
  Waves,
} from 'lucide-react'
import { type JSX, useState } from 'react'
import { useFerramentas } from '../faixas'
import { Dialogo } from '../pecas'
import type { Biblioteca, CenariosHost, TexturaDeBiblioteca } from '../portas'
import type { useTerreno } from '../useTerreno'
import { EscolherTextura } from './EscolherTextura'
import { CampoNumero } from './Painel'

type Ferramenta = ParametrosDeTerreno['ferramenta']
export const NOMES_TERRENO: Record<Ferramenta, string> = {
  elevar: 'Elevar',
  abaixar: 'Abaixar',
  aplainar: 'Aplainar',
  suavizar: 'Suavizar',
  nivelar: 'Nivelar',
  plato: 'Platô',
  rampa: 'Rampa',
  ruido: 'Ruído',
  erosao: 'Erosão',
  morro: 'Morro',
  cratera: 'Cratera',
  pintar: 'Pintar chão',
  furar: 'Abrir buraco',
  fechar: 'Fechar buraco',
}
export const FERRAMENTAS_TERRENO_RAIL = [
  ['elevar', ArrowUp],
  ['abaixar', ArrowDown],
  ['aplainar', SlidersHorizontal],
  ['suavizar', Waves],
  ['pintar', Paintbrush],
  ['furar', Circle],
] as const
type Props = {
  terreno: ReturnType<typeof useTerreno>
  documento: DocumentoDeCenario
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  indisponivel: boolean
  aoPintar(): void
}
export function Terreno({
  terreno: t,
  documento,
  host,
  bibliotecas,
  indisponivel,
  aoPintar,
}: Props): JSX.Element {
  const { pode } = useFerramentas()
  const p = t.parametros,
    base = documento.base.tipo === 'terreno' ? documento.base : null,
    [confirmar, setConfirmar] = useState<ReceitaDeTerreno | null>(null),
    [receita, setReceita] = useState<'plano' | 'ilha' | 'colinas' | 'vale'>('ilha'),
    [altura, setAltura] = useState(12),
    [semente, setSemente] = useState(77),
    [preto, setPreto] = useState(base?.min ?? -50),
    [branco, setBranco] = useState(base?.max ?? 150)
  const n = (
    campo: keyof ParametrosDeTerreno,
    rotulo: string,
    min: number,
    max: number,
    passo: number,
    sufixo?: string,
  ) => (
    <CampoNumero
      rotulo={rotulo}
      valor={Number(p[campo] ?? 0)}
      min={min}
      max={max}
      passo={passo}
      sufixo={sufixo}
      aoMudar={(v) => t.mudar(campo, v)}
    />
  )
  return (
    <div className="mcn-painel-corpo mcn-terreno">
      <fieldset className="mcn-grupo" disabled={indisponivel || t.ocupado}>
        <legend>
          <Mountain aria-hidden="true" /> Terreno
        </legend>
        {!base ? (
          <p className="text-sm text-mld-muted">
            Comece com um modelo pronto ou importe alturas. O plano atual continua intacto até você
            aplicar.
          </p>
        ) : (
          <>
            <label className="mcn-campo">
              Ferramenta
              <select
                aria-label="Ferramenta"
                value={p.ferramenta}
                onChange={(e) => t.mudar('ferramenta', e.target.value as Ferramenta)}
              >
                {FERRAMENTAS_DE_TERRENO.filter((f) => pode(FAMILIA_DA_FERRAMENTA.terreno[f]!)).map(
                  (f) => (
                    <option key={f} value={f}>
                      {NOMES_TERRENO[f]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <button type="button" className="sz-tool-btn" onClick={aoPintar}>
              Esculpir no cenário
            </button>
            <p className="text-sm text-mld-muted">
              Arraste no chão. Solte para guardar; Escape cancela. Segure Alt para girar a vista.{' '}
              {p.ferramenta === 'rampa'
                ? 'A rampa liga a altura original do início à do fim do arraste.'
                : null}
            </p>
            {p.ferramenta !== 'rampa'
              ? n('raio', 'Raio', 0.25, 4096, 0.25, 'm')
              : n('largura', 'Largura da rampa', 0.25, 512, 0.25, 'm')}
            {p.ferramenta !== 'rampa' ? n('forca', 'Força', 0, 1, 0.05) : null}
            {!['rampa', 'morro', 'cratera'].includes(p.ferramenta)
              ? n('dureza', 'Dureza da borda', 0, 1, 0.05)
              : null}
            {['elevar', 'abaixar', 'morro', 'cratera', 'ruido'].includes(p.ferramenta)
              ? n('metros', 'Intensidade', 0, 1000, 0.25, 'm')
              : null}
            {['nivelar', 'plato'].includes(p.ferramenta)
              ? n('altura', 'Altura de destino', base.min, base.max, 0.25, 'm')
              : null}
            {p.ferramenta === 'ruido' ? (
              <>
                {n('escalaRuido', 'Escala do ruído', 0.25, 8192, 1, 'm')}
                {n('oitavas', 'Oitavas', 1, 8, 1)}
                {n('semente', 'Semente do pincel', 0, 2147483647, 1)}
              </>
            ) : null}
            {p.ferramenta === 'erosao' ? (
              <>
                {n('passadas', 'Passadas', 1, 64, 1)}
                {n('talude', 'Talude', 0, 10, 0.1)}
              </>
            ) : null}
            {p.ferramenta === 'cratera'
              ? n('bordaCratera', 'Elevação da borda', 0, 1000, 0.1, 'm')
              : null}
          </>
        )}
      </fieldset>
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
        <div role="status" className="mcn-grupo">
          Preparando e guardando o terreno…
          <button type="button" className="sz-tool-btn" onClick={t.cancelar}>
            Cancelar preparação
          </button>
        </div>
      ) : null}
      <fieldset className="mcn-grupo" disabled={indisponivel || t.ocupado}>
        <legend>Modelos prontos</legend>
        <label className="mcn-campo">
          Modelo de terreno
          <select
            aria-label="Modelo de terreno"
            value={receita}
            onChange={(e) => setReceita(e.target.value as typeof receita)}
          >
            {['plano', 'ilha', 'colinas', 'vale'].map((r) => (
              <option key={r} value={r}>
                {r === 'plano'
                  ? 'Plano'
                  : r === 'ilha'
                    ? 'Ilha'
                    : r === 'colinas'
                      ? 'Colinas'
                      : 'Vale'}
              </option>
            ))}
          </select>
        </label>
        <CampoNumero
          rotulo={receita === 'plano' ? 'Altura do plano' : 'Altura do modelo'}
          valor={altura}
          min={receita === 'plano' ? -2000 : 0}
          max={2000}
          passo={1}
          sufixo="m"
          aoMudar={setAltura}
        />
        {receita !== 'plano' ? (
          <CampoNumero
            rotulo="Semente do modelo"
            valor={semente}
            min={0}
            max={2147483647}
            passo={1}
            aoMudar={setSemente}
          />
        ) : null}
        <p className="text-sm text-mld-muted">
          Substitui o relevo na cobertura do terreno. Alturas ficam limitadas ao intervalo
          configurado; camadas de chão e buracos são preservados. A mudança pode ser desfeita.
        </p>
        <button
          type="button"
          className="sz-tool-btn"
          onClick={() =>
            setConfirmar(
              receita === 'plano' ? { tipo: 'plano', altura } : { tipo: receita, altura, semente },
            )
          }
        >
          Aplicar modelo de terreno
        </button>
      </fieldset>
      {base ? (
        <>
          <CamadasDeTerreno
            key={JSON.stringify(base.solo)}
            base={base}
            t={t}
            host={host}
            bibliotecas={bibliotecas}
            indisponivel={indisponivel}
          />
          {pode('terreno.tamanho') ? (
            <details className="mcn-grupo">
              <summary>Avançado: tamanho e resolução</summary>
              <Medidas
                key={JSON.stringify([
                  base.origem,
                  base.colunas,
                  base.linhas,
                  base.passo,
                  base.min,
                  base.max,
                  base.fundo,
                ])}
                base={base}
                t={t}
                indisponivel={indisponivel}
              />
            </details>
          ) : null}
          {base.recortes?.length ? (
            <fieldset className="mcn-grupo" disabled={t.ocupado || indisponivel}>
              <legend>Recortes importados</legend>
              <p className="text-sm text-mld-muted">
                {base.recortes.length} recortes do cenário original. Fechar com o pincel só afeta
                buracos pintados; os recortes continuam preservados.
              </p>
              <RemoverRecortes t={t} />
            </fieldset>
          ) : null}
        </>
      ) : null}
      {pode('terreno.tamanho') ? (
        <fieldset className="mcn-grupo" disabled={indisponivel || t.ocupado}>
          <legend>Mapa de alturas PNG</legend>
          <p className="text-sm text-mld-muted">
            PNG cinza ou colorido, 8 ou 16 bits, sem entrelaçamento. A imagem ocupa toda a cobertura
            atual. Exportação sempre em cinza de 16 bits, sem alterar o cenário.
          </p>
          <CampoNumero
            rotulo="Preto corresponde a"
            valor={preto}
            min={base?.min ?? -50}
            max={base?.max ?? 150}
            passo={1}
            sufixo="m"
            aoMudar={setPreto}
          />
          <CampoNumero
            rotulo="Branco corresponde a"
            valor={branco}
            min={base?.min ?? -50}
            max={base?.max ?? 150}
            passo={1}
            sufixo="m"
            aoMudar={setBranco}
          />
          <label className="mcn-campo">
            Importar PNG de alturas
            <input
              type="file"
              accept="image/png,.png"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void t.importar(f, preto, branco)
              }}
            />
          </label>
          <button
            type="button"
            className="sz-tool-btn"
            disabled={!base}
            onClick={() => void t.exportar()}
          >
            Exportar alturas em PNG 16 bits
          </button>
        </fieldset>
      ) : null}
      {confirmar ? (
        <Dialogo titulo="Substituir o relevo?" aoFechar={() => setConfirmar(null)}>
          <p className="text-sm text-mld-muted">
            O modelo altera as alturas em toda a cobertura. Os objetos apoiados acompanham o
            terreno; objetos livres mantêm suas posições. Você poderá desfazer.
          </p>
          <button
            type="button"
            className="sz-tool-btn"
            onClick={() => {
              void t.receita(confirmar)
              setConfirmar(null)
            }}
          >
            Confirmar modelo
          </button>
        </Dialogo>
      ) : null}
    </div>
  )
}

function Medidas({
  base,
  t,
  indisponivel,
}: {
  base: BaseDeTerreno
  t: ReturnType<typeof useTerreno>
  indisponivel: boolean
}): JSX.Element {
  const [forma, setForma] = useState(base),
    [confirma, setConfirma] = useState(false)
  const mudar = (campo: 'colunas' | 'linhas' | 'passo' | 'min' | 'max' | 'fundo', v: number) =>
    setForma((b) => ({ ...b, [campo]: v }))
  const validacao = BaseDeTerrenoSchema.safeParse({
      ...forma,
      pecas: [],
      buracos: [],
      ...(forma.solo ? { solo: { ...forma.solo, pecas: [] } } : {}),
    }),
    corte =
      forma.origem.x > base.origem.x ||
      forma.origem.z > base.origem.z ||
      forma.origem.x + forma.colunas * forma.passo < base.origem.x + base.colunas * base.passo ||
      forma.origem.z + forma.linhas * forma.passo < base.origem.z + base.linhas * base.passo,
    satura = forma.min > base.min || forma.max < base.max,
    // O Estúdio abre o relevo com até 1088 × 1088 células (plano "Mundos de 2 km", lote 4).
    cabeNoEstudio = relevoCabeNoEstudio(forma.colunas, forma.linhas),
    lado = Math.max(forma.colunas * forma.passo, forma.linhas * forma.passo),
    sugerido = lado > 0 && lado <= 8192 ? passoDoTerreno(lado) : null
  return (
    <fieldset className="mcn-grupo" disabled={indisponivel || t.ocupado}>
      {(['colunas', 'linhas'] as const).map((c) => (
        <CampoNumero
          key={c}
          rotulo={c === 'colunas' ? 'Células em X' : 'Células em Z'}
          valor={forma[c]}
          min={64}
          max={4096}
          passo={64}
          aoMudar={(v) => mudar(c, v)}
        />
      ))}
      <CampoNumero
        rotulo="Distância entre amostras"
        valor={forma.passo}
        min={0.25}
        max={32}
        passo={0.25}
        sufixo="m"
        aoMudar={(v) => mudar('passo', v)}
      />
      {(['x', 'z'] as const).map((eixo) => (
        <CampoNumero
          key={eixo}
          rotulo={`Origem ${eixo.toUpperCase()}`}
          valor={forma.origem[eixo]}
          min={-100000}
          max={100000}
          passo={1}
          sufixo="m"
          aoMudar={(v) => setForma((b) => ({ ...b, origem: { ...b.origem, [eixo]: v } }))}
        />
      ))}
      {(['min', 'max', 'fundo'] as const).map((c) => (
        <CampoNumero
          key={c}
          rotulo={c === 'min' ? 'Altura mínima' : c === 'max' ? 'Altura máxima' : 'Altura do fundo'}
          valor={forma[c]}
          min={-10000}
          max={10000}
          passo={1}
          sufixo="m"
          aoMudar={(v) => mudar(c, v)}
        />
      ))}
      <p className="text-sm text-mld-muted">
        Cobertura: {forma.colunas * forma.passo} × {forma.linhas * forma.passo} m.{' '}
        {(forma.colunas + 1) * (forma.linhas + 1)} amostras. O relevo é reamostrado nas coordenadas
        do mundo; objetos não são deslocados para compensar mudanças.
      </p>
      {!cabeNoEstudio ? (
        <p role="status" className="text-sm text-mld-muted">
          Este relevo tem amostras demais para abrir no Estúdio (até 1088 × 1088 células).
          {sugerido ? ` Para ${lado} m, use ${sugerido} m entre amostras.` : ''}
        </p>
      ) : null}
      {corte ? (
        <p role="status" className="text-sm text-mld-muted">
          A nova cobertura corta parte do relevo atual. O conteúdo fora dela será removido.
        </p>
      ) : null}
      {satura ? (
        <p role="status" className="text-sm text-mld-muted">
          Alturas fora do novo intervalo serão limitadas. A quantização será refeita em todas as
          peças.
        </p>
      ) : null}
      {!validacao.success ? (
        <p role="alert" className="text-sm text-mld-muted">
          Use múltiplos de 64 células, lado de até 8192 m e fundo entre mínimo e máximo.
        </p>
      ) : null}
      <button
        type="button"
        className="sz-tool-btn"
        disabled={!validacao.success}
        onClick={() => setConfirma(true)}
      >
        Aplicar medidas do terreno
      </button>
      {confirma ? (
        <Dialogo titulo="Reamostrar o terreno?" aoFechar={() => setConfirma(false)}>
          <p className="text-sm text-mld-muted">
            {corte ? 'Atenção: a nova cobertura remove relevo fora dos seus limites. ' : ''}
            {satura ? 'Alturas serão limitadas ao novo intervalo. ' : ''}As camadas e buracos serão
            reamostrados. Recortes importados permanecem nas coordenadas originais. Esta mudança
            pode ser desfeita.
          </p>
          <button
            type="button"
            className="sz-tool-btn"
            onClick={() => {
              void t.dimensoes(forma)
              setConfirma(false)
            }}
          >
            Confirmar medidas
          </button>
        </Dialogo>
      ) : null}
    </fieldset>
  )
}

function CamadasDeTerreno({
  base,
  t,
  host,
  bibliotecas,
  indisponivel,
}: {
  base: BaseDeTerreno
  t: ReturnType<typeof useTerreno>
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  indisponivel: boolean
}): JSX.Element {
  const { pode } = useFerramentas()
  // No básico, até cinco chãos (grama, terra, areia, pedra e neve); mais é do intermediário.
  const maximo = pode('terreno.camadas') ? 8 : 5
  const [camadas, setCamadas] = useState<CamadaDeSolo[]>(
      base.solo?.camadas ?? [{ id: 'grama', nome: 'Grama', cor: '#80a568' }],
    ),
    [escolhendo, setEscolhendo] = useState<number | null>(null),
    [texturas, setTexturas] = useState<TexturaDeBiblioteca[]>([]),
    [regras, setRegras] = useState<(RegraDeChao & { id: string })[]>([])
  const alterar = (i: number, patch: Partial<CamadaDeSolo>) =>
    setCamadas((c) => c.map((anterior, k) => (k === i ? { ...anterior, ...patch } : anterior)))
  const aplicar = () =>
    void t.camadas(
      camadas,
      texturas
        .filter((r) => camadas.some((c) => c.textura?.id === r.id))
        .map((r) => ({
          tipo: 'textura.definir',
          textura: {
            id: r.id,
            textura: r.id,
            biblioteca: r.bibliotecaId,
            digest: r.digest,
            nome: r.nome.slice(0, 120),
          },
        })),
    )
  const mudou = JSON.stringify(camadas) !== JSON.stringify(base.solo?.camadas)
  const reais = base.solo?.camadas ?? []
  return (
    <>
      <fieldset className="mcn-grupo" disabled={indisponivel || t.ocupado}>
        <legend>Camadas de chão</legend>
        <p className="text-sm text-mld-muted">
          Até oito camadas. A primeira é o fundo. A pintura mistura as cores e texturas no próprio
          terreno.
        </p>
        {camadas.map((c, i) => (
          <div className="mcn-grupo" key={c.id}>
            <label className="mcn-campo">
              Nome da camada {i + 1}
              <input
                value={c.nome}
                maxLength={120}
                onChange={(e) => alterar(i, { nome: e.target.value })}
              />
            </label>
            <div className="mcn-campo">
              <span>Cor de {c.nome || 'chão'}</span>
              <ColorPicker value={c.cor} onChange={(cor) => alterar(i, { cor })} />
            </div>
            <button
              type="button"
              className="sz-tool-btn sz-tool-btn--sm"
              onClick={() => setEscolhendo(i)}
            >
              {c.textura ? 'Trocar textura' : 'Escolher textura do chão'}
            </button>
            {c.textura ? (
              <>
                <CampoNumero
                  rotulo={`Repetição de ${c.nome}`}
                  valor={c.textura.repeticaoMetros}
                  min={0.1}
                  max={100}
                  passo={0.1}
                  sufixo="m"
                  aoMudar={(v) =>
                    alterar(i, { textura: { id: c.textura!.id, repeticaoMetros: v } })
                  }
                />
                <button
                  type="button"
                  className="sz-tool-btn sz-tool-btn--sm"
                  onClick={() =>
                    setCamadas((cs) =>
                      cs.map((v, k) => {
                        if (k !== i) return v
                        const { textura: _, ...sem } = v
                        return sem
                      }),
                    )
                  }
                >
                  Usar apenas cor
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="sz-tool-btn sz-tool-btn--sm"
              disabled={camadas.length === 1}
              onClick={() => setCamadas((cs) => cs.filter((_, k) => k !== i))}
            >
              Retirar camada {c.nome}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="sz-tool-btn"
          disabled={camadas.length >= maximo}
          onClick={() =>
            setCamadas((cs) => [
              ...cs,
              { id: crypto.randomUUID(), nome: `Chão ${cs.length + 1}`, cor: '#a38b63' },
            ])
          }
        >
          Adicionar camada de chão
        </button>
        <button
          type="button"
          className="sz-tool-btn"
          disabled={!mudou || camadas.some((c) => !c.nome.trim())}
          onClick={aplicar}
        >
          Guardar camadas de chão
        </button>
        {reais.length ? (
          <label className="mcn-campo">
            Camada para pintar
            <select
              aria-label="Camada para pintar"
              value={Math.min(t.parametros.camada, reais.length - 1)}
              onChange={(e) => {
                t.mudar('camada', Number(e.target.value))
                t.mudar('ferramenta', 'pintar')
              }}
            >
              {reais.map((c, i) => (
                <option key={c.id} value={i}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </fieldset>
      {reais.length && pode('terreno.camadas') ? (
        <details className="mcn-grupo">
          <summary>Pintura automática por altura e inclinação</summary>
          <fieldset className="mcn-grupo" disabled={indisponivel || t.ocupado}>
            <p className="text-sm text-mld-muted">
              Regras aplicadas de cima para baixo; a última cobre as anteriores onde sua faixa é
              satisfeita. Inclinação é subida por metro: 1 equivale a 45°.
            </p>
            {regras.map((r, i) => (
              <div className="mcn-grupo" key={r.id}>
                <label className="mcn-campo">
                  Camada da regra {i + 1}
                  <select
                    aria-label={`Camada da regra ${i + 1}`}
                    value={r.camada}
                    onChange={(e) =>
                      setRegras((rs) =>
                        rs.map((v, k) => (k === i ? { ...v, camada: Number(e.target.value) } : v)),
                      )
                    }
                  >
                    {reais.map((c, j) => (
                      <option key={c.id} value={j}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
                {(['altura', 'declive'] as const).flatMap((faixa) =>
                  (['min', 'max'] as const).map((extremo) => (
                    <CampoNumero
                      key={`${faixa}-${extremo}`}
                      rotulo={`${faixa === 'altura' ? 'Altura' : 'Inclinação'} ${extremo === 'min' ? 'mínima' : 'máxima'} da regra ${i + 1}`}
                      valor={r[faixa]?.[extremo] ?? (extremo === 'min' ? 0 : 10)}
                      min={faixa === 'altura' ? base.min : 0}
                      max={faixa === 'altura' ? base.max : 100}
                      passo={faixa === 'altura' ? 1 : 0.1}
                      aoMudar={(v) =>
                        setRegras((rs) =>
                          rs.map((regra, k) =>
                            k === i
                              ? { ...regra, [faixa]: { ...regra[faixa], [extremo]: v } }
                              : regra,
                          ),
                        )
                      }
                    />
                  )),
                )}
                <CampoNumero
                  rotulo={`Transição de altura da regra ${i + 1}`}
                  valor={r.transicao?.altura ?? 0}
                  min={0}
                  max={1000}
                  passo={0.5}
                  sufixo="m"
                  aoMudar={(v) =>
                    setRegras((rs) =>
                      rs.map((regra, k) =>
                        k === i
                          ? { ...regra, transicao: { ...regra.transicao, altura: v } }
                          : regra,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="sz-tool-btn sz-tool-btn--sm"
                  onClick={() => setRegras((rs) => rs.filter((_, k) => k !== i))}
                >
                  Retirar regra {i + 1}
                </button>
                <CampoNumero
                  rotulo={`Transição de inclinação da regra ${i + 1}`}
                  valor={r.transicao?.declive ?? 0}
                  min={0}
                  max={10}
                  passo={0.1}
                  aoMudar={(v) =>
                    setRegras((rs) =>
                      rs.map((regra, k) =>
                        k === i
                          ? { ...regra, transicao: { ...regra.transicao, declive: v } }
                          : regra,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="sz-tool-btn"
              disabled={regras.length >= 32}
              onClick={() =>
                setRegras((rs) => [
                  ...rs,
                  {
                    id: crypto.randomUUID(),
                    camada: 0,
                    altura: { min: base.min, max: base.max },
                    declive: { min: 0, max: 10 },
                  },
                ])
              }
            >
              Adicionar regra
            </button>
            <button
              type="button"
              className="sz-tool-btn"
              disabled={!regras.length}
              onClick={() => void t.automatizar(regras.map(({ id: _, ...regra }) => regra))}
            >
              Pintar terreno pelas regras
            </button>
          </fieldset>
        </details>
      ) : null}
      {escolhendo !== null ? (
        <EscolherTextura
          host={host}
          bibliotecas={bibliotecas}
          aoFechar={() => setEscolhendo(null)}
          aoEscolher={(r) => {
            alterar(escolhendo, { textura: { id: r.id, repeticaoMetros: r.repeticaoMetros } })
            setTexturas((ts) => [...ts.filter((t) => t.id !== r.id), r])
            setEscolhendo(null)
          }}
        />
      ) : null}
    </>
  )
}

function RemoverRecortes({ t }: { t: ReturnType<typeof useTerreno> }): JSX.Element {
  const [confirmar, setConfirmar] = useState(false)
  return (
    <>
      <button type="button" className="sz-tool-btn" onClick={() => setConfirmar(true)}>
        Retirar recortes importados
      </button>
      {confirmar ? (
        <Dialogo titulo="Retirar os recortes importados?" aoFechar={() => setConfirmar(false)}>
          <p className="text-sm text-mld-muted">
            Isso fecha os recortes poligonais do cenário original. Buracos pintados são preservados.
            Você pode desfazer.
          </p>
          <button
            type="button"
            className="sz-tool-btn"
            onClick={() => {
              void t.retirarRecortes()
              setConfirmar(false)
            }}
          >
            Confirmar retirada dos recortes
          </button>
        </Dialogo>
      ) : null}
    </>
  )
}
