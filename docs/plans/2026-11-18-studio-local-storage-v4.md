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
