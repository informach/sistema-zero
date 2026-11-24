# Confirmação de prévias e coleta assinada — 21/11/2026

Base `d4eda0d13366e2ae8c5f746fd2752e9564ab9dba`. Continuação do item 3.
Formato 8 permanece interno; não há merge em staging ou implantação neste lote.

## Implementação e revisão

Biblioteca e espalhamento verificavam a base antes de confirmar, mas registravam
histórico antes dos assinantes da escrita. Uma adoção síncrona por um assinante
podia deixar um desfazer alheio e anunciar como própria uma inserção adotada.
Quatro testes reproduziram o defeito, com quatro controles de adoção pelo host
aprovados. A confirmação agora usa `createEditorGesture`: substitui a própria
revisão e só registra o histórico se ela sobreviver aos assinantes. Não há outro
mecanismo de gravação ou alteração do CAS persistente da issue 026.

`ObjectScatterStroke` extrai as amostras do hook. Usa limites assinados, ordem da
primeira visita, círculo e revisitas iguais ao ramo denso. Segmentos excessivos
são recusados antes de criar a linha; até 65.536 destinos distintos por gesto.
Cada segmento é admitido inteiro e a recusa torna o traço terminal. A auditoria
de acesso às células registra que o coletor percorre posições, sem ler valores
de peças ou buffers autorais. O núcleo esparso foi testado sem um store 8 falso.

`MapLibraryPreview` extrai o SVG existente e aplica a origem ao viewBox, mantendo
classes, estilos, opacidade e transformações anteriores. Os hooks conferem o
contexto geométrico também nos eventos. O SVG regional foi exercitado em leitura;
o store público, recursos/IO e consumidores dos novos contratos seguem no plano.

## Verificação

- Suíte completa final: 2.570 aprovados, três controles nativos omitidos, zero
  falhas e 29.603 asserções em 225 arquivos, sem aumentar timeouts.
- 24 testes focados, zero falhas e 2.591 asserções, incluindo ordem densa,
  coordenadas negativas, orçamento antes de expandir e recusa sem segmento parcial.
- 63 ensaios Chromium dos hooks/SVG e 33 percursos da oficina, sem retries.
  Mouse, toque emulado e CPU 4× nesta máquina; mapas e conjuntos, adoção do host
  e assinante, cancelamento, zoom e um desfazer. Os documentos completos são
  conferidos por SHA-256 após salvar/reabrir no IndexedDB, normalizando somente
  timestamps da raiz e do mapa de conjunto. Doze comparações exatas de conjuntos
  na oficina complementam as provas dos controladores.
- Os dois hooks históricos reais reproduzem 12 falhas esperadas de adoção por
  assinante, com 12 controles positivos de desfazer. Não representa distribuição
  antiga completa, sincronização autenticada ou conflito entre aparelhos.
- Tipos completos do Pinta e dos arquivos alterados de QA, Biome e diff sem erros.
  Três controles Pygame são omitidos pela configuração comum e não foram repetidos
  neste lote.

A primeira montagem do host de QA usou a forma errada do bitmap; o typecheck
detectou isso e capturas de narrowing em closures, corrigidas com ligações
validadas. A segunda prova encontrou no host a ausência de `touchAction: none`,
já usada pela biblioteca real. O host foi alinhado, sem mudar o produto ou relaxar
asserções. Os ensaios interrompidos ficam registrados como incompletos.

A primeira suíte completa exigiu registrar o novo coletor na auditoria e atingiu
o timeout de cinco segundos em um percurso da oficina. O percurso passou isolado
sem alterar seu timeout; a suíte foi repetida com menos carga concorrente. Seus
recibos anteriores permanecem no relatório. Não usar durações dessas execuções
concorrentes como qualificação de desempenho.

Não houve nova execução de motores externos, tipos completos do Estúdio, medição
de heap/latência, teste com crianças ou outro aparelho físico. Evidências destes
escopos continuam nos relatórios anteriores. A entrega não fecha etapas macro nem
promove o documento 8. Fontes, hashes, relatórios e screenshots estão no índice.
