import { isInteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonSectionProvider } from '@sistemazero/member-shell/components/lesson-section-context'
import { SceneActivityView } from '@sistemazero/member-shell/components/scene-activity'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import { resolveLessonSplit } from '@sistemazero/member-shell/lib/lesson-split'
import { createRoot } from 'react-dom/client'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import naveDia1 from '../../../../docs/aulas-interativas/construtor/nave-contra-asteroides/nave-contra-asteroides-dia-1.manifesto.json'
import naveDia5 from '../../../../docs/aulas-interativas/construtor/nave-contra-asteroides/nave-contra-asteroides-dia-5.manifesto.json'
import navePrimeira from '../../../../docs/aulas-interativas/construtor/nave-contra-asteroides/nave-contra-asteroides-primeira-nave.manifesto.json'
import ilha1 from '../../../../docs/aulas-interativas/faisca/a-ilha-do-farol/ilha-aula-1.manifesto.json'
import ilha2 from '../../../../docs/aulas-interativas/faisca/a-ilha-do-farol/ilha-aula-2.manifesto.json'
import ilha3 from '../../../../docs/aulas-interativas/faisca/a-ilha-do-farol/ilha-aula-3.manifesto.json'
import farolDia1 from '../../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/desafio-dia-1.manifesto.json'
import farolDia2 from '../../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/desafio-dia-2.manifesto.json'
import farolDia3 from '../../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/desafio-dia-3.manifesto.json'
import ponte from '../../../../docs/aulas-interativas/faisca/poder-a-ponte-apressada/ponte-aula-1.manifesto.json'
import moedas from '../../../../docs/aulas-interativas/faisca/poder-moedas-no-caminho/moedas-aula-1.manifesto.json'
import simbolos from '../../../../docs/aulas-interativas/faisca/poder-o-bau-dos-simbolos/simbolos-aula-1.manifesto.json'
import cabana from '../../../../docs/aulas-interativas/faisca/poder-o-segredo-da-cabana/cabana-aula-1.manifesto.json'
import dino01 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-01.manifesto.json'
import dino02 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-02.manifesto.json'
import dino03 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-03.manifesto.json'
import dino04 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-04.manifesto.json'
import dino05 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-05.manifesto.json'
import dino06 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-06.manifesto.json'
import dino07 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-07.manifesto.json'
import dino08 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-08.manifesto.json'
import dino09 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-09.manifesto.json'
import dino10 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-10.manifesto.json'
import dino11 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-11.manifesto.json'
import dino12 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-12.manifesto.json'
import dino13 from '../../../../docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-13.manifesto.json'

const params = new URLSearchParams(location.search)
// Desde a reestruturação da Nave (05/10/2026), as experiências do antigo Dia 1 ficaram em
// "primeira-nave"; a de camadas continua no Dia 1.
// Os quatro Poderes da Faísca (02/11/2026): a experiência de cada um é o bloco `experiencia` da
// aula 1, escolhido por `?course=<poder>`.
type BlocoDoManifesto = { key: string; content?: unknown }
// Os JSON importados têm tipos literais diferentes entre si: aqui só importa a chave e o conteúdo.
const PODERES: Record<string, BlocoDoManifesto[]> = {
  ponte: ponte.blocks as BlocoDoManifesto[],
  moedas: moedas.blocks as BlocoDoManifesto[],
  simbolos: simbolos.blocks as BlocoDoManifesto[],
  cabana: cabana.blocks as BlocoDoManifesto[],
}
// O Corre Dino inteiro (`?course=dino`) e as três aulas da Ilha (`?course=ilha`, as quatro experiências
// 3D desde 08/11/2026), em exploração livre desde
// 02/11/2026; o Dia 5 da Nave entra depois dos outros (a meta do jogo), sem tomar chave de ninguém.
const DINO = [
  dino01,
  dino02,
  dino03,
  dino04,
  dino05,
  dino06,
  dino07,
  dino08,
  dino09,
  dino10,
  dino11,
  dino12,
  dino13,
].flatMap((m) => m.blocks as BlocoDoManifesto[])
const curso = params.get('course') ?? ''
const blocks: BlocoDoManifesto[] =
  curso === 'farol'
    ? ([...farolDia1.blocks, ...farolDia2.blocks, ...farolDia3.blocks] as BlocoDoManifesto[])
    : curso === 'dino'
      ? DINO
      : curso === 'ilha'
        ? ([...ilha1.blocks, ...ilha2.blocks, ...ilha3.blocks] as BlocoDoManifesto[])
        : (PODERES[curso] ??
          ([...navePrimeira.blocks, ...naveDia1.blocks, ...naveDia5.blocks] as BlocoDoManifesto[]))
const source = blocks.find(
  (block) =>
    block.key === (params.get('block') ?? (PODERES[curso] ? 'experiencia' : 'experiencia-areas')),
)
if (!source || !isInteractiveBlock(source.content)) throw new Error('Experiência não encontrada')
/**
 * Os testes de layout do palpite precisam de uma cena com palpite. Os cursos deixaram de usá-lo
 * nessas cenas (Diretrizes, 05/10/2026), mas o player continua oferecendo o recurso; por isso os
 * dois palpites de antes ficam aqui, como dado do teste, e não no manifesto.
 * ⚠️ Com a exploração livre (02/11/2026) eles continuam valendo: o palpite abre ANTES da tela livre,
 * e responder abre a tela livre (`.sz-scene-prancha` da `Frame`). As metas do `revealOn` (`down` e
 * `hidden`) são metas dos blocos livres.
 */
const PALPITES_DE_TESTE: Record<string, unknown> = {
  'experiencia-coordenadas': {
    context: {
      label: 'Os números x e y',
      explanation:
        'Nesta experiência, vamos usar os números x e y para escolher onde a nave aparece na tela do jogo.',
    },
    prompt: 'Se o y AUMENTAR, para onde a nave vai?',
    choices: [
      { id: 'cima', label: 'Para cima', shows: 'Aumentando o y, a nave desceu.' },
      { id: 'baixo', label: 'Para baixo' },
    ],
    correctChoiceId: 'baixo',
    revealOn: 'down',
  },
  'experiencia-criar-mostrar': {
    context: {
      label: 'Bastidores e tela do jogo',
      explanation:
        'Nesta experiência, vamos comparar o que existe nos bastidores com o que aparece na tela do jogo.',
    },
    prompt: 'Você cria a nave, mas ainda não manda desenhar. O que aparece na tela?',
    choices: [
      {
        id: 'aparece',
        label: 'A nave aparece',
        shows: 'A tela continuou vazia até a nave ser desenhada.',
      },
      { id: 'vazia', label: 'A tela fica vazia' },
    ],
    correctChoiceId: 'vazia',
    revealOn: 'hidden',
  },
}
// Os palpites de teste são da Nave (o curso padrão): o Dino tem experiências com as mesmas chaves.
const palpite = curso === '' ? PALPITES_DE_TESTE[source.key] : undefined
const original = palpite
  ? ({ ...source.content, prediction: palpite } as typeof source.content)
  : source.content
const content = publicInteractiveBlock(original)
if (content.activity.type !== 'experimentation') throw new Error('Bloco não é experiência')
const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')

const experience = (
  <div className="sz-lesson-block">
    <LessonSectionProvider
      value={params.has('repeated-title') ? { titulo: content.title, temDialogo: false } : null}
    >
      <SceneActivityView
        block={{ id: source.key, kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={content.activity}
        previewContent={original}
      />
    </LessonSectionProvider>
  </div>
)
const { contentMinimum, toolMinimum } = resolveLessonSplit({
  contentWidth: document.documentElement.clientWidth - 32,
  handleWidth: 44,
  hasWorkspace: true,
})

// O vocabulário da criança, como o `KidsLessonCopy` em volta da área logada do app: sem ele o
// ensaio montaria a experiência com as palavras do adulto ("Voltar à aula").
/**
 * `?barras`: as barras do app de verdade em volta da aula, para o e2e não ser circular. No celular,
 * a barra de cima (`h-14`, sticky) e a de abas (fixa embaixo); em toda largura, o rodapé fixo da
 * aula (`.sz-lesson-nav-immersive`, que o CSS do Kids põe acima das abas) e o `--sz-lesson-nav-height`
 * que o `LessonSections` publica. O `.kids-aula` dá o `--sz-lesson-stage-top` do app.
 */
const barras = params.has('barras')
const RODAPE_PX = 72
if (barras) document.documentElement.style.setProperty('--sz-lesson-nav-height', `${RODAPE_PX}px`)
const BARRAS_CSS = `
.ensaio-topo { position: sticky; top: 0; z-index: 40; height: 3.5rem; background: #18213a; }
.ensaio-abas { position: fixed; inset-inline: 0; bottom: 0; z-index: 40; height: calc(3.5rem + env(safe-area-inset-bottom)); background: #18213a; }
@media (min-width: 768px) { .ensaio-topo, .ensaio-abas { display: none; } }
`
createRoot(root).render(
  <LessonCopyProvider value={KIDS_LESSON_COPY}>
    {barras ? (
      <>
        <style>{BARRAS_CSS}</style>
        <div className="ensaio-topo" />
      </>
    ) : null}
    <main className={`sz-lesson-sections${barras ? ' kids-aula' : ''}`} style={{ padding: 16 }}>
      <button type="button">Antes da experiência</button>
      <div style={{ height: 64 }} />
      {params.has('split') ? (
        <PanelGroup direction="horizontal" className="h-auto! items-start overflow-visible!">
          <Panel
            id="lesson-content"
            defaultSize={50}
            minSize={contentMinimum}
            maxSize={100 - toolMinimum}
            className="min-w-0 overflow-visible!"
          >
            <div className="sz-lesson-block" style={{ aspectRatio: '16 / 9' }}>
              Vídeo da aula
            </div>
          </Panel>
          <PanelResizeHandle
            aria-label="Mudar o tamanho dos dois lados"
            hitAreaMargins={{ coarse: 20, fine: 6 }}
            className="sz-lesson-split-handle relative flex w-6 shrink-0 self-stretch items-center justify-center"
          >
            <span className="sz-lesson-split-grip absolute inset-y-0" />
          </PanelResizeHandle>
          <Panel
            id="lesson-tool"
            defaultSize={50}
            minSize={toolMinimum}
            maxSize={100 - contentMinimum}
            className="min-w-0 overflow-visible!"
          >
            {experience}
          </Panel>
        </PanelGroup>
      ) : (
        <div style={{ width: '100%', maxWidth: Number(params.get('width') ?? 620) }}>
          {experience}
        </div>
      )}
      <button type="button">Depois da experiência</button>
      {barras ? (
        <nav className="sz-lesson-nav-immersive" style={{ height: RODAPE_PX }}>
          <button type="button">Próxima parte</button>
        </nav>
      ) : null}
    </main>
    {barras ? <div className="ensaio-abas" /> : null}
  </LessonCopyProvider>,
)
