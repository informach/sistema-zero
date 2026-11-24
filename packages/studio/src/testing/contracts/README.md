# Fixtures congeladas dos contratos do Pinta e do Molda Cenários

Cada arquivo é a saída do produtor real de uma versão do contrato, gravada uma vez por
`scripts/freeze-contract-fixtures.ts` e nunca regerada. O teste `contracts.test.ts` prova que esta
versão do Estúdio continua lendo o que os produtores antigos gravaram.

| Arquivo | Contrato | Produtor |
|---|---|---|
| `pinta-scene-v1.json` | cena do Pinta, versão 1 | "A Vila e a Floresta" (cabana), `packages/pinta/scripts/homologacao/studio-assets.ts` |
| `pinta-scene-v2.json` | cena do Pinta, versão 2 | "A Vila e a Floresta" (mapa), o mesmo script |
| `pinta-scene-v3.json` | cena do Pinta, versão 3 | `exportPintaScene` com um objeto de colisão |
| `molda-scene3d-v1.json` | `studio-cena3d` v1 e os arquivos do cenário | compilador real do Molda Cenários, pela importação do Estúdio |

**Regra decidida pela dona em 21/11/2026:** campo ou versão que esta versão do Estúdio não conhece é
recusado sem perder nada. O projeto não abre e nada é regravado. Os contratos estritos das outras
frentes não mudam.

Versão nova de um contrato: acrescente o produtor no script e grave só ela
(`bun scripts/freeze-contract-fixtures.ts --nova <nome>`); as antigas ficam como estão.
