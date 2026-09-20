# Trilha ilustrada do Desafio — plano de implementação

**Objetivo:** centralizar a trilha do curso em uma coluna compacta, reduzir a largura do cabeçalho e mostrar uma cena SVG animada para cada um dos três módulos do Desafio do Primeiro Jogo.

**Arquitetura:** manter a faixa de fundo da página, limitar `CourseTrail` a 40 rem e o cabeçalho a 52,5 rem (capa de 22,5 rem, intervalo de 2 rem e texto de até 28 rem). Usar três SVGs locais, com animação interna e alternativa estática para movimento reduzido. O Admin escolhe uma chave de ilustração por módulo, persistida em `members.modules`; a página Kids resolve essa chave no catálogo de artes.

**Escopo deste piloto:** as três artes do Desafio do Primeiro Jogo. O Admin já pode escolher uma delas em cada módulo Kids; novos cursos e artes podem ser acrescentados ao catálogo depois.

## Tarefa 1 — Artes SVG

**Criar:** `packages/community-kids/public/trilha/desafio-nave.svg`, `desafio-asteroides.svg`, `desafio-conquista.svg`.

- [x] Desenhar cenas legíveis em 180 × 160: nave ganhando movimento; tiros e asteroides; jogo completo e medalha.
- [x] Animar apenas partes pequenas com CSS embutido e congelar a cena em `prefers-reduced-motion: reduce`.
- [x] Renderizar as três artes em PNG para inspeção visual; manter apenas os SVGs como produto.

## Tarefa 2 — Composição da trilha

**Modificar:** `packages/community-kids/src/components/kids/course-trail.tsx`, `packages/community-kids/src/app/globals.css`, `packages/community-kids/src/app/(app)/cursos/[slug]/page.tsx`.

- [x] Limitar a largura da trilha a 40 rem no desktop, preservando o preenchimento horizontal do `KidsBand` no celular.
- [x] Limitar o cabeçalho a 52,5 rem e colocar descrição e barra de progresso na mesma coluna de até 28 rem.
- [x] Mostrar uma cena decorativa por módulo do Desafio no espaço lateral oposto ao primeiro nó. Usar `alt=""`, `aria-hidden` e `pointer-events: none`.
- [x] Não mostrar ilustrações em módulos sem escolha no Admin, independentemente do título.

## Tarefa 3 — Configuração no Admin

**Modificar:** contrato e persistência de módulos em `packages/members`, formulário em `packages/admin`, tipo compartilhado em `packages/member-shell` e catálogo em `packages/core`.

- [x] Adicionar campo opcional por módulo, com migração que mantém os existentes sem arte.
- [x] Mostrar no Admin as três escolhas e a opção de remover; preservar escolhas em PATCH de Admin antigo.
- [x] Expor a escolha no detalhe do aluno e renderizar a arte pelo módulo, sem depender do título ou da posição da aula.

## Tarefa 4 — Verificação

**Modificar:** `packages/community-kids/tests/course-trail.test.tsx` e testes de integração de `packages/members`.

- [x] Testar escolha por módulo, renomeação, remoção, valor inválido, detalhe do aluno, módulo vazio e módulo sem arte.
- [x] Rodar teste focado, suíte do pacote, checagem de tipos, validador de SVG, `bun run ci` e build. A inspeção visual dos SVGs em 180 e 92 px está feita; a página em navegador depende de navegador disponível.
- [x] Revisar o diff e preparar somente os arquivos desta tarefa para o commit no branch `staging`.
