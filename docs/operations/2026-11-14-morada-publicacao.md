# Publicação da Morada — 14/11/2026

A Morada foi publicada manualmente em **staging e produção**, por autorização explícita da responsável, enquanto o CI continuava em paralelo. A migration `0149_morada_house` e a conversão das contas foram efetivamente aplicadas aos dois bancos. Este registro substitui o estado de publicação pendente descrito nas verificações locais anteriores.

## Código e serviços

Revisão dos deploys: `0a208ede7ae1e895926726030c6a325c806d2fe3`, que contém a migração Morada, os reparos dos reviews e a entrega do avatar. Members, Auth, api-gateway, arquipelago-api, community-kids, community e Admin ficaram `SUCCESS` nos dois ambientes. A publicação usou builds do commit no GitHub, fixado por SHA.

O deploy manual ocorreu antes da promoção de staging para main, solicitada no [PR #258](https://github.com/informach/sistema-zero/pull/258). Portanto, a presença da migração em produção não depende de ela já constar na branch main. A correção posterior de tipagem da prova de navegador altera somente o teste.

Deployments críticos:

| Serviço | Staging | Produção |
| --- | --- | --- |
| Members | `cd10a5d9-9f51-4657-8b33-be4e26f82bf2` | `09af498d-29b2-4baf-ae1f-248d8b8f1d6a` |
| Kids | `5350ee91-22e5-4661-85fd-3b9e0648e089` | `dc3f1e3f-fde4-4fb2-aec2-443563a6aa18` |
| Comunidade adulta | `f707f59b-a317-4f83-aae8-dbecbe697db0` | `49944dad-4e73-4aff-bed2-ed0adb183f20` |

## Contas e moedas

O ensaio foi executado no Members atualizado e a identidade de projeto, ambiente, serviço e commit foi conferida antes de cada operação. Backups consistentes de quartos antigos, inventários, carteiras, extratos e casas foram guardados nos buckets privados de cada ambiente e verificados por SHA-256 antes da conversão.

| Resultado | Staging | Produção |
| --- | ---: | ---: |
| Casas criadas a partir dos quartos antigos | 4: 3 Kids, 1 adulto | 8, todas Kids |
| Entradas de inventário retiradas | 11 | 9 |
| Perfis com reembolso histórico | 0 | 6 Kids |
| Moedas devolvidas | 0 | 750 |

Aplicação em produção: **14/11/2026, 19:53:15 UTC**. O ensaio repetido às **19:53:21 UTC** retornou zero casas, itens e reembolsos pendentes. Staging também retornou zero pendências após a aplicação. O marcador `morada-refund-v1` impede repetir o pagamento. Galeria, troféus e extratos históricos foram preservados.

Os recibos privados e relatórios operacionais da sessão ficam em `.cache/morada-publicacao/`, fora do Git. Backups remotos ficam em `operations/morada-backups/<ambiente>/` nos buckets privados. Recuperações devem ser seletivas: não substituir carteiras inteiras por um snapshot anterior a novas transações.

## Artes e validação real

As **6.693 artes**, correspondentes a 3.106 peças do catálogo, foram enviadas para `testes-privado/morada/` e `comunidade-sistema-zero-privado/morada/`. Todos os arquivos dos dois ambientes foram relidos e conferidos por SHA-256. O acesso público `r2.dev` está desativado e ambos os buckets estão sem domínio público associado.

Com as contas administrativas autorizadas, os quartos Kids e adulto foram abertos nos dois ambientes reais. Foram conferidos os 24 gatos/cães, gravação HTTP 200, persistência após recarregar e recusa HTTP 409 de revisão antiga. A escolha original de pet foi restaurada ao fim de cada teste. Esses fluxos não apresentaram exceções JavaScript.

O jogo adulto abriu e exibiu HUD e menu nos dois ambientes sem falhas de arquivos privados ou exceções JavaScript. A prova local com modelos privados reais confirmou cancelamento de colocação, colocação válida, desfazer, conflito entre abas e pausa da física. Medições em navegador de software não substituem uma matriz de dispositivos físicos.
