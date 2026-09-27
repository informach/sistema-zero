# Palpite, descoberta e diálogo do Zappy: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Fazer a criança entender o assunto do palpite antes de responder, abrir a descoberta somente após a escolha e separar com clareza as falas do Zappy.

**Architecture:** O Core passa a entregar um contexto editorial estruturado junto de cada palpite e uma configuração de prévia segura por cena. O Member Shell usa esse contrato para montar dois momentos distintos: palpite com balão, prévia e alternativas; depois, instrução com a cena completa. O Admin edita e valida o mesmo conteúdo, enquanto a Comunidade Kids fornece os balões e esconde o status técnico de obrigatoriedade.

**Tech Stack:** TypeScript, React 19, Next.js 16, Bun Test, Testing Library, Tailwind e o dicionário de voz do Zappy armazenado na atividade de cena.

**Spec:** docs/plans/2026-09-18-palpite-cenas-dialogo-zappy-design.md

## Global Constraints

- Não mudar a regra de conclusão, persistência de tentativa, resposta de checkpoint ou revisita.
- Toda cena com palpite, inclusive demonstração guiada, começa pelo palpite. Demonstrações inline e cenas sem palpite continuam diretas.
- Antes da escolha, a cena completa, suas ferramentas, pistas, metas, estado e controles não podem ser montados. A única representação permitida é a prévia estática e segura.
- A prévia usa o mesmo renderizador e o mesmo elenco da cena. Não criar screenshots, imagens manuais ou duplicações do estado visual.
- O contexto do palpite é conteúdo autoral. Nunca inferir esse contexto a partir do título da cena.
- Todo texto infantil novo deve evitar travessão e deve explicar primeiro a ferramenta, personagem ou situação concreta antes de perguntar o que vai acontecer.
- Os dois botões Ouvir não podem tocar a mesma fala: um toca contexto, pergunta e alternativas; o outro toca somente a instrução da descoberta.
- A voz gravada e a voz do navegador seguem a regra de tudo ou nada por fala. Nunca misturar as duas dentro da mesma fala.
- O Zappy começa parado e anima somente enquanto o áudio do balão correspondente estiver tocando.
- A interface Kids não exibe “Atividade obrigatória”. A regra continua no progresso e no servidor.
- Compatibilidade de leitura é obrigatória: aulas publicadas antes deste lote não podem deixar de abrir. Conteúdo personalizado legado sem contexto recebe aviso no Admin até ser revisado.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade após o lote |
| --- | --- |
| packages/core/src/learning/prediction-context.ts | Contrato estrutural do contexto do palpite e guarda de leitura. |
| packages/core/src/learning/index.ts | Tipos públicos, resolução de contexto de modelos e projeção segura para o navegador. |
| packages/core/src/learning/scene/questions.ts | Contexto editorial revisado das 45 previsões de modelo. |
| packages/core/src/learning/scene/catalog.ts | Configuração obrigatória de prévia segura por modelo de cena. |
| packages/core/src/learning/scene/prediction-preview.ts | Estado inicial seguro, redactions declaradas e função que prepara a prévia. |
| packages/core/src/learning/scene/voz.ts | Texto determinístico da fala do palpite e da fala da instrução. |
| packages/member-shell/src/components/scene-prediction.tsx | Cartão do palpite, resumo da escolha, troca e foco. |
| packages/member-shell/src/components/scene-prediction-preview.tsx | Renderizador visual e não interativo da prévia segura. |
| packages/member-shell/src/components/scene-activity.tsx | Máquina de estados do fluxo fechado e aberto, montagem condicional e foco. |
| packages/member-shell/src/components/dialogue-block.tsx | Balão reutilizável com controle de áudio interno e fallback explicitamente permitido para cenas. |
| packages/member-shell/src/components/lesson-player-context.tsx | Contrato para o app hospedeiro renderizar balões de cena com fala e controles internos. |
| packages/member-shell/src/components/lesson-sections.tsx | Respeita a opção do app de ocultar a linha de obrigatoriedade. |
| packages/admin/src/components/editor/learning-builder.tsx | Campos de contexto, ajuda editorial e erro de publicação para previsão personalizada. |
| packages/admin/src/components/editor/voz-zappy-button.tsx | Gera as duas falas de cena a partir da projeção pública nova. |
| packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx | Injeta o mascote e desliga o status visual de obrigatoriedade. |
| packages/core/src/learning/scene/questions.test.ts | Cobertura das 45 previsões, contexto e projeção. |
| packages/core/src/learning/scene/voz.test.ts | Contrato exato das duas falas geráveis. |
| packages/admin/tests/learning-builder.test.tsx | Edição, validação e aviso do contexto personalizado. |
| packages/community-kids/tests/lesson-experimentation.test.tsx | Ordem visual, DOM fechado, foco e troca de palpite. |
| packages/community-kids/tests/lesson-voz-zappy.test.tsx | MP3 e fallback por balão, sem mistura de falas. |
| packages/community-kids/tests/zappy-fala.test.tsx | Animação do Zappy limitada ao áudio ativo. |
| packages/community-kids/tests/lesson-sections.test.tsx | Ausência de “Atividade obrigatória” no player Kids. |

## Interfaces entre os lotes

O contexto é um único campo conceitual, mas tem título curto para a ficha visual e explicação completa para o balão. Isso evita tentar extrair o nome da ferramenta de uma frase escrita para outro fim.

~~~ts
export interface LearningPredictionContext {
  label: string
  explanation: string
}

export interface LearningPrediction {
  context: LearningPredictionContext
  prompt: string
  choices: LearningChoice[]
  correctChoiceId?: string
  revealOn?: string
}
~~~

A prévia é sempre derivada da própria cena:

~~~ts
export interface ScenePredictionPreview {
  initial: true
  conceal?: readonly ('layers-order' | 'readout-values')[]
}

export function scenePredictionPreview(
  activity: SceneActivity,
): { state: SceneState; preview: ScenePredictionPreview }
~~~

O contexto e a pergunta formam uma fala fechada. A instrução é outra fala fechada:

~~~ts
export function falaDoPalpite(
  kind: 'experimentation' | 'demonstration',
  prediction: Pick<LearningPrediction, 'context' | 'prompt' | 'choices'>,
): string

export function falaDaInstrucao(instructions: string): string
~~~

## Task 1: Criar o contrato de contexto e preencher as previsões de modelo

**Files:**

- Create: packages/core/src/learning/prediction-context.ts
- Modify: packages/core/src/learning/index.ts
- Modify: packages/core/src/learning/scene/questions.ts
- Modify: packages/core/src/learning/scene/questions.test.ts
- Modify: packages/members/src/interfaces/http/learning.dtos.ts
- Modify: packages/members/tests/unit/learning-dto-conformance.test.ts

**Consumes:** O contrato atual de LearningPrediction, ScenePrediction, blockPrediction e publicInteractiveBlock.

**Produces:** Uma previsão pública com context.label e context.explanation, ou uma leitura legado segura com o contexto revisado do modelo da cena.

- [ ] **Step 1: Escrever os testes de contrato do Core**

Adicionar em questions.test.ts testes que percorram SCENE_IDS e exijam contexto não vazio, sem travessão e vestido pelo elenco. O cenário de leitor de tela deve afirmar a presença literal de “Ouvir a tela”.

~~~ts
expect(prediction.context.label.trim(), scene).not.toBe('')
expect(prediction.context.explanation.trim(), scene).not.toBe('')
expect(prediction.context.explanation, scene).not.toContain('—')

const leitor = SCENE_QUESTIONS['screen-reader'].prediction.context
expect(leitor.label).toContain('Ouvir a tela')
expect(leitor.explanation).toContain('lê em voz alta')
~~~

Adicionar casos de projeção para garantir que contexto acompanha prompt, choices, revealOn e shows sem vazar campos não públicos.

- [ ] **Step 2: Rodar os testes novos para confirmar a falha**

Run: bun test packages/core/src/learning/scene/questions.test.ts

Expected: FAIL porque LearningPrediction e SCENE_QUESTIONS ainda não possuem context.

- [ ] **Step 3: Criar o tipo e a guarda de leitura**

Em prediction-context.ts, criar LearningPredictionContext com label de até 180 caracteres e explanation de até 2.000 caracteres. Exportar isLearningPredictionContext para os guardas de leitura. A guarda deve aceitar somente strings não vazias e aparadas.

Em learning/index.ts:

1. Adicionar context a LearningPrediction.
2. Resolver modelos com castText tanto em label quanto em explanation.
3. Ao ler um prediction personalizado legado sem context, usar somente o contexto explicitamente revisado de SCENE_QUESTIONS para a mesma cena.
4. Quando não houver modelo correspondente, manter a previsão legada disponível para leitura sem quebrar a aula, mas não montar o novo portão de palpite.
5. Copiar context campo a campo em publicInteractiveBlock.
6. Exigir context em isInteractiveBlock para uma previsão personalizada nova ou alterada.

O fallback é de compatibilidade, não é geração de conteúdo. Não concatenar title, instruction ou manipulates para inventar contexto.

- [ ] **Step 4: Escrever o contexto editorial das 45 cenas**

Em questions.ts, adicionar context a cada ScenePrediction. Cada item deve cumprir:

1. label nomeia a ferramenta, o objeto ou a situação que aparece na ficha.
2. explanation descreve de modo neutro o que será investigado.
3. prompt pergunta a previsão sem antecipar a resposta.
4. choices respondem diretamente ao prompt.

Usar como referência obrigatória para screen-reader:

~~~ts
context: {
  label: 'Ouvir a tela',
  explanation:
    'Nesta experiência, vamos usar o botão “Ouvir a tela”. Ele lê em voz alta o que aparece no jogo.',
},
prompt: 'Antes de apertar “Ouvir a tela”, o que você acha que ele vai dizer?',
~~~

Para as outras 44 cenas, revisar o par contexto, prompt e alternativas no mesmo commit. Não aceitar expressões vagas como “quando você clicar”, “isso”, “ali” ou “a tela” quando a criança ainda não viu a ferramenta a que o texto se refere.

- [ ] **Step 5: Atualizar DTOs e testes de conformidade**

Declarar context no DTO de leitura de aula e fazer os testes de members verificarem a forma pública:

~~~ts
prediction: {
  context: {
    label: 'Ouvir a tela',
    explanation: 'Nesta experiência, vamos usar o botão “Ouvir a tela”. Ele lê em voz alta o que aparece no jogo.',
  },
  prompt: 'Antes de apertar “Ouvir a tela”, o que você acha que ele vai dizer?',
  choices: expect.any(Array),
}
~~~

Preservar a tolerância de leitura para registros antigos, mas fazer a publicação de conteúdo personalizado incompleto falhar com contexto ausente.

- [ ] **Step 6: Rodar testes e typecheck do Core e Members**

Run: bun run --filter @sistemazero/core test

Expected: PASS.

Run: bun run --filter @sistemazero/core typecheck

Expected: PASS.

Run: bun run --filter @sistemazero/members test

Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add packages/core/src/learning/prediction-context.ts packages/core/src/learning/index.ts packages/core/src/learning/scene/questions.ts packages/core/src/learning/scene/questions.test.ts packages/members/src/interfaces/http/learning.dtos.ts packages/members/tests/unit/learning-dto-conformance.test.ts
git commit -m "feat(learning): adicionar contexto aos palpites"
~~~

## Task 2: Modelar e renderizar a prévia segura da cena

**Files:**

- Create: packages/core/src/learning/scene/prediction-preview.ts
- Create: packages/core/src/learning/scene/prediction-preview.test.ts
- Modify: packages/core/src/learning/scene/catalog.ts
- Modify: packages/core/src/learning/scene/index.ts
- Modify: packages/member-shell/src/components/exploration-stage.tsx
- Create: packages/member-shell/src/components/scene-prediction-preview.tsx
- Test: packages/community-kids/tests/lesson-scene-design.test.tsx

**Consumes:** SceneActivity, sceneStart, openScene, SceneModel e ExplorationStage.

**Produces:** Uma prévia identificada por data-scene-prediction-preview, sem controles interativos e com o estado inicial seguro da cena real.

- [ ] **Step 1: Escrever testes do Core para as configurações de prévia**

Criar prediction-preview.test.ts para exigir uma configuração para cada SceneId e para verificar que ela parte da atividade real, incluindo setup, cast, pilha e initialImpulse.

~~~ts
for (const scene of SCENE_IDS) {
  expect(SCENE_MODELS[scene].predictionPreview, scene).toBeDefined()
  const { state } = scenePredictionPreview({
    type: 'experimentation',
    scene,
  })
  expect(state.evidence.discoveries, scene).toEqual([])
}
~~~

Acrescentar o caso layers para confirmar que a prévia declara a ocultação de ordem, e o caso screen-reader para confirmar que ela mantém o estado inicial vazio.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: bun test packages/core/src/learning/scene/prediction-preview.test.ts

Expected: FAIL porque SceneModel ainda não possui predictionPreview.

- [ ] **Step 3: Adicionar o contrato obrigatório ao catálogo**

Adicionar ScenePredictionPreview a SceneModel e uma entrada explícita em cada uma das 45 cenas:

~~~ts
predictionPreview: {
  initial: true,
  conceal: [],
},
~~~

Usar conceal: ['layers-order', 'readout-values'] para layers. Quando uma revisão visual mostrar outro vazamento de resposta, declarar uma redaction nomeada neste contrato, cobri-la por teste e aplicá-la no palco. Não esconder a prévia inteira com opacidade ou blur.

Em prediction-preview.ts, implementar scenePredictionPreview(activity) com openScene(sceneStart(activity)). A função retorna estado e configuração sem modificar a sessão da criança.

- [ ] **Step 4: Criar o componente de prévia estática**

Criar ScenePredictionPreview com:

1. role="img" e aria-label derivado de prediction.context.label.
2. data-scene-prediction-preview para testes.
3. Estado de scenePredictionPreview(activity).
4. ExplorationStage em modo preview.
5. Nenhum SceneReadoutBand, medidor, dica, botão de ferramenta, barra de progresso ou controle da cena.

Ampliar ExplorationStage com uma prop preview. Em preview, toda interação direta deve ser removida do palco ou receber handlers undefined antes de chegar ao componente específico. Não usar fieldset disabled nem inert como substituto da remoção de controles.

~~~tsx
<ScenePredictionPreview
  activity={activity}
  contextLabel={prediction.context.label}
/>
~~~

- [ ] **Step 5: Cobrir o DOM da prévia**

Em lesson-scene-design.test.tsx, montar screen-reader e layers ainda sem escolha e garantir:

~~~ts
expect(screen.getByTestId('scene-prediction-preview')).toBeTruthy()
expect(screen.queryByRole('button', { name: 'Ouvir a tela' })).toBeNull()
expect(screen.queryByRole('button', { name: 'Recomeçar' })).toBeNull()
expect(screen.queryByRole('meter')).toBeNull()
~~~

Percorrer a galeria de cenas ou uma tabela de casos para assegurar que nenhuma prévia contém texto que reproduza uma choice correta ou um shows da previsão correspondente.

- [ ] **Step 6: Rodar testes do Core e do desenho Kids**

Run: bun test packages/core/src/learning/scene/prediction-preview.test.ts packages/core/src/learning/scene/questions.test.ts

Expected: PASS.

Run: bun test packages/community-kids/tests/lesson-scene-design.test.tsx

Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add packages/core/src/learning/scene/prediction-preview.ts packages/core/src/learning/scene/prediction-preview.test.ts packages/core/src/learning/scene/catalog.ts packages/core/src/learning/scene/index.ts packages/member-shell/src/components/exploration-stage.tsx packages/member-shell/src/components/scene-prediction-preview.tsx packages/community-kids/tests/lesson-scene-design.test.tsx
git commit -m "feat(lessons): mostrar prévia segura antes do palpite"
~~~

## Task 3: Separar os dois momentos de diálogo, foco e reinício do palpite

**Files:**

- Modify: packages/member-shell/src/components/scene-activity.tsx
- Modify: packages/member-shell/src/components/scene-prediction.tsx
- Modify: packages/member-shell/src/components/dialogue-block.tsx
- Modify: packages/member-shell/src/components/lesson-player-context.tsx
- Modify: packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx
- Test: packages/community-kids/tests/lesson-experimentation.test.tsx
- Test: packages/community-kids/tests/zappy-fala.test.tsx

**Consumes:** LearningPrediction.context, ScenePredictionPreview, requestLessonMediaFocus e o contexto ZappyFalaProvider.

**Produces:** Dois balões independentes, cada um com seu próprio Ouvir, e um palco que só monta após a escolha.

- [ ] **Step 1: Escrever testes de interação antes de alterar o player**

Adicionar em lesson-experimentation.test.tsx os cenários abaixo:

1. Na chegada a cena com previsão contém primeiro balão, prévia, ficha “Hoje vamos usar” e alternativas.
2. instruction, SceneReadoutBand, ExplorationStage completo, LessonSceneControls, pistas e rodapé da cena não existem no DOM.
3. A alternativa abre o segundo balão antes da cena e move o foco para ele.
4. “Trocar meu palpite” remove novamente a cena aberta, limpa a escolha persistida e devolve foco ao primeiro balão.
5. Revisita e demonstração inline não recebem o portão.

O teste de screen-reader deve localizar o texto “Ouvir a tela” antes da pergunta. Não basta testar que um botão aparece depois.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: bun test packages/community-kids/tests/lesson-experimentation.test.tsx

Expected: FAIL porque a instrução e a cena são montadas antes de o palpite ser escolhido.

- [ ] **Step 3: Tornar o balão capaz de receber uma fala de cena**

Estender DialogueBlockView com uma configuração opcional de fala de cena. Ela deve aceitar texto visível, lista de textos falados, dicionário de vozes, fallback de navegador permitido e, para instructionAudioUrl, uma URL de áudio revisado.

~~~ts
export interface DialogueSpeech {
  texts: readonly string[]
  vozes?: SceneVozes
  fallbackToBrowser: boolean
  audioUrl?: string
  captionsText?: string
}
~~~

O botão deve morar dentro do balão, usar requestLessonMediaFocus antes de tocar e alimentar ZappyFalaProvider com falando verdadeiro somente durante reprodução. Não iniciar áudio automaticamente. O balão de conteúdo normal mantém sua regra atual: sem dicionário, não exibe Ouvir e não usa fallback.

Atualizar LessonPlayerContextValue para o hospedeiro poder renderizar esse balão de cena, sem impor o mascote ao Member Shell adulto.

- [ ] **Step 4: Reorganizar ScenePrediction**

Fazer ScenePrediction receber:

~~~ts
onEscolher: (id: string) => void
onTrocar: () => void
renderDialogue: (text: string, speech: DialogueSpeech) => ReactNode
preview: ReactNode
~~~

Quando não há escolha, a ordem fixa é:

1. marcador “Seu palpite” ou “Antes de assistir”;
2. balão do Zappy com context.explanation e prompt;
3. prévia segura;
4. ficha não interativa “Hoje vamos usar: {context.label}”;
5. alternativas;
6. incentivo de que errar é permitido.

Quando há escolha, manter somente a linha curta “Seu palpite: ...”, a ação “Trocar meu palpite” e a transição para a descoberta. “Trocar” chama onTrocar; não pode ser um estado local que mantenha o palco aberto.

- [ ] **Step 5: Reorganizar SceneActivityView em estado fechado e aberto**

Substituir o véu, fieldsets desativados, blur, props escondida e botões fechado do estado previsaoPendente por montagem condicional:

~~~tsx
{previsaoPendente ? (
  <ScenePrediction ... />
) : (
  <>
    {instructionDialogue}
    {sceneAndControls}
  </>
)}
~~~

No caminho aberto:

1. Renderizar o segundo balão com apenas instruction e sua própria fala.
2. Renderizar depois dele a moldura completa, a situação, os controles e o restante da cena atual.
3. Preservar todas as regras existentes de demonstração, checkpoint, conclusão, conflito e salvamento.

No callback de troca:

~~~ts
apagarPalpite(scope)
setPrediction('')
setHint(0)
setPistaCongelada(null)
setConferiu('')
setPalpiteNaHora('')
dispatch({ type: 'reset' })
~~~

Depois da escolha, usar um efeito de foco no wrapper do segundo balão. Depois da troca, usar um efeito de foco no wrapper do primeiro balão. Não mover foco em revisita nem em hidratação de localStorage.

- [ ] **Step 6: Montar os balões no app Kids**

Atualizar lesson-player-client.tsx para criar DialogueBlockView com o mascote KidsMascotAnimated e com a configuração de fala recebida. A prop sound do mascote continua false, porque a animação é governada pelo contexto de fala, não por loop próprio.

- [ ] **Step 7: Rodar os testes do fluxo e do mascote**

Run: bun test packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/zappy-fala.test.tsx

Expected: PASS.

Run: bun run --filter @sistemazero/member-shell typecheck

Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add packages/member-shell/src/components/scene-activity.tsx packages/member-shell/src/components/scene-prediction.tsx packages/member-shell/src/components/dialogue-block.tsx packages/member-shell/src/components/lesson-player-context.tsx packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/zappy-fala.test.tsx
git commit -m "feat(kids): abrir descoberta após o palpite"
~~~

## Task 4: Fazer o áudio e a autoria seguirem o novo contrato

**Files:**

- Modify: packages/core/src/learning/scene/voz.ts
- Modify: packages/core/src/learning/scene/voz.test.ts
- Modify: packages/admin/src/components/editor/learning-builder.tsx
- Modify: packages/admin/src/components/editor/voz-zappy-button.tsx
- Modify: packages/admin/tests/learning-builder.test.tsx
- Modify: packages/admin/tests/scene-authoring-rules.test.ts
- Modify: packages/community-kids/tests/lesson-voz-zappy.test.tsx

**Consumes:** Contexto público resolvido, DialogueSpeech e gerarVozes já existentes.

**Produces:** Uma geração de voz por unidade de fala e campos editoriais que impedem publicar um palpite personalizado sem contexto.

- [ ] **Step 1: Escrever os testes de fala segmentada**

Em voz.test.ts, escrever os casos:

~~~ts
expect(falaDoPalpite('experimentation', palpite)).toContain(
  'Nesta experiência, vamos usar o botão Ouvir a tela.',
)
expect(falaDoPalpite('experimentation', palpite)).toContain(
  'Antes de apertar Ouvir a tela',
)
expect(falaDaInstrucao('Aperte Ouvir a tela.')).toBe('Aperte Ouvir a tela.')
expect(falaDaInstrucao('Aperte Ouvir a tela.')).not.toContain(palpite.prompt)
~~~

Em lesson-voz-zappy.test.tsx, provar que o primeiro botão toca somente o MP3 do palpite e o segundo somente o MP3 da instrução. Fazer um caso de dicionário incompleto em cada balão para provar que o fallback inteiro é a voz do navegador.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: bun test packages/core/src/learning/scene/voz.test.ts packages/community-kids/tests/lesson-voz-zappy.test.tsx

Expected: FAIL porque o botão atual lê instrução, palpite e checkpoint em uma única fila.

- [ ] **Step 3: Criar os construtores determinísticos de fala**

Em voz.ts:

1. Fazer falaDoPalpite incluir rótulo temporal, context.explanation, prompt e choices.
2. Fazer falaDaInstrucao devolver somente a instrução.
3. Manter falaDaPergunta para checkpoint, que é uma terceira unidade já existente e não deve ser anexada à instrução.
4. Fazer textosFalaveisDaCena retornar cada unidade fechada e normalizada: instrução, palpite, checkpoint.

Não alterar chaveDeVoz, textoFalado, filaDeVoz, hash no R2, limites de tamanho nem o fluxo de geração. A mudança de texto já invalida somente os MP3 que precisam ser gerados de novo.

- [ ] **Step 4: Atualizar o Editor**

No bloco de previsão personalizada de LearningBuilder, antes de “Pergunta de antes”, inserir:

1. “Nome curto do que vamos investigar”, ligado a prediction.context.label.
2. “Como o Zappy apresenta isso”, ligado a prediction.context.explanation.
3. Ajuda: “Diga o que é a ferramenta ou a situação antes de perguntar. A criança ainda não vê os controles.”
4. Erros específicos para label ou explanation vazios.

Para previsão herdada, mostrar contexto, pergunta e alternativas em PerguntaHerdada. Para conteúdo legado personalizado sem context, exibir aviso de revisão e bloquear a publicação quando a autora salvar uma alteração sem completar os dois campos.

No botão de voz, continuar derivando textos da projeção pública. A alteração de textosFalaveisDaCena faz a lista incluir o contexto do palpite sem uma segunda implementação no Admin.

- [ ] **Step 5: Provar o comportamento de animação e de áudio manual**

Adicionar testes de DialogueBlockView para:

1. MP3 de instructionAudioUrl acender falando no provider em play.
2. pause, ended, error e interrupção por requestLessonMediaFocus apagarem falando.
3. Começar o Ouvir do palpite interromper o Ouvir da instrução e vice-versa.

O teste deve disparar handlers do elemento Audio falso. Não usar timeout como evidência de fim de fala.

- [ ] **Step 6: Rodar testes do Core, Admin e Kids**

Run: bun run --filter @sistemazero/core test

Expected: PASS.

Run: bun run --filter @sistemazero/admin test

Expected: PASS.

Run: bun test packages/community-kids/tests/lesson-voz-zappy.test.tsx packages/community-kids/tests/zappy-fala.test.tsx

Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add packages/core/src/learning/scene/voz.ts packages/core/src/learning/scene/voz.test.ts packages/admin/src/components/editor/learning-builder.tsx packages/admin/src/components/editor/voz-zappy-button.tsx packages/admin/tests/learning-builder.test.tsx packages/admin/tests/scene-authoring-rules.test.ts packages/community-kids/tests/lesson-voz-zappy.test.tsx packages/community-kids/tests/zappy-fala.test.tsx
git commit -m "feat(lessons): separar voz do palpite e instrução"
~~~

## Task 5: Ocultar o status técnico de obrigatoriedade somente no player Kids

**Files:**

- Modify: packages/member-shell/src/components/lesson-player-context.tsx
- Modify: packages/member-shell/src/components/lesson-sections.tsx
- Modify: packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx
- Modify: packages/community-kids/tests/lesson-sections.test.tsx

**Consumes:** O status de requirements já calculado por LessonSections.

**Produces:** Progresso e bloqueios continuam ativos, mas a criança não lê “Atividade obrigatória” ou “Atividade concluída” como uma linha adicional acima de cada cartão.

- [ ] **Step 1: Escrever o teste Kids**

Montar LessonSections com LessonPlayerProvider contendo showActivityRequirement: false e uma requirement pendente.

~~~ts
expect(screen.queryByText('Atividade obrigatória')).toBeNull()
expect(screen.queryByText('Atividade concluída')).toBeNull()
expect(screen.getByRole('button', { name: 'Próxima seção' })).toHaveProperty('disabled', true)
~~~

Acrescentar o controle adulto sem a flag para garantir que a remoção é específica da interface Kids.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: bun test packages/community-kids/tests/lesson-sections.test.tsx

Expected: FAIL porque LessonSections sempre desenha sz-lesson-requirement.

- [ ] **Step 3: Adicionar a opção do hospedeiro**

Em LessonPlayerContextValue, adicionar:

~~~ts
showActivityRequirement?: boolean
~~~

Em LessonSections, renderizar sz-lesson-requirement somente quando player?.showActivityRequirement não for false. Não mudar requirements, progresso, critérios de seção, foco de pendência ou API.

Em lesson-player-client.tsx, definir showActivityRequirement: false.

- [ ] **Step 4: Rodar o teste e typechecks**

Run: bun test packages/community-kids/tests/lesson-sections.test.tsx

Expected: PASS.

Run: bun run --filter @sistemazero/member-shell typecheck

Expected: PASS.

Run: bun run typecheck:kids

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add packages/member-shell/src/components/lesson-player-context.tsx packages/member-shell/src/components/lesson-sections.tsx packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx packages/community-kids/tests/lesson-sections.test.tsx
git commit -m "feat(kids): ocultar status técnico de atividade"
~~~

## Task 6: Revisão editorial, regressão e aceite visual

**Files:**

- Modify: packages/core/src/learning/scene/questions.ts
- Modify: packages/core/src/learning/scene/catalog.ts
- Modify: packages/core/src/learning/scene/questions.test.ts
- Modify: packages/core/src/learning/scene/prediction-preview.test.ts
- Modify: packages/community-kids/tests/lesson-experimentation.test.tsx
- Modify: packages/community-kids/tests/lesson-scene-design.test.tsx

**Consumes:** Os cinco lotes anteriores e o cenário de referência screen-reader.

**Produces:** Evidência de que o fluxo inteiro é coerente em cenas, demonstrações, áudio, foco, conteúdo e progresso.

- [ ] **Step 1: Fazer a revisão editorial das 45 previsões**

Para cada SceneId, verificar em questions.ts:

1. O label dá nome a algo que a criança verá na ficha.
2. A explanation não revela a choice correta.
3. O prompt se refere à mesma ferramenta ou situação apresentada na explanation.
4. As choices respondem ao prompt sem repetir a resposta.
5. Texto com elenco não volta a citar Dino para turmas de nave.
6. Não há travessão.

Registrar correções diretamente nos dados e manter os testes de catálogo como guarda permanente.

- [ ] **Step 2: Fazer a revisão visual das prévias**

Executar a galeria de cenas e inspecionar uma prévia por SceneId. Checar que cada imagem:

1. Mostra estado inicial reconhecível.
2. Não oferece controle que pareça utilizável.
3. Não expõe uma meta, descoberta, dica, posição ou frase que resolva o palpite.
4. Mantém elenco, caso e pilha da atividade real.

Para qualquer vazamento, adicionar ou ajustar uma redaction declarada no modelo e incluir um teste de regressão do caso.

- [ ] **Step 3: Executar a suíte direcionada**

Run: bun test packages/core/src/learning/scene/questions.test.ts packages/core/src/learning/scene/prediction-preview.test.ts packages/core/src/learning/scene/voz.test.ts

Expected: PASS.

Run: bun test packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/lesson-scene-design.test.tsx packages/community-kids/tests/lesson-voz-zappy.test.tsx packages/community-kids/tests/zappy-fala.test.tsx packages/community-kids/tests/lesson-sections.test.tsx

Expected: PASS.

Run: bun run --filter @sistemazero/admin test

Expected: PASS.

- [ ] **Step 4: Executar verificação completa**

Run: bun run ci

Expected: PASS.

Run: bun run typecheck:admin

Expected: PASS.

Run: bun run typecheck:kids

Expected: PASS.

Run: bun run build:kids

Expected: PASS.

- [ ] **Step 5: Commit de correções de revisão**

~~~bash
git add packages/core/src/learning/scene/questions.ts packages/core/src/learning/scene/catalog.ts packages/core/src/learning/scene/questions.test.ts packages/core/src/learning/scene/prediction-preview.test.ts packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/lesson-scene-design.test.tsx
git commit -m "test(lessons): revisar fluxo de palpite e descoberta"
~~~

## Critérios finais de aceite

- Na experiência de leitor de tela, a criança lê e ouve o nome “Ouvir a tela” e sua função antes de prever o resultado.
- Antes da escolha, o DOM contém somente o primeiro balão, a prévia segura, a ficha de contexto e as alternativas.
- Depois da escolha, a cena abre após o segundo balão e o foco chega nesse balão.
- Trocar o palpite volta ao início completo e remove a cena aberta do DOM.
- A primeira fala não inclui a instrução. A segunda não inclui o palpite. O checkpoint continua unidade própria.
- O Zappy só se anima durante a fala que estiver ativa e para em término, pausa, erro ou interrupção.
- Uma cena sem palpite, uma demonstração inline e uma revisita mantêm o fluxo direto atual.
- O Admin deixa claro o que escrever como contexto e não permite publicar previsão personalizada sem esse contexto.
- A Comunidade Kids não mostra “Atividade obrigatória”, mas a conclusão da aula continua bloqueada enquanto a requirement estiver pendente.
