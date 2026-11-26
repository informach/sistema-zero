# Revisão de campanhas, embaixadores e origem das aquisições

Revisão independente da frente comercial em andamento, com correções integradas à `staging` local. O objetivo conferido foi vender o curso para pais sobre frustrações por uma campanha vinculada à embaixadora, distinguir a origem de cada aquisição e reservar o bônus à primeira assinatura da Comunidade.

## Correções desta revisão

| Achado | Correção e prova |
| --- | --- |
| Estorno recebido entre a leitura do pagamento e o INSERT podia deixar compra sem bônus ativa nos relatórios. | Todo encerramento bem-sucedido da compra reconfere o pagamento. Regressão reproduzida antes da correção, com e sem embaixador. |
| O cache podia manter o endereço antigo redirecionando após a data da campanha. | O prazo é conferido em cada visita, inclusive com o serviço indisponível. Teste cobre vencimento dentro do TTL. |
| Assinatura anterior de outro produto bloqueava o bônus da primeira Comunidade. | O histórico comprova a oferta da Comunidade; assinatura de outro produto não ocupa essa vaga. Regressões para slug conhecido e ainda não preenchido. |
| Aulas ou módulos arquivados interferiam no início, na conclusão e na contagem de aulas. | As consultas usam apenas aulas publicadas do currículo ativo, incluindo os filtros de posição de vídeo e entregas. Prova com PostgreSQL. |
| Dois convites Kids por oferta geravam literalmente `undefined` no rodapé. | Rodapé preenchido. O teste importa os quatro templates realmente renderizados pelo seed, sem executar o acesso ao banco. |
| Contratos incompletos impediam verificações estritas de tipos. | Portas de leitura menores no funil, data serializada no DTO da campanha, resgate opcional tratado, cenários HTTP e mocks tipados e configuração do gateway validada antes do registro. |

As correções e provas SQL recebidas da outra sessão também foram conferidas: primeira assinatura histórica pelo Payments, autoindicação por conta, vaga do bônus por conta/público, contadores e origem, oferta principal por SKU e paginação de lembretes sem perder a precisão de microssegundos do PostgreSQL.

## Verificação

Na cópia de revisão da staging: Core 3.332 testes; Members 2.454; Member Shell 2.822; Admin 1.037; Funil 745; Catálogo 171; Payments 443; Gateway 336; Messaging 183. As suítes gerais pulam as provas de banco opcionais quando não recebem suas variáveis específicas.

As provas de banco foram executadas separadamente em PostgreSQL 17 descartável, em loopback: Referrals 319 testes sem skips; lembretes e dias extras 2; catálogo/público/oferta principal 5; ofertas pagas do Payments 1; comércio e origem JSONB do Funil 2. Também passou a prova SQL de reorganização do currículo.

O navegador conferiu criação de campanha de presente, campanha de venda vinculada à embaixadora, calendário e cartões de cupom em Kids/adulto e nas larguras 320, 390 e 1.440 px. A página do curso da Vivianne foi conferida em 320, 390, 768 e 1.440 px: preço do catálogo, imagens, origem pelo `/i/` com cookie HttpOnly e modo presente.

Os navegadores usam o build e os componentes reais com fronteiras externas simuladas. As provas SQL usam as implementações reais de persistência. Esta conferência local não substitui o smoke integrado de pagamento e concessão depois do deploy em staging.

Resultado da candidata seletiva: checagens de tipos dos 11 pacotes aprovadas; build do Funil e os dois cenários de navegador aprovados; Referrals 319, Funil 745 e Kids 1.748 testes aprovados. Biome conferiu 313 arquivos alterados sem erros, com 15 avisos. O Funil reportou sete hints na checagem de tipos. O Members precisou de `NODE_OPTIONS=--max-old-space-size=8192` para concluir a checagem completa; a tentativa com o limite padrão de 4 GB esgotou o heap.

## Promoção seletiva

Base: `fed288d8e78620e1224259b4f6b9081e3083413a` (`origin/main` confirmada novamente antes do fechamento). Candidata local: `review/promocao-campanhas-20261125`, commit `6f349e0a2f74949cb8c9efc63bfbc59be2698a31`.

A candidata tem um único commit sobre essa base, cobrindo 398 arquivos alterados. Foi reconstruída sobre a main, com os commits comerciais e suas correções. A lista e os arquivos estão em [promocao-seletiva.json](promocao-seletiva.json). Não houve merge da staging inteira nessa branch.

Foi necessário extrair seis arquivos comerciais de `249b9c54f`: apesar do título de formatação, esse commit continha parte da primeira implementação de origem. Também foram incorporados os materiais e registros do curso solicitados nesta sessão e o ajuste anterior da barra inferior das aulas.

Ficaram fora as alterações de autoria da Nave/Patrulha, apelido e avatar da staging. Nos dois conflitos de documentação foram mantidas as seções da frente comercial. A correção adicional do inventário e dos testes de autoria (`d5f9dc502`) pertence apenas à staging.

## Na operação de publicação

1. Aplicar as migrations do catálogo `0013_product_primary_offer`, do funil `0024_lead_origin` e do referrals `0013_origin_acquisitions`/`0014_redemption_advertised_days` antes dos consumidores que leem as novas colunas.
2. Configurar no catálogo a oferta principal dos produtos de cada página de venda: Comunidade, Desafio e Cadê nos dois públicos, guia dos pais e curso da Vivianne. Página sem principal marcada responde 503. Conferir `salesOfferRef` do curso na área dos pais.
3. Conferir no Referrals `PAYMENTS_INTERNAL_TOKEN`, `PAYMENTS_BASE_URL`, `CATALOG_BASE_URL`/`CATALOG_INTERNAL_TOKEN`, `BONUS_WINDOW_DAYS` e `ORIGIN_LEGACY_BEFORE`. A última deve representar o instante real de entrada da migration de aquisições em cada ambiente, preservando os acordos anteriores.
4. Executar o backfill em `plan`, revisar as contagens e aplicar; o seed dos templates deve incluir os convites, dias extras e lembretes novos. Depois, conferir campanha, embaixadora, oferta, cupom, origem e entrega no staging integrado antes da produção.

As operações acima ainda pertencem à publicação desta frente. Esta sessão não enviou mensagens, não criou cobranças e não fez push ou deploy da frente comercial.

## Achados editoriais fora da frente comercial

O inventário de repertório ignorava o novo campo `allowBlocks`; a leitura e os artefatos foram corrigidos. A autoria atual usa blocos diferentes de alguns desafios antigos. O inventário agora explicita a falta de fonte local na trilha para Corrida dos bichos (`every_frames`, `random_x`), Pedras (`every_frames`) e Relógio da onda (`spawn_asteroid`), nos dois públicos. Esses projetos ainda precisam de uma revisão editorial própria. A exceção já documentada do desafio opcional noturno foi preservada.

Os casos de regressão das experiências retiradas da Nave foram guardados como fixtures com a origem indicada. Os testes do currículo atual passaram a conferir o movimento, o limite, os materiais e o reinício na organização atual, e os percursos da Patrulha foram acrescentados.
