# Concorrência da biblioteca de paletas

A reprodução contra `3ecd92a04b4fcfddd758d33ffd0f0ac6b0ab5faa` restaurou a paleta apagada, retrocedeu a marca de 52 para 2 e gerou um reenvio com base 52. O mesmo caso no candidato preservou a revisão 52 e a ausência da paleta. Os resultados estão em `antes.txt` e `resultado.txt`.

| Ensaio | Resultado |
| --- | --- |
| Descida entre abas, quatro asserções sobre IndexedDB e marcas independentes | 1 passou |
| Pinta, conteúdo puro, store, persistência e revisão confirmada | 37 passaram, 146 asserções |
| Comunidade Kids, espelho da galeria e fila HTTP | 143 passaram, 699 asserções |
| Members HTTP e PostgreSQL 16 isolado | 1 passou, 54 asserções |
| Chrome 157, duas páginas de mesma origem e escritor histórico real | Revisão 52, zero reenvios, cópia legada com ID estável após reabrir |

Na raiz, execute `python docs/pinta-cenarios/revisao-2026-11-18/qa/paletas-cas/repetir.py <checkout>` contra os dois checkouts com dependências locais. O programa usa o mesmo teste integrado e grava sua montagem apenas no cache temporário do checkout. Para o Chrome, execute `bun --no-env-file run docs/pinta-cenarios/revisao-2026-11-18/qa/paletas-cas/browser.ts`. O programa compila o Pinta atual e o escritor histórico 64c197d em diretório próprio de cache, inicia um servidor em porta efêmera de loopback e abre um perfil temporário.

Em `packages/pinta`, execute `bun --no-env-file test ./src/state/paletteLibraryStore.test.ts ./src/state/localPaletteAccount.test.ts ./src/state/paletteLibraryPersistence.test.ts ./src/core/paletteLibrary.test.ts`. Em `packages/community-kids`, execute `bun --no-env-file test ./tests/creations-cloud.test.ts ./tests/pinta-cloud-persistence.test.ts`. O diretório do pacote seleciona a configuração de DOM dos testes.

O ensaio de servidor usa `bun --no-env-file test ./tests/db/pinta-causal-http.test.ts` em `packages/members`, com `PINTA_CAUSAL_HTTP_TEST_DATABASE_URL` apontando para um PostgreSQL de teste local próprio. O banco usado foi `kids_journey_pinta_palette_private_cas` na porta 55553. O teste usa dados aleatórios e também comprova que o cliente histórico que relê a revisão atual consegue publicar no item reservado. A prevenção dessa escrita requer negociar o protocolo no servidor. Este checkpoint protege o armazenamento e os dois hosts modernos.
