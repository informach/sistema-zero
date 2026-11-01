import './edisvg-process.js'
import { createRoot } from 'react-dom/client'
import { LessonParityPreview } from '../../../../member-shell/tests/browser/lesson-parity-context'
import { course, lesson, user } from '../../../../member-shell/tests/browser/lesson-parity-data'
import { LessonPlayer } from '../../../src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client'
import { CommunityFrame } from '../../../src/components/community/community-frame'
import { AdultGamificationProvider } from '../../../src/components/community/gamification-provider'

const node = document.getElementById('root')
if (!node) throw Error('Missing fixture root')
createRoot(node).render(
  <LessonParityPreview>
    <AdultGamificationProvider initial={null}>
      <CommunityFrame user={user} banner={null}>
        <LessonPlayer
          course={course}
          lesson={lesson}
          nextLessonHref={null}
          viewerWatermark={null}
          viewerId={null}
          lessonDraftsEnabled={false}
          creationSharingEnabled={false}
          viewer={user}
          shareUrl={null}
        />
      </CommunityFrame>
    </AdultGamificationProvider>
  </LessonParityPreview>,
)
