# Correções do full review de Jogo 2D Avançado

## Escopo

Corrigir os achados do full review da extensão `game-2d-advanced` sem reduzir a quantidade de blocos ou categorias. As aulas continuam controlando a paleta com `allowBlocks` e `allowCategories`.

## Decisões

1. Manter o catálogo oficial e as APIs de extensão síncronos. A mudança evita uma quebra ampla em preview, exportação, captura de capa, Blockly e projetos persistidos.
2. Corrigir o lifecycle na origem. Todo registro criado pela fábrica do projeto deve ser removido antes de executá-la novamente; o kit de tower defense não pode acumular slots nem compradores.
3. Declarar `storage`, pois o runtime usa o shim de `localStorage` do preview.
4. Alinhar documentação e tooltips ao boot automático. Blocos legados ocultos não devem aparecer como instrução atual. Pular o menu deve usar uma configuração de lifecycle que sobreviva a `start()`.
5. Tornar cada aviso de conflito identificável pela extensão bloqueada, sem repetir uma mensagem ambígua.
6. Modularizar a autoria pesada sem mudar o contrato publicado. Extrair textos e domínios coesos para arquivos dedicados e compor o mesmo `ExtensionDefinition` síncrono.
7. Preservar todos os blocos, níveis e categorias existentes.

## Testes

- Adicionar regressão real do fluxo `runProject → restartGame → compra de torre`.
- Auditar permissões declaradas contra o uso de armazenamento.
- Impedir referências pedagógicas a blocos ocultos e fixar o fluxo oficial para pular o menu.
- Cobrir mensagens de conflito sem seletores ambíguos.
- Executar testes direcionados, suite completa, typecheck, Biome, build e E2E da extensão.

## Compatibilidade

Projetos salvos, IR, nomes de blocos, API global `SZGameKit`, exemplos e curadoria por aula permanecem compatíveis. O manifest recebe apenas o incremento de versão exigido pela mudança de comportamento e permissão.
