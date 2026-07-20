# Correções residuais de HTML, CSS, SVG e Canvas

## Objetivo

Corrigir os dez achados reabertos no full review sem reescrever o pipeline do
Studio. O lote preserva projetos antigos, mantém a Ponte sem perda silenciosa e
faz o jogo exportado executar os mesmos recursos de entrada do preview.

## Abordagem escolhida

O trabalho centraliza três contratos que hoje divergem: runtime de entrada,
estrutura CSS e símbolos Canvas. Parsers, schemas, diagnósticos, geradores e
exportadores passam a consumir esses contratos. Correções locais continuam
limitadas a HTML inline, source maps e medidas SVG.

Foram descartadas duas alternativas:

- patches em cada consumidor, porque manteriam o drift que causou os defeitos;
- migração imediata dos megaswitches para codecs completos, porque ampliaria o
  risco numa árvore já modificada e excederia os dez achados aprovados.

## Runtime de entrada Canvas

O runtime que define `__szInput` será separado da instrumentação exclusiva do
preview. O preview continuará compondo entrada e recursos de desenvolvimento; o
export clássico emitirá o runtime de entrada como arquivo próprio e o carregará
antes do código do aluno. O ZIP de fonte e a conversão para Pro herdarão a mesma
composição por usarem `buildClassicFileMap`.

O runtime entrará de forma determinística, sem procurar chamadas por regex. Isso
mantém preview e artefato publicado sob o mesmo contrato e evita que uma nova
expressão de entrada volte a funcionar somente dentro do Studio.

## Símbolos e ordem Canvas

O validador sequencial de Programação ganhará um conjunto próprio de contextos
Canvas. Somente `canvasSetup` declara um contexto, e a declaração passa a valer
depois do statement. Todo statement ou expressão `canvas*` com `ctxVar` consulta
esse conjunto; uma variável comum com o mesmo nome não satisfaz a referência.

Uma tabela local de declarações detectará nomes repetidos no mesmo escopo
lexical, inclusive colisões entre variável, setup, import, função e classe.
Escopos filhos continuarão podendo sombrear nomes externos. O diagnóstico Canvas
específico seguirá responsável por mensagens de tela/id e setup duplicado.

## Estrutura e comentários CSS

Um scanner compartilhado distinguirá chaves estruturais de chaves dentro de
strings, comentários e escapes. O parser usará esse scanner para localizar a
abertura real da regra; schema e gerador usarão a mesma classificação. Seletores
válidos como `[data-x="}"]` serão preservados, enquanto chaves soltas continuarão
bloqueadas.

O scanner de declarações informará se consumiu integralmente cada segmento.
Qualquer trecho não vazio sem propriedade e valor completos fará a regra ou o
passo de keyframe permanecer inteiro como `rawCSS`.

Comentários CSS terão um contrato de saída próprio. O schema e o diagnóstico
rejeitarão `*/`; o gerador recusará o nó por inteiro como defesa final. O parser
estruturará apenas um comentário isolado inequívoco e preservará sequências
ambíguas como CSS avançado.

O parser reconhecerá somente o `@import` canônico de Google Fonts emitido pelo
gerador. A família será decodificada e validada pelo contrato de
`css/googleFonts.ts`; outros imports continuarão avançados.

## Fidelidade HTML e source map

Um elemento de conteúdo phrasing que contenha filho não modelado será preservado
inteiro como `rawHTML`. Essa degradação mantém a adjacência e o whitespace em vez
de oferecer edição parcial que muda o texto da página.

O gerador inline carregará uma posição `{ linha, coluna }`. Cada fragmento
atualizará a posição por suas quebras de linha, inclusive em filhos recursivos.
Os ranges do source map passarão a apontar a linha final real.

## Diagnóstico SVG

O validador extrairá o número de comprimentos literais com unidade. A regra de
não-negatividade será aplicada a números puros, `px`, `%` e às demais unidades
aceitas. Expressões dinâmicas como `var()` e `calc()` continuarão fora da análise
estática.

## Testes e gates

Cada causa receberá primeiro uma regressão que falha no estado atual:

- export real define `__szInput` antes do script do aluno;
- uso de contexto antes do setup e colisão de declaração são rejeitados;
- comentário CSS não encerra o delimitador;
- declaração incompleta permanece `rawCSS`;
- seletor com chave em string round-trippa sem alteração;
- tag inline desconhecida preserva o pai e o texto `AB`;
- source map avança após `\n`;
- Google Font volta ao bloco dedicado;
- comprimento SVG negativo com unidade recebe warning.

Depois de cada grupo, serão executados seus testes focados. Ao final, serão
executados Biome, TypeScript, a suíte dirigida, `bun test src` e os E2Es das
quatro categorias. Falhas globais preexistentes serão relatadas separadamente;
nenhuma será mascarada por alteração de expectativa.

## Fora de escopo

- reescrever os cinco arquivos centrais como registry de codecs;
- corrigir as falhas atuais das extensões de Jogo 2D sem relação causal com este
  lote;
- mudar APIs públicas ou o formato persistido do projeto;
- adicionar novos blocos ou alterar a progressão pedagógica.
