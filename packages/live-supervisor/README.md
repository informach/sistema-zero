# Supervisor independente de mídia

Worker Cloudflare com um Durable Object SQLite por conexão. Registra lease, geração, sessão SFU, mids conhecidos e resultado de limpeza. Não armazena nomes, projeto ou mensagem infantil; não concede acesso a uma turma. Members continua responsável por inscrição, dispositivo, professora e permissões.

O registro durável ocorre antes de autorizar distribuição. Alarmes fecham trilhas quando lease/hard end vence ou a conexão é aposentada. Aposentadoria é irreversível; renovação atrasada não reativa a conexão. Respostas e alocações tardias são retidas. Inspeções posteriores reconhecem trilhas inativas e fecham novamente um mid que reapareça ativo. Cada resultado de fechamento é conferido.

## Configuração e operação

`wrangler.jsonc` contém ambientes `staging` e `production`, cada um com binding próprio `CONNECTIONS`, classe `LiveConnectionSupervisor` e migração SQLite `v1`. Configurar os segredos `SFU_APP_ID`, `SFU_APP_SECRET` e `SUPERVISOR_TOKEN` (pelo menos 32 caracteres) para o mesmo app do Members/gravador do ambiente. O token é diferente do segredo SFU e não vai ao navegador.

Os ambientes foram provisionados em 14/10/2026; ver o [runbook de implantação](../../docs/runbooks/2026-10-14-oficinas-ao-vivo-deploy.md). Para atualizar staging, usar Wrangler a partir deste diretório; produção exige selecionar explicitamente `--env production`:

```text
bunx wrangler secret put SFU_APP_ID --env staging
bunx wrangler secret put SFU_APP_SECRET --env staging
bunx wrangler secret put SUPERVISOR_TOKEN --env staging
bunx wrangler deploy --env staging
```

Fornecer a origem HTTPS resultante como `LIVE_SUPERVISOR_URL` no Members e gravador, e o mesmo token como `LIVE_SUPERVISOR_TOKEN`. Não desabilitar a exigência de supervisão quando o Worker falhar: novas transmissões devem ser recusadas. Deixar `LIVE_MEDIA_READY=false` até o ensaio completo do [gravador](../live-recorder/README.md).

`PUT /connections/:uuid` exige Bearer privado e documento mínimo com `connectionId`, `generation`, `sessionId|null`, `leaseEndsAt`, `hardEndsAt`, `retired` e `mids`. Limite de corpo 16 KiB, até 128 mids, lease no máximo 20 segundos adiante e hard end no máximo cinco horas adiante. Instâncias Members e gravador renovam somente dentro da própria autorização.

`GET /connections/:uuid` exige o mesmo segredo e retorna o estado operacional para suporte, com `Cache-Control:no-store`. Conferir `retired`, `cleanupPending`, `closedMids` e `lastErrorAt`. A API não lista todas as conexões: partir dos IDs duráveis em `live_media_connections` e dos jobs. Nunca copiar tokens, SDP ou conteúdo de crianças para logs de diagnóstico.

Chamadas SFU têm timeout de oito segundos. Alarmes de limpeza repetem a cada 15 segundos enquanto há falha e reinspecionam até hard end + 60 segundos mesmo após fechamento confirmado, para encontrar alocações atrasadas. Pendência não vira sucesso porque passou um prazo. Conexão sem sessionId permanece incerta aguardando eventual resposta tardia; a API SFU não permite localizar criação pela correlationId. Recursos incertos precisam de suporte, e falha persistente pode continuar gerando operações cobradas.

O supervisor é uma camada independente, não uma garantia de desligamento instantâneo contra falha simultânea do fornecedor. Em incidente: impedir novas salas pelo gate no Members, ordenar fim da ocorrência, conferir estados de mídia/gravador, inspecionar cada conexão com esta API e medir encerramento no fornecedor. Não concluir que parou somente porque o cliente removeu o vídeo. Não remover o Durable Object para ocultar uma pendência.

## Verificação e custos

Executar `bun run typecheck`, `bun run check` e `bun test`. Testes cobrem autenticação, geração, aposentadoria irreversível, lease expirada e alocação que reaparece depois do fechamento. O armazenamento/alarme é um adapter determinístico nesses testes; Cloudflare real ainda precisa ser ensaiado.

Durante a prova, interromper Members mantendo WebRTC ativo e medir suspensão no navegador e fechamento no SFU. Repetir com supervisor indisponível, fechamento parcial, resposta atrasada e aba em segundo plano. Confirmar que a professora perde acesso após revogação e que a tela infantil nunca chega a colegas ou gravador. Verificar ausência de sessões conhecidas pendentes após o prazo observado.

Durable Objects, Workers e tráfego SFU/TURN têm medição própria. Esta implementação não promete custo zero dentro de um plano existente. Acompanhar quantidade de renovações, duração das pendências, alarmes e recursos órfãos. O registro não contém TTL de exclusão automática: retenção de auditoria deve ser decidida antes do uso continuado e só remover registros após fechamento comprovado.

Referências: [sessões e status](https://developers.cloudflare.com/realtime/sfu/api/), [negociação e falhas](https://developers.cloudflare.com/realtime/sfu/concepts/negotiation/), [Durable Objects](https://developers.cloudflare.com/durable-objects/).
