# P09 · Explicar uma escolha

Produção local em 14/10/2026. Sete slides de 1080 × 1350, 4:5, sRGB. Primeiro post da semana 14, série Por trás do jogo. D09 permanece hipótese; a peça não usa frequência populacional nem acusa a criança de copiar.

## Texto e imagens

[Ficha vigente](../../../../postagens/01-p01-a-p10.md#p09), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json) e [verificação da montagem](verificacao.json).

Cinco imagens selecionadas produzidas pela ferramenta nativa image_gen.imagegen: quatro cenas fotográficas e uma ilustração. [Prompts e referências](prompts.json), [origens e hashes](imagens-geradas.json). Os originais foram preservados. A foto da capa serviu como referência para as demais cenas da família. A ilustração recebeu correção de anatomia; a versão selecionada tem dois braços e duas mãos.

Pessoas fictícias, sem nome de aluna real. As cinco imagens são distintas. Slides 1 e 6: telas geradas em branco e preenchidas na montagem com capturas reais, por transformação de perspectiva. A pose da capa foi ajustada para deixar a tela livre; a máscara da cena 6 preserva a planta na frente do monitor. Slide 6 é uma comparação editorial de duas capturas; não anuncia uma interface de comparação integrada ao produto. Slide 3 é ilustração de ideia, sem interface simulada. [Textos alternativos completos](../texto-alternativo.txt).

## Jogo da Memória

Fonte: packages/studio/src/official-extensions/game-2d-advanced/examples/jogoDaMemoriaExample.ts, runtime cards.ts e gerador atuais. [IR original](jogo-original.json), [código original](jogo-original.js), [IR sem espera](sem-espera.json), [código sem espera](sem-espera.js).

A variação foi feita no IR: o único bloco gk:waitThen de 0,7 segundo foi retirado e seus três comandos foram promovidos ao mesmo lugar. As duas chamadas para virar as cartas e a redefinição de primeira permanecem. Não se apagou o corpo do bloco. As duas versões usam a mesma semente aleatória, as mesmas posições e os mesmos cliques. Nenhuma outra regra foi alterada. Um observador somente de leitura registrou as cartas e variáveis.

[Estados e capturas](capturas-verificadas.json): slide 4 com maçã e banana abertas; slide 5 com banana primeiro e uva depois, capturas 120 ms após o segundo toque nas duas versões. O original ainda mostra ambas; a cópia já mostra os versos. Após 800 ms, ambas estão fechadas. A imagem da capa mostra dois dos três pares encontrados, sem entrar na vitória. Slide 6 usa outra jogada, maçã e uva, em duas capturas novas aos 200 ms.

Virar carta é troca instantânea, sem animação de giro. O recorte dos blocos vem da renderização real do Blockly e mantém o valor original: [regra completa](05-bloco-espera.png) e [identificação](blocos-capturados.json). Na arte entra só o cabeçalho, para leitura. As ampliações e contornos amarelos são editoriais. A repetição do estado inicial nas duas colunas é necessária para a comparação sob as mesmas condições; não é reaproveitamento de imagem entre slides.

Capturas locais com Playwright headless, porque o navegador integrado retornou lista vazia nesta sessão. Sem conta real, sem alterar código da aplicação e sem publicar. Scripts em output/instagram/p09-2026-10-14/.

## Entrega e conferência

[Prévia](../index.html), [montagem editável](../montagem.html), [legenda](../legenda.txt), [orientações de publicação](../publicacao.txt), [verificação final](entrega-verificada.json). Fonte Nunito 600/800 com [licença](LICENSE-Nunito).

Conferência editorial, visual e execução do exemplo. Não é teste de conversão. Próximo carrossel: P42, segundo post da semana 14.
