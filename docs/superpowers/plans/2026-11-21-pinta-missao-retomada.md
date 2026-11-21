# Pinta — execução da continuação aprovada

Base inicial: staging `30f6d22963ee57769c970a93c9c63d4492101bb5`.
Execução isolada em `pinta-missao-retomada-20261121`, sem alterar arquivos do Molda.
Este documento continua o plano da missão e o design de regiões de 20/11.

## Ordem e critérios de fechamento

- [ ] 0. Fechar gravador 6 com produtor real, leitor anterior, erros de cliente
  antigo, CAS, recuperação offline e rollback B → A → B em staging.
- [ ] 1. Promover regiões somente após adaptar todos os consumidores, preservando
  IDs, metadados, recursos, snapshots e formatos antigos.
- [ ] 2. Completar os dois motores JavaScript e Python, atualização e publicação
  sem perder arquivos, blocos ou programação; investigar a divergência histórica de IR.
- [ ] 3. Adaptar todas as ferramentas existentes de terreno às regiões.
- [ ] 4. Integrar objetos, conjuntos vinculados, cópias e espalhamento.
- [ ] 5. Integrar geometria, caminhos, portas, animações e profundidade.
- [ ] 6. Completar câmera, minimapa, teclado/toque, cancelamento e mensagens na oficina atual.
- [ ] 7. Validar os novos contratos em Tiled, Phaser, Pygame e Godot reais.
- [ ] 8. Completar IO incremental, cache, autorregras multicamadas e projeções.
- [ ] 9. Executar os dez passos da Vila e Floresta, variantes e PyDew Valley;
  revisar, atualizar guias, registrar evidências e preparar PR, sem merge automático.

## Decisões aprovadas

Autorregras visuais próprias do Pinta, por exemplos de entrada/saída, com ordem
explícita, prévia determinística e uma entrada de histórico por confirmação.
Tetos: 64 regras, padrões 16×16, oito camadas de entrada/saída,
65.536 células alteradas e 1.048.576 comparações por aplicação.

Regiões 32×32, até 2.048 chunks, 32 camadas, 4 MiB de índices e extensão
de 10.000 células por eixo nos intervalos assinados do contrato existente.
Nativo 8 para regiões; nativo 9 para autorregras/projeções; físico local 3.
Cena 4/PNG 5 para regiões, cena 5/PNG 6 para projeções. Nuvem 7/8 somente
depois dos leitores. Receitas e formatos anteriores permanecem compatíveis.
Hexágonos usam codec de células 32 bits com transformações na própria célula;
o orçamento de 4 MiB permite até 1.024 chunks nesse codec. Não reutilizar
silenciosamente a diagonal quadrada para rotações de 60°/120°.

Alvos nesta máquina: quadro aquecido p95 ≤33,3 ms e feedback do gesto p95
≤100 ms, viewport 1024×768. Medir abertura fria, autosave, buffers e CPU 4×;
não apresentar emulação como outro aparelho físico. Cache de render: 32 MiB.

## Situação de partida comprovada

Leitura do Railway nesta retomada: Community e Kids ainda na fonte 85d16fcd9.
O código da staging já declara escrita 6; integração Git não prova ativação.
As provas anteriores de publicação e análise Python continuam históricas,
com suas versões e escopos. Nenhum rollout novo ocorreu nesta retomada.

Cada lote exige testes, ensaio funcional aplicável, revisão e commit.
Um teste HTTP local com repositório em memória não substitui IndexedDB real,
R2/Postgres, login ou rollback dos serviços publicados.
