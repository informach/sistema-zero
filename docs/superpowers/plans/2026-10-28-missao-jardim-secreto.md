# O Jardim Secreto — plano de implementação

Execução na sessão atual com writing-plans, executing-plans e aula-roteiro. Proposta aprovada pelo usuário em 28/10/2026. Não depende de nova aprovação entre etapas.

**Objetivo:** entregar a autoria completa da missão Faísca em 2D/3D, jogos e artes, verificações, quiz, materiais e PDF no padrão dos cursos-base.

**Arquitetura:** fontes editoriais e gerador em `docs/aulas-interativas-tecnico/qa/jardim-*`, autoria em `docs/aulas-interativas/faisca/o-jardim-secreto`. Modelos compactos na biblioteca existente, arquivos portáteis com malhas reais. Avaliação reutiliza regras estruturais e executor; quiz reutiliza player e correção do servidor.

**Stack:** TypeScript/Bun, SZIR/Blockly, React, Jogo 2D/3D, glTF, Playwright para revisão e PDF.

**Spec:** [proposta aprovada](../../aulas-interativas/faisca/o-jardim-secreto/proposta.md) e [direção de arte](../../aulas-interativas/faisca/o-jardim-secreto/direcao-de-arte.md).

## Restrições

- Duas aulas, oito partes 2D e sete 3D, uma entrega por aula, sem certificado ou publicação obrigatória.
- Somente Programação básica e extensão da dimensão, inclusive preparação, referência e soluções.
- Movimento, limite 2D, coleta, memória, mensagens, decisão e posição construídos pela pessoa.
- Infraestrutura pronta, ajuda completa opcional, projetos preservados entre partes.
- Preservar UUIDs/outline do seed e alterações anteriores de organização das pastas.
- Voz gravada, filmagem e publicação remota são produção distinta; gerar fontes prontas sem inventar mídia publicada.

## 1. Artes e projetos

- [x] Criar `docs/design/jardim-secreto/gerar-artes.ts`: SVGs e GLBs reproduzíveis, regador, flor com clipe, jardim; reutilizar personagem dos Faróis.
- [x] Publicar GLBs com `publishCourseModel` e `writeCourseModelRegistry`, mantendo biblioteca anterior; registrar dimensões/clipes no catálogo do Jardim.
- [x] Criar `qa/jardim-projeto.ts`: `montarProjetoJardim(dimensao, etapa)` para entrada, movimento, limite, coleta, decisão e posição. Usar parseJS/normalizeSZIR/buildWorkspaceStateFromIR/generateProjectFiles.
- [x] Conferir cada etapa com schema SZIR, blocos básicos, roundtrip e renderização real; salvar prévias das duas dimensões.

## 2. Objetivos e avaliação

- [x] Criar `qa/jardim-criterios.ts` com objetivos por etapa; usar ações approachSprite/approachObject3d por geometria atual, observar antes/depois e reinício.
- [x] Implementar ligação causal básica da variável sem nome canônico, com testes de nome alternativo, condição invertida, declaração sem uso e memória que não participa da decisão.
- [x] Testar posição alternativa em um eixo, limites, falso sucesso, coleta precoce e regras ausentes; verificar limites de tempo dos contratos.

## 3. Quiz e autoria

- [x] Registrar demonstrações Jardim em contratos core/members/Admin/member-shell e implementar cena no padrão do player, com estados antes/depois e alternativa estática acessível.
- [x] Suportar pergunta sem demonstração no mesmo quiz, preservando correção do servidor e novas tentativas.
- [x] Criar `qa/jardim-conteudo.ts`, `qa/jardim-quiz.ts` e `qa/gerar-jardim-secreto.ts`; gerar manifestos v5, roteiros, derivados de voz, modulos, inventário, passos e projetos portáteis.
- [x] Reconciliar authoredSource da missão no currículo mantendo outline e IDs históricos.

## 4. Material e validação

- [x] Gerar PDF com tipografia, cartões e blocos reais no padrão dos cursos-base; renderizar e revisar todas as páginas.
- [x] Rodar testes do Jardim e regressões dos contratos compartilhados, validadores de manifestos/roteiros/voz e checagem de importação portátil.
- [x] Revisar copy, liberdade de montagem, critérios por etapa, quiz neutro, salvamento e conclusão; corrigir achados.
- [x] Atualizar README e relatório de revisão com evidências e etapas de produção ainda pendentes.

## Comandos de conferência

`bun docs/aulas-interativas-tecnico/qa/gerar-jardim-secreto.ts`

`bun test docs/aulas-interativas-tecnico/qa/jardim-secreto.test.ts`

`bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts`

`bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts --check`

`python docs/aulas-interativas-tecnico/validar-roteiros.py`

Testes dos arquivos compartilhados alterados acompanham cada etapa; regressões dos Faróis ao fechar.


## Fechamento

Autoria e revisão concluídas localmente. Evidências e limites no relatório de implementação do curso. Em 28/10/2026 o usuário autorizou, após a revisão, commit e merge na staging local; não autorizou push nesta tarefa.
