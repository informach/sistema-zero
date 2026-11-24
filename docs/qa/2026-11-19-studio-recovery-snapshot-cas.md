# Recuperação: snapshot e gravação condicional

## Problema reproduzido

Um journal nativo foi substituído depois da leitura e antes da transação
condicional. O replay aplicou o snapshot antigo sobre o documento confirmado,
mesmo quando já havia outra revisão pendente do mesmo escritor. A reprodução
injeta a escrita concorrente na conexão IndexedDB real do teste, antes de criar
a transação de promoção. Não há hooks de teste no produto.

O teste falhou antes da correção: o documento continha `older pending` em vez
do último conteúdo confirmado. Depois da correção, a primeira tentativa conserva
a revisão nova no journal e o documento confirmado; a segunda recupera a revisão
nova integralmente.

## Correção

A transação compara o payload completo lido do journal com o snapshot validado.
Se divergir, não promove nem reconhece a revisão antiga. Reusa a comparação
iterativa da promoção de migrações; ela agora trata ciclos sem laço infinito,
compara comprimentos de arrays e descritores de dados e não executa getters.
Não se usa stringify recursivo nem o limite menor do espelho síncrono para
comparar documentos nativos.

A criação de cópia recuperada também exige igualdade da fonte. Se uma cópia já
existe com o mesmo token e conteúdo diferente, o novo journal fica preservado;
o token sozinho não autoriza descartá-lo. O teste verifica as duas cópias.

## Carga inicial

A primeira versão da correção mediu 120.052 bytes gzip e reprovou o teto de
120.000. Não se ampliou o limite. Preparação, validação e cópia de recuperação
foram separadas em `projectIndexedRecovery.ts`. A lista sem journals retorna
antes de carregar esse módulo. As funções internas conservam os contratos e
reutilizam a mesma fila/CAS; a captura síncrona na saída não ganhou imports ou
awaits.

Nova medição: 366.548 bytes brutos, **119.173 gzip**, dois arquivos iniciais.
O teste passou em 16,48 s, com 35 asserções, incluindo ausência dos módulos de
recuperação no grafo inicial. Prazo de 60 s e tetos de bytes inalterados.

## Verificação e limites

Regressão local: **443 testes, 2.368 asserções, 70 arquivos, zero falhas**,
40,53 s. Inclui Chromium e WebKit nativos com aborto da transação de saída,
conflitos, quota, arquivos, formatos e persistência. A seleção com documentos,
recuperação e comparação também passou: 32 testes, 154 asserções.

São testes Windows de laboratório, sem homologação física de entrada nem
afirmação de FPS/p95. Namespace padrão continua v3. O laboratório v4, migração
de journals antigos e a missão global continuam sujeitos aos gates registrados.

Typecheck completo aprovado após a separação. Homologação no editor real:
`bunx playwright test e2e/reload-flush.spec.ts --project=chromium --project=webkit --retries=0`
passou os seis fluxos, sem retries, em 1,4 min com build. Inclui imagem de 1,5 MB,
três materiais do Molda com modal aberta e revisão nova salva ao esconder a aba,
seguida de recarga ainda escondida. Nenhuma asserção ou prazo foi ampliado.
