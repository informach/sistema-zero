import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { createRoot } from 'react-dom/client'
import {
  CreatorJourneyMap,
  CreatorJourneySummary,
  CreatorMasteryArea,
  CreatorMasteryHub,
  CreatorPost,
} from '../src/components/creator-journey'
import { MasterySubmission } from '../src/components/mastery-submission'
import type { creatorSceneFixture } from './creator-journey-fixtures'

declare global {
  interface Window {
    creatorFixture: ReturnType<typeof creatorSceneFixture>
  }
}
const { view, catalog, audience, state } = window.creatorFixture
const query = new URLSearchParams(location.search)
const screen = query.get('screen') ?? 'map'
const post = view.stages[Number(query.get('post') ?? 0)] ?? view.stages[0]!
const area = view.masteries.find((item) => item.id === query.get('area')) ?? view.masteries[0]!
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
const body =
  screen === 'post' ? (
    <CreatorPost stage={post} catalog={catalog} skin={audience} />
  ) : screen === 'mastery' ? (
    <CreatorMasteryArea
      area={area}
      catalog={catalog}
      skin={audience}
      submission={(level) => (
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
      )}
    />
  ) : screen === 'areas' ? (
    <CreatorMasteryHub areas={view.masteries} skin={audience} />
  ) : (
    <CreatorJourneyMap view={view} skin={audience} />
  )
const title =
  screen === 'post'
    ? post.title
    : screen === 'mastery'
      ? area.title
      : screen === 'areas'
        ? 'Escolha a sua maestria'
        : 'Jornada do Criador'
createRoot(document.getElementById('root')!).render(
  <AppRouterContext.Provider value={router}>
    <main>
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
        <>
          <section className="sz-band">
            <div className="sz-page space-y-5 py-10">
              <p className="sz-kicker">Aprender · aplicar · criar</p>
              <h1 className="sz-h1">{title}</h1>
              <p className="sz-lead">Do primeiro jogo às suas próprias escolhas de criação.</p>
              {screen === 'map' ? (
                <CreatorJourneySummary view={view} skin="adult" catalog={catalog} />
              ) : null}
              {screen === 'map' ? body : null}
            </div>
          </section>
          {screen !== 'map' ? <div className="sz-page py-10">{body}</div> : null}
        </>
      ) : (
        <>
          <section className="bg-(--chao)">
            <div className="mx-auto max-w-[73.25rem] space-y-5 px-5 py-10 md:px-10 lg:px-16">
              <p className="font-bold text-primary">Aprender · aplicar · criar</p>
              <h1 className="sz-display text-3xl md:text-4xl">{title}</h1>
              <p className="text-muted-foreground">
                Do primeiro jogo às suas próprias escolhas de criação.
              </p>
              {screen === 'map' ? (
                <CreatorJourneySummary view={view} skin="kids" catalog={catalog} />
              ) : null}
            </div>
          </section>
          <section className="bg-(--chao-alt)">
            <div className="mx-auto max-w-[73.25rem] px-5 py-10 md:px-10 lg:px-16">{body}</div>
          </section>
        </>
      )}
    </main>
  </AppRouterContext.Provider>,
)
