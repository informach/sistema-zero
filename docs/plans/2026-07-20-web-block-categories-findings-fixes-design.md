# Correções das categorias HTML, CSS, SVG e Canvas

## Objetivo

Corrigir os quatro achados da revisão das categorias web do Studio sem quebrar projetos Blockly salvos nem reduzir a fidelidade da Ponte código ↔ blocos.

## Desenho

### Responsividade da paleta

Os blocos que excedem a largura de 375 px manterão seus tipos, nomes de campos, entradas e semântica. A correção reorganizará as mensagens Blockly em linhas menores. Assim, estados serializados e codecs continuam compatíveis enquanto os campos permanecem legíveis e arrastáveis no celular.

O teste E2E percorrerá todas as 25 subcategorias de HTML, CSS, SVG e Canvas. Cada flyout deverá caber na viewport e cada bloco deverá caber no flyout.

### Acessibilidade de SVG

O diagnóstico semântico tratará a raiz `<svg>` como conteúdo visual que precisa de nome acessível. Um SVG será aceito quando tiver `aria-label`, `aria-labelledby` válido ou um filho `<title>` com texto. Elementos explicitamente decorativos com `aria-hidden="true"` ou `role="presentation"`/`role="none"` não gerarão aviso. Um `<title>` ausente ou vazio gerará aviso no bloco raiz.

### Imagens HTML

O bloco guiado de imagem ganhará campos opcionais de largura e altura e uma opção de carregamento (`automático`, `preguiçoso` ou `imediato`). O codec emitirá atributos apenas quando preenchidos ou explicitamente escolhidos. A conversão de IR para blocos preencherá os campos e continuará guardando atributos desconhecidos no `data` do bloco.

### Formulários HTML

Os blocos de `input` e `textarea` ganharão um campo opcional de `autocomplete`. O valor livre preservará tokens HTML existentes, inclusive combinações como `shipping street-address`, sem coerção por dropdown. Campos vazios não emitirão o atributo.

## Compatibilidade

- Tipos de bloco, nomes de campos antigos e entradas existentes permanecem iguais.
- Workspaces antigos usarão os novos valores padrão sem migração.
- Código importado continuará preservando atributos não modelados.
- Os novos atributos participarão do round-trip IR → blocos → IR e da geração HTML.

## Testes

- Teste unitário para SVG sem nome, título vazio, título válido, `aria-label`, `aria-labelledby` e SVG decorativo.
- Testes de codec para os atributos de imagem e formulário, inclusive ausência dos opcionais.
- E2E responsivo cobrindo todas as subcategorias e apontando o bloco mais largo em caso de regressão.
- Gates finais: testes direcionados, `bun test src`, typecheck, check, build e E2E relevante.
