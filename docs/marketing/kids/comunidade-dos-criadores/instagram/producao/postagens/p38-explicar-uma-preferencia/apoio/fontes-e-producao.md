# P38 · Explicar uma preferência

Produzido em 14/10/2026. Quarta imagem única na ordem do calendário, terceira publicação da semana 7. Série Tradução de criança. Desejo W08: comparar possibilidades e explicar uma escolha; hipótese no corpus de pesquisa, não traço comprovado de todas as famílias. Público: pais e responsáveis por crianças de 9 a 14 anos. Objetivo: atração e convite para seguir.

## Copy e direção

[Ficha vigente](../../../../postagens/09-p31-a-p40.md#p38), [calendário](../../../../03-postagens.md), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy extraída](copy.json) e [legenda integral](../legenda.txt). Os dois parágrafos da arte e toda a legenda foram preservados literalmente. Os rótulos Alcança a plataforma e Bate no teto esclarecem as capturas; registrados também na direção visual da ficha. Arte com dezenove palavras, incluindo rótulos. O selo Tradução de criança identifica a série.

O texto convida o responsável a escutar o motivo de uma escolha. A legenda distingue uma diferença observável de uma preferência pessoal. Não exige resposta técnica, não transforma W08 em diagnóstico e não promete desenvolvimento garantido de habilidades. [Revisão mecânica](copy-linter.json) aplicada à copy limpa, além da revisão editorial.

## Fotografia e montagem

Fotografia nova de pai e filho fictícios, gerada pela ferramenta nativa image_gen.imagegen. [Prompt completo](prompts.json), [origem e hash](imagens-geradas.json) e [foto original](01-pai-e-filho-comparando.png). O menino aponta para o papel à esquerda; o pai observa e escuta. Não foi usada referência de pessoa real. A foto original tem dois papéis em branco; recebe as capturas reais por homografia em HTML/CSS, conforme [coordenadas de composição](composicao.json). Pequena mistura multiplicativa conserva a textura e a luz do papel. Nenhum rosto foi retocado, nem os estados do jogo foram regenerados por IA.

Paleta azul, branca, creme e amarela; [Nunito](LICENSE-Nunito), pesos 600 e 800. Título de 84 pixels, frase de apoio de 53 pixels, rótulos de 30 pixels e margens laterais de 64 pixels. Sem repetição do título como ilustração. Origem descrita no texto alternativo; Rótulo de IA indicado para publicação.

## Demonstração real

Base: Mini plataforma, em packages/studio/src/official-extensions/game-2d/examples/foundations.ts. Personagem EXAMPLE_HERO_IMAGE, da biblioteca oficial. Projeto exportado por generateProjectFiles e executado com gameTwoDRuntime. [Origem e hashes](origem-jogo.json).

Adaptação comum: duas plataformas e um teto sólido, fundo azul claro e personagem com 24 × 24 pixels, num palco de 320 × 200. Mesmos elementos, posições, velocidade horizontal e sequência de teclas nas duas versões. Apenas o parâmetro jump muda de 9 para 15. As definições e scripts estão preservados: [IR do salto menor](salto-curto.json), [IR do salto maior](salto-alto.json), [código menor](salto-curto.js) e [código maior](salto-alto.js).

[Verificação da execução](jogo-verificado.json): as duas versões começam em x=64, y=140. O salto menor pousa no destino no passo 26, em x=168, y=96; não toca no teto. O salto maior toca no teto no passo 7, em x=92, y=56, com velocidade vertical zerada pela colisão real. As duas execuções continuam por quarenta passos. A versão maior também pode pousar depois; o rótulo descreve o contato com o teto, não uma impossibilidade de chegar.

Capturas: [pouso](salto-curto.png) e [contato com teto](salto-alto.png), 1280 × 800. Cada quadro mostra o evento descrito, em um instante diferente da mesma sequência de comandos. A trilha pontilhada é sobreposição editorial baseada nas posições medidas até cada evento, sem alterar a física ou a posição do personagem. Não atribuir esta demonstração a aluno ou anunciar um curso específico a partir dela.

## Arquivos e conferência

[PNG final](../01-p38.png), [prévia com legenda](../index.html), [prévia PNG](../previa.png), [montagem editável](../montagem.html), [texto alternativo](../texto-alternativo.txt), [publicação](../publicacao.txt), [checagem da montagem](verificacao.json) e [verificação final](entrega-verificada.json). Exportação via Chromium em sRGB, 1080 × 1350, 4:5.

Conferidos foto e comparação visualmente, correspondência da copy à ficha, origem dos assets, diferença única entre variantes, colisão e pouso medidos, dimensões, fontes, margens, prévia a 360 pixels e links locais. Scripts reproduzíveis em output/instagram/p38-2026-10-14. Sem ZIP, publicação, agendamento ou envio de mensagens. Estado: 30 carrosséis com 220 PNGs e quatro imagens únicas, totalizando 224 PNGs em 34 publicações. Próxima imagem única: P49, segunda publicação da semana 8.
