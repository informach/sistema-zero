/**
 * A GALERIA das 45 cenas: um arquivo HTML com todos os palcos lado a lado.
 *
 * ⚠️⚠️ Ela existe porque a dona nunca viu 21 delas. A proposta do lote 3 promete mexer no visual
 * das cenas, e não dá para autorizar o que não se vê — nem para julgar "destoante" olhando uma.
 * Aqui saem as 45, cada uma no estado em que o próprio ROTEIRO do modelo a deixa (as ações do
 * roteiro passam pelo motor de verdade), com a faixa de estado, a frase, as descobertas que a
 * cena cobra e o que a criança pode mexer.
 *
 * ⚠️ O desenho é o de PRODUÇÃO: os mesmos componentes que a aula monta e o CSS do app kids
 * compilado do `globals.css` dele. Uma galeria com marcação própria mostraria a cópia.
 *
 * Como rodar (de dentro de `packages/community-kids`):
 *   bun tests/visual/build-galeria-cenas.tsx <caminho-de-saida.html>
 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import {
  openScene,
  SCENE_GROUPS,
  SCENE_IDS,
  SCENE_MODELS,
  type SceneGroup,
  type SceneId,
  type SceneState,
  sceneReadout,
  sceneSituation,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { ExplorationStage } from '@sistemazero/member-shell/components/exploration-stage'
import tailwind from '@tailwindcss/postcss'
import { renderToStaticMarkup } from 'react-dom/server'

const GRUPOS: Record<SceneGroup, string> = {
  stage: 'A tela e quem a lê',
  art: 'Desenho e animação',
  world: 'Mundo e desenho',
  motion: 'Movimento',
  events: 'Eventos e estados',
  population: 'Objetos no grupo',
  collision: 'Áreas e contato',
  speed: 'Sorteio e velocidade',
}

/**
 * O estado em que a cena se mostra.
 *
 * ⚠️ Não é um estado escolhido a dedo: são as ações do ROTEIRO do próprio modelo, aplicadas pelo
 * motor. É o que a cena faz quando se apresenta — se ela aparecer vazia aqui, é porque o roteiro
 * dela não mostra nada, e isso também é informação.
 */
function estadoDeApresentacao(scene: SceneId): SceneState {
  const start = { scene }
  let state = openScene(start)
  for (const passo of SCENE_MODELS[scene].script)
    for (const acao of passo.actions) state = stepScene(start, state, acao)
  return state
}

function Cena({ scene }: { scene: SceneId }) {
  const modelo = SCENE_MODELS[scene]
  const state = estadoDeApresentacao(scene)
  const leituras = sceneReadout(scene, state)
  return (
    <article className="sz-lesson-block space-y-3" data-grupo={modelo.group} id={`cena-${scene}`}>
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
          {GRUPOS[modelo.group]} · <code>{scene}</code>
        </p>
        <h2 className="text-lg font-semibold">{modelo.title}</h2>
        <p className="text-sm text-muted-foreground">{modelo.instruction}</p>
      </header>
      <dl className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-card px-3 py-2 text-xs text-foreground sm:text-sm">
        {leituras.map((r) => (
          <div key={r.label} className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd
              className={
                r.tone === 'a' ? 'font-semibold text-scene-a' : 'font-semibold text-scene-b-ink'
              }
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mx-auto w-full max-w-scene">
        <ExplorationStage
          activity={{ type: 'experimentation', scene }}
          state={state}
          dispatch={() => {}}
        />
      </div>
      <p className="min-h-6 text-center text-sm font-medium text-muted-foreground">
        {sceneSituation(scene, state)}
      </p>
      <dl className="grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">A criança mexe em</dt>
          <dd className="text-muted-foreground">{modelo.manipulates}</dd>
        </div>
        <div>
          <dt className="font-semibold">Fecha quando</dt>
          <dd className="text-muted-foreground">{modelo.goals.map((g) => g.label).join(' · ')}</dd>
        </div>
      </dl>
    </article>
  )
}

function Galeria() {
  const porGrupo = SCENE_GROUPS.map((group) => ({
    group,
    cenas: SCENE_IDS.filter((id) => SCENE_MODELS[id].group === group),
  })).filter((g) => g.cenas.length > 0)
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
          Sistema Zero · cenas de aula
        </p>
        <h1 className="text-2xl font-bold">As {SCENE_IDS.length} cenas, uma ao lado da outra</h1>
        <p className="text-sm text-muted-foreground">
          Cada cena no estado em que o roteiro dela a deixa, com o desenho de produção e o visual do
          kids. O cromo (faixa, moldura, controles) veste o aplicativo; o mundo dentro do palco
          continua ilustrado.
        </p>
        <nav className="flex flex-wrap gap-2 pt-2 text-sm">
          {porGrupo.map(({ group, cenas }) => (
            <a
              key={group}
              href={`#grupo-${group}`}
              className="rounded-full border border-border bg-card px-3 py-1"
            >
              {GRUPOS[group]} ({cenas.length})
            </a>
          ))}
        </nav>
      </header>
      {porGrupo.map(({ group, cenas }) => (
        <section key={group} id={`grupo-${group}`} className="space-y-6">
          <h2 className="border-border border-b pb-1 text-sm font-bold uppercase tracking-[.14em] text-muted-foreground">
            {GRUPOS[group]}
          </h2>
          {cenas.map((scene) => (
            <Cena key={scene} scene={scene} />
          ))}
        </section>
      ))}
    </main>
  )
}

const app = resolve(import.meta.dir, '../..')
const postcss = createRequire(Bun.resolveSync('@tailwindcss/postcss', app))('postcss')
const cssPath = resolve(app, 'src/app/globals.css')
const styles = await postcss([tailwind()]).process(await Bun.file(cssPath).text(), {
  from: cssPath,
})
/**
 * ⚠⚠ O embrulho É `sz-lesson-sections`. É esse gancho que o `globals.css` do kids usa para
 * transformar cada `sz-lesson-block` no cartão branco de raio 20 da comunidade — sem ele a
 * galeria mostraria os palcos soltos na página, que é justamente a tela que ninguém tem.
 */
const corpo = `<div class="sz-lesson-sections" style="background:var(--background);color:var(--foreground);min-height:100vh">${renderToStaticMarkup(<Galeria />)}</div>`
const saida = process.argv[2] ?? resolve(app, 'tmp/galeria-cenas.html')
/**
 * ⚠ `--artefato` emite só o MIOLO (título, folha e conteúdo): o publicador de artefato monta o
 * esqueleto do documento por fora, e um `<html>` de dentro sairia aninhado. Sem a bandeira sai o
 * documento inteiro, que é o que abre no navegador por duplo clique.
 */
const artefato = process.argv.includes('--artefato')
const folha = `<title>As ${SCENE_IDS.length} Cenas de Aula</title><style>${styles.css}</style>`
await Bun.write(
  saida,
  artefato
    ? `${folha}${corpo}`
    : `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${folha}</head><body>${corpo}</body></html>`,
)
console.log(`Galeria: ${saida} (${SCENE_IDS.length} cenas)`)
