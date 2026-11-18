# Lote 4 — Checkpoint da malha e do material

17/11/2026. Continuação de `214671daa`. **Parte 4.3 em execução; não fecha o lote 4.** Ainda faltam a prévia dos gestos, a interface Terreno e seu fechamento integrado.

O renderer agora lê alturas, pintura e buracos, com conferência de hash/formato/intervalo/camadas. Reutiliza recursos do terreno anterior pelo hash, sem reler as peças que continuam na base; a cache retém apenas a última base carregada e é liberada ao passar para plano/perfil ou destruir o palco. Fontes atrasadas continuam protegidas pelo cancelamento e identidade do pedido.

A malha publicada e o campo transitório compartilham a triangulação do núcleo. Buracos removem os dois triângulos da célula; a união com os recortes poligonais importados serve à vista, seleção, cápsula e câmera. Uma peça toda aberta não emite malha vazia nem plano físico sob o buraco. Esse caso teve teste vermelho/verde. Regiões sem alteração continuam com piso esparso; pintura em uma área sem altura própria ganha malha apenas naquele setor, sem planos coplanares.

O solo mistura até oito cores/texturas com repetição em metros de mundo, usando duas faixas de pesos Uint8 normalizados e o material Standard iluminado. Os pesos acompanham o recorte geométrico por interpolação. Texturas são da cache compartilhada do palco, sem cópia por camada/peça; a textura de espera pertence ao material e é liberada com ele. Não há emissão artificial à noite. Recortes só são aplicados às malhas cujos volumes eles alcançam, conservando índices e buffers compactos nas demais.

## Evidências técnicas

O ensaio Chrome compilou o shader real com 1, 4 e 8 camadas. Usa uma **trama quadriculada de teste**, não uma proposta artística para a Faísca. [Uma camada](evidencias/lote4-material/solo-1.png), [oito](evidencias/lote4-material/solo-8.png), [noite](evidencias/lote4-material/solo-8-noite.png), [recursos e ciclos](evidencias/lote4-material/resultados.json).

Cada configuração passou por três ciclos plano → solo no mesmo renderer, incluindo uma imagem que chega depois da textura de espera. Solo: 3 geometrias/5 texturas; plano: 4/3, estáveis em todos os ciclos. A mesma imagem é usada nas oito camadas; a contagem não cresce por camada. Zero erros de página/console. Isso prova o ciclo de recursos desse ensaio, não FPS em aparelhos físicos.

Regressão da Faísca convertida, com Cute Characters nativo de 1,17 m: [percursos](evidencias/lote4-material/faisca-percursos.json). Morada → praça 12,68 m; praça → horta 19,74 m; aproximações/travessia da ponte 46,66 m; subida ao Farol até Y≈9,56 m. Documento preservado e nenhum erro. Não houve rearranjo do cenário nem aceite artístico.

Núcleo: 165 testes/8.229 asserções. Motor: 78/2.639. Tipagem núcleo/motor/oficina e build passaram. Biome e diff conferidos. O aviso de chunk continua: motor aproximadamente 823 kB, 220 kB gzip; não foi suprimido.

## Continuação obrigatória dentro do mesmo lote

Próxima parte: edição ao vivo, atualização das peças/normais tocadas e restauração em todos os cancelamentos, seguida da aba/painéis e PNG. A altura usada pelos apoios deve acompanhar o campo de prévia; a máscara continua separada da leitura matemática de altura. Distinguir peças densas por pintura/buracos de peças que realmente têm altura própria, para pintar uma peça omitida não alterar seu piso de fundo.

A ferramenta precisa conseguir fechar um buraco: sua consulta de edição pode atravessar a máscara para alcançar o campo matemático, sem adicionar piso à colisão ou à renderização. Aproveitar os controles de pintura do Molda; não criar outro motor de gestos. Rampa usa as alturas originais nas extremidades, evitando realimentação da própria prévia. Atualização de relevo deve reassentar os apoios e conjuntos existentes, preservando offsets e relações internas.

O próximo ensaio precisa demonstrar gesto → upload → comando único → reentrada/undo/redo, falha de upload, Escape, perda de foco, toque múltiplo e cabeça nova. Lotes 5–10 e implantação/validação remotas permanecem pendentes.
