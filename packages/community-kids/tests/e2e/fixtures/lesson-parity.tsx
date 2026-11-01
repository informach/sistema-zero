import './edisvg-process.js'
import { FocusModeProvider } from '@sistemazero/member-shell/components/creator/focus-mode'
import { createRoot } from 'react-dom/client'
import { LessonParityPreview } from '../../../../member-shell/tests/browser/lesson-parity-context'
import { course, lesson, user } from '../../../../member-shell/tests/browser/lesson-parity-data'
import { LessonPlayer } from '../../../src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client'
import { FocusModeToggle } from '../../../src/components/kids/focus-mode-toggle'
import { LessonCompletionRefreshProvider } from '../../../src/components/kids/lesson-completion-refresh'
import { MobileTabbar, MobileTopbar } from '../../../src/components/kids/mobile-nav'

const node = document.getElementById('root')
if (!node) throw Error('Missing fixture root')
createRoot(node).render(
  <LessonParityPreview>
    <FocusModeProvider viewerId={null}>
      <LessonCompletionRefreshProvider>
        <div className="min-h-screen">
          <MobileTopbar user={user} gamification={null} />
          <div className="kids-shell-row flex">
            <main className="kids-aula w-full flex-1 px-4 pt-6 pb-40 md:px-8 md:pt-8 md:pb-32">
              <LessonPlayer
                course={course}
                lesson={lesson}
                nextLessonHref={null}
                viewerWatermark={null}
                viewerId={null}
                ratingViewer={{ name: 'Pessoa de teste', age: null, avatarUrl: null }}
                shareUrl={null}
              />
            </main>
          </div>
          <FocusModeToggle target="outline" />
          <MobileTabbar />
        </div>
      </LessonCompletionRefreshProvider>
    </FocusModeProvider>
  </LessonParityPreview>,
)
