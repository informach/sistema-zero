# Implantação de staging e produção em 29/10/2026

Os dois ambientes receberam manualmente a versão `cd0e92389dab06fbba0b60ba6260323c2bd596c6`, em paralelo, após aprovação dos testes do CI. A árvore é idêntica à versão aprovada `b3c0e323e90dc885190c8d1b98508c177285f7f1`, promovida pelo PR #220.

## Resultado

| Ambiente | Serviços Railway | Fim do controlador (UTC) | Configurações pendentes | Deployments pendentes |
| --- | --- | --- | --- | --- |
| Staging | 19 de 19 com sucesso e SHA correto | 18:11:02 | 0 | 0 |
| Produção | 19 de 19 com sucesso e SHA correto | 18:25:49 | 0 | 0 |

Serviços conferidos: Arquipélago API, Live Recorder, Helpdesk App, Helpdesk, Referrals, Marketing App, Marketing, Hub, Fiscal, Kids, Funil, Comunidade adulta, Admin, Gateway, Members, Catalog, Messaging, Auth e Payments.

A conferência das instâncias ativas às 18:25:16 UTC encontrou exatamente uma implantação bem-sucedida na versão esperada por serviço. Uma segunda leitura pelo conector Railway confirmou os 38 resultados. A leitura final da fila não encontrou implantações pendentes.

## Verificações

- Doze endpoints públicos retornaram HTTP 200: Admin, Kids, comunidade adulta, Gateway, Funil e executor do Estúdio em cada ambiente.
- Onze serviços internos responderam ao readiness pelo gateway de cada ambiente. Foram conferidos banco e inicialização da integração Efí onde essas verificações são expostas. O Arquipélago respondeu `mapaDasIlhas: ok`.
- As configurações dos 38 serviços foram relidas, sem alterações aguardando aplicação. As relações de tokens internos, URLs, configuração do Estúdio e catálogo Python foram conferidas sem publicar valores secretos.
- Os controladores canônicos validaram a barreira de publicação da jornada na versão 2. As migrações foram executadas pelos comandos canônicos de implantação. Não houve edição manual dos bancos remotos.
- O certificado Fiscal carregado na nova instância de produção vence em 28/09/2027.
- O executor Cloudflare foi atualizado nos dois ambientes. Versão de staging: `77db704e-8758-4552-aa32-9aad2fc7ea00`. Versão de produção: `8bc72a23-e978-429f-ac18-e8a0069094aa`. Imagem comum: `sha256:5b7971c87d1b7117add2c9f3668af16e3bf03006eff3ab4bc9e1c2a92d9d4f85`.
- A prova real do executor aprovou `dobro(2) = 4` e reprovou `dobro(2) = 5` nos dois ambientes.
- A distribuição Python existente `2026-10-25-integrated-games-2` permaneceu ativa, com manifesto `0d27adb3af80195770b95545f3d1a40c4153941d4cf5cfc56f513b95e07371e1`. Os oito recursos HTTP de cada ambiente responderam 200. Não houve nova promoção dessa distribuição nesta onda.

## Falhas anteriores e tratamento

O deploy automático de staging parou antes de acessar o Railway porque a busca de histórico atingiu o limite de resultados do GitHub. A correção consulta somente execuções bem-sucedidas, preservando as demais validações. Está no PR #221, separado da versão de aplicação implantada. O lote original passou 94 testes e 205 asserções; o transporte foi novamente conferido na branch isolada com 40 testes e 114 asserções.

O deploy automático de produção parou durante a prova SSH anterior às mutações. A mesma verificação funcionou localmente e no diagnóstico independente do CI. Não foi comprovado defeito de chave e nenhuma chave foi trocada para contornar esse episódio.

Durante a primeira operação manual, a credencial local do Railway expirou na consulta de acompanhamento. Os deployments já confirmados foram reconciliados antes de continuar, sem repetir seus envios. A retomada releu a credencial atual e renovou a sessão pela CLI quando necessário.

O último serviço, Fiscal de produção, demorou na publicação da imagem e preparação da instância. Concluiu sem reconstrução: migrações aprovadas às 18:18:32 UTC e aplicação iniciada às 18:24:09 UTC.

## Limites

Esta é uma validação operacional da implantação. Os fluxos autenticados completos e a conferência visual no navegador não foram repetidos nesta rodada. Nenhuma afirmação de homologação integral de produto decorre dos healthchecks.

Commits e edições locais posteriores ao congelamento da versão aprovada não estão nesta implantação. A versão efetivamente publicada é o SHA registrado acima. A correção do CI no PR #221 ainda não foi mesclada nesta onda.

Os recibos locais sanitizados estão em `.cache/deploy-2026-10-29/`: `wave-versions-final.json`, `health-final.json`, `private-readiness-staging.json`, `private-readiness-production.json`, `config-activation-final.json`, `pending-final.json` e `resume-staging-r4.json` / `resume-production-r4.json`.
