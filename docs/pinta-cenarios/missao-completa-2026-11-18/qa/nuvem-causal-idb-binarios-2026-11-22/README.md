# Compatibilidade da fila causal no IndexedDB

Seis bundles foram compilados das revisões do Pinta indicadas no [resultado](resultado.json). A prova usa Chrome com um perfil efêmero, servidor loopback e IndexedDB real. Cada versão abriu a mesma galeria da prova em uma página nova. Os snapshots e recibos da conta são entradas sintéticas para os métodos locais. Login e interoperabilidade HTTP da conta exigem ensaios próprios.

| Caso | Transição | Resultado observado |
| --- | --- | --- |
| Unidade preparada representada como v1 | `09aa01d52` → `332e94b59` → `09aa01d52` | O leitor anterior avançou a época local de 1 a 2, manteve a unidade pendente e apagou o registro que aponta para o gzip congelado. O Blob ficou órfão no IndexedDB. |
| Autoria sem base remota representada como v1 | `09aa01d52` → `64c197d53` → `09aa01d52` | O leitor anterior abriu a primeira época da conta. O desenho permaneceu local, com a fila vazia e sem o registro da alteração anterior à primeira leitura. |
| Marca de recuperação representada como v1 | `09aa01d52` → `3d6aad294` → `09aa01d52` | A cópia recuperada conservou seu pixel. A gravação do leitor anterior apagou a marca de recuperação. |
| Escrita pelo cliente público nativo 7 | `09aa01d52` → `61ef65f2d` → `09aa01d52` | O cliente público gravou o nome e a célula. A versão causal manteve o SHA-256 da unidade preparada, selou-a e aceitou o recibo. A edição pública permaneceu no disco como divergência local, sem sucessor ou cópia na fila. A descida divergente seguinte foi adiada. |
| Migração do envelope da fila | `09aa01d52` → `e28bb5dbb` → `332e94b59` → `e28bb5dbb` | A versão nova leu v1 e escreveu v2 com o mesmo SHA-256. O causal anterior recusou a inspeção e a escrita. A reabertura pela versão nova encontrou mesma unidade, época e gzip. |

O caso do escritor público é histórico. O recibo do gzip preparado comprova somente a revisão enviada. O nome e a célula editados depois permanecem locais e precisam de recuperação ou reconciliação explícita. O envelope v2 protege os metadados contra clientes causais que conhecem a chave. O documento público continua nativo 7.

## Reproduzir

Use Bun 1.3.11, Node 24, Chrome e dependências do workspace instaladas. Os commits precisam existir no repositório local, assim como o helper de extração `packages/pinta/scripts/authority-baseline.ts`. Execute a partir da raiz.

```powershell
bun --no-env-file docs/pinta-cenarios/missao-completa-2026-11-18/qa/nuvem-causal-idb-binarios-2026-11-22/build.ts --run
```

O comando compila em `.cache` e registra o SHA-256 de cada bundle, da fonte do contrato Core compartilhado e do executável Chrome que respondeu pelo CDP. O loopback e o navegador são encerrados ao sair. O [log](ensaio.log) e o [índice](artefatos.json) registram o resultado e os arquivos usados.
