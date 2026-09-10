# Revisão de amostragem matemática bbmodel — lote 203

Implementação, review e verificações concluídos; homologação visual/hardware pendente.

## Decisão de conversão

`sampleBbmodelContinuousTrack` é adaptação matemática, não emulação da reprodução
do Blockbench. Não adotar clipes com esse avaliador sem escolha explícita e
relatório da conversão. Não reproduz snap temporal 1/1200, tabela Bezier de 201
pontos ou deslocamento de segmento Catmull quando um ponto pre/post exclui um
vizinho. Não promete equivalência visual/bit a bit com esses comportamentos.

Contrato: descritores numéricos ordenados/orçados e imutáveis do lote 202. Tempo
finito conferido antes de ler a trilha. Busca binária encontra o intervalo; tempo
exato usa pre, instante posterior usa post, extremos mantêm o ponto do lado
correspondente. Trilha vazia retorna null, não identidade nem chave inventada.
Degrau anterior prevalece; Catmull em qualquer extremo prevalece sobre Bezier,
seguido por linear. Graus Euler permanecem graus, sem envolver rotações.

Catmull-Rom usa base Hermite com tangentes uniformes, tempo normalizado no
segmento atual e duplicação do extremo quando não há vizinho. Pre/post quebra
a tangente daquele lado, não muda o segmento. Vizinho em loop é escolha explícita
do chamador e só afeta Catmull com ao menos três chaves; não envolve tempo nem
transforma o primeiro/último intervalo em reprodução cíclica.

Bezier usa handles independentes por eixo e defaults da origem em extremos
mistos. Tempo é limitado ao segmento antes da divisão; valor não é limitado.
De Casteljau avalia a curva, e busca monótona por bisseção encontra o parâmetro
no tempo solicitado, incluindo alças cruzadas e derivada zero. Para ao encontrar
tempo representado igual ou limites double adjacentes; não usa epsilon absoluto,
tabela de amostras ou Newton sem garantia. Teto de 1.076 iterações decorre da
faixa F64 até subnormais, não do número de keys. No caso normal chega antes.

Mistura linear ponderada evita transbordar b-a; tangentes dividem extremos antes
da diferença. Operações continuam F64 com arredondamento normal de ponto flutuante,
não aritmética exata. Gap/razão temporal não representável, handle/resultado
não finito são diagnósticos, nunca zero, saturação ou XYZ parcial. Resultado de
curva aponta para a chave, sem supor que a fonte tem data_points (pode ser direta).

## Arquitetura e pesquisa

Busca O(log keys), apenas vizinhos necessários e espaço de trabalho constante.
Não ordena/copia trilha por amostra, não cria tabelas por segmento nem cache
global. XYZ de saída sempre próprio, inclusive em chaves exatas e extremos.
Sem leitura de textura, geometria, metadata/binding ou raw expressions.

Referência semântica: arquivos Blockbench fixados e registrados em
`bbmodel-animation-research.md`; nenhuma incorporação/execução GPL ou Molang.
Oracle matemático independente: Three.js **0.184.0** já instalado, MIT,
SplineCurve/CubicBezierCurve/getPoint. API consultada via Context7 e conferida
na fonte instalada; só os testes importam Three. Produção usa fórmulas
matemáticas próprias, sem dependência nova, DOM ou biblioteca de renderização.

Review conferiu precedências, pre/post, loop de vizinhos versus tempo, defaults
mistos, ownership, extremos F64, matriz de alças e busca sem varredura de pontos.
Primeira rodada teve **28 passes/1 falha** (`13c775`): teste exigia igualdade
binária entre mistura ponderada e expressão reduzida em MAX_VALUE. Diferiam em
um ULP, ambos finitos. A asserção passou a comparar razão com tolerância F64
estreita (15 casas), mantendo o teste de não transbordar; nenhuma mudança de
algoritmo para imitar o arredondamento da expressão esperada.

## Evidências

- Avaliador: **29 passes, zero falhas, 3.924 asserts, 504 ms** (`ee89a7`).
- Três versões pelo pipeline real, extremos/tempo exato, pre/post/step, Catmull
  não uniforme/loop/misto, centenas de comparações independentes por eixo,
  sete pares de alças Bezier (cruzadas, fora de faixa, extremas/defaults),
  tempo 1e-300 e overflow/razão inválida sem retorno parcial.
- Teste de **8.192 chaves** limita leituras de tempo a log2(N)+6 e envenena pontos
  fora do segmento. Prova de acesso, não benchmark de tempo/RAM nem hardware.
- Review ajustou path de resultado derivado para a chave; verificações finais
  depois do ajuste: tipos exit 0 (`39a715`/`7a2742`), Biome **1.048 arquivos**, exit 0
  (`835c67`), focal **249 passes, zero falhas, 15.502 asserts, 13 arquivos,
  8,25 s** (`803986`).
- Integral **2.530 passes, zero falhas, 8.335.956 asserts, 333 arquivos,
  164,49 s** (`fd7488`). Duração não é benchmark comparativo.
- Integral exibiu avisos React de updates fora de act durante TextureEditor
  (LoadedEditor/EditorTopBar/FacePaintDialog/ModelEditor). Arquivo não alterado;
  inspeção e execução isolada: **16 passes, zero falhas, 203 asserts, 10,58 s**, sem
  os avisos (`b8e67f`). Isso não prova correção nem identifica a causa; manter a
  pendência de investigação da interação da suíte, sem suprimir console ou inserir
  esperas. Não há UI/React no grafo novo de amostragem, conforme pureza.
- Vite **1,15 s**, exit 0 (`27e7e5`); CSS 53,86 kB, worker BB 171,29 kB,
  painel 46,47 kB, index 360,81 kB, Three 579,29 kB com aviso >500 kB, inalterados.
- Kids: compilação **6,6 s**, tipos **29,7 s**, 59 páginas em 404 ms, exit 0
  (`590fc3`/`6e4b84`). Tempo de build não isola performance da implementação.
- Diff exit 0 (`b7086a`), apenas três avisos CRLF anteriores.

## Limitações

Ainda não converte para clips nativos ou liga a UI. Faltam duração/modos de
reprodução, pose-base/quaternions/global, agenda/FPS e orçamento nativo conjunto,
políticas/remainder/relatório/worker/consentimento. Não pressupor que uma curva
avaliável caiba no domínio nativo ou que resampling preserve descontinuidades.
Sem promessa de performance em GPU/toque, usabilidade infantil ou ativação pública.
