# Rive dos módulos maior e com posição segura — Implementation Plan

> Execução nesta sessão; proposta aprovada pelo usuário. Skills: brainstorming, writing-plans e verificação antes da conclusão.

**Goal:** Rive com largura de 250 px no desktop e aproximadamente 130–160 px no celular, preservando proporção e acesso às aulas.

**Architecture:** CourseTrail continua renderizando o conteúdo no servidor. Uma pequena ilha mede a área disponível e os limites dos nós, títulos e balões; uma função pura encontra uma posição lateral sem colisões. Se não houver espaço, reserva altura na própria unidade, somente quando a arte carregar. ResizeObserver acompanha alterações de largura e texto.

**Tech Stack:** React, TypeScript, CSS, Rive existente, Bun e Playwright.

**Spec:** proposta aprovada nesta conversa: ampliar a animação e adaptar o posicionamento às dimensões reais. Proporção atual 9:8 e Fit.Contain preservados; arquivos .riv, acesso, progresso e recompensas permanecem com seus contratos atuais.

## Escopo e verificações

- [x] Substituir a escolha por soma de offsets em `trail-layout.ts` por colocação que considera retângulos e uma margem. Testar unidades curtas, baú, balão e larguras restritas.
- [x] Criar `trail-unit-body.tsx`, integrar no `course-trail.tsx` e identificar os obstáculos do baú. Notificar carga/falha do Rive para não reservar espaço para uma animação ausente.
- [x] Atualizar somente as regras da arte em `globals.css`: 250 px no desktop; no mobile, 45% da coluna limitados a 130–160 px, respeitando a largura da coluna.
- [x] Conferir no navegador com componentes reais: módulos de uma e várias aulas, arte carregada/falha, resize e legendas longas. Rodar testes, tipos, Biome e build de Community Kids.
- [x] Atualizar a documentação do componente e registrar evidências.

Alterações preexistentes em vídeo flutuante, palco e teclas de rolagem pertencem a outro trabalho e serão preservadas. Nenhuma publicação ou operação Git está incluída nesta implementação.

## Evidências — 03/10/2026

- `bun test tests`: 1173 passaram, nenhuma falha (139 arquivos).
- `bun run typecheck`: passou; a compilação final também verificou os tipos do novo ensaio.
- `bun run check`: 613 arquivos, sem erros.
- `bun run build`: passou, incluindo compilação, TypeScript e páginas estáticas.
- Chromium: 7 testes passaram. Larguras 320/390/430/768/1440 px, sem colisões nem rolagem horizontal; resize, falha/recuperação, movimento reduzido e economia de dados.
- [Desktop](../../qa/rive-trilha-2026-10-03/desktop.png) e [mobile](../../qa/rive-trilha-2026-10-03/mobile.png): componentes reais com módulos locais de 1, 2 e 5 aulas, títulos longos e o Rive local do Zappy. Os arquivos enviados dos módulos não foram substituídos.

Comando habitual do ensaio, em `packages/community-kids`: `bun x playwright test --config playwright.scenes.config.ts e2e-scenes/trail-rive.spec.ts`.
Nesta sessão, o encerramento automático do servidor pelo Playwright ficou pendente no Windows restrito. A rodada final iniciou o mesmo `e2e-scenes/fixtures/serve.ts` separadamente (porta 5204), executou os mesmos testes com configuração temporária sem `webServer` e terminou com código 0. O servidor temporário foi encerrado ao concluir a verificação.

## Revisão solicitada após a implementação

[Relatório da revisão](../../qa/rive-trilha-2026-10-03/review.md): dois achados corrigidos
(prontidão ao retornar à mesma URL e overflow de arte invisível). Suíte completa,
tipos, lint e build passaram novamente; o ensaio Chromium passou de 7 para 12 testes.
