# Lote 8.4 — Canvas 3D

19/11/2026 · `staging` · recorte implementado, testado e revisado localmente. O lote 8.4 completo permanece aberto.

## Implementação

O Canvas recebe a cena completa pelo mesmo SDK usado no Mundo 3D. Três blocos integram carregamento, atualização e ligação física ao programa Three.js existente. O seletor armazena o ID estável do cenário; o ramo de sucesso recebe o handle e há tratamento de erro. Câmera, renderer, objetos autorais e loop continuam pertencendo ao programa.

O adaptador prepara a próxima base antes de substituir a anterior, conserva objetos/luzes autorais e aplica o ambiente compilado. Cancelamento, conclusão atrasada, troca e encerramento liberam somente seus próprios recursos. O ambiente alterado explicitamente pelo programa também é conservado entre duas bases e no descarte. Não há outro renderer, controlador, inventário ou loop automático.

A atualização consulta a base instalada na `THREE.Scene`, portanto funciona no loop global antes e depois do carregamento. Água, clipes e setores continuam atualizados pelo handle canônico. O handle do callback permanece local, sem referências circulares em `userData`.

`Physics Lite.setScene(id, provedor)` liga as consultas emprestadas dos triângulos/BVH canônicos. O kernel conserva forças, controles, corpos, colisores autorais, gatilhos e eventos. Apenas com cenário ligado, deixa de usar o chão analítico; recortes permanecem vazios. Consulta de raio considera a superfície mais próxima entre cena e colisores autorais. Remover a ligação não descarta a arte. Descarregar a arte retira o provedor antes de uma consulta posterior, sem recriar um chão invisível.

O contato com os triângulos usa a cápsula vertical canônica, dimensionada pela altura e pelo menor semieixo do corpo, em coordenadas dos pés. Os colisores simples autorais mantêm AABB/esfera. Isso é física arcade e não uma simulação rígida exata de caixas ou malhas arbitrárias. O deslocamento é subdividido conforme o raio; configurações que excedam o orçamento seguro falham explicitamente, sem atravessar superfícies silenciosamente.

A função de piso do bloco de criação física tornou-se opcional: vazia conserva o padrão plano do kernel; definida gera a mesma chamada anterior. Depois do carregamento, a ligação explícita usa as superfícies reais do cenário. Não é necessário criar um terreno procedural fictício para utilizar a física.

## Evidências locais

O produtor cria o projeto pelo ciclo **IR → Blockly → IR → JavaScript → parser**, preservando as receitas dos três blocos. Reabre pelo validador canônico, confere os assets e produz preview strict e site exportado. A cena completa vem do projeto real de galeria; o segundo cenário é um recorte físico compilado pelos comandos reais do domínio.

O navegador utiliza Three/WebGL reais nas URLs pinadas, com instrumentação que somente observa os contadores públicos. O programa de ensaio possui uma cápsula de referência, controles de teclado e sua própria câmera/RAF; não utiliza o controlador do Mundo 3D nem o explorador portátil.

| Caso | Verificações |
| --- | --- |
| Cena completa no preview | Três substituições, caminhada e corrida parciais sobre a ponte, salto/pouso, mudança de direção |
| Recorte no preview | Três substituições, caminhada, entrada no recorte e queda contínua por gravidade |
| Site exportado | Mesmos arquivos, três substituições e sequência de movimento |
| Rota local `/jogar` | Componentes reais PublicPlayer/StudioProjectPlayer, API de publicação controlada, três substituições e movimento |

Em cada caso, os recursos permanecem estáveis entre os três ciclos e o descarte final termina com **zero geometrias e zero texturas**. A cena completa compara **441 alturas/máscaras** com a referência Raylib nativa, em cada modo, com tolerância de 1e-6 m. Não há requisição fetch/XHR dos materiais nem erro de script/CSP; o player tem somente a consulta de publicação esperada.

A cena completa permaneceu com **25 geometrias/22 texturas**, e o recorte com **cinco/três**. O ator da cena conservou seus quatro clipes; o programa ativou o primeiro e os recibos confirmam o avanço do mixer no loop real. Isso não equivale ao aceite perceptivo dos quatro estados de locomoção.

O primeiro ensaio de navegador identificou uma falha de chegada do próprio programa: o raio do centro dos pés atravessava uma junta e posicionava o corpo sob o tabuleiro. A chegada do ensaio passou a medir a área dos pés com nove raios sobre os triângulos reais, como a prova anterior do Mundo. A repetição percorreu o tabuleiro com apoio. Não foi criada superfície invisível nem alterada a ponte para fazer o teste passar.

Com o delta do loop preservado, a repetição detectou também que o programa de ensaio misturava o timestamp do RAF com uma amostra anterior de `performance.now()` na primeira chamada, podendo produzir um delta negativo. O programa passou a inicializar sua referência no primeiro RAF, com delta zero, e depois usa diferenças do mesmo relógio. A validação do runtime continua recusando passos inválidos.

O percurso começa sobre a ponte e é parcial. Não certifica cabeceiras, travessia integral, implantação artística do lago ou a composição final da Faísca. A cápsula é uma referência funcional; os vídeos não aprovam animação/IK do Cute Characters.

## Qualificação e revisão

- Ensaios de geometria real: chão fora da origem, recorte com queda, ponte/junta, toras arredondadas, teto/salto, parede triangular fina com corpo pequeno a 120 m/s, raycast, propriedade, troca, remoção e limites de recursos.
- Ciclo de blocos/código: ID, escopos, tipos dos seletores, checksum de receitas editadas, source maps de sucesso/erro, contexto contínuo e lifecycle gerenciado existente.
- A revisão corrigiu o soquete de delta na reabertura Blockly (ele não pode perder a variável do loop e voltar ao valor padrão), as declarações de posicionamento dos blocos e a entrega de uma cena cancelada por um evento síncrono de montagem do Three. Casos de regressão exercitam esses comportamentos; o cancelamento conserva a base anterior e libera o preparo novo.
- Regressão Canvas/parser/seletores/SDK/Physics Lite/Mundo/arquitetura: **188 testes, 1.113 asserções, 27 arquivos**, sem falha.
- Regressão compartilhada de assets, importação, transporte, preview, exportação e conversão Pro: **123 testes, 631 asserções, 12 arquivos**, sem falha.
- Tipagem integral do Estúdio aprovada. A primeira passagem apontou contratos incorretos no soquete de valor, declarações de posicionamento e casts de serialização dos ensaios; foram corrigidos na origem, sem supressões ou coerção dupla.
- Build/orçamento aprovado com os limites originais: carga inicial **365.070 bytes/118.273 gzip**, dois arquivos; Blocos **4.741.115/1.269.684**, Ponte **4.220.100/1.133.054**, Código **2.654.459/744.180**. Um teste, 29 asserções, 24,34 s.
- Geração reproduzível conferida em `--check`: SDK com **503.871 caracteres**, três imports Three compartilhados e SHA-256 `00fc70a009b0f14910c7dc1355be90b4ddd01912b7c70a449f8c2d44f1a7e82a`. Runtime portátil permanece idêntico ao corte Mundo: **1.106.298 caracteres**, SHA-256 `830824068cb5e5424915188e064c6fa13575d74d03a61dfa36c37c1507a66732`.
- Repetição final dos quatro casos Canvas aprovada, incluindo clipes e delta real. Repetição dos quatro casos Mundo 3D também aprovada após a mudança compartilhada no kernel/SDK e a extração do preparador de vendors de ensaio.
- Revisão final concluída sobre contratos/escopos, integridade das receitas, cancelamento/troca, propriedade do ambiente/recursos, coordenadas físicas, apoio/parede/teto/recorte, preservação do caminho sem cenário e limites das evidências. Biome e `git diff --check` sem falhas.

Os bytes privados dos modelos/projetos/sites ficam em `output/`. [Capturas, vídeos e recibo sanitizado](evidencias/lote8-studio-canvas/recibo.json) acompanham este recorte; o recibo permite conferir os três ciclos de cada modo. Não houve teste em aparelho físico, publicação em conta real ou aprovação artística. O host local usa os componentes/CSS da comunidade e seus fallbacks de fonte; não substitui Next/gateway/staging. Service workers são bloqueados somente no contexto do site exportado; atualização offline não é validada aqui.

## Continuidade

Canvas está fechado no escopo acima; registrar/enviar o commit antes de iniciar Jogo 3D. O lote 8.4 permanece aberto até Jogo 3D, Jogo 3D Avançado, Pro autoral e qualificação integrada. Depois vêm 8.5/8.6, lotes 9–10, composição final da Faísca pela ferramenta, full review, CI, implantação e validação real de staging no encerramento global.
