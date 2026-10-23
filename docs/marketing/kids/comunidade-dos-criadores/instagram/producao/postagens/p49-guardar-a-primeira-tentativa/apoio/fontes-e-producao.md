# P49 · Guardar a primeira tentativa

Produzido em 14/10/2026. Quinta imagem única na ordem do calendário, segunda publicação da semana 8. Série Tradução de criança. Desejo W19: ver o filho reconhecer que consegue aprender coisas novas. Público: pais e responsáveis por crianças de 9 a 14 anos. Objetivo: atração e convite para seguir.

## Copy e direção

[Ficha vigente](../../../../postagens/10-p41-a-p50.md#p49), [calendário](../../../../03-postagens.md), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy extraída](copy.json) e [legenda integral](../legenda.txt). Os dois parágrafos da arte e a legenda foram preservados literalmente. Antes e Depois identificam as duas capturas; os rótulos e a trajetória foram registrados na direção visual da ficha. Dezenove palavras na copy da arte, incluindo os rótulos. O selo Tradução de criança identifica a série.

A legenda propõe comparar uma foto ou um vídeo de dois momentos e conversar sobre uma conquista concreta. Não promete histórico automático, transformação geral de autoestima ou desenvolvimento garantido. W19 é hipótese na pesquisa de avatar, não característica comprovada de todas as famílias. [Revisão mecânica da copy](copy-linter.json), além da revisão editorial.

## Assets e composição

Cenário de floresta e raposa originais, gerados com image_gen.imagegen: [prompts](prompts.json), [origens e hashes](imagens-geradas.json), [cenário](cenario-floresta.png) e [raposa transparente](raposa.png). Não foram usadas fotos de referência nem personagens licenciados. A [caixa](caixa.svg) é um asset vetorial simples criado pela equipe. Esses elementos foram incorporados ao jogo executável antes das capturas; não são telas de plataforma inventadas por IA.

As duas capturas completas aparecem empilhadas, sem alterar seu conteúdo, com o mesmo enquadramento e tamanho. Paleta azul, branca, creme e amarela; [Nunito](LICENSE-Nunito) 600 e 800. Título de 72 pixels, frase final de 50 pixels, rótulos de 30 pixels e margens laterais de 64 pixels. Exportação em sRGB, 1080 × 1350, 4:5. Sem rodapé técnico na arte.

## Demonstração executada

Base: Mini plataforma, em packages/studio/src/official-extensions/game-2d/examples/foundations.ts. Exportação por generateProjectFiles e execução com gameTwoDRuntime, da extensão oficial Jogo 2D. [Origem e hashes](origem-jogo.json).

O palco mede 640 × 200. As versões usam o mesmo fundo, raposa, chão, caixa, velocidade horizontal, gravidade e colisões. Só a segunda adiciona a regra: ao apertar a seta para cima, se a raposa estiver no chão, iniciar o pulo com velocidade vertical -10. [Projeto antes](projeto-antes.json), [projeto depois](projeto-depois.json), [código antes](projeto-antes.js) e [código depois](projeto-depois.js).

[Verificação da execução](jogo-verificado.json): ambos começam em x=64, y=126 e recebem a mesma sequência de teclas por sessenta passos. Antes, a raposa anda até a caixa e permanece no chão; depois, salta, ultrapassa a caixa e pousa. A primeira captura ocorre no passo 23, em x=156, y=126, ainda andando em direção à caixa. A segunda ocorre no passo 34, em x=200, y=47,6, no ar sobre a caixa. São instantes diferentes para mostrar as ações com clareza. As linhas pontilhadas são anotações editoriais que seguem as posições medidas até cada captura, sem alterar física ou posição.

Capturas de 1920 × 600: [antes](jogo-antes.png) e [depois](jogo-depois.png). A autoria é da equipe e está explícita na legenda e no texto alternativo. Não atribuir a demonstração a aluno ou a um curso específico.

## Entrega e conferência

[PNG final](../01-p49.png), [prévia com legenda](../index.html), [prévia PNG](../previa.png), [montagem editável](../montagem.html), [texto alternativo](../texto-alternativo.txt), [publicação](../publicacao.txt), [checagem da montagem](verificacao.json) e [verificação final](entrega-verificada.json).

Conferidos copy e legenda, origem dos assets, diferença única entre projetos, funcionamento do salto, dimensões, fontes, margens, leitura na prévia móvel e links locais. Scripts em output/instagram/p49-2026-10-14. Sem ZIP, publicação ou agendamento. Estado: 30 carrosséis com 220 PNGs e cinco imagens únicas, totalizando 225 PNGs em 35 publicações. Próxima imagem única: P53, segunda publicação da semana 10.
