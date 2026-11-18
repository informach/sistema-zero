---
status: valid
file: packages/pinta/src/state/persistence.ts
line: 420
severity: high
author: codex
provider_ref:
---

# Issue 026: Aba antiga com RAM4 apaga documento5 do IndexedDB sem recuperação local

## Review Comment

A trava de leitura do formato novo não protege uma aba que abriu o documento antes
da promoção. Ela ainda possui RAM4 e executa o gravador antigo na mesma chave
`pinta:asset:<id>`. Sem nuvem, a gravação substitui o documento5 e não existe
checkpoint/revisão autoritativa local para recuperá-lo. A proteção do canônico na
conta, corrigida nas issues 023/025, não resolve essa perda do documento local.

## Triage

- Decision: `VALID`.
- Baseline real: `567b93f95`, cujo `PINTA_MAX_SCHEMA` é 4. O reprodutor extrai
  `persistence.ts`, `project.ts` e seu grafo relativo por `git show`, sem substituir
  o gravador antigo por uma imitação. Não há host ou módulo de nuvem no teste.
- As duas versões usam `createStore('sistema-zero-pinta-<perfil>', 'kv')` e a mesma
  chave `pinta:asset:<id>`. `setMany(pairs)` escreve sem compare-and-swap ou
  checkpoint protegido. A fila FIFO, o histórico e `openAssets` são locais à página.
- `loadAssetById` lê apenas a chave substituída. A listagem filtra esse mesmo prefixo.
  O BroadcastChannel invalida o inventário de tamanho; não impede a gravação antiga
  nem conserva a versão anterior. Fechar a página nova elimina sua cópia em memória.
- Impacto: perda silenciosa de dados que já tiveram gravação local confirmada,
  mesmo com versões recusadas corretamente pelo leitor frio e sem nenhuma chamada
  de rede. O exemplo perde offset2,5; uma RAM anterior também pode eliminar outras
  edições feitas na versão mais recente.
- Escopo desta entrega: auditoria, reprodução e documentação. Nenhum journal,
  contrato de persistência, source ou migração foi implementado. Issue aberta;
  PR **draft de revisão**, sem prontidão para release.

## Reproduction

Reprodutor versionado e independente de `.tmp` preexistente:

`docs/pinta-cenarios/revisao-2026-11-18/qa/repro-local-only-026.ts`

Na raiz, com Git, Bun e dependências do monorepo instalados:

```powershell
bun docs/pinta-cenarios/revisao-2026-11-18/qa/repro-local-only-026.ts
```

O script prepara um diretório novo em `.tmp`, copia 37 módulos reais do baseline
por `git show`, liga as dependências instaladas e executa um único teste com o mock
funcional do IndexedDB. Não altera fontes, banco real, perfil real ou nuvem.

1. Gravar mapa4 rico com o baseline; aba antiga carrega e conserva sua RAM4.
2. Código atual grava o mesmo ID como5, com `offsetX:2.5` e novo nome.
3. Leitura fria do baseline retorna `null`, comprovando que ele não abriu o5.
4. Aba antiga grava a RAM4 anterior com uma edição adicional, sem reler o5.
5. Reimportar o módulo atual e reabrir/listar o perfil.
6. Resultado: somente mapa4/edição antiga; offset ausente; uma chave física; nenhum
   documento5, checkpoint ou cópia de recuperação no banco simulado.

## Verification

Executado nesta revisão, depois de criar o reprodutor independente:

```text
Baseline 567b93f95: 37 módulos reais
promoted: {schema:5,offsetX:2.5}
oldColdReadOf5: null
oldDelayedWriteSucceeded: true
reopened: {schema:4,name:"edicao-aba-antiga",offsetX:null}
physicalKeys: ["pinta:asset:same-authorial-map"]
hasSchema5Checkpoint: false
cloudImported: false
1 pass; 0 fail; 12 expect() calls; um teste; 84 ms
```

Preparação mais teste: aproximadamente seis segundos nesta máquina. **O teste
aprovado confirma a perda existente; não confirma segurança ou correção.** Usa
IndexedDB simulado; não é ensaio de quota física, navegador ou dispositivo real.
Nenhum gate pesado foi executado por este lote.

## Requisitos da correção

Não é possível impedir o gravador já publicado de gravar sua chave antiga apenas
adicionando um guard ao código novo. A solução precisa proteger a recuperação do
documento nativo e tratar o ciclo completo, sem implementar um journal às pressas.

1. **Autoridade única e revisão:** definir um registro protegido que seja a fonte
   autoritativa local do documento nativo completo; a chave conhecida pelo cliente
   antigo pode ser um espelho de compatibilidade. Não eleger o vencedor por maior
   schema/timestamp. Vincular gravações à revisão/proveniência e distinguir retirada
   legítima de recursos de RAM antiga que sobrescreveu o espelho.
2. **Atomicidade:** gravar autoridade, revisão e espelho na mesma transação; ler e
   comparar o estado necessário dentro da transação. Um `get` separado de `setMany`
   mantém a corrida. Cobrir também batches e mapas/dependências ligados.
3. **Preservar as duas edições:** detectar espelho antigo divergente, conservar a
   versão rica e recuperar a edição antiga como cópia independente, com IDs/vínculos
   corretos e aviso compreensível. Não mesclar campos desconhecidos silenciosamente.
4. **Quota e falhas:** transação recusada mantém a versão anterior recuperável e o
   editor em estado de erro/retry. Limitar retenção e contabilizar armazenamento
   adicional/cópias; não apagar o checkpoint para fazer o write caber. Não depender
   de rede no autosave ou de memória da página que já fechou.
5. **Lista, leitura, captura e orçamento:** todos os caminhos precisam resolver a
   mesma autoridade, inclusive leituras diretas/getMany da captura de recursos.
   Evitar duplicatas na galeria e no backup; expor versões futuras sem saneamento
   destrutivo; isolamento por perfil deve continuar valendo.
6. **Exclusão/tombstone:** exclusão nova é transacional e não pode ser desfeita por
   uma gravação tardia da aba antiga. Preservar essa edição recuperável sem
   ressuscitar silenciosamente o mesmo ID. Tratar também exclusão executada por
   cliente antigo e retenção/limpeza explícitas.
7. **Capacidades futuras e migração reversível:** envelope protegido versionado,
   recusa de formato futuro antes de regravar e comparação causal. Preservar o
   banco/store e compatibilidade necessária sem migração irreversível, segundo
   editor autoral ou dependência de fechar abas por BroadcastChannel.
8. **Aceitação funcional:** repetir a prova com código antigo real e exigir que a
   nova reabertura conserve o rico5 e a edição4. Acrescentar concorrência de duas
   abas atuais, crash/reinício, quota em cada etapa, versão futura, downgrade
   legítimo, lote/dependências, captura, lista/backup, delete/ressurreição, perfis
   isolados e execução no IndexedDB real. Só então fechar esta issue e reavaliar R02.
