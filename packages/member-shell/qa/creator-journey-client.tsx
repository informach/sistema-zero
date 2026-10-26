import type { CreatorMasteryView } from '@sistemazero/core/journey'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AdultCreatorNextStep,
  AdultCreatorPost,
  AdultCreatorStepper,
  AdultMasteriesOpen,
  AdultMasteryArea,
  AdultMasteryHowItWorks,
  AdultMasteryHub,
  MasteryTile,
  type StageCapabilities,
} from '../../community/src/components/community/journey/creator'
import { PageBand, PageBody } from '../../community/src/components/community/page'
import {
  KidsCreatorCatalog,
  KidsCreatorPost,
} from '../../community-kids/src/components/kids/creator-curriculum-page'
import {
  KidsMasteryArea,
  KidsMasteryHub,
  MasteryHowItWorks,
} from '../../community-kids/src/components/kids/creator-journey/mastery'
import { KidsBand } from '../../community-kids/src/components/kids/kids-band'
import { MasterySubmission } from '../src/components/mastery-submission'
import type { creatorSceneFixture } from './creator-journey-fixtures'

declare global {
  interface Window {
    creatorFixture: ReturnType<typeof creatorSceneFixture>
  }
}
const { view, catalog, mine, curriculum, audience, state } = window.creatorFixture
const query = new URLSearchParams(location.search)
const screen = query.get('screen') ?? 'map'
const post = view.stages[Number(query.get('post') ?? 0)] ?? view.stages[0]!
const area = view.masteries.find((item) => item.id === query.get('area')) ?? view.masteries[0]!
/** As ferramentas de cada trilha, como a página lê do `advances[i].capabilities`. */
const capabilities = Object.fromEntries(
  curriculum.stages.map((stage) => [
    stage.level,
    [...new Set(stage.grants.flatMap((grant) => grant.capabilities))],
  ]),
)
const router = {
  bfcacheId: 'creator-journey-preview',
  back() {},
  forward() {},
  refresh() {},
  hmrRefresh() {},
  push() {},
  replace() {},
  prefetch() {},
}

function submissionFor(level: CreatorMasteryView['levels'][number]) {
  return (
    <MasterySubmission
      areaId={area.id}
      level={level.level}
      hasAccess={true}
      available={level.available}
      skin={audience}
      evidence={[
        {
          id: '10000000-0000-4000-8000-000000000001',
          title: 'Meu jogo · versão de teste',
          lessonId: 'fixture',
          createdAt: '2026-10-25T14:30:00.000Z',
          kind: 'studio',
        },
      ]}
      current={
        state === 'mastery' && level.level === 1
          ? {
              id: 'fixture-submission',
              masteryId: area.id,
              level: 1,
              policyVersion: 1,
              rubricVersion: 1,
              evidenceId: 'fixture-evidence',
              evidenceTitle: 'Meu jogo · primeira versão',
              submittedAt: '2026-10-24T14:30:00.000Z',
              message: null,
              status: 'changes-requested',
              feedback:
                'A regra já funciona. Teste o que acontece quando dois objetos chegam ao alvo ao mesmo tempo e explique a escolha que você fez.',
              criteria: [],
              credits: [],
              reviewedAt: '2026-10-25T10:00:00.000Z',
            }
          : null
      }
    />
  )
}

/** As telas do Kids, montadas com os mesmos componentes das páginas do app. */
function kidsScreen(): ReactNode {
  // A entrada da página (com a trava do posto não alcançado), como em `/cursos/trilha/<nível>`.
  if (screen === 'post')
    return (
      <KidsCreatorPost
        view={view}
        level={post.level}
        courses={catalog}
        mine={mine}
        capabilities={capabilities}
      />
    )
  if (screen === 'areas')
    return (
      <KidsBand tone="creme">
        <h1 className="sz-display mb-8 text-[clamp(2rem,3.6vw,3rem)]">Maestrias</h1>
        <KidsMasteryHub areas={view.masteries} view={view} />
      </KidsBand>
    )
  if (screen === 'mastery')
    return (
      <>
        <KidsBand tone="creme">
          <h1 className="sz-display mb-6 text-[clamp(2rem,3.6vw,3rem)]">{area.title}</h1>
          <MasteryHowItWorks area={area} />
        </KidsBand>
        <KidsBand tone="lilas">
          <KidsMasteryArea
            area={area}
            catalog={catalog}
            mine={mine}
            view={view}
            submission={submissionFor}
          />
        </KidsBand>
      </>
    )
  return <KidsCreatorCatalog view={view} courses={catalog} mine={mine} />
}

/** As telas adultas, montadas com os mesmos componentes das páginas da comunidade. */
function adultScreen(): ReactNode {
  if (screen === 'post')
    return (
      <AdultCreatorPost
        view={view}
        level={post.level}
        catalog={catalog}
        mine={mine}
        capabilities={capabilities as StageCapabilities}
        staff={query.get('staff') === '1'}
      />
    )
  if (screen === 'areas')
    return (
      <>
        <PageBand
          kicker="Sua criação vai mais longe"
          title="Maestrias para os seus jogos"
          lead="Escolha uma linguagem, uma dimensão ou as ferramentas de arte dos seus jogos."
          back={{ href: '#', label: 'Voltar à jornada' }}
        />
        <PageBody>
          <AdultMasteryHub areas={view.masteries} view={view} />
        </PageBody>
      </>
    )
  if (screen === 'mastery')
    return (
      <>
        <PageBand
          kicker="Maestria"
          title={
            <span className="flex items-center gap-4">
              <MasteryTile id={area.id} big />
              {area.title}
            </span>
          }
          back={{ href: '#', label: 'Todas as áreas' }}
        />
        <PageBody className="gap-10">
          <AdultMasteryHowItWorks area={area} />
          <AdultMasteryArea
            area={area}
            catalog={catalog}
            mine={mine}
            view={view}
            submission={submissionFor}
          />
        </PageBody>
      </>
    )
  return (
    <PageBand
      kicker="Catálogo da comunidade"
      title="Cursos"
      lead="Sete etapas até a Lenda. Em cada uma, os cursos da trilha em 2D e 3D, uma missão para criar um jogo seu e os Poderes para ampliá-lo."
    >
      <section className="mt-6 flex flex-col gap-5">
        <h2 className="sz-h3">Jornada do Criador</h2>
        <AdultCreatorStepper view={view} staff={query.get('staff') === '1'} />
        <AdultCreatorNextStep view={view} catalog={catalog} mine={mine} />
        <AdultMasteriesOpen view={view} />
      </section>
    </PageBand>
  )
}
createRoot(document.getElementById('root')!).render(
  <AppRouterContext.Provider value={router}>
    <aside
      style={{
        padding: '.75rem 1.25rem',
        background: '#fff9df',
        color: '#252740',
        fontSize: '17px',
        borderBottom: '1px solid #bca957',
      }}
    >
      <strong>Prévia local · dados fictícios.</strong>{' '}
      <nav
        aria-label="Cenários da prévia"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '.5rem' }}
      >
        {['map', 'post', 'areas', 'mastery'].map((value) => (
          <a key={value} href={`/?skin=${audience}&screen=${value}&state=${state}`}>
            {value === 'map'
              ? 'Mapa'
              : value === 'post'
                ? 'Posto'
                : value === 'areas'
                  ? 'Áreas'
                  : 'Maestria'}
          </a>
        ))}
      </nav>
    </aside>
    {audience === 'adult' ? (
      <div className="sz-app">
        <main>{adultScreen()}</main>
      </div>
    ) : (
      <main className="flex min-w-0 flex-1 flex-col bg-(--chao)">{kidsScreen()}</main>
    )}
  </AppRouterContext.Provider>,
)
