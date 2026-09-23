# Layout adaptativo das experiências — implementação

**Goal:** reorganizar a experiência ao ganhar largura na aula, sem exigir ampliação ou perder estado.

**Architecture:** container query CSS no workspace existente; console com as mesmas regiões visual/ação no modo inline e ampliado. Uma árvore React, sem novo controlador ou observador de largura em JavaScript.

**Tech Stack:** CSS, React, react-resizable-panels 2.1.9, Playwright, Bun.

**Spec:** [design aprovado](../../plans/2026-09-23-experiencias-layout-adaptativo-design.md).

**Restrições:** preservar modo ampliado, a11y e estado; não alterar regras de avaliação, manifesto, narração, banco ou padrão/persistência da divisória. Aproveitar tokens e aparência existentes.

## 1. Testes de comportamento

- [x] Em `packages/community-kids/e2e-scenes/fixtures/client.tsx`, acrescentar um modo com PanelGroup/PanelResizeHandle reais e os pisos de `resolveLessonSplit`.
- [x] Em `packages/community-kids/e2e-scenes/scene-workspace.spec.ts`, testar estreito → largo → estreito por arrasto/teclado, seleção/progresso preservados, cena visível ao executar, expansão cobrindo a janela e palpite responsivo.
- [x] Rodar `bun run --filter @sistemazero/community-kids e2e:scenes`; confirmar falha da expectativa de duas colunas inline antes da implementação.

## 2. Layout compartilhado

- [x] Em `packages/member-shell/src/styles/scene.css`, definir `container: scene-workspace / inline-size` na seção do workspace.
- [x] Usar `@container scene-workspace (min-width: 52rem)` com altura mínima de janela de 34rem. Compartilhar grid, divisória e rolagem das regiões entre inline/ampliado.
- [x] Limitar altura inline pela janela; preservar o preenchimento da área útil ampliada e o ajuste pela proporção real dos palcos.
- [x] Reexecutar a suíte e inspecionar capturas. Ajustar medidas somente com evidência de legibilidade ou acesso insuficiente.

## 3. Contrato, revisão e entrega

- [x] Atualizar `docs/aulas-interativas/BRIEFING.md` e `packages/member-shell/CLAUDE.md` para distinguir adaptação automática e ampliação opcional.
- [x] Rodar testes de member-shell, Kids e Community, typecheck dos três hosts e member-shell, Biome e `git diff --check`.
- [x] Revisar o diff inteiro: estado, acessibilidade, containment/posição fixa, palpite, CSS nos três hosts, regressões em telas estreitas/baixas.
- [ ] Registrar evidências, commitar e integrar staging. Push/deploy apenas em staging conforme autorização vigente; verificar revisão implantada e saúde dos hosts.

## Revisão do plano

Escopo limitado ao layout e sua cobertura. Não há migração nem alteração de conteúdo. O risco principal é a interação entre contenção CSS, altura flexível e ampliação fixa; os testes de geometria e preservação de estado cobrem esse contrato.

## Evidências locais e revisão integral

- O teste do arrasto falhou antes do CSS: painel largo continuava empilhado. Depois passou, incluindo ida/volta por teclado, palpite, contadores e descobertas.
- 18 testes passaram em cada motor: Chromium, Firefox e WebKit (54 execuções). Player e CSS reais, com uma área representativa do vídeo e a biblioteca real da divisória; não são testes de autenticação ou reprodução do Vimeo.
- Capturas conferidas em painel largo inline, próximo do limiar e modo ampliado. Pisos de largura, quebra dos chips e altura do palco preservados; fontes de 32px voltam ao empilhamento sem cortar controles.
- A revisão unificou a condição de colunas e altura ampliada. Dois limiares independentes poderiam restringir a altura quando a fonte maior exige empilhamento.
- WebKit revelou uma falha de foco do modo ampliado: clique não foca o botão, então o modal guardava outro alvo. Reproduzida em teste mínimo; o gatilho agora recebe foco ao ser ativado, antes da abertura, sem timers nem mudanças no hook compartilhado.
- O WebKit também informou interseções truncadas: SVG de 594,578125 × 318,515625px com interseção de 594 × 318px. O teste aceita menos de 1px por borda, não uma porcentagem arbitrária de recorte.
- Member-shell: 924 testes; Kids: 1076; Community: 5. Todos passaram. Typecheck de member-shell, Kids, Community e Admin passou.
- Biome global: sem erros, com 11 avisos e 89 informações preexistentes. Arquivos de código alterados: sem diagnósticos. `git diff --check` passou.
- Nenhuma alteração em manifesto, avaliação, narração, API, banco ou persistência da divisória. Não é necessário reimportar a aula.

## Instalação limpa do CI

A primeira execução remota (`35918075076`) passou lint, testes e bancos, mas recusou o typecheck
do Kids: a fixture importava `react-resizable-panels` sem declará-lo naquele pacote. A instalação
local tinha um vínculo disponível e não reproduziu a ausência. A biblioteca agora é uma
`devDependency` explícita do Kids, na mesma versão 2.1.9 já usada pelo member-shell; o lockfile
muda apenas essa declaração, sem atualizar bibliotecas. A validação remota precisa ser repetida.
