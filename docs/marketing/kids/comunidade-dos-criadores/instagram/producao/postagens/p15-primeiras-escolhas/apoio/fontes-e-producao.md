# P15 · Primeiras escolhas

Produção local em 14/10/2026. Sete PNGs de 1080 × 1350, 4:5, sRGB. Primeiro post da semana 18; série Teste em casa; dor D15, tratada como situação possível, sem prevalência afirmada.

## Copy e direção

[Ficha atual](../../../../postagens/02-p11-a-p20.md#p15), [direção visual](../../../../postagens/05-direcao-visual-e-producao.md), [texto preservado](copy.json), [legenda](../legenda.txt). Copy dos sete slides e legenda preservadas integralmente. Não foi recuperada nenhuma direção anterior. A publicação conversa com o responsável e apresenta escolhas observáveis, sem promessa de ganho cognitivo.

## Imagens

Seis imagens novas pela ferramenta nativa image_gen.imagegen: quatro fotografias e dois desenhos de fundo. [Prompts e referências completos](prompts.json), [origens e hashes](imagens-geradas.json). O menino da capa é fictício e serviu de referência para a continuidade das novas cenas. Não se usaram pessoas reais nem depoimentos.

Slide 1: menino consulta um modelo com lápis parado. Slide 3: close novo do telhado circulado; do meu jeito foi aplicado com fonte manuscrita, não gerado. Slide 4: mãe e filho conversam sobre o movimento e o cenário. Slide 7: enquadramento novo do modelo e desenho com telhados roxos, arco-íris e flores. O modelo aparece como objeto da narrativa em fotos novas; nenhuma fotografia ou captura é reutilizada entre slides.

O slide 2 é diagrama editorial de dois projetos e transferência de uma sequência, com formas simples sem marca. Não simula uma funcionalidade de copiar entre janelas da plataforma. Não é captura e não pretende ensinar um gesto específico da interface.

Fontes [Nunito](LICENSE-Nunito) e [Caveat](Caveat-OFL.txt). O rótulo de IA está previsto nas [instruções de publicação](../publicacao.txt), sem rodapé Cena ilustrativa. [Textos alternativos](../texto-alternativo.txt) distinguem cenas geradas, desenho e capturas reais.

## Jogo executado

Exemplo Cenário do meu desenho, da extensão Jogo 2D. [Origem](origem.json), [IR original preservado](cenario-original.json), [JavaScript original preservado](cenario-original.js), [asset original](asset-original.json). As duas cópias usam exatamente o mesmo IR e código. Só muda a imagem associada ao nome cenario: [castelo](cenario-castelo.png) ou [rua](cenario-rua.png). São desenhos preparados para esta peça com IA; não são trabalhos de alunos.

O palco permanece em 320 × 240, o herói em quadrado laranja de 24 × 24 e a velocidade em três. As setas movem nas quatro direções e o limite da tela continua ativo. O desenho é fundo: casas, castelo e caminho não geram colisões. Foram testadas as quatro setas e o limite direito nas duas cópias. [Estados e checagens](capturas-verificadas.json). As capturas são feitas após teclas reais; o observador de posição é somente de leitura.

[Captura do castelo](05-jogo-castelo.png), [captura da rua](06-jogo-rua.png). Os momentos são diferentes, com o mesmo herói em posições diferentes. O bloco ampliado [Pôr o cenário cenario atrás de tudo](06-bloco-fundo.png) foi renderizado pelo Blockly original a partir do IR, sem substituir texto por uma instrução inventada. [Identificação do bloco](blocos-capturados.json). O nome sem acento cenario é o identificador original do asset.

O navegador integrado estava indisponível, com lista vazia. Captura local em Chromium headless, servidor temporário encerrado ao concluir e uma página isolada no Vite já existente para renderizar os blocos. Nenhuma conta de aluno foi usada e nenhum código da aplicação foi alterado.

## Entrega e verificação

[Prévia](../index.html), [montagem editável](../montagem.html), [layout e copy](verificacao.json), [verificação final](entrega-verificada.json). Scripts em output/instagram/p15-2026-10-14/: preparar.ts exporta as cópias; capturar.mjs executa o jogo; blocos.mjs renderiza o comando; adaptar.mjs e montar.mjs produzem a composição; documentar.mjs registra a entrega.

Conferência editorial, visual e funcional da demonstração. Não é teste de conversão nem prova de resultado pedagógico. Não publicado ou agendado. Próximo: P48, segundo post da semana 18.
