# Revisão integrada intermediária — 22/11

O [índice](index.json) fixa o checkout, os hashes das fontes Git e 25 recibos
comprimidos. O hash do conteúdo descomprimido também é registrado. Esta rodada
incorpora a staging `208c8571a`. Não é o encerramento da missão ou do rollout.

- Backend: PostgreSQL real, 21 casos/132 asserções; composição HTTP, um caso/30;
  armazenamento MinIO real, um caso/19. Não houve login de staging nesta rodada.
- Cliente: cinco ensaios de Chrome com IndexedDB real no candidato terminal
  `5ef94cc85`; gates focados do transporte, autenticação e arquivos nativos.
- Runtime reconstruído: 126 arquivos conferidos por hash; quatro ensaios
  regionais CE, oito de Pygame Zero/Raylib 2D e 32 de regressão Python em Chrome
  e Chromium. Incluem PyDew Valley, mundos e física. A distribuição permanece
  privada e não altera o catálogo ou a versão pública do motor.
- Tipos do Core e Pinta passaram nos pontos registrados. O log de Member Shell
  conserva cinco erros de tipagem de fixtures para correção. A suíte completa
  do Core arquivada precede a incorporação de `208c8571a`; a suíte completa do
  Pinta ainda não foi repetida neste corte causal.

A revisão independente encontrou perdas que estes testes não cobriam quando
um escritor anterior substitui o documento local de uma unidade pendente.
[Negativos reproduzíveis e critérios da correção](../../../revisao-2026-11-18/qa/nuvem-causal-cliente/README.md).
O novo snapshot durável da ponta da fila e sua recuperação precisam de replay
verde e revisão antes de ativar o candidato. Não interpretar os testes de
navegador aprovados como prova de ausência dessa falha.

Os ensaios foram feitos nesta máquina. Não houve teste com crianças, aparelhos
físicos adicionais, queda de energia ou quota física esgotada. Os programas
externos Tiled/Phaser/Pygame/Godot têm relatórios próprios, anteriores à promoção
regional; não foram requalificados por esta rodada.
