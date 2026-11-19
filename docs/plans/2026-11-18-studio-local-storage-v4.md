# Armazenamento local v4: árvores profundas sem perda

Branch de laboratório: estudio-deep-storage-v4-20261118, criada em 4bf685ecc.
A missão/PR273 permanece em estudio-missao-completar-20261118. Não promover
este laboratório enquanto migração, testes nativos e compatibilidade falharem.

## Problema e decisão

O ensaio real de 10 mil blocos encontrou RangeError no structured clone do
IndexedDB. O modelo completo deve continuar editável; não trocar blocos por
código opaco, descartar caches ou aumentar quotas. Reusar o codec de grafo plano
já verificado na recuperação de saída, com limites explícitos por contexto.
O documento portátil e os projetos publicados conservam seu formato.

Usar a evolução já adotada pelo Estúdio: namespace de chaves v4, leitura e
migração seguras dos layouts anteriores. Não colocar um payload ilegível em
chaves v3 que clientes antigos ainda interpretam. Não fingir uma versão portátil
futura para impedir escrita. Os dois layouts precisam preservar edições de abas
antigas como cópias, de acordo com o protocolo de migração atual.

## Sequência bloqueante

1. Generalizar o único codec plano, preservando byte a byte o wire de saída v1
   e seu orçamento de 2 milhões. Testar golden, limites, objetos profundos,
   undefined, -0, campos desconhecidos, ciclos, protótipos e referências.
2. Introduzir transporte profundo estritamente nas chaves de projeto v4.
   Dados de jogos e valores externos não podem colidir com o envelope.
   Ler e escrever pelo coordenador/transações existentes, sem outra base/fila.
3. Preparar conversões custosas antes de abrir a transação viva quando possível;
   a saída continua síncrona. Medir custo, não prometer responsividade universal.
4. Estender migração v1/v2 para v3→v4, incluindo cabeça, aplicações, orçamento,
   miniatura, rascunhos e backups. Capturar a fonte exata na mesma promoção CAS.
   Backup também não pode estourar a pilha. Não apagar cabeças/tombstones ou
   referências em uso para fazer um teste passar. Falha conserva a fonte.
5. Migrar journals IndexedDB/saída v3 por identidade e token; nenhuma entrada
   estrangeira ou futura é normalizada silenciosamente. Só reconhecer após
   promoção/cópia confirmada, mantendo o original e seu histórico completo.
6. Exercitar cliente antigo, duas abas, alteração durante migração, recarga,
   quota, formatos futuros, aplicações/undo e projeto excluído. Manter cursos.
7. Navegadores reais: 10 mil blocos profundos, editar, confirmar, reabrir e
   comparar IDs/campos/ordem. Não confundir isso com renderização Blockly pronta.
8. Suítes, typecheck, limites de bundle, medição e revisão; só então integrar na
   branch da missão e qualificar pelo GitHub, sem merge/deploy em staging/main.

O bug de renderização/virtualização R2 permanece um contrato separado. Um save
profundo aprovado não fecha abertura/navegação/arrasto/desfazer de 10 mil blocos.

## Ensaios do laboratório, base atualizada 7b36c4ff6

O transporte experimental passou nos dois navegadores reais Windows, usando
o driver existente de persistência, sem substituir o IndexedDB por mock:
10.000 registros de bloco do Farol, 9.920 IDs presentes e distintos (80 sombras
no arquivo original não declaram ID), profundidade 2.503. A comparação do grafo
completo conferiu campos, ordem, IDs, desconhecidos, `undefined` em objeto e `-0`.
Editar/reler e rejeitar uma codificação futura na mesma transação preservaram
a revisão anterior. O driver também concluiu seus testes originais de recarga,
conflitos e quota.

Na última rodada conjunta (22,77 s), `structuredClone` direto falhou com
`RangeError` no Chromium e funcionou no WebKit. O transporte plano funcionou
nos dois. Grafo: 1.767.283 caracteres. Primeira codificação/gravação/leitura/
comparação: 367 ms e 479 ms, respectivamente. São observações individuais de
laboratório Windows, sem p95 nem homologação física de aparelhos de entrada.
Nenhuma afirmação sobre renderizar ou editar SVGs deriva destes números.

Os testes separados de estado aprovaram 353 casos/2.067 asserções; persistência,
32 casos/89 asserções. O golden do journal de saída conserva seu wire e teto.

**Integração bloqueada:** a guarda inicial reprovou 120.471 bytes gzip contra
o teto inalterado de 120.000 (370.295 bytes brutos). Resolver a dependência do
transporte no carregamento inicial, a preparação fora da transação CAS e toda
a migração antes de levar à PR. Não aumentar o teto nem ativar chaves v4 para
declarar o problema resolvido.

Uma segunda tentativa passou a preparar o codec ao abrir/ler chaves v4, antes
da transação CAS. Escritas diretas frias são recusadas antes de qualquer put;
saída não espera importação. Transporte v4 ausente do grafo inicial, mas o
total ainda reprovou: 120.151 gzip, 369.509 brutos. Não promover essa tentativa.
Resolver a divisão do codec/recovery inicial em vez de elevar a cota. Os quatro
testes de IndexedDB e saída passaram, incluindo o nativo nos dois motores;
typecheck após essa alteração aprovado. Migração e preparação da codificação
pesada fora do CAS continuam pendentes.

Reprodução: `STUDIO_STORAGE_DEEP=1 bun test src/state/projectStorageBrowser.test.ts`.
O teste gera a fixture pelo modo `--blocks-fixture` do profiler existente. Esse
modo exporta o estado completo sem montar workspace nem gerar código opaco.

## Divisão das fronteiras de leitura e captura

Na branch `estudio-deep-storage-boundary-20261118`, o decodificador plano e a
leitura dos journals foram separados da captura de saída. Há uma implementação
de cada operação, com os mesmos validadores, wire e limites. A captura continua
síncrona; a leitura rara só entra quando a recuperação existente a solicita.
O transporte v4 é preparado antes de abrir a transação viva. Nenhuma importação
é introduzida no pedido síncrono de saída.

Resultado: 366.875 bytes brutos, **119.426 gzip**, dois arquivos; 35 asserções
de orçamento/grafo aprovadas. A guarda também exige ausência dos leitores raros
e do transporte no grafo inicial. Os tetos continuam os mesmos. Testes de estado
e persistência: **385 casos, 2.156 asserções, zero falhas**, 36,88 s. Typecheck
aprovado. A prova nativa com dez mil blocos e aborto de saída passou nos dois
motores em 22,30 s, reutilizando o driver e os testes de conflito/quota.

O bloqueio de tamanho inicial foi resolvido neste ensaio, mas não se concluiu
a etapa: ainda faltam preparo de payload pesado fora do CAS, migração completa,
cliente antigo, histórico/budgets/tombstones/rascunhos e homologação do fluxo de
edição real. A ativação e integração na PR continuam bloqueadas por esses itens.

## Contrato de migração a implementar

- Centralizar a versão nas funções de chaves existentes (argumento interno
  opcional 3/4), mantendo v3 ativo até finalizar os gates. `projectStorageEntries`
  usa a mesma versão na chave e no marcador local; formato portátil não muda.
- Capturar partições v3, cabeça, aplicações, orçamento e miniatura; converter e
  calcular hash plano fora da transação. Promover pelo `promoteLocalMigration`
  existente, comparando a fonte completa. Backup v4 guarda **todos** os registros
  originais, inclusive propriedades desconhecidas. Não usar stringify recursivo.
- Conservar cabeças/tombstones v3. Uma aba v3 ainda aberta pode confirmar outra
  edição no namespace antigo; a próxima leitura v4 importa essa edição como
  cópia, sem sobrescrever a atual. Uma cabeça v3 excluída sem meta semeia a
  tombstone v4 antes de migrar v1/v2; não ressuscitar um projeto apagado.
- Primeira importação com mesma identidade conserva cabeça e histórico ativos.
  Validar inteiro/limites/pertencimento dos registros e orçamento antes de
  promover; não deixar a política de expiração descartar histórico na migração.
  Cópias com identidade nova arquivam cabeça/histórico originais integralmente;
  não reaplicar inversos com identidade/hash inválidos como se fossem atuais.
- Não perder campos raiz ao reparticionar: metadados desconhecidos precisam
  sobreviver, ou produzir pendência explícita antes de qualquer promoção.
  Partições e símbolos locais não devem vazar como metadados de documento.
- Rascunhos v3 nativos e cópias síncronas devem ser classificados pelas chaves
  das partições, não tratados como payload v4. Migrar primeiro a base durável
  quando existir. Um registro completo pode virar recovery v4 pelo CAS atual;
  um registro incompleto depende da partição/base ou backup exato e não pode
  virar bloco opaco/vazio para passar o teste.
- Cada fonte de recovery recebe um recibo imutável v4 por hash do **payload
  inteiro**, incluindo campos desconhecidos. Enfileirar no journal existente e
  arquivar o original na mesma transação, comparando a fonte. Remover a fonte
  IndexedDB só nessa promoção; reconhecer a cópia síncrona somente depois.
  O recibo torna um crash entre promoção e reconhecimento idempotente.
- Reusar a chave canônica de recovery com escritor/token derivados do hash da
  fonte para não sobrescrever outra revisão com token reutilizado. A base antiga
  só autoriza o CAS se ainda corresponder à cabeça atual. Caso contrário o fluxo
  existente cria cópia recuperada. Nunca usar a cabeça atual como força de escrita.
- O carregamento chama a migração antes de oferecer as entradas v3 ao recovery
  v4. Listagem e abertura reconhecem também v3/tombstones/rascunhos; uma fonte
  futura/corrompida continua preservada e aparece como pendência compreensível.
- Preparar envelopes profundos fora do CAS quando o conteúdo já é conhecido.
  A captura na saída permanece síncrona e conserva o limite do journal; falta de
  quota/permissão continua exigindo salvar/exportar, sem confirmação fictícia.

## Ensaio de migração da base — 19/11/2026

Implementada a promoção v3→v4 pelo CAS existente, ainda sem ativação nos
carregadores. A versão padrão continua 3. O backup conserva as partições
originais, campos desconhecidos, cabeça e histórico. Escrita posterior de uma
aba v3 produz cópia; não substitui a revisão v4. Históricos incompatíveis,
campos conflitantes e partições de outro projeto bloqueiam a promoção.

A repartição e a validação de documentos antigos agora conservam metadados
raiz desconhecidos, sem executar getters nem copiar partições como metadados.
Os testes incluem falha na segunda escrita da transação real e edição
concorrente antes do CAS. A preparação de payload conhecido ocorre antes dele.

Verificação nesta branch experimental: 464 testes, 2.500 asserções, 73 arquivos,
zero falhas (43,67 s), incluindo Chromium e WebKit nativos com dez mil registros
de blocos, migração da base e aborto de saída. Typecheck aprovado. Bundle inicial:
367.407 bytes brutos, 119.756 gzip, 35 asserções; teto de 120.000 inalterado.

Pendências para ativar: migração dos journals v3 nativos e síncronos, validação
integral deles, carregadores/listagem, layouts v1/v2 e homologação do editor.
Este checkpoint não conclui a migração nem foi integrado à PR de produto.
