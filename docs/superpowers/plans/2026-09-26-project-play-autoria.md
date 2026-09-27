# Project Play Authoring Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan inline, task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Configurar manualmente o mesmo jogo jogável aceito pelo manifesto, com participação como padrão e compatibilidade com objetivos existentes.

**Architecture:** Ampliar o contrato `ProjectPlayActivity` e compartilhar sua avaliação. Acrescentar editor dedicado dentro de `LearningBuilder`, reutilizando importação validada, StudioEmbed e prévia. Informar participação pelo runtime isolado, nunca por um botão externo.

**Tech Stack:** TypeScript, React, Elysia, Bun, Studio, componentes UI existentes.

**Spec:** `docs/plans/2026-09-26-project-play-autoria-design.md`

## Global Constraints

- Não alterar a jogabilidade da criança nem acrescentar controles que o jogo não tenha.
- Não alterar o projeto inicial da criança; edição e cancelamento atuam numa cópia.
- Manter o Cadê Todo Mundo? exigindo seus três alvos e o vídeo.
- Não apagar projeto válido ao importar um arquivo inválido.
- Sem push nem deploy. Executar os testes dentro dos pacotes quando houver bunfig próprio.

### Task 1: Contrato, progresso e participação

**Files:** `packages/core/src/learning/index.ts`, `requirements.ts`, `packages/members/src/interfaces/http/learning.dtos.ts`, `packages/studio/src/preview/inputBridge.ts`, `packages/studio/src/components/preview/StudioProjectPlayer.tsx`, `packages/member-shell/src/components/learning-activity.tsx`, `project-play-activity.tsx` e respectivos testes.

**Interfaces:** `ProjectPlayActivity.completion?: 'participation' | 'targets'`; `projectPlayComplete(activity, answers): boolean`. Sem completion significa targets. Participação usa `answers.participated === true`; o iframe envia `sz:game-interaction` apenas por entrada real. `StudioProjectPlayer.onReady?: () => void` informa o carregamento do documento jogável, não do placeholder.

- [ ] Escrever e rodar testes vermelhos para participação sem alvos, preservação do comportamento antigo, projeção e DTO.

```ts
expect(evaluateLearning(participationBlock, {}).passed).toBe(false)
expect(evaluateLearning(participationBlock, { participated: true }).passed).toBe(true)
expect(evaluateLearning(targetBlock, { participated: true }).passed).toBe(false)
```

- [ ] Implementar validação dos dois critérios, permitir snapshot clássico sem game-2d no modo participação, manter limites de palco/alvos e proibir Pro. Manter mensagens antigas apenas para o formato legado.
- [ ] Implementar emissão de participação no bridge com `event.isTrusted`, origem explícita e deduplicação; ignorar Tab/Escape/modificadores, movimento de ponteiro e cliques de restauração. O host exige a janela exata do iframe.
- [ ] Reusar a avaliação no autoenvio da atividade e na preservação da conclusão ao reiniciar. Exibir proporção configurada do palco.
- [ ] Rodar testes core, contratos HTTP, bridge e player. Revisar antes da autoria.

### Task 2: Autoria manual

**Files:** criar `packages/admin/src/components/editor/project-play-editor.tsx` e `packages/admin/src/lib/project-play-authoring.ts`; alterar `learning-builder.tsx`, `scene-authoring-rules.ts`; testes em `packages/admin/tests`.

**Interfaces:** `ProjectPlayEditor({value, onChange})` consome `ProjectPlayActivity`. `readProjectPlayFile(text): Promise<Project>` valida JSON/projeto exportado, migração suportada, limite e rejeição de Pro antes de retornar. `MemoriaDaAutoria.projectPlay?: ProjectPlayActivity` conserva o jogo entre tipos; a pergunta anexa fica guardada mas não é carregada para o jogo.

```ts
const novo: ProjectPlayActivity = {
  type: 'project-play', project: {}, stage: { width: 800, height: 480 },
  targets: [], completion: 'participation',
}
```

- [ ] Escrever teste que seleciona Jogo pronto para jogar, carrega projeto e muda critério; confirmar falha antes da UI.
- [ ] Adicionar terceira opção, retirar aviso manifesto-only e liberar a troca preservando memória. Não sobrescrever texto autoral; substituir apenas o texto de fábrica ao criar jogo novo.
- [ ] Criar formulário com upload rotulado, projeto selecionado, criar/editar no Estúdio, largura/altura, critério e lista de alvos editável (ID, nome, X, Y, largura, altura). Exibir limites e avisos de campos incompatíveis.
- [ ] Carregar StudioEmbed dinamicamente ao editar; manter edição local, aplicar `handle.getProject()` e validar antes de gravar no bloco; cancelar descarta só essa edição. Não montar o Estúdio em cada render do formulário.
- [ ] Rodar testes com componentes reais do formulário e testes puros da importação. Manter prévia existente capaz de ensaiar ambos os critérios.

### Task 3: Revisão e documentação

**Files:** `docs/aulas-interativas/ESPEC-MANIFESTO.md`, `BRIEFING.md`, este plano e relatório de revisão.

- [ ] Documentar os dois critérios e a paridade manual/manifesto, sem instruir dependência exclusiva do manifesto.
- [ ] Conferir no navegador criação manual, arquivo inválido sem perda, preview, entrada real e reinício; conferir também modo estreito.
- [ ] Rodar typechecks core/members/member-shell/studio/admin/kids, testes focados e suítes core/member-shell; validar os 34 manifestos.
- [ ] Revisar o diff, verificar Biome e git diff --check. Registrar evidências e limitações e fazer commit local do escopo.
