# Implementação da oferta de habilidades escolares

**Goal:** publicar no código do funil a variante editorial `/kids/comunidade-dos-criadores/oferta/habilidades-escolares` aprovada pelo usuário.

**Architecture:** conteúdo tipado no registro de ofertas existente, renderização Astro compartilhada, tour com posição configurável por página. Preservar os quatro perfis do quiz e a contratação atual.

**Tech Stack:** Astro, TypeScript, Bun, componentes e estilos existentes do funil.

**Spec:** [proposta revisada](../../plans/2026-10-15-comunidade-habilidades-escolares-proposta.md) e [copy aprovada](../../marketing/kids/comunidade-dos-criadores/copy/historico/2026-10-16-antes-da-proposta/pagina-f-habilidades-escolares-proposta.md).

**Global Constraints:** hero aprovado; dor imediatamente abaixo; mesmas condições comerciais e preços do catálogo; somente capturas reais; nenhuma promessa de notas; alterações restritas ao funil e documentação desta página. Usar a alternativa de ciências baseada no experimento do jardim, cuja demonstração existe, sem depender da publicação de Corre, Dino!.

## Tarefa 1: registro e conteúdo

- [x] Criar `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/habilidades-escolares.ts` e FAQ específico, reutilizando `FAQ` e `FAQ_VISUALS`.
- [x] Acrescentar a variante em `types.ts`, `index.ts` e no sitemap; tornar explícitos os quatro perfis aceitos pelo quiz.
- [x] Preservar hero, seções, CTAs e condições da proposta, usando a alternativa aprovada de ciências.

## Tarefa 2: composição visual

- [x] Extrair o tour de `ComunidadeOfertaBody.astro` para `ComunidadeTour.astro`, sem mudar sua aparência; inserir depois de `f01` somente nesta variante.
- [x] Permitir ícones semânticos no arranjo de cartas de `ComunidadeSection.astro` e cadastrar os assuntos em `arte.ts`.
- [x] Usar destaques literais e imagens associadas ao texto, sem repetir demonstrações no corpo.

## Tarefa 3: verificação e registro

- [x] Cobrir registro, isolamento dos perfis e integridade de âncoras/FAQ/tour nos testes da oferta.
- [x] Executar `bun test`, `bun run typecheck`, `bun run check` e `bun run build` em `packages/funnel`.
- [x] Abrir a rota no navegador em desktop e celular; conferir ordem, overflow, imagens, âncoras, zoom e abertura dos dois planos sem enviar dados.
- [x] Revisar o diff e registrar a implementação e as verificações na documentação.

Revisão do plano: não há novo produto, endpoint ou dependência; nenhum passo exige alterar pagamento. O posicionamento do tour é o único ajuste de composição compartilhada, com padrão preservado nas cinco páginas anteriores.
