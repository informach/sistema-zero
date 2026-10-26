# Full review — Cadê Todo Mundo

**Atualização:** os achados abaixo são o registro histórico da revisão. As correções e sua verificação estão em [Correções do review — 26/10/2026](../docs/aulas-interativas/cade-todo-mundo/CORRECOES-REVIEW-2026-10-26.md).

Data: 26/10/2026. Base local: `staging`, `e3a88a4c2`, com alterações ainda não commitadas.

## Parecer

**Há nove achados confirmados: um P1 e oito P2. A implementação precisa de correções antes de ser considerada pronta.** O fluxo principal funciona e os objetivos executam os jogos corretamente nos casos testados. Os principais problemas estão na integração com a autoria e nos estados que surgem quando a criança explora fora da sequência prevista.

Esta revisão não alterou código de produção. Foram criadas reproduções locais em diretórios `.cache`, além deste relatório. As mudanças simultâneas da Jornada do Criador foram preservadas e não constituem objeto desta auditoria.

## Escopo e método

- Experiências de toque e contador: estados, descobertas, reinício, repetição, orientações do Zappy e controles.
- Quiz de previsão: seleção, demonstração, correção, tentativa, conclusão, retomada, autoria e validação no servidor.
- Objetivos do Estúdio: execução, verificações intermediárias, seletores do HUD, soluções, erros plausíveis e personalizações.
- Integrações dos componentes compartilhados com os temas infantil e adulto, manifestos, importação e editores do Admin.
- Roteiros, exportações de voz, manifestos, geradores, PDF e diretrizes de autoria.

Foram combinados leitura dos diffs e dos consumidores dos contratos, testes automatizados, reproduções com componentes reais e verificações no navegador. As reproduções de interface usam os componentes reais com uma montagem local e adaptadores de assets; não equivalem a uma sessão completa autenticada em produção. Os testes de API verificam separadamente autorização, correção e persistência.

P1 significa alta prioridade, por comprometer um fluxo de trabalho. P2 significa correção necessária de comportamento ou conteúdo. Todos os nove achados abaixo têm confiança alta; os gatilhos e limites estão explicitados.

## Achados

### R1 — P1 — As falas por etapa provocam atualizações repetidas no editor do Admin

**Local:** [voz.ts](../packages/core/src/learning/scene/voz.ts), linhas 286–289; [learning-builder.tsx](../packages/admin/src/components/editor/learning-builder.tsx), linha 518; [zappy-speech-editor.tsx](../packages/admin/src/components/editor/zappy-speech-editor.tsx), linhas 54–64.

As seis novas falas guiadas usam o mesmo `slot: instruction`, que já pertence à instrução original. O editor transforma o slot em identificador da linha, chave de estado e chave React. Assim, sete textos diferentes compartilham a mesma identidade. O mapa de textos anteriores guarda apenas o último; em renderizações posteriores, os outros parecem ter mudado e o efeito dispara `onChange(id, undefined)` novamente.

**Reprodução:** renderizar o `LearningBuilder` com o bloco real `experiencia-toque` e provocar uma nova renderização do pai, sem editar pronúncia. A cena de controle `world` produz zero escritas e nenhuma chave duplicada. A cena `touch-response` produz 18 escritas e 30 avisos de chave duplicada, mesmo limitando artificialmente as atualizações do pai para evitar execução sem fim. O editor de produção não contém esse limite.

**Impacto:** instabilidade na edição, atualizações desnecessárias e impossibilidade de manter ajustes de pronúncia independentes para cada etapa. Não se trata de afirmar que todo áudio usa a mesma fala: a resolução de voz verifica `sourceText`; o defeito confirmado está na identidade das entradas de autoria.

**Correção recomendada:** definir identificadores estáveis para as etapas e propagá-los pelo contrato de overrides, catálogo de falas e editor. Trocar apenas a chave React não resolve o compartilhamento do estado e dos overrides. Cobrir uma renderização adicional sem edição e a edição independente de duas falas.

**Evidência:** `packages/admin/.cache/cade-review-authoring.tsx` e `cade-review-authoring.log`.

### R2 — P2 — Reiniciar antes da hora deixa a orientação sem uma ação capaz de avançá-la

**Local:** [garden.ts](../packages/core/src/learning/scene/garden.ts), linhas 91–98; [engine.ts](../packages/core/src/learning/scene/engine.ts), linhas 588–593.

A próxima fala é escolhida pelas descobertas acumuladas, sem considerar se o estado atual permite realizá-la. O botão de reinício está disponível antes da etapa em que o Zappy o solicita.

**Reprodução:** encontrar dois personagens, reiniciar a busca e seguir a instrução de tocar no espaço vazio. O valor está em zero; `look-around` só registra `no-find` quando há pontos. Tocar no vazio repetidamente mantém a mesma orientação e o progresso em três de cinco descobertas.

**Impacto:** a criança obedece à instrução e não avança. É possível sair desse estado encontrando novamente um personagem, mas o Zappy não orienta essa ação. Um reinício antes da descoberta de repetição também pode solicitar um toque repetido quando não há personagem revelado.

**Correção recomendada:** calcular a orientação pelos conhecimentos já descobertos e pelos pré-requisitos atuais da cena. Após reiniciar, guiar a recuperação do estado necessário, preservando as descobertas anteriores. Testar reinício em cada etapa, além do caminho principal.

**Evidência:** `packages/studio/.cache/cade-review-evidence/review.json`, campo `earlyReset`, e `reset-before-empty.png`.

### R3 — P2 — Um esconderijo invisível continua sendo escolhido na experiência de toque

**Local:** [engine.ts](../packages/core/src/learning/scene/engine.ts), linhas 551–565; [scene-two-hiding-places.tsx](../packages/member-shell/src/components/scene-two-hiding-places.tsx).

O motor atualiza o escolhido sem impedir uma nova reação para um esconderijo já revelado. Os alvos da experiência permitem repetir o toque, mas o resultado não representa a regra do jogo ensinado.

**Reprodução:** na etapa com dois esconderijos, tocar no arbusto, nas pedras e novamente no lugar do coelho. O escolhido muda de pedras para arbusto e aparece “Só esse esconderijo ficou invisível”, apesar de ambos já estarem invisíveis.

**Impacto:** a experiência ensina um comportamento diferente do runtime e da explicação da terceira pergunta do quiz. No jogo real, o hit test rejeita o sprite com opacidade zero; a repetição não deve disparar novamente a reação daquele esconderijo.

**Correção recomendada:** manter a oportunidade de testar repetição, mas representar explicitamente que não houve um novo evento no esconderijo invisível. Não atualizar escolhido/reação como se o toque tivesse atingido uma cobertura visível.

**Evidência:** `packages/studio/.cache/cade-review-evidence/review.json`, campo `repeatInvisible`; implementação real de hit test em `packages/studio/src/official-extensions/game-2d/runtime/textSprites.ts`, linha 372.

### R4 — P2 — O editor de objetivos não conhece as verificações intermediárias e pode invalidá-las

**Local:** [project-execution.ts](../packages/core/src/learning/project-execution.ts), contrato de `checkpoints`; [execution-rule-editor.tsx](../packages/admin/src/components/editor/execution-rule-editor.tsx), linhas 387–390; [execution-rule.ts](../packages/admin/src/lib/execution-rule.ts).

As novas regras incluem verificações após passos específicos e um seletor de texto. O editor só mostra a verificação final, e sua descrição ainda fala genericamente no texto da página. Ao remover ou reordenar passos, ele preserva os índices antigos dos checkpoints.

**Reprodução:** abrir a regra real `mensagem-tres-achados`, que contém quatro checkpoints e o seletor `#sz-game-hud-status [data-sz-hud-kind="label"]`. Nenhum deles aparece no editor. Remover o primeiro passo deixa seis passos e checkpoints `[1, 3, 5, 7]`; `isSectionExecutionRule` passa a retornar falso.

**Impacto:** uma edição normal corrompe a regra, e a autora não dispõe de controles para compreender ou corrigir a parte oculta. Mesmo antes da alteração, o editor não descreve toda a condição de aprovação.

**Correção recomendada:** integrar checkpoints e seletor à autoria e atualizar referências ao editar passos. Se for necessário um estágio intermediário, mostrar claramente a regra completa em um editor avançado e impedir operações incompatíveis no editor simplificado.

**Evidência:** `packages/admin/.cache/cade-review-contracts.tsx` e `cade-review-contracts.log`.

### R5 — P2 — Uma pergunta sem cena desativa silenciosamente as demonstrações de todo o quiz

**Local:** [quiz-block.tsx](../packages/member-shell/src/components/quiz-block.tsx), linha 38; [kids-quiz.tsx](../packages/community-kids/src/components/kids/kids-quiz.tsx), linha 38; contratos de quiz do Core e Members.

O player de previsão só é escolhido quando todas as perguntas têm `predictionScene`. O campo é opcional por pergunta e os validadores aceitam um quiz misto. O editor também não oferece um fluxo correspondente para configurar essas cenas.

**Reprodução:** retirar `predictionScene` de uma única pergunta do quiz atual. A validação de autoria e a validação de manifesto aceitam o documento, mas os dois wrappers passam a escolher o quiz clássico para todas as perguntas.

**Impacto:** adicionar ou editar uma pergunta pode remover “Ver o que acontece” das demais sem qualquer indicação de erro, perdendo a funcionalidade pedagógica aprovada.

**Correção recomendada:** explicitar o modo do quiz e validá-lo de forma uniforme, ou suportar a cena individualmente por pergunta. O editor deve oferecer as opções necessárias e apontar configurações incompletas.

**Divergência associada:** um quiz de previsão com duas alternativas corretas passa em `isManifestQuiz`, mas é rejeitado por Members; o novo player usa seleção única. Centralizar a validação também deve alinhar essa cardinalidade.

**Evidência:** `packages/admin/.cache/cade-review-contracts.log`, casos `mixed` e `multiple-correct`.

### R6 — P2 — O quiz perde as respostas e a posição ao sair e voltar

**Local:** [prediction-quiz.tsx](../packages/member-shell/src/components/prediction-quiz.tsx), linhas 46 e 105; comparação com [quiz-block.tsx](../packages/member-shell/src/components/quiz-block.tsx), linhas 67–108.

O novo componente mantém respostas, seleção e índice apenas em memória. O quiz clássico adulto já preservava um rascunho por pessoa, aula e bloco. A correção parcial no servidor deliberadamente não salva uma tentativa, portanto ela não recupera esse progresso.

**Reprodução:** acertar a primeira pergunta, avançar para a segunda, trocar de parte e voltar. O quiz retorna à primeira pergunta, sem alternativa selecionada. Recarregar ou desmontar o componente tem o mesmo efeito sobre o estado local.

**Impacto:** perda do trabalho em andamento e regressão de retomada na experiência adulta. A conclusão definitiva já registrada é um caso diferente e não foi apontada como perdida.

**Correção recomendada:** persistir e restaurar o rascunho com identidade do aluno, aula, bloco e revisão do conteúdo. Preservar a correção final autoritativa no servidor; dados locais não devem conceder aprovação ou XP.

**Evidência:** `packages/studio/.cache/cade-review-evidence/review.json`, campo `quizResume`.

### R7 — P2 — O destaque “Escolhido” tem contraste insuficiente nas seis paletas infantis

**Local:** [garden-learning.css](../packages/member-shell/src/styles/garden-learning.css), linhas 80–92.

**Reprodução:** verificação no navegador com CSS real, em seis paletas e dois temas, para toque, contador e quiz: 36 combinações. Seis falharam, todas no texto `.sz-garden-chosen > span` da experiência de toque infantil. O texto de 14 px em negrito tem cor `#b55a00`, fundo `#f9eee8` e contraste medido de **4,16:1**, abaixo dos 4,5:1 exigidos para esse tamanho.

**Impacto:** o destaque que deve ajudar a identificar o escolhido fica menos legível, especialmente para pessoas com baixa visão. As outras combinações verificadas não apresentaram essa falha; isso não representa uma certificação completa de acessibilidade.

**Correção recomendada:** usar uma cor semântica de texto com contraste suficiente, mantendo a cor de destaque em bordas, ícones ou fundos. Revalidar as seis paletas.

**Evidência:** `packages/studio/.cache/cade-review-evidence/palettes.json` e `packages/studio/.cache/cade-review-palettes.mjs`. O tema adulto foi testado com seu CSS compilado aplicado aos componentes compartilhados; não com o player adulto autenticado completo.

### R8 — P2 — A fala de encerramento ainda apresenta publicação como parte obrigatória do caminho

**Local:** [cade-todo-mundo-aula-2.roteiro.md](../docs/aulas-interativas/cade-todo-mundo/cade-todo-mundo-aula-2.roteiro.md), linhas 152, 166 e 177.

O texto da página e o PDF atualizado permitem concluir sem publicar. A fala preservada anuncia que chegou a hora de publicar e orienta a conclusão somente depois de copiar o link, sem apresentar a alternativa de concluir diretamente.

**Impacto:** a criança recebe orientações diferentes conforme lê a página ou acompanha a gravação. É uma inconsistência editorial do curso atualizado, mesmo que a interface permita a conclusão sem publicação.

**Correção recomendada:** apresentar a publicação como convite também na fala e indicar o caminho para concluir sem compartilhar. Atualizar as exportações derivadas antes de gravar.

### R9 — P2 — A prévia do novo quiz falha quando a nota mínima está ausente

**Local:** [prediction-quiz.tsx](../packages/member-shell/src/components/prediction-quiz.tsx), linhas 51–61; validação de `passingScore` em `manifest-quiz.ts` e contrato de autoria em Members.

Members admite `passingScore` ausente. A prévia local do novo componente exige `isManifestQuiz(content)`, que não aceita essa ausência, e cai no caminho de submissão da aula. Sem um contexto de aluno, a operação falha. A prévia clássica normaliza esse valor antes da validação.

**Reprodução:** montar `PredictionQuiz` com `LessonPreviewProvider`, selecionar uma resposta e clicar em “Ver o que acontece”. Com `passingScore: 100`, a cena avança para o resultado. Com o mesmo quiz e sem `passingScore`, aparece “Não foi possível conferir a previsão. Tente de novo.”

**Impacto:** a prévia falha para conteúdo aceito pela autoria, e repetir o clique não corrige o problema. Os manifestos atuais do Cadê incluem a nota; portanto o gatilho é uma configuração de autoria válida, não o conteúdo padrão atual.

**Correção recomendada:** aplicar o mesmo valor padrão e contrato na autoria, importação, prévia e execução, sem transformar ausência de normalização em tentativa de chamada ao fluxo do aluno.

**Evidência:** `packages/admin/.cache/cade-review-preview.tsx` e `cade-review-preview.log`.

## Verificação executada nesta revisão

| Área | Resultado observado |
| --- | --- |
| Core learning e QA editorial | 1.375 testes passaram; 2 falharam, ambos relacionados ao Farol, discriminados abaixo |
| API de quiz | 14 testes passaram; autorização, privacidade do gabarito, correção parcial sem tentativa/XP e conclusão final |
| Estúdio: motor, ciclo de vida, tipos de runtime e autoria de objetivos | 126 testes passaram |
| Contrato de execução do runtime | 17 testes passaram |
| Jogos no navegador real | 1 teste passou, com 22 verificações sobre 11 variantes de solução, erros e personalizações |
| Fluxo principal dos componentes reais | 45 verificações passaram; larguras de 320, 390, 768 e 1.280 px; sem erros de execução registrados |
| Paletas e contraste | 36 combinações verificadas; seis falhas explicadas em R7 |
| TypeScript do Studio Runtime, incluindo testes | Comando concluiu com código 0 |
| TypeScript de Community Kids, com tipos Bun e Node | Comando concluiu com código 0 |
| Biome nos arquivos selecionados desta implementação | 46 arquivos, sem erros e sem aplicação de correções |
| Manifestos do acervo | 37 válidos, zero reprovados e zero avisos de convenção |
| Inventário de gravações | 203 clipes em 37 aulas, zero erros estruturais |
| Exportações de voz | Verificação de sincronização passou, sem gerar áudio pago |
| PDF | Sete páginas renderizadas e inspecionadas visualmente; sem cortes de layout observados |

As duas falhas da bateria editorial abrangente são `Desafio do Primeiro Jogo — A Chave do Farol > cada roteiro cobre as partes e gravações do manifesto na mesma ordem` e `diretrizes dos cursos curtos > desafio: uma revisão final, sem vídeo, antes do certificado preservado`. Elas apontam divergências entre roteiro e manifesto do Farol, incluindo seu encerramento. Não foram contabilizadas como defeitos desta alteração do Cadê nem corrigidas durante esta revisão. A bateria abrangente, portanto, **não está totalmente verde**.

Logs principais: `.cache/cade-review-core-editorial.log`, `.cache/cade-review-api.log`, `.cache/cade-review-studio.log`, `.cache/cade-review-native.log`, `.cache/cade-review-check-contract.log`, `.cache/cade-review-biome.log`, `.cache/cade-review-manifests.log`, `.cache/cade-review-roteiros.log`, `.cache/cade-review-voices.log` e `packages/studio/.cache/cade-review-regression-ui.log`.

## Observação documental menor

`docs/aulas-interativas-tecnico/ESPEC-ROTEIRO.md`, linha 79, ainda orienta “Próxima seção” para adultos, enquanto a diretriz pedagógica atual e `lesson-copy.ts` usam “Próxima parte”. É uma inconsistência preexistente que permaneceu em um documento atualizado neste trabalho; convém corrigi-la junto da revisão editorial. Não está incluída nos nove defeitos funcionais e pedagógicos acima.

## Limites e ordem de correção

Os testes aprovados sustentam o funcionamento do caminho principal e dos contratos cobertos, mas não anulam as reproduções negativas. Os testes atuais não cobrem adequadamente a renderização adicional do editor de falas, o reinício antecipado em cada descoberta, a edição dos checkpoints e a retomada do quiz. Esses cenários devem orientar testes de regressão das correções.

Não foram realizados publicação, deploy, migração, geração paga de áudio nem uma jornada completa autenticada nas aplicações implantadas. O PDF foi inspecionado como documento gerado; não houve validação de novas gravações de voz ou vídeo.

Ordem recomendada: corrigir R1; alinhar autoria e contratos em R4, R5 e R9; corrigir a experiência da criança em R2 e R3; restaurar retomada em R6; ajustar contraste e encerramento em R7 e R8. Depois, repetir as reproduções afetadas e a verificação de integração correspondente.
