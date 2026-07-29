# Correções do follow-up da categoria Programação

Data: 2026-07-20  
Escopo: semântica lexical/temporal da IR, contrato de corpos filhos, busca da toolbox,
movimento reduzido e documentação do review.

## Contexto

O full review pós-correções encontrou quatro reproduções semânticas:

- `event` e `ctx` eram aceitos como variáveis globais;
- uma função ou método assíncrono não reconhecia declarações que estarão disponíveis depois de
  `await`;
- `onClickAssign`, `imageOnLoad` e `imageOnError` eram tratados como corpos imediatos;
- enumeração de corpos, timing e bindings locais estavam distribuídos entre validador e gerador.

Também restaram dois ajustes de interface e um drift documental: o campo de busca não tinha os
atributos semânticos completos, o hover da toolbox ignorava `prefers-reduced-motion`, e o relatório
descrevia texto escuro embora a implementação atual use branco sobre fundos normalizados.

## Alternativas consideradas

1. **Adicionar exceções nos switches atuais.** Menor diff, mas mantém o drift que causou o problema.
2. **Centralizar incrementalmente o contrato de corpos filhos.** Reúne enumeração, timing e bindings
   locais em um módulo puro, reutilizado pelo validador e pelo gerador. É a opção escolhida.
3. **Reescrever toda a análise da IR como um control-flow graph.** Mais completa, porém amplia muito o
   risco e o escopo para os casos concretos deste review.

## Desenho escolhido

`ir/programmingExecution.ts` passa a expor entradas de corpos filhos contendo caminho, corpo,
timing, variáveis locais e contextos Canvas. O gerador usa a mesma enumeração para suas travessias;
o validador deixa de manter cópias desses contratos.

A validação carrega dois conjuntos de símbolos: os disponíveis no ponto atual e os disponíveis após
uma suspensão/callback. Funções e métodos continuam sendo revalidados no ponto de chamada. Em corpos
assíncronos, apenas as instruções posteriores a um `awaitStmt` passam ao horizonte adiado; usos antes
do `await` continuam inválidos. Corpos condicionais não promovem o fluxo externo, pois nem todo
caminho necessariamente suspende.

`event` será binding local somente do corpo `event`. `ctx` será binding local e contexto Canvas de
`g2d:defineShape`; os callbacks de desenho que já possuem `ctxName` continuam usando esse nome.
`onClickAssign`, `imageOnLoad` e `imageOnError` serão classificados como adiados no contrato comum.

Na interface, o input do plugin recebe `type=search`, nome, `autocomplete=off`, spellcheck desligado,
`aria-label` e reticências tipográficas. O media query de movimento reduzido neutraliza a transição e
o deslocamento do hover sem remover a mudança de cor.

## Testes

O ciclo será red-green com IR real, sem mocks:

- topo rejeita `event`/`ctx`, enquanto os corpos corretos os aceitam;
- função e método assíncronos aceitam variável futura somente depois de `await`;
- os três callbacks DOM/imagem aceitam declarações futuras;
- o contrato compartilhado enumera corpos especiais e bindings esperados;
- os testes de acessibilidade verificam atributos da busca e reduced motion;
- matriz dos 149 blocos, suite completa, TypeScript, Biome e Playwright fecham a regressão.

## Fora do escopo

A eventual promoção de aritmética ao primeiro degrau é uma hipótese de pesquisa pedagógica, não uma
falha técnica reproduzida. O orçamento deliberado de 25 blocos iniciantes permanece inalterado até
validação com educadores/crianças.
