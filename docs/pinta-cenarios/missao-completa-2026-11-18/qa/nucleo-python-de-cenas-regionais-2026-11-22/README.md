# Núcleo Python de cenas regionais

O template interno `packages/pinta/src/export/pythonSceneRuntime.ts` recebe um mundo admitido por `pythonRegionWorld.ts`. O lote foi verificado em CPython 3.12 com pygame-ce 2.5.8, sobre o loader `d266d82f2`.

## Contrato dos adaptadores

`CenaRegional(mundo, mapa_id=None)` seleciona o ID da raiz por padrão. O componente trabalha com os índices e as imagens do snapshot confirmado pelo loader. As coordenadas do jogo já incluem a escala de exportação e conservam a origem assinada do mundo.

`desenhar(draw_affine, viewport, camera=(0, 0), frente=False, tempo=0)` visita a passagem desejada. O viewport informa largura e altura do palco em pixels. A câmera indica seu canto superior esquerdo no mundo e o tempo está em milissegundos desde a abertura. O programa pode desenhar personagens entre as duas passagens.

O callback recebe `(url, (sx, sy, w, h), (a, b, c, d, e, f), opacidade)`. A origem local do recorte é a aresta superior esquerda da região escolhida no PNG original. Um ponto local `(u,v)` chega ao palco em `(a*u+c*v+e, b*u+d*v+f)`. O backend encontra os bytes em `mundo['images'][url]['png']`, usa vizinho mais próximo e aplica a opacidade de 0 a 1.

| Consulta | Resultado |
| --- | --- |
| `limites`, `tamanho_peca`, `fisica` | Retângulo assinado `(x,y,w,h)`, lado da peça em pixels do jogo e modo autoral |
| `objetos(tipo=None)`, `objeto_por_id(id)` | Iterador de cópias posicionadas e consulta da primeira ocorrência, incluindo IDs e referências locais de instâncias |
| `ponto_inicial()` | `(x,y)` do primeiro objeto com papel `start` ou tipo `inicio`. Na ausência dele, centro da célula válida mais próxima de `(0,0)` |
| `propriedade(obj,chave)`, `propriedade_camada(id,chave)`, `propriedade_peca(id,peca,chave)` | Valor da propriedade, incluindo zero e falso, ou `None` |
| `recurso_imagem(id)` | URL da folha/arte identificada, inclusive versões capturadas |
| `bloqueado(corpo)` | Interseção de `(x,y,w,h)` com os limites e as peças sólidas. Física precisa também consulta os contornos autorais |
| `pouso(anterior,atual,gravidade=1)` | Retângulo apoiado ou `None`. A física legada e a gravidade zero deixam o corpo passar |

A travessia considera a visibilidade herdada e o deslocamento físico dos grupos. A câmera, a opacidade e o parallax participam da composição visual. Cada conjunto usa a própria origem, com escala, rotação e reflexo da instância. O recorte inverso limita as células consultadas, inclusive dentro de conjuntos. A seleção de destinos de portas, movimento de personagens e armazenamento de estado pertencem ao programa.

## Ensaios

- A Vila e a Cabana reais abrem a partir do mesmo PNG 5 com os IDs, propriedades e posições iniciais do Core. Cada mapa emite operações referenciando imagens admitidas.
- O compositor TypeScript e o stream Python produziram pixels RGBA idênticos em oito passagens de 138 × 112 a 2×. Os casos incluem duas folhas distintas, arte animada, câmera assinada, parallax e opacidade herdados, os oito espelhos/giros, colisão invisível e conjunto refletido com filho rotacionado.
- Em 2×, 554 caixas e 333 ensaios de plataforma foram comparados ao Core, incluindo gravidade invertida, ausência de gravidade, elipse, peças inclinadas e conjunto com origem distinta da raiz.
- No modo legado, ultrapassar qualquer das quatro bordas assinadas por um quarto de pixel bloqueia o corpo. O controle executa também a fachada publicada `Mapa.bloqueado`, que aplica os limites em ambas as versões. Na implementação interna `Mundo.bloqueado`, a versão 2 permite esse corpo externo e a versão 3 o bloqueia.
- A comparação com o `Mundo` histórico executou pygame-ce real para cenas 2 e 3. Seis passagens tiveram pixels RGBA iguais. Foram comparadas 3.720 colisões internas e 2.430 consultas de plataforma. Os corpos desse controle usam coordenadas inteiras. O núcleo regional usa o limiar de apoio em precisão dupla do Core.
- Em 10.000 × 10.000 com 32 camadas e 4 MiB de índices, o viewport de uma peça desenhou 32 comandos. O viewport distante e vazio acrescentou zero. O pico de alocações Python medido por `tracemalloc`, após a admissão, ficou abaixo de 2 MiB nesse percurso. No ensaio separado com arte distante, a consulta ao leitor ocupou no máximo 7 × 6 células por janela.
- Com `PYTHON` apontando para o ambiente com pygame-ce, `bun test src/export/pythonSceneRuntime.test.ts src/export/pythonSceneGeometry.test.ts src/export/pythonRegionWorld.test.ts` passou nos 21 casos. Biome conferiu os quatro arquivos TypeScript. O teste RGBA usa um canvas nativo como consumidor dos comandos. A qualificação final de cada backend, publicação e atualização de jogos continua na integração.
