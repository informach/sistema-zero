# Revisão de limites de poses bbmodel — lote 208

Implementação, review e verificações concluídos em 09/09/2026.

## Escopo

`assessBbmodelAnimationBounds` recebe nós/clipes/malhas nativos imutáveis de uma
mesma conversão estrita. É específico do caminho bbmodel TRS local, sem skins.
Não é leitor de documentos desconhecidos nem análise de deformação de skins,
local-delta ou bases afins. Não transfere/quantiza/clampa dados e não aprova
fidelidade das curvas de origem, normais, câmera ou GPU.

Clipes locais e bases TRS são conferidos antes da geometria. Hierarquia é
indexada uma vez; coordenadas de todas as malhas são varridas uma vez por chamada,
incluindo vértices autorais sem face. Cada clipe tem máximos próprios dos canais
de posição/escala; não misturar máximos de clipes independentes. Filhos sem
trilhas continuam na propagação. Não há agenda temporal nem geometria por frame.

## Envelope conservador

Máximos absolutos por componente envolvem as interpolações nativas step/linear/
smooth, com margem de arredondamento. Escala usa o maior módulo dos eixos;
posição e geometria usam a soma de máximos absolutos como raio que envolve a
norma euclidiana. Esse raio pode conter combinações de coordenadas impossíveis
na fonte; ele é propositalmente conservador, não um extremo geométrico exato.

A norma de rotação considera a tolerância unitária nativa. Para q não exatamente
unitário, R(q)=s R(q/sqrt(s))+(1-s)I, s=|q|², logo sua norma é no máximo
1+4t+2t² para |q|<=1+t. A constante de tolerância (1e-6) agora é compartilhada
entre composição de matriz e leitura de chaves, sem mudar o valor aceito.
Não multiplicar sqrt(3) por grupo: hierarquias longas de rotações unitárias não
devem acumular artificialmente uma norma de Frobenius a cada nível.

Produtos de escalas envolvem a parte linear mundial. Posição mundial usa o
raio do pai mais sua norma linear vezes o raio local. Pontos acrescentam a norma
mundial vezes o raio da geometria. Aritmética positiva arredonda para o próximo
F64: buffer privado de oito bytes, carry entre palavras de 32 bits, zeros
exatos preservados e produto positivo subnormal nunca reduzido a zero no envelope.
Há margem conservadora 1/(1-64*EPSILON) para as fórmulas pequenas de composição,
produto afim e interpolação; cada resultado limitado usa menos de 64 operações
elementares. Não é tolerância para alterar o dado de origem.

Normas de escala/posição/pontos acima do maior F32 finito ou não finitas recusam
a análise. A mensagem diz que não foi possível garantir a faixa. Uma recusa
conservadora NÃO prova que uma pose real estourou: cancelamentos de translação,
correlações entre canais e eixos podem tornar o envelope maior que as poses.
Também não é certificação dos cálculos de shader, matriz de câmera ou normais.

## Review e evidências

- 257 poses densas do player nativo com rotações, smooth/step, escalas negativas
  e descendente não animado. Colunas das matrizes, translações e pontos dentro
  do envelope; dados intactos. Não confundir teste denso com solver de extremos.
- Contraprova: rotação de vetor [2,5e38,2,5e38,0] tem extremos representáveis,
  mas o meio ultrapassa F32. Conferir somente chaves autorais perderia o caso.
- Produtos de escalas locais finitas, translação de filhos e vértice não usado
  pela superfície também provocam recusa quando necessário. Outro teste demonstra
  recusa conservadora mesmo quando translações reais se cancelam.
- Clipes independentes, escala zero, arredondamento de produtos subnormais,
  tolerância de quaternion, 128 níveis com norma <1,001 e leitura de coordenadas
  uma vez em 64 clipes (FPS envenenado prova ausência de agenda).
- Integração nas três versões: arquivo real -> documento estático -> conversão
  de clipes -> leitura nativa -> poses de cubo contidas, fonte e bytes intactos.
- Primeira rodada núcleo/matriz/leitor: 26 passes, zero falhas, 12.836 asserts,
  629 ms (`b961e8`). Depois integração/numéricos: 13/0 (`a9b317`). Review criou
  regressão de recusa antes da geometria: falhou (`a0150c`); pré-validação de
  modos corrigida, final local **14/0, 5.452 asserts, 465 ms** (`8cdec4`).
- Tipos finais exit 0 (`5e7139`/`1aacba`). Biome **1.066 arquivos**, exit 0
  (`a7dece`). Focal **316 passes, zero falhas, 23.744 asserts, 19 arquivos,
  8,96 s** (`97624a`). Integral **2.605 passes, zero falhas, 8.345.637 asserts,
  340 arquivos, 162,89 s**, exit 0 (`0a37c4`).
- Vite **1,34 s**, exit 0 (`3267f4`); worker bbmodel 171,29 kB, glTF 182,98 kB,
  OBJ 157,51 kB e CSS 53,86 kB inalterados. A tolerância compartilhada mudou os
  chunks matrix (2,11 -> 2,13 kB) e readAnimation (1,71 -> 1,75 kB). Three
  continua com aviso de tamanho (579,29 kB). Sem alegação de ganho de desempenho.
- Kids exit 0 (`962d3a`): compilação 6,2 s, tipos 13,8 s, 59 páginas em 730 ms.
  Diff exit 0 (`7eca78`), somente os três avisos CRLF preexistentes. Ausência de
  avisos act nesta integral não comprova correção da interação aberta no lote 203.

## Próxima integração

Aplicar a proteção ao candidato do importador completo antes de entregá-lo à
prévia/adoção. Somar os relatórios de clipe e de bounds aos demais stages; atualizar
contrato do worker e escolhas da oficina. Até lá, conversão de clipes continua
privada e importador existente continua estático. Sem benchmark comparativo,
browser/GPU/toque/hardware, homologação infantil ou ativação pública.
