# Canvas 3D — inicialização manual e contratos de nomes

Data: 22/07/2026

## Objetivo

Fechar os quatro achados do review da categoria Canvas 3D sem transformar a categoria em uma extensão ou em um motor pronto. A criança monta a cena com peças separadas e vê o Three.js correspondente na Ponte.

## Fluxo aprovado

A categoria Canvas continua responsável por criar o elemento `<canvas>`. No Canvas 3D, quatro facilitadores intermediários completam a inicialização:

1. criar a cena;
2. criar o renderizador ligado a uma tela Canvas já declarada;
3. criar a câmera;
4. criar uma luz e adicioná-la à cena.

Os blocos permanecem separados. Posição da câmera e da luz, direção da câmera, configuração do renderizador, desenho do quadro e responsividade continuam nos facilitadores existentes. Os construtores genéricos de Three.js permanecem no avançado 3D.

## Contratos e geração

Os quatro blocos usam IR semântica própria do Canvas 3D. O gerador expande cada instrução para Three.js real; o parser e o `workspaceState` recompõem os mesmos blocos. O renderizador recebe o `HTMLCanvasElement` escolhido pelo seletor de telas e produz um erro claro quando a tela não existe.

Os nomes de cena, renderizador, câmera e luz entram no registro central de variáveis. O campo da tela usa o `NameKind` `canvas`, portanto oferece somente telas criadas na categoria Canvas.

## Física leve

O contrato ganha dois símbolos declarados:

- `physics-body`: corpos dinâmicos ou personagens;
- `physics-resource`: corpos, paredes, esferas, objetos sólidos e áreas com ID explícito.

Mover, pular, definir velocidade, dar impulso, teleportar e ler estado escolhem um `physics-body`. Remover escolhe um `physics-resource`. Projetos antigos preservam strings serializadas, mas a interface deixa de oferecer digitação livre para novos consumidores.

## Posicionamento e segurança

`sz_t3d_new_var` passa a usar o contrato `resource-creator`, que o impede de entrar em laços. A validação da IR aplica a mesma regra a `newInstance` com namespace `THREE`, inclusive quando o código chega pela Ponte.

Os arrays `CANVAS3D_START_ONLY_BLOCK_TYPES` e `CANVAS3D_RESOURCE_CREATOR_BLOCK_TYPES` alimentam diretamente os testes de posicionamento. A documentação do arquivo de blocos passa a distinguir facilitadores genéricos de macros com IR semântica.

## Compatibilidade e testes

Os tipos e campos existentes continuam válidos. A correção adiciona testes que provam:

- o nível intermediário oferece o fluxo Canvas → cena → renderizador → câmera → luz;
- o renderizador só aceita uma tela Canvas declarada;
- consumidores físicos listam IDs compatíveis e não liberam texto livre;
- construtores Three.js são rejeitados dentro de laços na conexão e na IR;
- os contratos centrais, o catálogo, o parser, o gerador e o roundtrip cobrem os quatro blocos novos;
- os exemplos Canvas 3D continuam renderizando no Chromium.
