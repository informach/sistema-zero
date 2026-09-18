# Voz do Zappy: pronúncia e roteiro de síntese Implementation Plan

> For agentic workers: use executing-plans task-by-task and preserve the checkboxes.

> **Status de execução, 18/09/2026.** O plano foi implementado nos commits `028a27ae`,
> `ba2f7437`, `6a98d95c` e `94fe3c16`. O componente entregue se chama
> `zappy-speech-editor.tsx`; ele usa a rota real de geração também na prévia. A lista abaixo
> preserva o desenho original do trabalho, e o guia operacional atualizado está em
> `docs/voz-do-zappy.md`.

**Goal:** Fazer o áudio do Zappy usar um roteiro de síntese versionado e ajustável, sem alterar o texto que a criança lê.

**Architecture:** O core resolve cada fala em texto visível, roteiro efetivo e chave de MP3. O Admin edita exceções de pronúncia e chama a mesma geração usada pela aula. O player procura o MP3 pelo roteiro efetivo e preserva o texto visível para legenda e contingência do navegador.

**Tech Stack:** TypeScript estrito, React, Bun test, Next route handler, ElevenLabs TTS e Cloudflare R2.

**Spec:** docs/plans/2026-09-18-voz-zappy-pronuncia-design.md

## Global Constraints

- Texto infantil é a fonte pedagógica, sempre em português e grafia corretos.
- Só <break time="0.1s" /> até <break time="3s" /> é aceito como marcação no roteiro do Zappy.
- A autora não mantém duas aulas completas: roteiro manual é uma exceção por fala.
- A troca de texto visível invalida automaticamente uma substituição cuja origem não coincide mais.
- Voz, modelo, versão do perfil e roteiro efetivo fazem parte da identidade do áudio salvo.
- A chave do ElevenLabs permanece exclusivamente no serviço Admin.
- Não misturar áudio do Zappy e síntese do navegador na mesma fala.
- Não tocar nos arquivos não relacionados que outros worktrees estão editando.

---

### Task 1: Modelo puro de roteiro e identidade da voz

**Files:**
- Modify: packages/core/src/learning/scene/voz.ts
- Modify: packages/core/src/learning/scene/index.ts
- Test: packages/core/src/learning/scene/voz.test.ts

**Interfaces:**
- Produces ZappySpeechOverride, SceneSpeechSlot, SceneSpeechOverrides and ZappySpeech.
- Produces roteiroDoZappy(texto, ajuste?), falasDaCena(bloco), chaveDeVoz(roteiro) and filaDeVoz(roteiros, vozes).
- SceneActivity gains zappySpeech?: SceneSpeechOverrides.

- [ ] **Step 1: Write the failing core tests.**

~~~
expect(roteiroDoZappy('Aperte X e Y.')).toBe('Aperte xis e ípsilon.')
expect(roteiroDoZappy('Experiência', { sourceText: 'Experiência', speechText: 'Experiênssia.' })).toBe('Experiênssia.')
expect(roteiroDoZappy('Texto novo', { sourceText: 'Texto antigo', speechText: 'Texto antigo.' })).toBe('Texto novo')
expect(isZappySpeechText('Pense.<break time="0.4s" />Agora tente.')).toBe(true)
expect(isZappySpeechText('<audio src="x" />')).toBe(false)
~~~

- [ ] **Step 2: Run the focused test to verify it fails.**

Run: bun test src/learning/scene/voz.test.ts

Expected: failure because the new exports do not yet exist.

- [ ] **Step 3: Implement the core contract.**

~~~
export interface ZappySpeechOverride {
  sourceText: string
  speechText: string
}

export function roteiroDoZappy(texto: string, ajuste?: ZappySpeechOverride): string {
  const origem = textoFalado(texto)
  if (ajuste?.sourceText === origem && isZappySpeechText(ajuste.speechText)) return normalizarRoteiro(ajuste.speechText)
  return aplicarPerfilDePronuncia(origem)
}
~~~

Use a versioned profile and boundary-safe replacements for isolated X and Y. Build falasDaCena from the same four deterministic segments used today. Make chaveDeVoz encode the profile version and effective script, and validate that exact key shape in isSceneVozes.

- [ ] **Step 4: Add the activity fields and validators.**

~~~
export type SceneSpeechSlot = 'instruction' | 'prediction-context' | 'prediction-question' | 'checkpoint'
export type SceneSpeechOverrides = Readonly<Partial<Record<SceneSpeechSlot, ZappySpeechOverride>>>
~~~

Reject unknown slots, blank source/script, scripts above VOZ_LIMITS.chave, and invalid pause markup.

- [ ] **Step 5: Verify and commit.**

Run: bun test src/learning/scene/voz.test.ts && bun run typecheck

Run: git add packages/core/src/learning/scene/voz.ts packages/core/src/learning/scene/index.ts packages/core/src/learning/scene/voz.test.ts && git commit -m "feat(lessons): versionar roteiro da voz do Zappy"

### Task 2: Geração ElevenLabs e cache pela fala efetiva

**Files:**
- Modify: packages/admin/src/server/voz-zappy.ts
- Modify: packages/admin/src/app/api/media/voz-zappy/route.ts
- Modify: packages/admin/src/components/editor/voz-zappy-button.tsx
- Test: packages/admin/tests/voz-zappy.test.ts

**Interfaces:**
- Consumes ZappySpeech and chaveDeVoz from Task 1.
- Route accepts { falas: readonly { texto: string; ajuste?: ZappySpeechOverride }[] }.
- Produces the voice dictionary keyed by chaveDeVoz(roteiro efetivo).

- [ ] **Step 1: Write failing cache and payload tests.**

~~~
expect(keyDaVoz('Aperte xis.', 'voice-a')).not.toBe(keyDaVoz('Aperte X.', 'voice-a'))
expect(fetchBody.text).toBe('Aperte xis.')
~~~

Mock only the ElevenLabs HTTP boundary and assert that R2 identity changes with profile version and effective script.

- [ ] **Step 2: Run the focused test to verify it fails.**

Run: bun test tests/voz-zappy.test.ts

Expected: failure until the route and generator receive speech objects.

- [ ] **Step 3: Replace raw text batches with resolved speech objects.**

~~~
const falas = body?.falas
if (!Array.isArray(falas) || !falas.every(isZappySpeechRequest)) return validationError()
return NextResponse.json(await gerarVozes(falas))
~~~

keyDaVoz must hash voice id, model, profile version and effective script. sintetizar receives only the effective script. Deduplicate by full voice key. The lesson-wide button collects falasDaCena and dialogue speech objects, then replaces each block dictionary with only current keys.

- [ ] **Step 4: Verify and commit.**

Run: bun test tests/voz-zappy.test.ts && bun run typecheck

Run: git add packages/admin/src/server/voz-zappy.ts packages/admin/src/app/api/media/voz-zappy/route.ts packages/admin/src/components/editor/voz-zappy-button.tsx packages/admin/tests/voz-zappy.test.ts && git commit -m "feat(admin): gerar voz pelo roteiro efetivo"

### Task 3: Painel de autoria e prévia da voz real

**Files:**
- Create: packages/admin/src/components/editor/zappy-speech-panel.tsx
- Modify: packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx
- Modify: packages/admin/src/lib/types.ts
- Modify: packages/members/src/domain/course/lesson-block.ts
- Modify: packages/member-shell/src/lib/types.ts
- Test: packages/admin/tests/zappy-speech-panel.test.tsx

**Interfaces:**
- Consumes falasDaCena, roteiroDoZappy, ZappySpeechOverride and current SceneVozes.
- Produces optional zappySpeech data in dialogue blocks and scene activities.
- onVozes receives a complete current dictionary after a single-row preview.

- [ ] **Step 1: Write a failing visible-text versus spoken-script test.**

~~~
render(<ZappySpeechPanel blocks={[dialogueBlock]} onAjuste={onAjuste} onVozes={onVozes} />)
expect(screen.getByText('A criança lê')).toBeTruthy()
expect(screen.getByDisplayValue('Aperte xis.')).toBeTruthy()
fireEvent.change(screen.getByLabelText('Como o Zappy fala'), { target: { value: 'Aperte xis.<break time="0.4s" />' } })
expect(onAjuste).toHaveBeenCalledWith('dialogue-1', undefined, expect.objectContaining({ speechText: expect.stringContaining('break') }))
~~~

- [ ] **Step 2: Run the focused test to verify it fails.**

Run: bun test tests/zappy-speech-panel.test.tsx

Expected: failure because the panel does not exist.

- [ ] **Step 3: Build the accessible collapsed panel.**

Each deterministic row has a readonly “A criança lê” field, a labeled “Como o Zappy fala” textarea, a restore-default button and a “Gerar e ouvir” button. Preview calls the same voice route, saves the resulting full current dictionary with onVozes, then plays the returned public MP3 URL.

- [ ] **Step 4: Persist only valid, source-bound overrides.**

~~~
const ajuste: ZappySpeechOverride | undefined = roteiro === roteiroPadrao
  ? undefined
  : { sourceText: textoFalado(textoVisivel), speechText: roteiro }
~~~

For scenes, update one SceneSpeechSlot; for dialogue, update its single override. Remove the optional property when no override remains. Mirror types in Admin, Members and Member Shell.

- [ ] **Step 5: Place the panel beside the existing full-lesson generation command.**

Keep “Gerar a voz do Zappy” as the full refresh. Explain that preview and final generation share the final MP3 cache.

- [ ] **Step 6: Verify and commit.**

Run: bun test tests/zappy-speech-panel.test.tsx tests/voz-zappy.test.ts && bun run typecheck

Run: bun --cwd ../members run typecheck

Run: git add packages/admin/src/components/editor/zappy-speech-panel.tsx packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx packages/admin/src/lib/types.ts packages/admin/tests/zappy-speech-panel.test.tsx packages/members/src/domain/course/lesson-block.ts packages/member-shell/src/lib/types.ts && git commit -m "feat(admin): permitir ajustar como o Zappy fala"

### Task 4: Player, contrato e guia operacional

**Files:**
- Modify: packages/member-shell/src/components/use-scene-voice.ts
- Modify: packages/member-shell/src/components/dialogue-block.tsx
- Modify: packages/member-shell/src/components/scene-activity.tsx
- Modify: packages/member-shell/src/components/scene-prediction.tsx
- Modify: packages/community-kids/tests/lesson-voz-zappy.test.tsx
- Modify: docs/voz-do-zappy.md
- Test: packages/member-shell/tests/scene-voice.test.tsx

**Interfaces:**
- Consumes effective speech scripts from Task 1 and dictionaries produced by Task 2.
- Browser fallback continues to receive visible text.
- The dialogue block consumes its optional source-bound override.

- [ ] **Step 1: Write failing player tests.**

~~~
expect(audio.tocados[0]).toBe(urlPara(chaveDeVoz('Aperte xis.')))
expect(sintese.falas).toEqual([])
~~~

Add a stale-source case proving the player uses the current default script rather than an old manual script.

- [ ] **Step 2: Run focused tests to verify red.**

Run: bun test tests/scene-voice.test.tsx

Run: bun --cwd ../community-kids test tests/lesson-voz-zappy.test.tsx

Expected: failure until components pass effective scripts to the voice hook.

- [ ] **Step 3: Pass scripts separately from visible text.**

~~~
const fila = filaDeVoz(roteirosEfetivos, vozes)
if (fila) tocar(fila, textosVisiveis)
else sintetizar(textosVisiveis)
~~~

Scene code applies a named script only while its deterministic visible phrase matches. Dynamic hints and later demonstration captions omit the pre-generated script and retain browser fallback.

- [ ] **Step 4: Update the guide.**

Document the profile, A criança lê versus Como o Zappy fala, allowed pauses, preview, cache invalidation and the regeneration required for existing lesson audio.

- [ ] **Step 5: Verify and commit.**

Run: bun test tests/scene-voice.test.tsx && bun run typecheck

Run: bun --cwd ../community-kids test tests/lesson-voz-zappy.test.tsx && bun --cwd ../community-kids run typecheck

Run: git add packages/member-shell/src/components/use-scene-voice.ts packages/member-shell/src/components/dialogue-block.tsx packages/member-shell/src/components/scene-activity.tsx packages/member-shell/src/components/scene-prediction.tsx packages/community-kids/tests/lesson-voz-zappy.test.tsx packages/member-shell/tests/scene-voice.test.tsx docs/voz-do-zappy.md && git commit -m "feat(kids): tocar roteiro ajustado do Zappy"

### Task 5: Full verification and review

- [ ] **Step 1: Run format and diff checks.**

Run: bunx biome check packages/core/src/learning/scene/voz.ts packages/admin/src/server/voz-zappy.ts packages/admin/src/components/editor/zappy-speech-panel.tsx packages/member-shell/src/components/use-scene-voice.ts packages/member-shell/src/components/dialogue-block.tsx

Run: git diff --check

- [ ] **Step 2: Run all affected package suites and typechecks.**

Run: bun --cwd packages/core test src/learning/scene && bun --cwd packages/core run typecheck

Run: bun --cwd packages/admin test && bun --cwd packages/admin run typecheck

Run: bun --cwd packages/member-shell test && bun --cwd packages/member-shell run typecheck

Run: bun --cwd packages/community-kids test tests/lesson-voz-zappy.test.tsx && bun --cwd packages/community-kids run typecheck

Run: bun --cwd packages/members run typecheck

- [ ] **Step 3: Review implementation against the design.**

Verify one display source, bounded overrides, central X/Y profile, source expiration, profile-aware cache, exact preview route, no secret on the player, no mixed voices and regenerated status for changed scripts.

- [ ] **Step 4: Commit checklist and hand off.**

Run: git add docs/plans/2026-09-18-voz-zappy-pronuncia-implementation.md && git commit -m "docs(lessons): registrar implementação da voz do Zappy"
