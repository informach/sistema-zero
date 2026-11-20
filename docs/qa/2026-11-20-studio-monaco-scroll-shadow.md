# Cliques no texto sob a sombra de rolagem do Monaco

O CI `44653891504` registrou 376 tentativas de clicar na primeira linha visível durante a segunda colagem na Ponte. O log identifica `.scroll-decoration` interceptando o clique. O CSS original do Monaco posiciona essa sombra de seis pixels sobre o conteúdo e não define `pointer-events: none`.

A regra do Estúdio agora deixa os eventos atravessarem somente essa camada decorativa. A sombra, cores, dimensões e conteúdo permanecem iguais; não foram alterados o gesto de colar, a seleção, a instrumentação do editor, timeouts ou retries.

Verificação local no Windows/Chromium, sobre build de produção:

- Duas colagens nativas do programa com figuras, sem duplicação dos blocos: aprovado.
- Aprender CSS: resultado visual, bloco amigável e seletores do HTML: aprovado.
- Menu: navegação ao reposicionar e fechamento ao selecionar: aprovado.

Os três casos passaram em 43,5 segundos, incluindo build (`.cache/mission/monaco-pointer-browser.txt`). TypeScript completo aprovado na mesma árvore. Biome sem erros; há dois avisos preexistentes de especificidade em seletores do Blockly, fora desta regra.

A falha de fechamento de menu observada uma vez no CI não é declarada resolvida apenas por passar localmente. A primeira execução hostil no Linux e a homologação integral continuam abertas.
