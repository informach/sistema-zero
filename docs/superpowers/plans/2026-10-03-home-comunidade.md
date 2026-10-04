# Página inicial da Comunidade dos Criadores: implementação

> Execução na sessão atual com as skills writing-plans, executing-plans e frontend-design. A proposta editorial já foi aprovada pelo usuário; não há nova etapa de aprovação intermediária.

**Objetivo:** implementar a raiz como apresentação da Comunidade, usando os prints e a identidade das ofertas.

**Arquitetura:** página Astro SSR na rota existente, dados editoriais separados, componentes e CSS das ofertas reutilizados. CSS adicional com escopo `.cdc-home`. Destinos do registry e atribuição sanitizada na navegação. Sem alteração de oferta, pagamento ou área de alunos.

**Stack:** Astro 6, TypeScript, CSS com tokens canônicos kids, HTML nativo para expansão e diálogo.

**Spec:** `docs/marketing/kids/comunidade-dos-criadores/instagram/historico/copy-home-2026-10-03.md`.

## Restrições

- Preservar `/` e a identidade visual de `kids-oferta.css` e `comunidade-oferta.css`.
- Usar imagens existentes, reais e com texto correspondente. Não simular player ou experiência interativa.
- Explicar jogo → experiência → programação → teste → novas criações; suporte por mensagens e liberações pela Jornada.
- Não criar preço, oferta, analytics paralelo ou lead apenas pela visita à raiz.
- Executar `bun test`, `bun run typecheck`, `bun run check` e `bun run build` no pacote.

## Tarefa 1: navegação e origem

Arquivos: `packages/funnel/src/lib/lead-attribution.ts`, `packages/funnel/tests/unit/lead-attribution-links.test.ts`.

- [x] Acrescentar `funnelLinkWithAttribution(path, location)` usando `leadAttributionFromLocation` e `URLSearchParams`. Encaminhar somente UTMs aceitas, evento e cupom sanitizados, preservando query e fragmento do destino.
- [x] Testar preservação de origem, descarte de parâmetros livres/sensíveis e ausência de origem sem query artificial.

## Tarefa 2: página, prints e identidade

Arquivos: `packages/funnel/src/pages/index.astro`, `src/content/home-comunidade.ts`, `src/styles/comunidade-home.css`, `src/components/funnel/oferta/ComunidadeImageZoom.astro`, `src/funnels/comunidade-dos-criadores/oferta/visuals.ts`.

- [x] Montar abertura, sequência em cinco passos, continuidade com Mural/Clube/desafio, recursos expansíveis, rotina, fundadores, oferta/quiz, FAQ e Desafio.
- [x] Reutilizar `BaseLayout`, `Footer`, `ComunidadeVisual` e as receitas `.kof-*`; adicionar somente a composição específica da raiz.
- [x] Compartilhar o diálogo de ampliação com o body da oferta; manter fallback por link para a imagem e fechamento por Escape.
- [x] Omitir player: a demonstração usa prints, conforme pedido do usuário.
- [x] Preservar origem em todos os links comerciais; dados de identificação dos CTAs não significam coleta analítica automática.

## Tarefa 3: validação e registro

- [x] Conferir desktop e larguras 375/390 px, overflow, carregamento dos prints, CTA, expansão de recursos, FAQ, zoom, teclado e funcionamento sem JavaScript.
- [x] Rodar testes, typecheck, Biome e build, corrigindo problemas causados pela mudança.
- [x] Registrar arquivos, validações e limites em `docs/marketing/kids/comunidade-dos-criadores/instagram/historico/implementacao-home-2026-10-03.md`.
- [x] Entregar implementação local e evidências; publicação não faz parte desta autorização de implementação.
