# JS Pro legado staging — leaf R3

Derivado offline de R1 congelado + transporte privado e seletor da nuvem R2. O snapshot CLI real de 2026-10-21 06:23:16–22 UTC observou Auth, Members e Community SUCCESS/8c0; os UUIDs estão em `contract.mjs` como tuplas exatas por serviço. Isso não prova o término do CI nem os arquivos remotos. Não há binding, execution, conta nova ou browser neste preparo.

`derivation.json` registra os receipts pais. Os 44 inputs anteriores permanecem idênticos. Os 20 arquivos Auth são comparados offline tanto com Git FACE quanto com Git 8c0; `remote.mjs`, idêntico a R1, voltará a conferir seus hashes no servidor antes de importar/consultar o banco e emitir READY. Só depois nasce a senha em RAM, enviada pelo stdin SSH. Nenhum email/outbox/convite, role existente, currículo ou política é alterado.

O refresh oficial usa a cópia local `oauth-session.mjs`: mesmo lifecycle R5, somente import de contexto fechado e Members UUID atual alterados. O helper R5 histórico não foi editado. `oauth-context.mjs` liga os argumentos ao mesmo projeto/staging e à tupla Members do contrato. Falha/drift impede o cenário; não há retry ou substituição automática por novo deployment.

`runOwnedScenario` recebe o browser já owned pelo adapter Node + Job; não lança browser nem fecha a árvore. A capability OAuth passa do caller original para o Node isolado por pipe privado; token/key não entram no env Chrome/Node ou nos artifacts. Ver `ADAPTER-INTERFACE.md`. A integração operacional com o adapter continua pendente.

Percurso preservado: staff próprio → login → Python oculto no Novo projeto → importação UI da cópia Vanilla8.0.16 → BFF de dependências/lock8.1.6 → Salvar → ZIP com arquivos/scripts invariantes → selo real da nuvem → TypeScript executado → contexto novo/login/lista cloud/mesmo ID → novo ZIP e preview. O wait da nuvem usa role=status + title exatos, sem `.first()`, com os mesmos30s. Preview livre é WebContainer; não é uma nova qualificação do compilador Worker. Fixture tem6arquivos e0assets.

Conta staff e projeto cloud ficam retidos explicitamente. Não existe cleanup de conta inventado. Deadline remoto45s/SSH60s/UI180s/total300s; timeout pede parada ao owner e conserva incerteza até close real. Browser1024MiB/reserva512MiB ficam com o adapter, sem alteração de política.

Comandos somente offline:

```powershell
node .cache/studio-python-l0/pro-legacy-staging-ui-owned-r5/run.mjs --verify
node --test .cache/studio-python-l0/pro-legacy-staging-ui-owned-r5/control.test.mjs .cache/studio-python-l0/pro-legacy-staging-ui-owned-r5/context-control.test.mjs .cache/studio-python-l0/pro-legacy-staging-ui-owned-r5/provider-context.test.mjs
```

Antes de Start: Root deve fornecer observação fresca por serviço e binding SHA-bound ao plan, CI conforme sua coordenação, adapter aprovado e janela. O schema fechado está em `validateBinding`: `attemptId`, `serviceContexts` (auth/members/community), `browserChannel`, `createExclusiveStaff`, `observedAt`, `expiresAt`, `planSha256`, `windowOwner`. Nenhum binding de exemplo persistido concede autoridade. O adapter chama a função, não existe CLI standalone de execução.
