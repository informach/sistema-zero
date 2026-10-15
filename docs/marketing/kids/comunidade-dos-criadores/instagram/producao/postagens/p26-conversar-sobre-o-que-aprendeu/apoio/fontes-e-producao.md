# P26 · Conversar sobre o que aprendeu

Produção local em 14/10/2026. Sete slides em 1080 × 1350, 4:5, sRGB. Primeiro post da semana 19, série Teste em casa, dor D26. Necessidade tratada como situação possível, sem afirmação de prevalência.

## Copy e direção

[Ficha vigente](../../../../postagens/03-p21-a-p30.md#p26), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json), [legenda](../legenda.txt). Os sete textos e a legenda foram mantidos. A aprendizagem não é inferida de uma resposta isolada. O jogo mostra uma ação que o adulto pode observar e conversar sobre ela.

## Imagens

Quatro fotografias novas criadas pela ferramenta nativa image_gen.imagegen. [Prompts e referências](prompts.json), [fontes e hashes](imagens-geradas.json). A primeira imagem estabelece a mãe e o filho fictícios; as outras usam essa referência para manter a identidade, com cenas e enquadramentos diferentes. Nenhuma pessoa real, depoimento ou resultado foi recriado. As imagens geradas foram copiadas para esta pasta.

As telas foram geradas vazias. O monitor da capa recebeu os blocos nativos do projeto; o segundo recebeu uma jogada real, diferente dos demais slides. Os encaixes usam perspectiva; o segundo preserva o dedo na frente da tela. O desenho no caderno do slide 6 é esquema editorial aplicado na montagem. Nenhuma captura ou foto se repete em outro slide.

Fonte [Nunito](LICENSE-Nunito). Os blocos mantêm sua aparência original. [Textos alternativos](../texto-alternativo.txt) descrevem as cenas, os recortes e suas origens. [Instruções de publicação](../publicacao.txt) registram o Rótulo de IA, sem aviso na arte.

## Demonstração real

Exemplo Equilibrista, extensão Jogo 2D, exportação stickHeroExample. [Origem e hash](origem.json), [IR original](equilibrista-original.json), [código original](equilibrista-original.js). Não houve mudança de regra, cenário, aparência ou velocidade. Palco lógico 360 × 480, rapidez de crescimento um, personagem geométrico vermelho, plataformas verdes e cenário originais.

Capturas do canvas em 1440 × 1920, com DPR 2, depois de entradas reais de mouse. [Registro dos estados e verificações](capturas-verificadas.json). O observador apenas lê fase, comprimento, rotação, plataformas e pontos. Relógio e semente permitem comparar tempos sem variar o campo; o crescimento e a rotação continuam sendo calculados pelo jogo.

[Segurando](03-segurando.png): após 384 ms, bastão vertical com comprimento 112,608. [Depois de soltar](03-soltou.png): 144 ms depois, mesmo comprimento e rotação 46,08 graus. [Menos tempo](04-menos-tempo.png) e [mais tempo](04-mais-tempo.png): 192 e 576 ms, comprimentos 53,856 e 171,36, no mesmo campo. A pequena diferença em relação a uma proporção exata de três decorre dos primeiros quadros do cálculo de tempo do runtime, sem impacto no argumento. A [jogada da tela do menino](02-mostrando-o-jogo.png) usa outra semente e mostra o bastão deitado e a fase walking.

Os [blocos da capa](01-blocos-completos.png) e a [regra isolada](05-regra-do-mouse.png) foram renderizados pelo Blockly da plataforma a partir do mesmo IR. [Identificação dos comandos](blocos-capturados.json). O slide 5 mantém a condição e os dois comandos nativos, sem reescrever seus rótulos. Captura nativa em página local isolada; não é uma tela inventada de curso ou conta de aluno.

Chromium headless local para exportação, com servidores temporários encerrados após captura. Nenhuma conta de aluno usada e nenhum código da aplicação alterado. Scripts em output/instagram/p26-2026-10-14/: preparar.ts, capturar.mjs, blocos.mjs, adaptar.mjs, montar.mjs, documentar.mjs e verificar-entrega.mjs.

## Entrega

[Prévia](../index.html), [montagem editável](../montagem.html), [conferência de copy e layout](verificacao.json), [verificação final](entrega-verificada.json). Revisão editorial, visual e funcional da demonstração. Não é teste de conversão nem comprovação de resultado pedagógico. Não publicado ou agendado. Próximo: P23, terceiro post da semana 19.
