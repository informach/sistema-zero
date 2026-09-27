# Orientação de imagens e UV no intercâmbio, lote 187

## Causa e contrato corrigido

O editor nativo já mantém pixels bottom-up: a linha zero corresponde à parte de
baixo da imagem, com V crescente para cima. Isso é usado por importação de canvas,
SceneImagePreview, pintura e recortes de flipbook. Os importadores glTF/OBJ ainda
guardavam pixels top-down e compensavam no UV. A imagem aparecia invertida no
editor 2D, embora o modelo 3D e um roundtrip entre as duas pontas erradas passassem.

Regressão inicial: um teste passou e cinco falharam. A verificação usa o componente
SceneImagePreview real, interceptando apenas a escrita no canvas, imagens assimétricas
e UVs em centros de texel. Um documento nativo construído independentemente é exportado;
o GLB e o PNG são lidos por leitores separados, incluindo libvips/sharp e Khronos Validator.

| Fronteira | Pixels entregues | UV entregue | Normal Y |
| --- | --- | --- | --- |
| Decoder PNG/JPEG neutro | Top-down, sem alteração | Não se aplica | Canais originais |
| glTF → documento nativo | Bottom-up | (u, 1-v), após bake | normalFlipY=true |
| OBJ → documento nativo | Bottom-up | UV original com escala/offset MTL | Flip apenas para fonte negativa |
| Documento nativo → GLB | PNG top-down | (u, 1-v) | Inverter G se normalFlipY não for true |

A origem superior esquerda do UV glTF e a definição da base tangente constam na
[especificação Khronos glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images).
A reflexão de V troca a orientação da bitangente; o sinal de G compensa essa mudança
sem alterar o relevo. A flag não é uma licença para espelhar o arquivo de imagem.

## Implementação e review

reverseRgbaRowsInPlace fica no núcleo puro e modifica somente o buffer derivado,
com uma linha temporária. Dimensões e comprimento são conferidos antes da escrita;
subarrays não afetam bytes vizinhos. Alpha, quantização, fatores de cor e composição
continuam iguais. Decoders, arquivos de entrada, camadas do documento e caches
emprestados não são modificados. Não há segundo formato de orientação no documento.

Exportação compõe/recorta no espaço nativo e inverte as linhas somente na emissão
central de PNG, incluindo mapas de rugosidade/metal combinados. UV exportado é uma
cópia Float32; UV autoral não é reescrito. Imagens importadas são invertidas após
a materialização completa, mantendo os orçamentos anteriores e a LUT de canais.

O review encontrou e corrigiu duas consequências do contrato:

- UV ausente continua sendo o fallback nativo (0,0); UV explicitamente autorado
  como zero é convertido para (0,1). Morphs são somados antes da reflexão. O leitor
  exige atributo-base para cada atributo de morph; não ampliar essa regra para
  justificar uma fixture inválida de target isolado.
- O leitor específico de detalhes do relatório do worker OBJ também validava
  o sinal antigo. Agora exige fonte negativa para flipY=true, mantendo a conferência
  adicional com o pedido e o material. Os testes continuam rejeitando sinais
  contraditórios, troca da escolha e campos ausentes/excedentes.

Testes de normais calculam bases tangentes com Three, independentemente do conversor,
e comparam vetores físicos em três pontos de uma imagem 2×2 após importação e três
exportações/reimportações. Cobrem entrada glTF e as duas flags nativas; os testes OBJ
mantêm escalas UV positivas/negativas em ambos os eixos e as duas convenções de fonte.
Isso é uma prova CPU para as fixtures, não homologação GPU nem equivalência universal
entre o shader derivativo nativo e MikkTSpace; o aviso de tangent space continua.

Expectativas antigas de linhas/UV foram atualizadas explicitamente; não foram
relaxadas tolerâncias ou removidas verificações de fonte, canais ou validação GLB.
O benchmark de materiais conserva os três hashes anteriores: calcula também o hash
das linhas em ordem top-down, independentemente da função de produção. Sua igualdade
prova que apenas a permutação de linhas mudou nessa fixture, incluindo os metadados.
O hash da saída canônica nova é emitido separadamente e conferido entre execuções.

## Limites

Não reescreve documentos existentes, não muda o formato público 1 nem ativa v2.
Bytes de GLB e imagens derivadas mudam intencionalmente. Em fronteiras exatas de
texel, a reflexão troca o lado de desempate do filtro NEAREST; não prometer igualdade
bit a bit para toda coordenada, nem introduzir epsilon/snap para esconder esse limite.
O editor/flipbook nativo não mudou; bbmodel ainda precisa normalização e materiais.
Sem nova dependência, migração, comunicação externa ou código GPL incorporado.

## Revisão dos goldens e evidências

Integral inicial: 2.261 passes e três falhas em goldens do encoder, não no novo
contrato de pixels. Comparação independente reverteu SOMENTE bytes de V e reproduziu
os hashes históricos dos dois GLBs Studio e da fixture de 65.536 chaves. As imagens
dessas fixtures não têm variação entre linhas; JSON, poses, clipes, pesos e outros
bytes ficaram idênticos. Os dois data URLs gravados foram atualizados, sem alterar
campos restantes ou código runtime do Studio. Os hashes antigos permanecem nos testes
sob essa transformação explícita; o hash novo do transporte também é fixado.

O helper de conferência inicialmente usou slice sobre Buffer, que compartilha memória.
Review identificou isso pela igualdade suspeita entre hash antigo e novo; a cópia agora
usa new Uint8Array. A prova foi refeita com imutabilidade explícita e os testes permanentes
também recebem Buffer. Não houve alteração das fontes nem das fixtures antes dessa prova.

Hashes Studio antigo → novo:

- Articulado: 842d68c8021d97a8313a53a7dd7c166ee5b7947946f06c2fe987b66f6d84e2ed →
  9ba06fbf0b99242b11a66c2c288275294ed797008ce9dcdde32eaaa5c7105952.
- Skin: 285d4bf449ce4b049880f21b3b95a7eb8610b3a38b6f4eede5cb985981435bf2 →
  855437cc4b6b70fc7eeacf30cca1a176c4d3daf0b5dd1cb4d17d7bd012931c49.

Focal do produtor: oito testes/64 asserts passaram; consumidor Studio: cinco testes,
2.087 asserts, 831 ms, zero falhas com loader/mixers reais (GPU simulada).

### Medições CPU

Bun 1.3.11, Windows, Ryzen 5 5600G. Materiais glTF, três aquecimentos e dez amostras;
IO/decode/hash/GC fora do tempo medido. Fonte intacta e três hashes históricos conferidos
pela ordem antiga de linhas. p50/p95 em ms:

| Imagem × usos | Antes | Depois |
| --- | --- | --- |
| 16² × 1 | 0,174 / 0,377 | 0,197 / 0,297 |
| 256² × 4 | 6,121 / 10,315 | 3,550 / 7,188 |
| 1024² × 8 | 75,514 / 101,148 | 104,314 / 114,834 |

A dispersão e processos externos ativos não permitem atribuir esses deltas somente
à mudança nem declarar ganho de velocidade. A operação adiciona uma passagem linear
com scratch de uma linha (até 4 KiB), não uma segunda cópia completa de 32 MiB.
Hashes canônicos novos, na mesma ordem: bd918314dc2a5b9342de0f536cc5355b1acc51e13bd14f05edd8c50eca4cc221,
fcd954a76f65b61ecf20daa5bab7e2842f48603998018109f5bacc3becfd0472 e
4777d1f57e02ffbd665de4836a605b8a74ba4a157597f6d0d033e2f899135381.

Worker GLB real, três aquecimentos/20 amostras por caso; bytes/report iguais ao
encoder direto e fonte intacta em todos. p50/p95 total: pequeno 52,438/57,574 ms;
9.216 faces 326,922/350,538 ms; 65.536 chaves+512² 240,701/268,596 ms;
65.536 chaves+oito camadas 1024² (32 MiB) 496,439/535,074 ms. Nesse caso extremo,
preparação síncrona 23,023/25,614 ms, envio 15,639/16,752 ms e intervalo máximo
observado do timer p95 35,950 ms. O caso de malha ainda custa p95 51,4 ms para
preparar/enviar; o benchmark não aprova latência de interação em navegador/hardware.

Tipos e Biome 975 passaram. Integral final: **2.264 passes, zero falhas, 310 arquivos,
8.253.397 asserts, 138,24 s**, exit 0. Vite 1,39 s: matrix 2,11 kB; worker GLB
74,11 kB, glTF 182,68 kB, OBJ 157,51 kB; Three 579,29 kB com o aviso anterior
de chunk >500 kB. Build Kids exit 0: compilação 5,8 s, tipos 9,3 s, 59 páginas
em 679 ms. Diff check passou com os três avisos CRLF anteriores.

O lote está concluído; homologação visual/GPU/toque e as fases completas não estão.
