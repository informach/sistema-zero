# Implementação da revisão do funil da Comunidade

**Objetivo:** aplicar a sequência de leitura aprovada à oferta, ao pré-checkout, ao checkout e à confirmação, com imagens provisórias autorizadas pelo responsável.

**Arquitetura:** preservar rotas, precificação dinâmica, seleção de oferta, integração de pagamento e estados de aprovação. Refazer o body Astro da oferta com dez seções, estilos escopados e identidade visual kids. Ajustar apenas os textos específicos da Comunidade nas etapas compartilhadas.

**Referências:** [copy](2026-09-30-comunidade-copy-leitura-revisada.md), [análise](2026-09-30-comunidade-copy-v2-revisao-e-melhorias.md), [materiais](2026-09-30-comunidade-materiais-para-pagina.md).

## Restrições

- Sem revisão obrigatória de atividades, prazo de resposta ou resultado pedagógico em prazo universal.
- Preservar os três depoimentos reais; não atribuir cenas ilustrativas aos alunos.
- Explicar condições de liberação; não inventar catálogo de cursos publicados.
- Preços e economia calculados a partir dos planos recebidos pela rota.
- Variante de origem Desafio não presume que a criança concluiu ou publicou.
- Ilustrações geradas devem ser identificadas e ter caminhos estáveis para substituição.
- Nenhum processamento de pagamento deve ser alterado.

## Execução

- [x] Oferta: substituir `ComunidadeOfertaBody.astro`, preservando Props, `byInterval`, metadados, Footer e `PreCheckoutModal`. CTA principal `#planos`, demonstração `#aula`, planos com `data-checkout-oferta`.
- [x] Visuais: gerar três imagens de apoio e armazenar em `packages/funnel/public/img/comunidade-dos-criadores/`; integrar com legendas, dimensões e carregamento diferido fora da hero. Registrar prompts e substituições no briefing.
- [x] Percurso: atualizar `content.ts`, `index.ts`, textos condicionais em `PreCheckoutModal.tsx`, `checkout.astro` e `obrigado.astro`. Preservar confirmação condicionada a pagamento aprovado e acesso existente.
- [x] Guardas: atualizar testes editoriais obsoletos que exigem as promessas rejeitadas; manter verificações de preços, seleção de plano, estados e ausência de promessas indevidas.
- [x] Verificação: executar `bun test`, `bun run typecheck`, `bun run check` e `bun run build` no funil. Inspecionar oferta normal e variante em desktop/celular, âncoras, abertura dos planos e checkout/obrigado sem efetuar compras.

O usuário autorizou implementação nesta sessão. Commit, push e deploy não fazem parte desta etapa.

## Verificação e limites

- 320 testes do funil passaram. Typecheck: 177 arquivos, nenhum erro, aviso ou hint. Biome e build passaram.
- Oferta normal e variante Desafio renderizadas; checkout e obrigado pendente retornaram HTTP 200. Inspeção em 1440 px e 390 px, sem rolagem horizontal nas páginas verificadas. Imagens carregadas e modal do plano anual aberto.
- O ambiente local está sem banco e gateway ativos. A criação de lead retorna 500 e os preços usam o fallback de exibição já existente. Não houve teste manual de cobrança ou de confirmação aprovada. Os testes automatizados de checkout e confirmação passaram.
- Ilustrações provisórias estão identificadas. Capturas de uso real e confirmação do catálogo publicado continuam como itens de produção antes da publicação definitiva.
- Alterações em outros packages feitas por outra sessão foram preservadas. Nenhum commit, push ou deploy nesta etapa.
