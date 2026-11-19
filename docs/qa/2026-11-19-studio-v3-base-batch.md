# Bases v3 sem journal: adaptação para migração em lote

O replay v3→v4 já existente começa pelos journals. Isso não basta para listar/abrir bases v3 que foram salvas normalmente e não têm journal pendente.

O novo adaptador `migrateLocalV3Projects` identifica partições v3 ainda ativas e chama o migrador transacional existente, por projeto. A listagem conserva falhas como resumos pendentes e segue com os demais; a abertura de um ID propaga a falha para impedir fallback histórico mais velho. Cabeças, histórico e marcadores v3 retidos, sem dados e com destino v4, não são considerados uma nova edição. Novos dados de uma aba antiga continuam gerando uma cópia recuperada.

Seis testes transacionais cobrem base sem journal, fonte incompleta junto de fonte válida, abertura de fonte incompleta sem tocar projeto alheio, retorno da aba antiga, formato futuro e metadado ilegível. O qualificador nativo passou a usar o adaptador na migração da base sem journal; as demais provas de transporte profundo e replay permanecem.

A primeira fixture nova omitia a cabeça v3 obrigatória e foi corrigida para reproduzir um salvamento real, sem afrouxar o migrador. A primeira regressão ampla executada junto de um bundle build excedeu o prazo do teste antigo de importação de IR excessiva. A repetição foi feita sem o bundle concorrente e sem ampliar prazos.

Verificação final local: 550 testes / 2.874 asserções, 79 arquivos, zero falhas, 43,54 s. Inclui Chromium/WebKit headless e a qualificação nativa. Bundle inicial: 366.681 bytes brutos / 119.686 gzip, limites mantidos. Biome e whitespace aprovados. Typecheck completo final aprovado.

```powershell
# em packages/studio
bun test ./src/project-migrations/localV3Projects.test.ts ./src/state/projectHistoricalLoad.test.ts
bun test ./src/state ./src/persistence ./src/project-migrations
```

O adaptador ainda não foi ligado à listagem/carregadores de produto e a escrita padrão continua v3. Portanto, estes resultados não qualificam uma ativação v4, uma interação de usuário da lista ou montagem visual de 10.000 blocos.
