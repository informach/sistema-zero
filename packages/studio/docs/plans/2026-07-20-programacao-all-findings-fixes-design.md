# Correção integral dos achados de Programação

Data: 2026-07-20  
Escopo: `packages/studio`, categoria Programação  
Estado: aprovado pelo usuário

## Objetivo

Fechar todos os achados do review round 2 sem alterar contratos salvos nem perder mudanças concorrentes. O resultado deve funcionar em celular e desktop, oferecer apenas símbolos válidos, remover pendências pequenas de acessibilidade e API, reduzir a concentração arquitetural da categoria e restaurar os gates do pacote.

## Princípios

- Cada bug nasce como teste vermelho e termina como regressão automatizada.
- A correção atua na causa: nenhum timeout arbitrário, cast para calar o compilador, regra de lint desativada ou teste que só espelha mocks.
- Projetos salvos mantêm os mesmos tipos de bloco e campos.
- A refatoração migra uma família completa por vez. Cada etapa preserva o pipeline Blockly → IR → JavaScript → parser → Blockly.
- Alterações concorrentes permanecem intactas. Mudanças mecânicas só alcançam arquivos necessários aos gates finais.

## 1. Toolbox compacta

O Blockly continuará com `horizontalLayout` em contêineres compactos. O painel marcará explicitamente esse modo no elemento de injeção. No CSS compacto, grupos de categoria serão visualmente achatados em uma única faixa sem quebra de linha. A faixa terá rolagem horizontal própria, alvos de toque de 40 px e não aumentará a altura da toolbox quando Programação for expandida.

O flyout ocupará a área restante do workspace. A hierarquia ARIA continuará no DOM; apenas o layout visual será achatado. Um E2E em 375 × 812 verificará três fatos: flyout dentro da viewport, primeiro bloco visível e interação real com esse bloco. O teste não usará espera fixa.

## 2. Símbolos de contexto do canvas

`FieldNamePicker` ganhará o kind `canvas-context`. Um provider próprio coletará contextos declarados por `sz_canvas_setup`, respeitando ordem e escopo. O provider também reconhecerá contextos lexicais introduzidos por corpos que recebem um pincel, como desenhos de figura, para não quebrar Canvas dentro de callbacks.

Todos os consumidores `CTX` passarão a usar esse kind. O campo deixará de aceitar texto livre, mas continuará preservando nomes legados ao desserializar. A validação da IR permanecerá como segunda barreira.

Testes cobrirão contexto preparado, variável comum, declaração posterior, escopo de função/callback e os dois blocos de dimensão presentes em Programação.

## 3. Acessibilidade e API interna

O input livre do picker receberá `name` estável e `autocomplete="off"`, mantendo `aria-label`, foco visível e `spellcheck=false`. Um teste abrirá o picker real e inspecionará o input.

`programmingBodyTiming` deixará de ser exportado porque só pertence ao módulo que o usa. A mudança não altera a API pública do package, definida por `src/index.ts`.

## 4. Decomposição arquitetural

A extração seguirá o padrão de registry já iniciado em `src/codecs/web`, sem acoplar Programação aos codecs de HTML/CSS/SVG/Canvas. O novo domínio `src/codecs/programming` terá contratos de capacidade e módulos por família:

- linguagem e controle;
- DOM e eventos;
- valores e matemática;
- funções;
- objetos e classes.

Cada família reunirá os adapters que possui para Blockly → IR, IR → Blockly, IR → JavaScript e JavaScript → IR. Os dispatchers centrais consultarão o registry antes de tratar domínios que ainda não migraram. A migração termina quando os 149 tipos visíveis e os 7 tipos de compatibilidade estiverem registrados e os ramos correspondentes tiverem saído dos arquivos centrais.

O registry falhará em desenvolvimento/testes quando um bloco público não declarar as capacidades exigidas. A matriz existente de 149 blocos continuará sendo a prova de comportamento. Testes do registry impedirão tipo duplicado, adapter ausente e divergência do catálogo.

O parser trocará o alias global `Node = any` pelos tipos do Babel e por guards estreitos nas fronteiras. A migração não usará casts amplos para reproduzir o `any` com outro nome.

## 5. Gates concorrentes

Depois das correções de Programação, os erros globais serão tratados pela causa:

- normalizar o contrato de timers de `projectRunContext` para o tipo de handle que o runtime realmente usa;
- formatar e organizar imports apenas nos arquivos já modificados que o Biome apontar;
- reexecutar o cenário de preview instável e alterar o teste somente se uma nova reprodução identificar uma corrida real.

## Verificação

A entrega exige:

1. testes vermelhos das duas reproduções antes das correções;
2. testes focados verdes depois de cada mudança;
3. matriz dos 149 blocos e matriz de símbolos;
4. E2E mobile e desktop no Chromium;
5. `bun run check`;
6. `bun run typecheck`;
7. `bun test src`;
8. build Vite do playground;
9. suíte E2E de Programação, preview, smoke, lifecycle e reabertura.

## Critério de conclusão

Todos os bugs do relatório ficam fechados, os artefatos de QA registram a evidência final, os 149 blocos mantêm round-trip e os gates acima terminam verdes no snapshot entregue.
