# Lote 8.2 — Compilador integrado e primeira prova do pacote

18/11/2026. Branch `staging`, base `dc5d0f218`, conferida sem divergência com `origin/staging` antes da alteração. **Lote 8 permanece aberto; este checkpoint não encerra 8.2 nem antecipa implantação.**

## O que entrou

`@sistemazero/molda-cenarios-motor/compilar` agora expõe `compilarCenario`, portas de conteúdo/progresso e o conferidor de conteúdo. A rotina recebe documento, fonte/revisão, contexto de licenças, portas autorizadas e cancelamento. Retorna manifesto, bytes próprios e avisos do gerador original. Não depende do estado privado do Palco, da câmera nem de um renderer WebGL ativo. O encoder de imagens/GLB ainda exige as APIs de navegador indicadas no plano.

A montagem conecta os componentes dos checkpoints anteriores:

- Carregamento/conferência por hash, preparação de apoios e conjuntos, ocultação herdada e procedência.
- Templates locais compartilhados entre instâncias; variantes de aparência/reflexo; atores conservam hierarquia, skin, morphs e clipes. O perfil pode identificar atores estáticos sem introduzir regras do Arquipélago no motor.
- Terreno visual por setores, pintura portátil com pixels reais, campo Float32, PNG16, cobertura, recortes e máscara de buracos. Colisão permanece independente dos recortes visuais sob caminhos.
- Piso plano finito vindo da mesma fábrica do Palco. Seu tamanho e collider ficam explícitos no manifesto; o plano exterior decorativo/grade do editor não são exportados.
- Caminhos e estruturas dos geradores existentes. A identificação das fontes físicas permite conservar suas entidades no manifesto.
- Lâminas, margens sólidas e decoração da água tratadas separadamente. Oceano próximo ao relevo usa partes menores; fundo constante usa faixas sem mapas ociosos. Lagos e rios extensos recortam os triângulos existentes em regiões de até 64 m, sem outro gerador de água.
- Arquivos deduplicados por conteúdo/papel/MIME, conferência integral de inventário e conteúdo antes de entregar o pacote, descarte em `finally`. Cancelamento não retorna manifesto parcial. Texturas usadas e panorama conservam IDs e procedência.

## Dois defeitos encontrados na prova integrada

**Piso XY rotacionado.** O piso plano do editor guarda a rotação no nó; os primeiros recortes pressupunham geometria local XZ. A vista geral quase escondia a falha, mas a aproximação mostrava grama sob a trilha. O recorte passou a usar eixos horizontais do mundo, com origem local para conservar precisão. O teste cobre piso rotacionado perto de −90 km/60 km, área removida e consulta física. Não houve deslocamento arbitrário em Y.

O erro médio das câmeras próximas caiu de aproximadamente 0,201/0,324 para 0,000098/0,000208 em canais de 8 bits. A física do piso inteiro permaneceu igual.

**Recompressão das imagens.** O GLTFExporter escolhe encoder pelo `mimeType` da textura. As fontes WebP eram recomprimidas e seis arquivos do ensaio recebiam `IMAGE_FEATURES_UNSUPPORTED` no validador. A gravação passou a preparar cópias de materiais/texturas com PNG sem perdas; restaura as ligações da raiz preparada e descarta essas cópias mesmo em falha. Não modifica bytes, imagens, materiais ou metadados do acervo. O teste confere compartilhamento, restauração e descarte único. O pacote de catálogo cresceu de cerca de 3,73 MB para 6,65 MB; os limites de destino devem medir esse tamanho real.

## Provas executadas

Script reproduzível: `packages/molda-cenarios/playground/oficina/verificar-compilacao-integrada.mjs`, com a oficina local em `4541`. Sem variável de ambiente executa a fixture própria de piso plano. `CENARIOS_QA_TERRENO=1` executa a fixture com recursos privados locais; os GLBs exportados ficam somente em `output`.

| Medida | Piso plano próprio | Terreno + catálogo |
|---|---:|---:|
| Ciclos completos | 3 | 3 |
| Cancelamentos antes da entrega | 3 | 3 |
| Arquivos por pacote | 6 | 25 |
| Bytes por pacote | 12.208 | 6.654.785 |
| Nós visuais / colisões | 5 / 3 | 18 / 7 |
| GLBs validados pelo Khronos | 6 | 21 |
| Erros / avisos do validador | 0 / 0 | 0 / 0 |

Inventário/bytes, contagem e descarte se repetiram nos três ciclos. O pacote foi reaberto pelo leitor GLB sem o palco autoral. As caixas mundiais foram comparadas com o manifesto. As consultas físicas verificaram objetos e chão; o ensaio de terreno confirmou cotas, limite finito e um buraco aberto. As duas caixas iguais compartilham o arquivo visual.

A fixture de catálogo combina relevo, recorte, máscara, pintura de duas camadas com pesos variáveis e textura própria, panorama 2:1, trilha, ponte do Adventure Land, lago `lago_nadavel` do Reino e suas margens, Cute Characters espelhado com os quatro clipes e conjunto girado. O contrato atual exige escala uniforme na raiz de uma montagem; a prova respeita esse contrato e usa escala por eixo na peça interna. Não foi alterada essa regra para satisfazer a fixture.

Nos ciclos, o pacote de catálogo alocou 22 geometrias e 17 texturas no renderer. Depois do descarte voltou a 0 geometrias e 1 textura, a mesma base aquecida. Essa textura é a `DFG_LUT` interna do Three r184, conferida no código instalado; `renderer.dispose()` levou ambos os contadores a zero. Isso verifica recursos GPU desses ensaios, não equivale a medição de heap estável ou desempenho em aparelhos físicos.

### Mesmas câmeras, antes e depois

| Fixture / câmera | Erro médio por canal | Canais com diferença > 16 |
|---|---:|---:|
| Plano geral | 0,000123 | 2 |
| Plano aproximação | 0,000098 | 2 |
| Plano rasante | 0,000208 | 4 |
| Catálogo geral | 0,092107 | 2 |
| Catálogo aproximação | 0,133899 | 0 |
| Catálogo rasante | 0,119044 | 1 |

Comparativos versionados: [plano](evidencias/lote8-integracao/plano/resultado.json), [terreno/catálogo](evidencias/lote8-integracao/terreno/resultado.json). [Plano antes](evidencias/lote8-integracao/plano/aproximacao-antes.png), [plano reaberto](evidencias/lote8-integracao/plano/aproximacao-depois.png), [catálogo antes](evidencias/lote8-integracao/terreno/geral-antes.png), [catálogo reaberto](evidencias/lote8-integracao/terreno/geral-depois.png). Os dois diretórios incluem também vistas rasantes e os relatórios Khronos por arquivo.

O ensaio anterior de encontro de trilhas em terreno foi repetido após a correção: **0 diferença nas três câmeras**, 8.575 triângulos e máximo de 21.651 vértices por parte. Os testes incluem rio extenso recortado com área/cotas/UVs preservados e recusa de licença restrita, fonte divergente, hash de alturas trocado e cancelamento anterior a qualquer leitura.

### Regressão local

- Núcleo: **347 testes, 10.576 asserções**, sem falhas.
- Motor: **226 testes, 4.732 asserções**, sem falhas.
- Oficina: **110 testes, 735 asserções**, sem falhas.
- Tipagem dos três pacotes aprovada. Build da oficina/workers aprovado; permanece o aviso já existente de chunks acima de 500 kB.

## Revisão e limites desta entrega

Revisão das matrizes locais/mundiais, recursos emprestados/próprios, caches, fontes físicas, lados opacos/translúcidos e restauração após erro. Superfícies transparentes ou recortadas por alpha não removem chão do piso plano; atores móveis também não deixam furos. Um recorte que cobre todo o visual não elimina a colisão.

As capturas são fixtures técnicas, **não uma nova composição da Faísca nem aprovação artística**. A comparação congela as ondas; a restauração dinâmica continua responsabilidade do runtime a implementar. Não há ainda ZIP jogável, arquivo único, runtime Raylib, importação `scene3d` ou publicação do jogo. Não houve implantação, validação remota ou teste de FPS em dispositivo físico.

**8.2 continua ativo:** falta concluir a opção de junção estática por região/material com preservação de identidade, ampliar a prova de caminho de catálogo conformado/apoio estrutural e conferir os casos restantes antes do fechamento. Em seguida vêm os consumidores e destinos de 8.3–8.5. Lotes 9–10 e encerramento global permanecem pendentes.
