# Armazenamento local v4: árvores profundas sem perda

Origem do laboratório: estudio-deep-storage-v4-20261118, criada em 4bf685ecc.
Branch atual: estudio-deep-storage-boundary-20261118; base promovida em 5028657f6.
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
- Cada fonte de recovery recebe um recibo imutável v4, indexado pelo hash da
  identidade e token, contendo o **payload original inteiro** e seu hash,
  incluindo campos desconhecidos. Reutilização da identidade com outro payload
  bloqueia a promoção e conserva as duas fontes. Enfileirar no journal existente
  e arquivar o original comparando a fonte. Remover a fonte IndexedDB e reconhecer
  a cópia síncrona somente depois da confirmação durável correspondente.
  O recibo torna um crash entre promoção e reconhecimento idempotente.
- Conservar escritor/token ao projetar as chaves v3 em v4: são necessários para
  reconhecer a cabeça importada e as relações entre descendentes. Um recibo
  imutável por identidade/token compara o payload original inteiro e recusa
  reutilização com outro conteúdo. A base antiga só autoriza o CAS se ainda
  corresponder à cabeça atual. Caso contrário o fluxo existente cria cópia
  recuperada. Nunca usar a cabeça atual como força de escrita.
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


## Reforço do protocolo antes de migrar journals — 19/11/2026

A revisão reproduziu três falhas no caminho nativo: token reutilizado com outro
conteúdo entre espelhos, partição de outro projeto e documento de formato futuro.
A correção foi qualificada na branch da PR (5b954982d), sem ativar v4. O mesmo
validador raro agora protege controle, identidade e namespace dos journals.
Neste laboratório ele aceita parâmetro explícito 3/4, testando também chaves de
ancestrais e recusa de contratos futuros, sem mudar o namespace padrão.

Um ensaio posterior reproduziu snapshot obsoleto aplicado depois de trocar o
journal antes do CAS. A transação agora compara a fonte inteira e a recuperação
seguinte aplica o novo conteúdo. A cópia recuperada também compara fonte e
arquivo original para não reconhecer outro payload só pelo token. A preparação
rara foi separada do coordenador inicial; a captura de saída continua síncrona.
Os testes e typecheck finais dessa divisão estão sendo registrados antes do
checkpoint. A migração de journals continua sem ativação e sem integração nos
carregadores; não considerar a missão nem a migração concluídas.

Regressão do laboratório após a divisão e comparação no CAS: 474 testes,
2.542 asserções, 75 arquivos, zero falhas, 53,47 s; inclui o estresse de dez mil
registros e migração de base nos dois motores nativos, com aborto de saída.

## Preparo e arquivo imutável do rascunho v3

O laboratório agora prepara uma projeção v3→v4 mantendo escritor, token, base,
sequência e ancestrais. Muda as chaves locais e o marcador do meta, sem alterar
código, blocos, materiais ou histórico. O documento inteiro é validado antes do
preparo. A fonte é capturada por valor: alterações posteriores não afetam o
snapshot. Metadados legados desconhecidos, undefined e zero negativo sobrevivem.

O arquivo usa o backup da mesma base IndexedDB e a promoção CAS existente.
A chave identifica projeto/escritor/token; o registro contém o grafo completo e
seu SHA-256, pela função de hash já existente. Um token com outro conteúdo não
sobrescreve o recibo. O arquivo não apaga journals, não reconhece espelhos e não
enfileira a projeção. Fontes trocadas e falta de quota preservam o original.

Seis testes específicos/24 asserções passaram, incluindo injeção real de quota,
concorrência de fonte, idempotência, metadados desconhecidos e identidade alheia.
Com a guarda de namespaces, oito testes/32 asserções passaram. Typecheck completo
aprovado após tipar a fixture pelo contrato RecoveryWrite (a primeira execução
rejeitou o literal version alargado para number). A conexão desta preparação com
o replay/listagem e reconhecimento das fontes permanece por implementar.

Checkpoint final deste preparo: 480 testes/2.566 asserções, 76 arquivos,
zero falhas, 52,14 s, com estresse nativo e aborto nos dois motores. Bundle:
365.506 bytes brutos, 119.211 gzip, dois arquivos; 35 asserções aprovadas em
18,63 s. Typecheck completo aprovado. A guarda inicial também exige ausência
dos novos módulos raros. A versão padrão continua 3; este commit de laboratório
não ativa, enfileira ou reconhece rascunhos v3 projetados.

## Ancestrais antes da integração de rascunhos

A projeção v3→v4 depende de um replay correto dos ancestrais declarados. Um teste
realista com fallback de rascunho, nova edição e saída reproduziu a criação de
uma cópia obsoleta depois de confirmar a filha. Outro reproduziu a mesma falha
após salvamento normal. A correção agora consome chave de projeto/escritor/token,
aguarda a filha ainda disponível só no espelho e conserva ancestrais quando os
blocos estão incompletos. Escritor independente com token repetido permanece
separado. Os três caminhos exigem preservação do metadado desconhecido da fonte.

Regressão do laboratório: 485 testes/2.588 asserções, 76 arquivos, zero falhas,
52,14 s, com estresse nativo e aborto. A integração na branch principal da missão
inclui também a correção isolável dos metadados legados, sem ativar v4. Typecheck,
prova no editor e orçamento finais da alteração de ancestrais são os próximos
gates antes do commit correspondente neste laboratório.

Checkpoint dos ancestrais e identidade interna: 487 testes/2.592 asserções,
76 arquivos, zero falhas, 47,74 s. Typecheck completo aprovado. Bundle do laboratório:
365.532 bytes brutos, 119.218 gzip, dois arquivos; 35 asserções em 14,51 s.
As guardas exigem também ID interno das partições e marcador de layout coerente.
O caminho de recuperação completo já foi qualificado no editor real na branch da
missão; ver docs/qa/2026-11-19-studio-recovery-ancestors-metadata.md no commit
2f1ba1330 e a guarda adicional no commit 34322fa34. Esta branch continua com v3
padrão e projeções v4 somente nos contratos experimentais.

## Enfileiramento atômico experimental — 19/11/2026

`stageLocalV3Recovery` grava o recibo original e o journal v4 na mesma promoção
CAS existente. Conserva a fonte v3. Uma revisão v4 diferente, fonte trocada ou
falha na segunda escrita não substitui dados nem deixa recibo parcial. Repetir a
preparação a partir da mesma fonte é idempotente. Ainda não promove o documento
final nem reconhece a fonte; a conexão com replay/carregadores continua pendente.

O preparo captura o perfil/namespace/backend antes do primeiro await e produz
snapshot imutável, com registro privado fraco de procedência. Arquivo e estágio
recusam perfil/backend diferente ou objeto que não passou pelo preparo. O dado
original do chamador continua editável. Envelopes profundos são preparados antes
da transação, sem async novo na captura de saída.

Verificação: 13 testes específicos/52 asserções, incluindo troca de perfil,
idempotência, conflito e quota real na segunda escrita. Regressão: 494 testes,
2.620 asserções, 76 arquivos, zero falhas, 54,86 s. Typecheck completo aprovado.
Bundle inicial: 365.532 bytes brutos, 119.218 gzip, dois arquivos; 35 asserções
aprovadas em 24,57 s, com tetos inalterados.

A prova nativa agora lê um espelho v3 real de 1.769.020 caracteres com o modelo
completo de 10.000 registros/9.920 IDs, prepara e enfileira o v4, verifica todos os
campos do journal e arquivo, e comprova que o espelho v3 segue intacto. O meta
final v4 permanece ausente: o teste não simula confirmação do replay. A limpeza
posterior do próprio fixture libera sua quota local; não é reconhecimento de
produto. O arquivo e journal v4 persistem no banco de teste.

Os tempos por fase e hashes do código estão em
`docs/qa/2026-11-19-studio-legacy-recovery-stage-native.json`. Uma observação por
motor, com typecheck concorrente e carga externa não controlada. Leitura/preparo/
estágio não são p95 de digitação. A primeira coleta tinha um rótulo que agrupava
preparo, escrita da fonte e verificação; esse rótulo foi substituído por fases
explícitas, sem usar o total agrupado como custo de preparo. Nenhum FPS foi medido.

A ativação padrão permanece v3. Faltam reconhecimento condicional dos originais,
coleta conjunta de espelhos/journals, integração de base/listagem/abertura,
compatibilidade v1/v2 e homologação da abertura efetiva em v4.


## Continuação de 19/11 — replay real para v4, ainda sem ativação

Base atual integrada: `7fe761fb9`, com snapshot remoto `613404239`; correções subsequentes `a83f368e2` e `be46906bc`. As afirmações anteriores de que o replay não estava conectado descrevem as revisões anteriores. O helper de migração agora coleta fontes v3 nativas/síncronas, preserva espelhos e identidade, migra a base, arquiva snapshots imutáveis e usa o mesmo motor CAS direcionado à v4. A confirmação remove fontes apenas após promoção/cópia confirmada e comparação exata do original e de seu arquivo de segurança.

O preparo físico v4 é feito antes de abrir o CAS. Nenhum preparo assíncrono foi introduzido no pagehide. Fontes antigas inválidas continuam preservadas. Recibos usam o armazenamento de backup já existente; não há nova fila/base.

Qualificação nativa nova: 10.000 registros, 9.920 IDs existentes, profundidade 2.503, grafo completo e arquivo preservados após replay nos dois engines, com reconhecimento de fonte feito pelo produto antes do teardown. Relatórios: `docs/qa/2026-11-19-studio-versioned-recovery-replay.md` e `docs/qa/2026-11-19-studio-legacy-replay-native.json`.

Sequência restante antes de ativar:

1. Corrigir digest/backup e migração profunda dos layouts v1/v2, com preservação de marcadores/recibos e campos desconhecidos.
2. Ligar migração de bases/journals à listagem e a todos os carregadores, inclusive quando existe v4 e uma aba antiga volta a escrever.
3. Preparar o transporte antes de permitir edição de projeto novo/saída fria; preservar captura síncrona.
4. Qualificar troca de perfil, fontes concorrentes, quota, exclusões, histórico e versões futuras no fluxo integrado do produto.
5. Ativar apenas no laboratório, repetir suítes/curso/navegadores/limites e homologar antes de levar a branch da missão.

O padrão permanece v3; esta etapa não fecha renderização/virtualização do Blockly (R2), depuração/profiler/testes autorais nem a missão global.
