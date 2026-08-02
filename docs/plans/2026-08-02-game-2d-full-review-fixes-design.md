# Design — correção integral do full review do Jogo 2D

**Data:** 2026-08-02  
**Escopo:** `packages/studio/src/official-extensions/game-2d`

## Objetivo

Resolver todos os achados do full review atual sem alterar a oferta pedagógica de blocos. O trabalho preserva projetos, exemplos e imports existentes, corrige quatro inconsistências de runtime e fortalece a manutenção da extensão.

## Abordagem escolhida

Aplicar correções pequenas nas camadas que possuem cada estado, protegidas por regressões comportamentais. Em paralelo, dividir os dois catálogos gigantes em um arquivo por exemplo e manter os módulos atuais como barrels de compatibilidade.

A usuária aprovou a divisão por exemplo. Uma divisão apenas por família manteria arquivos com milhares de linhas. Um gerador novo reduziria o código manual, mas acrescentaria uma etapa de build sem necessidade.

## Geometria do ponteiro

`pointerXY` usará o canvas de palco e converterá coordenadas pela caixa de conteúdo. O cálculo descontará `clientLeft` e `clientTop` e usará `clientWidth` e `clientHeight`, que excluem a borda. O fallback continuará aceitando canvases simples usados fora do palco.

Os testes cobrirão borda, escala lógica e DPR. Um clique no primeiro e no último pixel da área desenhável deverá resultar nos extremos lógicos do palco.

## Contexto de figuras

`drawCustomShape` tratará largura e altura como uma pilha léxica. Antes de executar a callback, salvará o par ativo; no `finally`, restaurará dimensões e contexto Canvas. Figuras aninhadas e callbacks que lançam erro não poderão vazar estado para a figura externa.

O teste desenhará uma figura interna dentro de outra e verificará `shapeW()` e `shapeH()` antes e depois do desenho aninhado.

## Reinício acessível

O domínio de acessibilidade limpará o identificador da última tela anunciada durante o restart. Também restaurará o texto da região viva para a descrição-base do palco. Assim, uma tela terminal idêntica em uma nova partida produzirá uma nova mutação e um novo anúncio.

O teste executará duas partidas consecutivas com a mesma mensagem de fim e observará o conteúdo real da região viva.

## Versão e documentação

O manifesto passará de `0.55.0` para `0.55.1`, pois o ajuste de inércia muda o comportamento público de `flyFree`. O guia interno, o relatório de auditoria e os comentários de versão acompanharão o manifesto.

A documentação distinguirá mudança de direção de velocidade máxima oposta: o sprite cruza zero em cerca de 0,18 s e atinge o teto oposto em cerca de 0,33 s, a 60 quadros por segundo e velocidade 3.

## Contrato do runtime

O contrato TypeScript continuará sendo a fonte dos nomes, parâmetros e ordem. Um teste estrutural lerá a AST de `runtimeContract.ts` e a AST do JavaScript injetado, resolverá os wrappers públicos e comparará cada função pública com a assinatura declarada. A verificação cobrirá presença, aridade e ordem dos parâmetros, além da checagem semântica existente.

Os harnesses novos usarão `Pick<GameTwoDRuntimeApi, ...>` em vez de interfaces locais com `unknown[]`. O teste estrutural falhará se uma implementação trocar parâmetros sem atualizar o contrato.

## Modularização dos exemplos

Cada export de `examples/clearcode.ts` e `examples/gamesTwoD.ts` migrará para um arquivo próprio:

- `examples/clearcode/<exemplo>.ts` para os dez exemplos Clear Code;
- `examples/gamesTwoD/<exemplo>.ts` para os sete exemplos Games 2D;
- `examples/clearcode/index.ts` e `examples/gamesTwoD/index.ts` como barrels internos;
- os dois arquivos antigos permanecerão como barrels públicos.

O conteúdo de cada `ExtensionExample` será movido sem transformação. Testes de igualdade estrutural, schema, round-trip e galeria protegerão a migração.

Os testes específicos de exemplos compartilharão um harness para registro do Blockly, carregamento do workspace, normalização de IDs e round-trip. Cada teste manterá somente as expectativas próprias do jogo.

## Compatibilidade e tratamento de erros

- Nenhum tipo de bloco, chave de API ou nome de export mudará.
- O runtime continuará autocontido e sem dependências de rede.
- Restauros de estado ficarão em `finally`, inclusive quando a callback da criança falhar.
- O cálculo do ponteiro terá fallback explícito quando métricas de layout não existirem no ambiente de teste.
- A modularização não criará geração de código nem arquivos derivados adicionais.

## Critérios de aceite

- Ponteiro e moldura coincidem em DPR 1, 2 e 3.
- Figuras aninhadas preservam as dimensões externas.
- A mesma tela terminal volta a ser anunciada após restart.
- Manifesto, guia e auditoria declaram `0.55.1`.
- A descrição temporal de `flyFree` diferencia inversão e teto oposto.
- Todas as chaves públicas têm assinatura estrutural compatível com `GameTwoDRuntimeApi`.
- Cada exemplo dos dois catálogos vive em arquivo próprio, sem mudar seus exports ou dados.
- Testes da extensão, curadoria, typecheck, Biome e Playwright permanecem aprovados.
