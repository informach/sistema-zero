# Implementação: alinhamento visual do funil da Comunidade Kids

## Lote 1: fundação visual

1. Extrair os tokens Pen para uma fonte canônica em `@sistemazero/ui`.
2. Fazer os aliases `--sz-kids-*`, a plataforma e `.theme-kids` consumirem essa fonte.
3. Aplicar a fundação às jornadas da Comunidade e do Desafio, sem escopo paralelo.
4. Criar um teste de contrato contra duplicação dos valores-base.

Verificação do lote: testes de registry/copy e typecheck das páginas alteradas.

## Lote 2: página de oferta

1. Substituir as paletas locais das duas ofertas por aliases dos tokens Pen.
2. Atualizar botões, cartões, seções, topbar, hero, planos, FAQ e barra móvel.
3. Preservar integralmente o HTML textual, a ordem dos blocos e os atributos de checkout.
4. Validar visualmente desktop e celular.

Verificação do lote: testes da oferta, busca de contratos de copy e screenshots locais.

## Lote 3: jornada de compra

1. Aplicar o sistema visual ao pré-checkout sob `.theme-kids`.
2. Aplicar o sistema visual ao checkout e ao alternador de planos.
3. Aplicar o sistema visual à página de obrigado.
4. Confirmar que Comunidade e Desafio compartilham a mesma identidade.

Verificação do lote: testes do checkout, typecheck e QA das três etapas.

## Lote 4: acabamento

1. Revisar responsividade, foco, contraste e redução de movimento.
2. Corrigir cortes, overflow e alvos de toque.
3. Rodar formatação apenas nos arquivos tocados quando necessário.
4. Fazer revisão visual completa desktop e celular.

Verificação final: `bun test`, `bun run typecheck`, `bun run check`, `bun run build`, QA manual e
conferência do diff de copy.
