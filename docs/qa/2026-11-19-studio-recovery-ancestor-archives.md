# Recuperação: validação dos ancestrais e arquivo integral

## Problema reproduzido

Um descendente suportado podia reconhecer uma origem apenas por chave/token e consumir uma revisão cujo documento tinha formato futuro. Quatro combinações de salvamento/recuperação e origem nativa/síncrona falharam antes da correção. A cobertura inclui também duas variantes com o mesmo escritor na cópia síncrona.

## Contrato implementado

Antes da transação de promoção, validar o documento completo de cada origem disponível, seu proprietário e todas as cópias da mesma identidade. Uma origem futura, inválida ou divergente permanece preservada e impede a promoção que dependeria de consumi-la.

Arquivar integralmente as origens suportadas no namespace existente de backups. A identidade usa projeto, escritor e token; o conteúdo inclui o snapshot completo, codificação de grafo e SHA-256. Arquivo, promoção e remoção dos registros consumidos pertencem à mesma transação. Arquivos existentes de conteúdo diferente não são substituídos. A comparação CAS verifica o snapshot completo, incluindo alterações que reutilizem o mesmo token.

A codificação plana reutiliza o codec existente, preservando campos desconhecidos, `undefined`, zero negativo e profundidade sem exigir structured clone recursivo. O arquivo durável usa o orçamento já existente do documento. O limite síncrono de saída continua em 2.000.000 caracteres; os limites do editor e compiladores não foram ampliados. A representação antiga do journal permanece idêntica no teste golden.

## Evidências locais

- Estado/persistência/migrações: 474 testes, 2.511 asserções, zero falhas, 38,60 s na repetição final.
- Codec e recuperação síncrona: 49 testes, 176 asserções; incluem metadados com 10.000 níveis e origem nativa acima de 2 MB.
- Falha de gravação do arquivo: rollback conserva documento anterior e ambas as fontes.
- Mudança concorrente do conteúdo com o mesmo token: a revisão nova fica preservada no arquivo integral; não se exige que permaneça no journal após uma repetição válida da operação.
- Chromium e WebKit reais, headless: 12 recargas imediatas por navegador, conflito entre duas abas e promoção de descendente com ancestral de 10.000 níveis vindo de recuperação síncrona. O arquivo foi lido novamente do IndexedDB e comparado integralmente; fonte síncrona reconhecida e journal removido. Execução total 19,59 s.
- WebKit Windows: encerramento do processo descartável de teste após as asserções; não é evidência de encerramento gracioso do navegador do aluno.
- Typecheck completo, Biome dos 11 arquivos de código e `git diff --check`: aprovados.
- Bundle inicial: 368.179 bytes brutos, 119.800 gzip; teste aprovado com 37 asserções, limite gzip de 120.000 inalterado. O módulo raro de validação de ancestrais não entra no carregamento inicial.

Comandos, em `packages/studio`:

```powershell
bun test ./src/state ./src/persistence ./src/project-migrations
bun test ./src/state/projectSynchronousRecovery.test.ts ./src/state/exitJournalCodec.test.ts
bun test ./src/state/projectStorageBrowser.test.ts
bun test ./src/projects/__tests__/initialBundleBudget.test.ts
```

## Limites desta entrega

Não ativa armazenamento v4, não comprova montagem visual de 10.000 blocos e não encerra a missão global. A fixture usa o protocolo de origem explícita para um descendente pequeno; não afirma que o carregador de rascunhos nativos leia diretamente uma fonte que existe somente no localStorage. O teste é local/headless, sem homologação física de 8 GB.
