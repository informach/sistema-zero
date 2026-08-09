# Remediação integral do full review do Studio

Data: 2026-08-09  
Escopo: `packages/studio`  
Estado: aprovado pelo usuário

## Objetivo

Corrigir todos os achados do full review sem alterar o comportamento público do Studio nem os projetos salvos. A entrega cobre arquitetura dos codecs de Programação, contraste nos dois temas, segurança do preview no CI, dependências vulneráveis, código morto e documentação.

## Arquitetura dos codecs de Programação

Os 158 tipos de Programação (151 públicos e 7 legados) deixam de ser apenas itens de inventário. Cada registro passa a possuir adapters reais para as quatro direções do pipeline: Blockly → IR, IR → Blockly, IR → JavaScript e JavaScript → IR.

A migração é vertical e preserva o comportamento família por família:

1. linguagem e controle;
2. DOM e eventos;
3. valores e matemática;
4. funções;
5. objetos e classes.

Os adapters recebem contextos tipados e independentes dos dispatchers centrais. Os dispatchers consultam o registry e mantêm somente os domínios que ainda não pertencem a Programação. Um tipo serializado neutro de Blockly fica no domínio compartilhado de codecs para eliminar a dependência invertida dos codecs Web em `workspaceState.ts`.

O registry rejeita tipos duplicados, definições incompatíveis e capacidades ausentes. Testes de contrato garantem que todo tipo público ou de compatibilidade possui adapters executáveis e continua coberto pela matriz ponta a ponta.

## Tema e acessibilidade

Badges usam tokens semânticos próprios, resolvidos pelos seletores `[data-sz-theme='light']` e `[data-sz-theme='dark']`. O Studio não usa a variante Tailwind `dark:`, pois o tema é controlado por atributo. Testes calculam o contraste final renderizado nos dois temas e protegem o contrato contra a reintrodução dessa variante.

## Segurança e dependências

O CI instala Chromium e Firefox e executa explicitamente os cenários de CSP/SRI e execução isolada de código do preview nos dois navegadores, além da galeria 2D já coberta.

O lockfile recebe versões corrigidas de PostCSS e Nanoid dentro dos intervalos aceitos pelos consumidores. A árvore resultante e o audit constituem a evidência da correção.

## Higiene do pacote

Barrels sem consumidores e sem subpath público são removidos. A documentação corrente passa a refletir o contrato automatizado de 149 exemplos; registros históricos permanecem inalterados.

## Verificação

A entrega exige testes de regressão focados, formatação, análise estática, TypeScript, todos os testes de `src`, build do playground, auditoria da árvore de dependências e a suíte E2E completa em Chromium e Firefox onde configurado. A alteração preexistente em `src/blockly/blocks/svg.ts` é preservada e validada junto com o restante.
