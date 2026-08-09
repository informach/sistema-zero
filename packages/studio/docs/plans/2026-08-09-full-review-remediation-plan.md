# Plano de implementação — remediação integral do Studio

## 1. Contratos vermelhos

- Alterar o teste do registry para exigir callbacks executáveis nas quatro direções e rejeitar registros incompletos.
- Adicionar E2E de contraste dos badges com os temas `light` e `dark` controlados por `data-sz-theme`.
- Adicionar um teste estático do contrato de tema que rejeite variantes `dark:` no código do Studio.
- Registrar as falhas atuais antes de modificar a implementação.

## 2. Fronteira neutra e adapters

- Extrair `SerializedBlocklyBlock` de `blockly/workspaceState.ts` para `codecs/types.ts` e atualizar importadores.
- Definir contextos tipados e resultados `handled`/`unhandled` para cada direção.
- Implementar os adapters por família em `codecs/programming` e indexá-los no registry.
- Fazer Blockly→IR e IR→Blockly consultarem o registry antes dos dispatchers residuais.
- Fazer IR→JavaScript e JavaScript→IR consultarem os adapters pela capacidade da família.
- Remover dos dispatchers centrais os ramos cujo proprietário passou a ser o registry.
- Rodar matrizes de round-trip e testes do registry após cada família.

## 3. Interface e segurança

- Substituir cores incidentais de badges por tokens semânticos resolvidos nos dois seletores de tema.
- Remover as variantes `dark:` restantes do Studio.
- Instalar Chromium e Firefox no CI e executar os dois specs críticos de preview nos dois engines.

## 4. Dependências, higiene e documentação

- Atualizar PostCSS e Nanoid no lockfile para versões corrigidas aceitas pelos consumidores e conferir a árvore com `bun pm why`.
- Remover os barrels mortos de `codecs/programming` e `codecs/web`.
- Atualizar `CLAUDE.md` para 149 exemplos.

## 5. Evidência final

- Rodar testes focados a cada correção.
- Rodar `bun run check`, `bun run typecheck`, `bun test src` e o build do playground.
- Rodar o audit de dependências e confirmar que os advisories de PostCSS/Nanoid não aparecem na árvore do Studio.
- Rodar toda a suíte Playwright configurada, incluindo Chromium e os cenários Firefox.
