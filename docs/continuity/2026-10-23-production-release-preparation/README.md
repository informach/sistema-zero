# Preparação da janela de produção — 23/10/2026

Arquivo de fontes, testes e runbooks revisados para manutenção dos cinco serviços afetados, backup lógico final, restauração isolada e transferência cifrada. Os 57 snapshots preservam os bytes originais e seus pins; o manifesto registra origem, destino de restauração, SHA-256, tamanho e justificativa de cada item.

**Estado deste pacote: preparação, sem ativação da janela de produção.** Ainda faltam o backup FINAL obtido sob a barreira dos cinco processos, sua restauração e cópia durável qualificadas, além de contagens Pensa frescas e avaliação dos dados antes das migrações 0126/0128. O rehearsal anterior não substitui esse backup final. Nenhuma operação de produção foi executada para criar este arquivo.

## O que está preservado

- Fase 1: armazenamento de `RELEASE_MAINTENANCE_MODE=full` sem deploy; fase 2: reload serial da imagem antiga, verificação de snapshot/retirada e prova HTTP da manutenção.
- Três leitores novos para coletar novamente launchers instalados, journals antigos/banco e preDeploy dos três Next, sem sobrescrever recibos históricos.
- Contexto dos cinco processos antes/depois do dump; transporte binário cifrado; autenticação até EOF; restore PostgreSQL isolado; transferência final com intenção permanente e sem replay.
- Testes focados, programas shell fixos, planos/runbooks e dependências de fonte efetivamente importadas.

Os helpers históricos de staging, store de identidade e transferência do rehearsal entram porque funções deles são importadas pelo caminho atual. **A presença de suas fontes e seus runbooks não manda repetir store, gerar chaves, reenviar o rehearsal, ativar cron ou refazer operações concluídas.** Seus recibos reais, intenções e arquivos privados não estão neste pacote.

## Quatro fixtures históricas

Os JSON abaixo são apenas metadados técnicos sanitizados necessários a testes ou à identidade fixa de um leitor. Suas datas permanecem originais e expiradas; não constituem aprovação ou evidência operacional fresca.

| Arquivo original na cache | Uso |
| --- | --- |
| `production-pensa-writer-images-readonly-r2-final.json` | Teste de evidência/store e identidade fixa do leitor Next |
| `production-old-image-migration-readonly-r1.json` | Testes de evidência/store e journal/reload |
| `production-next-predeploy-readonly-r1.json` | Teste de evidência/store |
| `production-postgres-metadata-root-r3/receipt.json` | Teste de projeção PostgreSQL no reload |

Não há dumps, ciphertext, identidades AGE privadas, chaves SSH, cookies, handshakes, contas/alunos, mapas reais de variáveis, respostas brutas de providers ou logs stdout/stderr. Fontes mantêm IDs públicos, nomes técnicos, hashes, caminhos fixos e um recipient AGE público; o recipient não permite descriptografar. Credenciais aparentes em testes são fixtures sintéticas, sem vínculo com produção.

## Restaurar para revisão ou testes

1. Use um checkout compatível e confira o SHA/tamanho de cada snapshot contra `manifest.json`. A árvore de produto referenciada também precisa corresponder às dependências registradas.
2. Para cada entrada, restaure somente seus bytes para o `restorePath` sob `.cache/python-reference-games/`, preservando subdiretórios. Se o destino existir, aceite apenas bytes idênticos; recuse divergência, links ou escape de caminho. Não sobrescreva recibos, fontes ou intenções existentes.
3. Confira novamente SHA/tamanho dos arquivos restaurados. Não converta CRLF/LF, não adapte pins/caminhos e não atualize datas históricas. Não execute snapshots dentro de `docs`: os caminhos relativos pressupõem a cache original.

Não há restaurador automático. A cópia dos snapshots é de bytes (`Buffer`), não de texto reformatado. `.gitattributes` desativa a conversão de linhas e reconhece CRLF nos snapshots; o arquivo de patch também preserva o prefixo de espaço das linhas vazias de contexto. Antes do commit, o responsável deve conferir os hashes dos blobs do índice. O manifesto não se autentica sozinho: a revisão do commit e seu SHA externo preservam a proveniência.

## Ambiente necessário

Este é um pacote de reprodução das fontes no layout original, não um executável portátil para qualquer computador. Ferramentas, pins e caminhos Windows fixos precisam já existir: Node 24.22.0, Bun do workflow canônico (1.3.11), Railway CLI nativa 5.62.1 e Wrangler 4.120.1 instalado pelo workspace. Os testes de transporte sintético também exigem os binários pinados de age/age-keygen 1.3.2. A operação real usa adicionalmente PowerShell 7.6.7 para ACL, Docker e a imagem PostgreSQL exata registrada no manifesto.

O módulo `packages/studio-ai-reconcile-cron/src/index.ts` e a configuração `packages/studio-runtime/wrangler.jsonc` já pertencem ao repositório e não são duplicados. Os leitores de launcher precisam do executável Git e dos quatro commits históricos indicados no manifesto para `git show`. Binários, `node_modules`, imagens Docker, autenticação OAuth, identidades privadas e estado remoto ficam fora do pacote.

## Testes locais preparados

Após restaurar os bytes e conferir as ferramentas, execute os testes explicitamente e de forma serial, a partir da raiz do checkout. Estes comandos selecionam testes; não chamam os entrypoints operacionais.

```powershell
$prepNode = 'C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/node-v24.22.0/node-v24.22.0-win-x64/node.exe'
& $prepNode --test --test-concurrency=1 .cache/python-reference-games/production-maintenance-fresh-readers-r1.test.mjs .cache/python-reference-games/production-postgres-execution-preflight-r1.test.mjs .cache/python-reference-games/production-postgres-isolated-clone-r2.test.mjs .cache/python-reference-games/production-postgres-rehearsal-r1.test.mjs .cache/python-reference-games/production-postgres-fenced-context-r1.test.mjs

bun --no-env-file test ./.cache/python-reference-games/production-maintenance-store-r1.test.ts ./.cache/python-reference-games/production-maintenance-reload-r2.test.ts ./.cache/python-reference-games/production-maintenance-http-r2.test.ts ./.cache/python-reference-games/production-backup-durable-store-r2.test.ts ./.cache/python-reference-games/production-backup-rehearsal-r2-transfer-r2.test.ts ./.cache/python-reference-games/production-backup-final-transfer-r1.test.ts
```

O teste de transporte abaixo cria apenas identidade e dados sintéticos temporários, usa age local e os remove pelo fluxo do teste. Ele não usa chave ou banco de produção, SSH, providers ou Docker:

```powershell
& $prepNode --test --test-concurrency=1 .cache/python-reference-games/production-postgres-binary-stream-r1.test.mjs
```

Este arquivamento não rerodou os testes nem qualifica operações reais. Os recibos de execução futura devem registrar sua própria fonte, seus dados e resultados.

## Limites operacionais

O backup final exige os cinco VERIFY reais, com seus APPLY/HTTP, um manifesto explícito e observações frescas antes/depois da captura. Planos e recibos expirados devem ser substituídos por novos arquivos reais, nunca por alteração de timestamps. Intenções permanentes e resultados desconhecidos continuam impedindo replay.

`affectedWritersFenced` trata de Kids, Adult, Admin, Hub e Members. `allProductionWritersFenced` permanece falso: outros serviços de produção podem continuar escrevendo em seus próprios schemas. O dump consistente cobre um banco; o procedimento não promete rollback total do cluster, roles/ACL, outros bancos ou mídia externa. Contagens Pensa frescas e avaliação de dados antes de 0126/0128 continuam uma etapa própria, sem inferir consentimento de exclusão a partir de contagens antigas.

As instruções operacionais completas permanecem nos runbooks pinados restaurados. A abertura da janela e cada operação pertencem ao responsável pela implantação; arquivar estes arquivos não ativa manutenção, aplica migrações ou autoriza repetir operações históricas.

## Fora do Docker

A `.dockerignore` da raiz já exclui `/docs` e `/.cache`. Este pacote não altera Dockerfiles nem dependências e não deve integrar contexto ou imagem de runtime.
