# Lote 7 — Palco, gestos, câmeras e inspeção física

18/11/2026. **Recorte 7.2 implementado, testado e revisado. Lote 7 continua aberto**, com iluminação (7.3), interface (7.4) e fechamento integral (7.5) pendentes. Complementa o [checkpoint das guias](checkpoint-lote7-guias.md).

## Entrega deste recorte

- Marcadores entram nos alvos comuns do palco: seleção por ponto/área/laço, enquadramento e gizmos. Giro exclusivamente vertical; tamanho altera dimensões locais de zona/rota/régua, com escala uniforme para esfera e referência humana. Câmera/luz/ponto/início não oferecem escala indevida. Seleção mista não move silenciosamente só uma parte suportada.
- Movimento horizontal de marcador no chão conserva o desnível da raiz; movimento vertical edita esse desnível. A prévia da rota acompanha o relevo sem multiplicar sua altura ao escalar a rota. O gesto gera os comandos existentes de marcador na mesma fila de autoria dos objetos.
- Escape, segundo dedo e cabeça nova cancelam o gizmo sem publicar um estado intermediário. Callbacks e recursos têm descarte no encerramento do palco.
- Rotas e zonas poligonais reutilizam `EdicaoDePontos`/`CapturedPaintInput`. Conversão mundo/local conserva giro e compensação do relevo. A captura admite conservar a distância ao chão ou desenhar no plano horizontal da zona; não cria outro motor de gestos.
- Câmera autoral possui captura/restauração de posição, alvo e campo de visão, com validação e isolamento do Testar. Alvo mundial é convertido para vetor local corretamente ao guardar a câmera.
- Testar usa o início principal visível, ou um início secundário explícito; coordenadas explícitas do host têm prioridade. A direção inicial acompanha a seta. O GLB do personagem conserva seu tamanho nativo.
- Régua calcula distância em metros; rota fornece trechos e total usando a amostragem real sobre o relevo. Referência humana usa sua altura em metros, testada no laboratório com 1,17 m; o personagem real da Faísca mediu 1,1700405 m.
- Colisões visíveis usam o mesmo preparo de fontes do Testar: nenhuma, caixa, cápsula ou triângulos reais, incluindo terreno, caminhos e água. Desenho agrupado, sem novos colisores, sem tocar nas geometrias originais. Respeita `drawRange`, índices e matrizes, inclusive espelhamento.
- Guias e colisões ficam fora dos retratos e do Testar. O retorno conserva a câmera de edição e a visibilidade anterior.

## Correções encontradas na revisão

Uma escultura na raiz de uma rota podia não invalidar seu cache quando os controles ficavam longe dela. O teste reproduziu um desvio de cinco metros e passou após incluir a raiz na região de dependência do cache. Conferidos os modos livre e apoiado no chão.

A inspeção de colisões registrava uma geometria vazia no renderer após limpar. Ocultar também o desenho vazio liberou o recurso GPU observado. Três ciclos mostraram uma geometria adicional durante a inspeção e retorno à contagem anterior ao limpar, sem crescimento acumulado.

## Verificação fresca

| Verificação | Resultado |
| --- | --- |
| Núcleo | 303 testes; 10.364 asserções; zero falhas |
| Motor | 139 testes; 3.888 asserções; zero falhas |
| Oficina | 102 testes; 661 asserções; zero falhas |
| Tipagem | Núcleo, motor e oficina aprovados |
| Build | Aprovado; aviso de chunks acima de 500 kB permanece |
| Workers compilados | Terreno, PNG16, água e caminhos; quatro workers, sem erro |
| Gestos no Chrome | Arraste de gizmo pelo mouse, tamanho, undo, Escape, segundo dedo, cabeça nova, câmera e início/direção; sem erro |
| Pontos no Chrome | Controle elevado conserva 1,5 m; cancelamento por Escape/toque; criação no plano da zona a 2 m |
| Recursos | Guias: 2 geometrias/0 texturas; inspeção acrescenta 1 geometria e libera ao limpar, em três ciclos |
| Regressão de caminhos | Edição de alças, histórico, terrain worker, cancelamento e recursos; sem erro |
| Faísca real | Avatar nativo; praça, horta, ponte ida/volta e subida do Farol; autoria preservada, sem erro |

Percursos medidos nesta execução: porta–praça 12,63 m; praça–horta 19,36 m; percurso horta–ponte 43,13 m. Altura final na subida do Farol: 9,61 m. São medidas da execução, não uma mudança de geografia ou velocidade.

## Evidências e limites

[Gestos e câmera](evidencias/lote7-palco/gestos.json), [recursos](evidencias/lote7-palco/recursos.json), [regressão da Faísca](evidencias/lote7-palco/regressao-faisca.json), [gizmo](evidencias/lote7-palco/gizmo.png), [alças](evidencias/lote7-palco/pontos.png) e [vídeo dos gestos](evidencias/lote7-palco/gestos.mp4). Os PNGs/vídeo de guias são laboratório do motor, não a interface final nem a composição artística da Faísca. Os scripts reproduzíveis estão em `playground/oficina/verificar-marcadores-{palco,gestos}.mjs`.

A inspeção integral limita o desenho a 200 mil triângulos e informa erro antes de alocar ou mostrar uma representação parcial. Não se trata do orçamento de exportação nem de aprovação do desempenho em dispositivos físicos. Os controles para expor o estado/erro, os painéis de autoria, a referência de altura conforme o personagem escolhido e a escolha de início na interface pertencem a 7.4.

Nenhuma luz local foi renderizada neste recorte: seu símbolo editorial continua sendo somente uma guia. Não houve alteração de identidade Kids/adulta, narrativa, inventário ou velocidades. Implantação e validação remotas continuam reservadas ao fechamento global.
