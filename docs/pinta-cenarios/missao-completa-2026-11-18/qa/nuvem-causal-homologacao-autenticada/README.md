# Homologação autenticada da nuvem causal em staging

**Estado.** Preparação local. A consulta Railway observou Members e as duas comunidades em `16bf6725f8704ed3305e5783397cdee0b230b6ab` e Gateway em `4eddccb1baac4de5a51aa48b05f95be453087e58`, todos `SUCCESS`. Essas fontes antecedem as rotas candidatas. Registre novamente os deployments na hora da janela. [Fluxo do repositório](../../../../ambientes-e-fluxo.md)

## Preparar a janela

- [ ] Pinar o commit integrado e os quatro deployments vigentes. Para cada ID de serviço do workflow, executar `railway deployment list --project 415d5a1c-5f75-432c-8445-b395d0977ce3 --environment f634cff6-aafb-4804-8b69-172fad4e946e --service <id-do-serviço> --limit 5 --json` e extrair somente estado, ID do deployment e commit. Os serviços são Members, API Gateway, Community e Community Kids. [Workflow](../../../../../.github/workflows/ci.yml)
- [ ] Ter um perfil infantil de QA selecionado e uma conta adulta de QA com o Pinta disponível pela autorização normal. Ter um perfil de controle autorizado para testar exclusão da lista, de preferência outro perfil da mesma conta infantil. Manter uma aba do cliente público A aberta e um contexto de navegador limpo por origem.
- [ ] Fechar o gate do commit integrado e conferir o preDeploy do Members, com as migrações aditivas `0168_pinta_causal_units`, `0169_pinta_causal_object_retirement` e `0170_pinta_causal_writer_fence`. A onda CI de staging pode chamar o rollout canônico de Auth junto ao Members. A aprovação da janela precisa cobrir os serviços efetivamente selecionados pelo workflow.
- [ ] Implantar a fonte verificada com as opções padrão desligadas e comprovar o Pinta individual de controle. Depois da autorização específica para habilitar o ensaio, configurar `PINTA_CAUSAL_CANDIDATE=1` e `PINTA_CAUSAL_QA_PROFILES` no Members e nas duas comunidades. A lista é um array JSON de objetos com `audience`, `accountId` e `userId`, todos exatos. Na comunidade adulta, conta e usuário coincidem. Configuração ausente ou inválida fecha o candidato. O Gateway deve montar as rotas internas e conferir o consumidor existente `member-shell`.
- [ ] Pinar o build B de cada comunidade com `NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1=1`. O Dockerfile encaminha a opção ao `next build` com default `0`. A página autenticada passa somente o booleano de elegibilidade. Despacho, configuração e implantação ficam com o operador da janela. [Referência do Next](https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser)

Checagem da CI, somente leitura.

```powershell
gh run list --workflow ci.yml --branch staging --limit 5
gh run view <id-da-CI> --json headSha,status,conclusion
```

O despacho canônico abaixo é uma operação de implantação. Só o operador executa depois de conferir o SHA exato da branch e a autorização da janela.

```powershell
gh workflow run ci.yml --ref staging -f 'services=members,api-gateway,community,community-kids'
```

## Executar A → B → A → B

| Fase | Ação e critério |
| --- | --- |
| A · referência | Nas origens de staging já aprovadas, abrir `/pinta`, criar uma folha e um mapa nativo 7 descartáveis ligados entre si pela UI. Conferir o writer individual e registrar revisões, hashes e a aba A. |
| B · escopo | Pelo navegador autenticado, `GET /api/pinta/causal/graph?reader=6` devolve `200` e `protocol:1` para cada ator permitido. O perfil de controle recebe `404` na mesma rota e continua na via individual. A sessão Kids usa a prova do documento enviada pelo app. |
| B · unidade e descida | Conferir o backfill da folha e do mapa, preservando revisões e bytes. Pela UI, remover a peça referenciada. Observar reserva e verificações reais, um commit com as duas revisões e novo epoch. Repetir o commit do mesmo `opId` e conferir o mesmo recibo. Em outro contexto autenticado, abrir a galeria e comparar o mapa, as células, os vínculos e o SHA-256 dos gzips conferidos. O mapa nunca deve ser exibido com os índices antigos sobre a folha nova. |
| A · versão anterior | Manter o backend que aplica a cerca e abrir o binário A na mesma origem e perfil. Após a adoção, listagem, download, reserva, commit e exclusão individuais do perfil adotado recebem `409 protocol-required`. Uma edição em A permanece local. Provar que o backend conserva epoch, revisões e hashes. |
| B · retomada | Reabrir B com o mesmo IndexedDB e verificar que a edição de A reaparece como divergência recuperada ou edição da nova unidade pelo fluxo explícito, com confirmação apenas quando houver recibo. Em perfil limpo, conferir o grafo restaurado. Verificar também a UI de selo local enquanto houver trabalho sem recibo. |

O rollback de interface conserva o Members e o Gateway que aplicam a cerca. A desativação temporária do candidato mantém as migrações e a cerca das galerias já adotadas. Ao encerrar, restaurar o estado autorizado das opções e confirmar o perfil de controle.

A evidência deve guardar somente commits, IDs de deployments, estados HTTP, epochs, revisões e hashes de documentos de QA. As provas de armazenamento e do IndexedDB são complementares. [Cloudflare R2](../nuvem-causal-r2-staging-2026-11-22/README.md) · [Compatibilidade IndexedDB](../nuvem-causal-idb-binarios-2026-11-22/README.md)
