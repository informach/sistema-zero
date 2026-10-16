# Página F: habilidades escolares

Implementada no código em 15/10/2026, conforme a [proposta revisada](../../../plans/2026-10-15-comunidade-habilidades-escolares-proposta.md) e a [copy aprovada](copy/historico/2026-10-16-antes-da-proposta/pagina-f-habilidades-escolares-proposta.md). Sem deploy nesta etapa.

Rota: `/kids/comunidade-dos-criadores/oferta/habilidades-escolares`.

## Conteúdo e composição

O hero mantém a headline “Criar jogos dá um uso concreto ao que seu filho aprende na escola”, a subheadline, os benefícios e os CTAs aprovados. A cena da tarefa escolar e a explicação da dificuldade começam no capítulo seguinte. A ordem inicial é hero → dor e explicação → tour → demonstração.

Sete seções próprias apresentam a relação entre criação e escola. As seis cartas tratam de leitura, matemática, investigação científica, resolução de problemas, arte/geometria e comunicação. Orientação, revisão de tentativas, busca de ajuda, organização e acompanhamento familiar aparecem nas demais seções.

Em ciências foi usada a alternativa revisada do experimento do jardim, com reação ao toque desligada e ligada. A disponibilidade de Corre, Dino! no catálogo não foi confirmada; o exemplo de salto ficou fora da copy implementada. O movimento de cinco e dez passos na seção de dor continua identificado como exemplo imaginado.

As nove respostas específicas se combinam às respostas operacionais compartilhadas: 45 perguntas, sem repetição. Fundadores, condições comerciais, planos e garantia continuam na fonte comum. Preços e seleção de plano usam o catálogo e o pré-checkout existentes.

## Arquivos e integração

- [Conteúdo da página](../../../../packages/funnel/src/funnels/comunidade-dos-criadores/oferta/habilidades-escolares.ts) e [FAQ](../../../../packages/funnel/src/funnels/comunidade-dos-criadores/oferta/habilidades-escolares-faq.ts).
- Registro em `oferta/index.ts` e `types.ts`, URL incluída no sitemap. Os quatro perfis do quiz continuam explicitamente separados das variantes editoriais.
- [Tour compartilhado](../../../../packages/funnel/src/components/funnel/oferta/ComunidadeTour.astro) extraído sem alteração visual. `tourAfterSection` posiciona o tour após `f01`; as cinco páginas anteriores mantêm sua ordem.
- `ComunidadeSection.astro` aplica os ícones por assunto também nas cartas, com o fallback anterior. Ícones e trechos de destaque estão em `arte.ts` e `destaques.ts`.
- Estilos, tipografia, imagens e componentes existentes foram reutilizados.

## Verificação

- `bun test`: 470 aprovados, zero falhas; um teste de integração PostgreSQL ignorado pela configuração existente.
- `bun run typecheck`: zero erros, zero warnings; dois hints preexistentes em arquivos não alterados.
- `bun run check`: aprovado, com quatro avisos preexistentes de especificidade em `comunidade-quiz.css`.
- `bun run build`: aprovado; servidor SSR e sitemap gerados.
- Revisão mecânica Light Copy aplicada ao texto efetivamente renderizado: nenhuma ocorrência.
- Navegador sobre o build: seis rotas de oferta responderam 200; rota inexistente respondeu 404. Ordem do tour conferida em todas as variantes.
- Larguras 320, 390, 768, 1024 e 1440 px: sem overflow horizontal; seis cartas em três colunas no desktop e uma nas larguras menores.
- 55 fontes de imagem responderam 200. Sem IDs duplicados ou âncoras internas quebradas.
- Modal abriu pelos botões mensal e anual; seleção no atributo de cada plano conferida. Fechamento por Escape e pelo botão, FAQ e ampliação de imagens conferidos.

O catálogo e o banco locais não estavam disponíveis. A validação visual usou um catálogo efêmero somente de leitura em loopback, com os dois planos, e interceptação local dos endpoints de leads/eventos. Nenhum contato ou pagamento foi enviado. O teste não representa uma compra ponta a ponta nem valida disponibilidade comercial em produção.

## Reproduzir a verificação de navegador

Em `packages/funnel`, com Node, dependências instaladas e Google Chrome disponível:

```powershell
bun run build
node --import tsx tests/browser/comunidade-oferta.ts
```

O script inicia o servidor gerado pelo build e um catálogo de teste em portas locais livres e encerra os dois ao terminar. Os valores da fixture diferem dos fallbacks editoriais para comprovar o uso dos preços retornados pelo catálogo. Leads, eventos, contato e destino do checkout são interceptados no navegador; nenhuma integração externa é acionada.

A verificação cobre as seis rotas, a ordem do tour, os destaques renderizados, as imagens, âncoras, cinco larguras, FAQ, zoom, foco do modal, retorno ao CTA e o plano/UTMs encaminhados ao checkout. As capturas são recriadas em `tmp/comunidade-oferta-review/`, fora do versionamento.

O [full review](../../../plans/2026-10-15-comunidade-habilidades-escolares-full-review.md) registra os achados e as correções posteriores à primeira implementação.
