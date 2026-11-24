# Caminhos: preparo puro e moldagem de estrada

18/11/2026. Continuação exclusiva do lote 6, sobre staging `78df8cd6d`. O merge de Estúdio recebido durante a execução foi conferido; não alterou os arquivos deste recorte.

## Implementado, testado e revisado neste recorte

- `prepararOperacaoDeCaminho` recebe o descritor autoral das seis variantes e devolve o caminho, resumo e regiões. Apenas estrada devolve um campo modificado, sempre em cópia; pintura e buracos são preservados.
- A estrada usa o molde do núcleo do Claude: nivela transversalmente o leito, alisa o perfil longitudinal e transiciona pelos taludes. Não altera as velocidades, geografia ou controlador do jogo.
- Antes de copiar o campo, confere cobertura do eixo, até 20 mil estações, 16 milhões de visitas e 2 milhões de amostras na área de trabalho. Operações maiores pedem divisão em trechos; não chegam à alocação dos buffers de moldagem.
- Ponte mede o vão entre cabeceiras e informa invasão pelo terreno. Cercas e muros recusam mais de 20 mil peças antes de gerar os módulos.
- A mesma topologia confere controles repetidos e praças inválidas. A validação de praça usa coordenadas relativas para conservar precisão longe da origem; suavização não substitui os controles autorais.

Oito testes novos conferem as seis variantes, imutabilidade da origem, nivelamento e exterior conservado, fechamento da estrada, pintura/buracos, limites e cobertura, invasão do tabuleiro, orçamento de módulos e praça pequena distante. Núcleo: **220 testes, 8.564 asserções**, sem falhas. Tipagem do núcleo e Biome passaram. A revisão conferiu os limites antes da cópia, o fechamento e a ausência de efeitos sobre a origem.

## Ainda pendente

**6.1 continua aberto.** Este recorte não desenha caminhos novos, não publica arquivos, não acrescenta uma interface nem integra a física. Geometria coerente com os triângulos do chão, estruturas/apoios e clipboard ainda fazem parte de 6.1; seguem depois desenho, edição de pontos/worker, interface e fechamento do lote. Não há aceite artístico ou validação de implantação por estes testes.
