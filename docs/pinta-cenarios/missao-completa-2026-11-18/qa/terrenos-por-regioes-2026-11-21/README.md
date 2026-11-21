# Terrenos no modelo interno por regiões

O mesmo paintTerrain agora usa o leitor comum de células e a edição atômica em
lote. Pincel, borracha e balde atravessam a origem negativa e as bordas dos chunks,
preservando a seleção determinística, vizinhos, arte alheia e snapshots. A busca
por encaixes é indexada uma vez, conservando a ordem das variações anteriores.
Nenhum componente ou estilo da oficina foi alterado.

Gestos e consultas inspecionam no máximo 65.536 casas. Falta de transição,
orçamento de trabalho ou de armazenamento recusam a operação inteira. O
collectTerrainRegion expõe o motivo da recusa; terrainRegion conserva a API
histórica de array. A propagação desses motivos na futura oficina expansível
ainda precisa ser integrada, junto dos demais consumidores.

## Revisão e verificação

- Comparação denso/regiões nos três modos de terreno, sementes, variações e
  apagamento; costuras negativas, árvore virada preservada, locks herdados,
  orçamento global de 2.048 chunks, recusa fracionária e falta de transições.
- O mapa denso anterior completo de 256 × 256 continua preenchível em um gesto.
- 36 testes focados passaram, com 590 asserções; tipos completos do Pinta e
  Biome dos três arquivos passaram.
- A suíte completa correta: 2.343 passaram, zero falhas, três controles nativos
  ignorados por padrão. Estes três passaram separadamente com Pygame real e
  SDL dummy, 4.372 asserções. Isso não é execução gráfica em outro aparelho.
- Seis ensaios de navegador passaram sem retries: desktop, toque emulado e
  CPU 4×, com duas folhas, materiais, gestos, prévia, cancelamento, histórico,
  reabertura e modelo de bosque. São ensaios da oficina densa atual.

A revisão retirou terrain.ts da lista de acesso cru: ele já não indexa nem
percorre buffers diretamente. O teste continua rejeitando novas leituras cruas.
A nova API de coleta também distingue recusa por trabalho de região vazia.

## Falhas conservadas e limites

A primeira reprodução contra o código anterior chegou ao balde sem teto de
trabalho; foi interrompida e o processo próprio terminou. A reprodução limitada
registrou quatro falhas reais antes da correção. A primeira suíte completa foi
invocada da raiz e não carregou o preload DOM do pacote (604 falhas); foi repetida
no diretório correto. A rodada seguinte apontou a entrada obsoleta na lista de
acesso cru e foi interrompida para revisão. A rodada final passou integralmente,
com os controles nativos executados à parte. Os logs anteriores continuam no índice.

O teste da operação máxima registrou aproximadamente 500 ms; é duração de teste,
não perfil de interação nem taxa de quadros. A meta de feedback de 100 ms para
mapas grandes continua pendente de otimização e medição no lote de desempenho.

Regiões continuam internas, fora da união pública e dos escritores. Este lote
não ativa nativo 8, físico 3, cena 4, PNG 5 ou nuvem 7, nem comprova palco esparso,
conjuntos por regiões ou seus adaptadores. A ativação exige completar e revisar
esses consumidores e fechar o rollout anterior. Nenhuma fonte do Molda mudou.
