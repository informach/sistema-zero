# Lote 8.2 — Divisão de modelos preservando animações

18/11/2026 · `staging` após `696bd6aae` · **8.2 permanece em andamento.** A montagem do pacote completo ainda está pendente; não se trata do fechamento do lote 8.

`dividirGeometriaComDeformacoes` usa a divisão numérica do núcleo e remapeia os canais pelo índice original. Conserva UVs, atributos próprios, juntas/pesos e todos os slots de morph. As juntas continuam em Uint16; frações são recusadas antes da conversão para Float32. Há limites de leitura/saída e conferência de intervalos de material, layout, valores finitos e contagem de slots. A referência temporária de remapeamento não é acrescentada ao arquivo.

`normalizarRaizAnimavel` clona a hierarquia e os esqueletos, divide as partes por material e redireciona os clipes às cópias. A identidade do nó de transformação permanece em um grupo; canais de morph são distribuídos às partes. Não transforma a pose inicial em um modelo estático. Materiais/geometrias/esqueletos próprios são descartados uma vez; texturas continuam pertencendo ao carregamento. Canais sem representação portátil são recusados, sem omissão silenciosa.

A primeira validação independente encontrou dois avisos sobre malhas com skin abaixo de grupos. A estrutura foi corrigida: as malhas ficam nas raízes da cena glTF, preservando o bind; a hierarquia animada continua nos ossos. A comparação de movimento passou novamente e o validador deixou de emitir os avisos. A implementação também evita buscas quadráticas para mapear nós e mantém a visibilidade herdada.

A inspeção de **fontes** agora normaliza apenas a declaração de padding de imagens que alguns exportadores geram, mantendo bytes e hash autorais. A conferência dos GLBs **compilados** continua estrita. Isso permitiu usar o avatar real já existente no ensaio sem alterar o seu arquivo original ou enfraquecer o leitor de imagens.

## Verificação e revisão

- Suíte completa do motor: **176 testes / 4.076 verificações**, sem falhas. Tipagem e Biome passaram nos arquivos alterados.
- Fixture próprio com **65.001 vértices**: partes de **64.998 e 3 vértices**, 21.667 triângulos, um esqueleto e um clipe com movimento do corpo, rotação de osso e morph. O GLB foi gerado e reaberto no Chrome headless local. Nas amostras dos quatro instantes, diferença máxima medida **0 m**. Validador Khronos: **zero erros e zero avisos**. [Resultado](evidencias/lote8-animacao/resultado.json), [validação](evidencias/lote8-animacao/validacao-khronos.json).
- Cute Characters real do ensaio privado: **seis peças**, 5.810 triângulos, altura original e compilada **1,1700404965322315 m**. Preservados `parado_relaxado`, `andar_frente`, `correr_frente` e `pulo_no_ar`. Três instantes de cada clipe foram comparados nas peças, com diferença máxima medida **0 m** nas amostras. Validador: **zero erros e zero avisos**, com duas informações sobre UVs preservados que o material atual não usa. [Resultado](evidencias/lote8-animacao/cute-resultado.json), [validação](evidencias/lote8-animacao/cute-validacao-khronos.json).
- Os GLBs reais de entrada/saída permanecem em `output`, privados. Somente medições foram versionadas. Os testes não alteram a personalização, velocidade, controlador ou avatar da plataforma.

Estas verificações demonstram preservação dos dados e do movimento amostrado. **Não constituem aprovação perceptiva de animação/IK**, desempenho em aparelhos físicos ou aceite artístico da Faísca. Segue exclusivamente 8.2: integrar objetos, acabamentos e colisões no pacote completo e concluir comparações/ciclos antes de 8.3. Os demais destinos, lotes 9–10 e encerramento global continuam pendentes.
