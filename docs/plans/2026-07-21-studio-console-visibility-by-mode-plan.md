# Plano de implementação: visibilidade do Console por modo

**Design:** `docs/plans/2026-07-21-studio-console-visibility-by-mode-design.md`

## Objetivo técnico

Substituir o booleano global de visibilidade do Console por uma preferência
manual opcional, resolvida contra o modo atual. Manter a captura de logs
independente da montagem do painel.

## 1. Modelar a preferência de sessão

**Arquivos:**

- modificar `packages/studio/src/state/uiStore.ts`;
- criar `packages/studio/src/state/uiStore.test.ts`.

Primeiro, escrever testes para um resolvedor puro de visibilidade:

- preferência ausente + `blocks` resulta em oculto;
- preferência ausente + `bridge` resulta em oculto;
- preferência ausente + `code` resulta em visível;
- `true` e `false` manuais prevalecem em qualquer modo;
- uma nova `createUIStore()` começa sem preferência manual.

Depois, trocar `showConsole` por uma preferência `boolean | null` com nomes que
explicitem o contrato, por exemplo `consoleVisibilityOverride` e
`setConsoleVisibilityOverride`. Exportar um único resolvedor para evitar regras
duplicadas nos consumidores.

## 2. Aplicar a visibilidade efetiva aos painéis

**Arquivos:**

- modificar `packages/studio/src/components/layout/bottomTabs.tsx`;
- modificar `packages/studio/src/components/layout/BottomPanel.test.tsx`;
- modificar `packages/studio/src/components/layout/NarrowPanels.test.tsx`.

Atualizar `useVisibleBottomTabs` para combinar:

1. a capacidade `config.console` definida pelo host;
2. o modo do projeto;
3. a preferência manual da sessão.

Escrever os testes antes da alteração. Cobrir os padrões dos três modos, a
remoção da aba em Blocos/Ponte, a presença em Código e as duas escolhas manuais.
Nos testes antigos que precisam do Console visível, definir a preferência manual
explicitamente para preservar a intenção original do caso.

Não montar `ConsolePanel` quando a aba estiver oculta. O `logsStore` continuará
montado no conjunto de stores da instância e receberá mensagens normalmente.

## 3. Atualizar o controle nos três pontos

**Arquivo:**

- modificar `packages/studio/src/components/layout/Topbar.tsx`.

Usar o mesmo resolvedor para o estado ativo do item Console. Ao selecionar o
item, gravar o oposto da visibilidade efetiva como preferência manual. Não
recalcular nem limpar essa preferência ao trocar de modo ou projeto.

Manter `features.console: false` como bloqueio absoluto: sem item no menu e sem
painel.

## 4. Provar o ciclo da sessão e a captura oculta

**Arquivos:**

- modificar ou ampliar `packages/studio/src/components/layout/BottomPanel.test.tsx`;
- modificar `packages/studio/src/state/logsStore.test.ts` somente se faltar uma
  prova direta da independência entre store e painel;
- modificar `packages/studio/e2e/smoke.spec.ts`.

Adicionar testes de integração para demonstrar que:

- uma escolha manual sobrevive à troca de projeto e de modo na mesma store;
- uma nova instância de store volta a `null` e ao padrão do modo;
- mensagens recebidas enquanto o painel está oculto aparecem após abri-lo;
- no fluxo E2E de Blocos, a aba Console começa ausente, aparece após
  **Mais opções → Console** e pode ser ocultada pelo mesmo caminho.

Se o smoke E2E já oferecer um caminho estável para abrir projetos em Ponte e
Código, cobrir também os padrões desses modos ali. Caso contrário, manter essa
matriz nos testes de componente e evitar criar infraestrutura E2E só para esta
mudança.

## 5. Atualizar contratos e documentação próxima

**Arquivos:**

- modificar comentários em `packages/studio/src/state/uiStore.ts` e
  `packages/studio/src/components/layout/bottomTabs.tsx`;
- ajustar testes ou comentários que ainda afirmem que o Console começa ligado em
  todos os modos.

Não alterar `features.console` nem a API pública do Studio: a feature continua
habilitada por padrão; somente a apresentação inicial passa a depender do modo.

## Verificação

Executar, nesta ordem:

1. testes focais de `uiStore`, `BottomPanel` e `NarrowPanels`;
2. teste focal de `logsStore`;
3. typecheck do pacote Studio;
4. lint/formato nos arquivos alterados;
5. smoke E2E do Studio;
6. suíte completa do Studio antes de declarar conclusão.
