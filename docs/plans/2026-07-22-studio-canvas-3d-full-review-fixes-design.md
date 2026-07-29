# Canvas 3D — correções residuais do full review

Data: 22/07/2026

## Escopo aprovado

Corrigir os dez achados do full review sem transformar Canvas 3D em extensão ou motor pronto. A categoria Canvas cria o elemento `<canvas>`; Canvas 3D continua oferecendo cena, renderizador, câmera e iluminação em blocos separados.

## Alternativas avaliadas

1. Corrigir cada arquivo isoladamente. É a menor mudança, mas mantém contratos duplicados entre Blockly, IR, gerador e parser.
2. Centralizar os metadados Canvas 3D e fazer cada camada consumi-los. Esta é a opção adotada porque corrige a causa dos desvios e preserva os tipos serializados.
3. Reescrever a IR e os geradores em torno de um novo registro. A mudança reduziria switches, mas ampliaria demais o risco para projetos salvos.

## Contratos

O contrato Canvas 3D passa a declarar:

- blocos intermediários, criadores de recursos e comandos contínuos;
- tipos semânticos que ativam o reconhecimento Three.js na volta IR → Blockly;
- declarações e referências por papel: tela, cena, renderizador, câmera, luz, compositor, objeto, carregador e mundo físico;
- classes Three.js que materializam cada papel no caminho avançado;
- addons disponíveis no preview e addons preservados apenas para compatibilidade.

A validação da IR usa os mesmos papéis dos seletores. Uma referência precisa existir antes do uso e pertencer ao papel esperado. Os IDs de tela vêm da área HTML, não do conjunto de variáveis JavaScript.

## Progressão e ciclo de vida

O fluxo padrão usa `tela` em Canvas, renderizador e câmera. Carregar modelo e carregar som saem do intermediário porque dependem de import e construção técnica de loaders. O bloco de montar o `domElement` também fica avançado: o renderizador intermediário já usa a tela da categoria Canvas.

Água, grama e passo da física usam o contrato `loop-command`. Blockly e schema aceitam esses comandos em loops e em funções ou métodos compatíveis; rejeitam o uso direto em Ao iniciar e em eventos.

## Ponte e preview

O arquivo real continua contendo metadados e o kernel necessários ao round-trip e à exportação. A Ponte oculta essas faixas por padrão e oferece uma ação explícita para mostrá-las. O código Three.js produzido pelos blocos permanece visível e editável.

Os seletores deixam de oferecer DRACO, KTX2 e Pointer Lock como opções normais do Studio. Os mapas continuam reconhecendo esses nomes para abrir projetos antigos sem perda.

## Prioridade desktop e manutenção

Canvas 3D deixa de impor orçamento de largura mobile aos blocos. Os E2E passam a priorizar o fluxo funcional com valores padrão no desktop. A responsividade geral do Studio permanece intacta.

O trabalho também remove o export morto da física, extrai o catálogo de addons e centraliza a versão/URLs do Three.js usadas pelo núcleo e pelas extensões 3D.

## Verificação

Cada falha funcional recebe uma regressão que falha antes da correção. A entrega exige testes Canvas 3D, contratos centrais, parser/round-trip, E2E Chromium, typecheck e Biome. Falhas de arquivos paralelos devem ser relatadas separadamente.
