# P48 · O que o placar conta

Produção local em 14/10/2026. Sete PNGs em 1080 × 1350, 4:5, sRGB. Segundo post da semana 18; série Por trás do jogo; desejo W18 tratado como hipótese, sem afirmação de prevalência.

## Copy e direção

[Ficha vigente](../../../../postagens/10-p41-a-p50.md#p48), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [copy preservada](copy.json), [legenda integral](../legenda.txt). Nenhum texto público foi alterado. A conexão com curtidas é uma pergunta para conversar; não se afirma transferência automática de habilidade ou funcionamento de algoritmo.

## Imagens e composição

Duas imagens novas pela ferramenta nativa image_gen.imagegen: ilustração da capa e fotografia da família fictícia. [Prompts completos](prompts.json), [origens e hashes](imagens-geradas.json). Os monitores vieram sem texto. Números e telas foram aplicados na montagem, com geometria própria e perspectiva. Os números 4 e 24 da capa e 24 do celular são exemplos editoriais, não dados de conta, resultados ou métricas reais.

Na TV foi inserida uma captura real com três cristais, diferente das demais. Pai e filho são fictícios; não há identidade real ou depoimento. A orientação de [publicação](../publicacao.txt) prevê Rótulo de IA e mantém a arte sem Cena ilustrativa. [Textos alternativos](../texto-alternativo.txt) descrevem as origens.

Fonte das peças: [Nunito](LICENSE-Nunito). O jogo mantém sua fonte original Press Start 2P e o Blockly mantém os blocos originais. Capturas de jogo em 2400 × 1600, vistas lógicas de 1200 × 800. Recortes aproximam campo e placar, sem redesenhar números. O marcador amarelo indica onde aconteceu o clique; não é feedback nativo do produto.

## Demonstração real

Exemplo básico Mina de Cristais, extensão Jogo 3D. [Origem e hash](origem.json), [IR original](mina-original.json), [código original](mina-original.js). Câmera isométrica fixa, paleta, geometria, iluminação e regras originais preservadas. O terreno tem blocos cinza e azuis, não objetos realistas de pedra ou joia. A ilustração da capa é uma representação genérica e não uma captura desse jogo.

O original soma um quando um cristal é retirado; pedra só é removida. Capturas: [início](02-inicio.png), [pedra com zero](03-pedra.png), [cristal com um](03-cristal.png), [momento com três](06-conversa.png), [vitória com dez](07-final.png). O bloco [Somar 1 em variável pontos](04-regra-do-ponto.png) é recorte nativo isolado da condição original. A [regra completa](04-regra-completa.png) conserva o contexto. [Identificação do recorte](blocos-capturados.json).

A cópia do slide 5 adiciona duas instruções no ramo da pedra: somar um e atualizar o placar. O rótulo Cristais passa a Pontos, porque a contagem inclui pedra. [IR adaptado](mina-pedra-vale-um.json), [código adaptado](mina-pedra-vale-um.js), [original comparado](05-original.png), [cópia comparada](05-adaptada.png). O teste é a comparação de um clique, não uma nova versão de jogo entregue como curso. Demais regras, inclusive o encerramento original no ramo do cristal, não foram alteradas.

[Registro das tentativas](capturas-verificadas.json). As duas versões usam a mesma semente, mesmo relógio, mesma pedra e câmera. O jogo principal usa outra semente e capturas distintas. Os estados confirmam a remoção de cada objeto e os valores 0, 1, 3 e 10; vitória visível somente ao atingir dez cristais no original. Nenhum valor de placar foi forçado ou desenhado na captura.

Captura local com cliques reais, observadores de leitura e relógio controlado. O tempo fica em 50 durante a captura para comparar as ações sem novos blocos surgindo; a regra do temporizador permanece no código. A renderização de frames intermediários foi suprimida por desempenho, e cada captura usa o renderizador nativo. O navegador integrado retornou lista vazia; foi usado Chromium headless local. Servidor temporário e páginas de captura encerrados. Uma página isolada usou o Vite já existente para renderizar Blockly. Nenhuma conta ou código de aplicação foi alterado.

## Entrega

[Prévia](../index.html), [montagem editável](../montagem.html), [layout e comparação da copy](verificacao.json), [verificação final](entrega-verificada.json). Scripts em output/instagram/p48-2026-10-14/: preparar.ts, adaptar-jogo.ts, capturar.mjs, blocos.mjs, adaptar.mjs, montar.mjs, documentar.mjs e verificar-entrega.mjs.

Verificação editorial, visual e funcional da demonstração; não é teste de conversão ou prova de resultado cognitivo. Não publicado ou agendado. Próximo: P26, primeiro post da semana 19.
