# Revisão de campanhas, embaixadores e origem das aquisições

Revisão independente da frente comercial, com correções integradas à `staging` local e publicação seletiva em produção. O objetivo foi vender o curso para pais sobre frustrações por links de embaixador ou campanha, distinguir a origem de cada aquisição e reservar o bônus à primeira assinatura da Comunidade. A responsável escolheu começar pelo link pessoal da Vivianne, sem campanha nem data final: **https://sistemazero.com.br/i/vivianne-e8ez/frustracoes**.

O [levantamento funcional completo](funcionamento-apos-publicacao.md) descreve as ofertas, presentes, relatórios, limites da atribuição, curso e materiais. O [recibo de produção](publicacao-producao-2026-11-26.json) distingue a publicação manual urgente já concluída da integração normal pelo GitHub e da segunda leva solicitada.

## Correções desta revisão

| Achado | Correção e prova |
| --- | --- |
| Estorno recebido entre a leitura do pagamento e o INSERT podia deixar compra sem bônus ativa nos relatórios. | Todo encerramento bem-sucedido da compra reconfere o pagamento. Regressão reproduzida antes da correção, com e sem embaixador. |
| O cache podia manter o endereço antigo redirecionando após a data da campanha. | O prazo é conferido em cada visita, inclusive com o serviço indisponível. Teste cobre vencimento dentro do TTL. |
| Assinatura anterior de outro produto bloqueava o bônus da primeira Comunidade. | O histórico comprova a oferta da Comunidade; assinatura de outro produto não ocupa essa vaga. Regressões para slug conhecido e ainda não preenchido. |
| Aulas ou módulos arquivados interferiam no início, na conclusão e na contagem de aulas. | As consultas usam apenas aulas publicadas do currículo ativo, incluindo os filtros de posição de vídeo e entregas. Prova com PostgreSQL. |
| Dois convites Kids por oferta geravam literalmente `undefined` no rodapé. | Rodapé preenchido. O teste importa os quatro templates realmente renderizados pelo seed, sem executar o acesso ao banco. |
| Contratos incompletos impediam verificações estritas de tipos. | Portas de leitura menores no funil, data serializada no DTO da campanha, resgate opcional tratado, cenários HTTP e mocks tipados e configuração do gateway validada antes do registro. |
| Consultas do controlador encerravam imediatamente ao atingir o limite da API Railway. | O prazo é encaminhado às leituras para respeitar `Retry-After`, com espera limitada. A main é reconferida depois da espera, antes da mutação e antes do resultado final. As mutações continuam sem repetição automática. Cinco regressões falharam antes da correção e passaram depois; a suíte operacional passou com 367 testes. |

As correções e provas SQL recebidas da outra sessão também foram conferidas: primeira assinatura histórica pelo Payments, autoindicação por conta, vaga do bônus por conta/público, contadores e origem, oferta principal por SKU e paginação de lembretes sem perder a precisão de microssegundos do PostgreSQL.

## Verificação

Na cópia de revisão da staging: Core 3.332 testes; Members 2.454; Member Shell 2.822; Admin 1.037; Funil 745; Catálogo 171; Payments 443; Gateway 336; Messaging 183. As suítes gerais pulam as provas de banco opcionais quando não recebem suas variáveis específicas.

As provas de banco foram executadas separadamente em PostgreSQL 17 descartável, em loopback: Referrals 319 testes sem skips; lembretes e dias extras 2; catálogo/público/oferta principal 5; ofertas pagas do Payments 1; comércio e origem JSONB do Funil 2. Também passou a prova SQL de reorganização do currículo.

O navegador conferiu criação de campanha de presente, campanha de venda vinculada à embaixadora, calendário e cartões de cupom em Kids/adulto e nas larguras 320, 390 e 1.440 px. A página do curso da Vivianne foi conferida em 320, 390, 768 e 1.440 px: preço do catálogo, imagens, origem pelo `/i/` com cookie HttpOnly e modo presente.

Os navegadores locais usam o build e os componentes reais com fronteiras externas simuladas. As provas SQL usam as implementações reais de persistência. Depois da publicação manual, houve também smoke de produção com oito ofertas, checkout, nove verificações de links, origem, imagens e quatro larguras. O mini checkout da área dos pais abriu com R$ 67, Pix, cartão e cupom, sem enviar pagamento. A conta sintética foi bloqueada novamente e sua concessão temporária revogada. A aprovação e a concessão por pagamento continuam cobertas pelas suítes; não foi criada cobrança real como teste.

Resultado da candidata seletiva: checagens de tipos dos 11 pacotes aprovadas; build do Funil e os dois cenários de navegador aprovados; Referrals 319, Funil 745 e Kids 1.748 testes aprovados. Biome conferiu 313 arquivos alterados sem erros, com 15 avisos. O Funil reportou sete hints na checagem de tipos. O Members precisou de `NODE_OPTIONS=--max-old-space-size=8192` para concluir a checagem completa; a tentativa com o limite padrão de 4 GB esgotou o heap.

## Promoção seletiva

Base: `fed288d8e78620e1224259b4f6b9081e3083413a`. Primeira candidata: `review/promocao-campanhas-20261125`, commit `fa103eb324fe9ff62b097d342d7436a195229463`, [PR 290](https://github.com/informach/sistema-zero/pull/290).

A candidata descende dessa base e cobre 424 arquivos no delta final. Foi reconstruída sobre a main, com os commits comerciais, materiais e correções. A lista e os arquivos estão em [promocao-seletiva.json](promocao-seletiva.json). Não houve merge da staging inteira nessa branch. O recibo preserva os SHAs finais de integração e publicação.

Foi necessário extrair seis arquivos comerciais de `249b9c54f`: apesar do título de formatação, esse commit continha parte da primeira implementação de origem. Também foram incorporados os materiais e registros do curso solicitados nesta sessão e o ajuste anterior da barra inferior das aulas.

Ficaram fora as alterações de autoria da Nave/Patrulha, apelido e demais trabalhos paralelos da staging. A correção de avatar `615329078` foi incluída isoladamente por pedido explícito da responsável. Os commits `7a630ea52` (quarto) e `6e0858525` (enquadramento da Cabine) pertencem à segunda promoção, [PR 291](https://github.com/informach/sistema-zero/pull/291), com correção adicional do enquadramento após redimensionar. A correção do inventário e dos testes de autoria (`d5f9dc502`) continua apenas na staging.

## Ativação em produção

1. Migrations aplicadas e serviços publicados em quatro ondas pelo caminho do controlador, com plano de infraestrutura sem alterações, triggers nativos desligados e barreira canônica Members/Auth preservada na versão 4. O pedido explícito autorizou a publicação manual urgente antes da conclusão do CI, com regularização pelo GitHub em seguida; nenhum gate versionado foi desativado.
2. Oito ofertas principais configuradas: Comunidade, Desafio e Cadê nos dois públicos, guia e curso da Vivianne. Quatro ofertas pagas anuais: Cadê Kids/adulto R$ 37, guia R$ 27 e Vivianne R$ 67, com garantia de sete dias e cupom. O Cadê entrega o Mural do mesmo público durante o prazo; depois permanece visitante. Os dois cursos para pais estão ligados às suas ofertas anuais, preservando os demais campos.
3. Variáveis e integrações conferidas. Corte legado real do Referrals: `2026-11-26T12:28:15.681Z`, mantido em novas publicações. As chaves antigas de oferta do Funil foram preservadas para a transição e rollback; o leitor novo usa o catálogo.
4. Backfill em plan/apply/replan sem registros faltantes; 23 aquisições de presente disponíveis na verificação e nenhuma conversão antiga gravada. Onze opções de ofertas de embaixadores habilitadas e 21 templates ativos. Presentes do Cadê e guia com 15 dias reais/7 divulgados; nenhum presente para Vivianne. Nenhuma campanha nova criada para ela.
5. Endereços `/bolsa` e `/cupom` reconhecidos pelo código novo. Endereço antigo do guia cadastrado até `2026-12-26T12:52:08.847Z`. Nove verificações de links aprovadas, com origem protegida por cookie HttpOnly/Secure. Relatório real de origens retorna 200 para admin e 403 para staff.

As quatro ondas manuais e as configurações acima foram concluídas e verificadas. O processo normal de CI, merge protegido e controlador oficial, assim como a segunda leva, têm seu estado e recibos no JSON de publicação. A sessão paralela mantém a responsabilidade pela subida de staging. Esta revisão não enviou mensagens a terceiros nem criou cobranças de teste.

O cadastro do curso inclui os materiais na Aula 1, Parte 2, seguido do resumo original em uma coluna e sem livro 3D; nomes e assinaturas oficiais no certificado; vídeo corrigido da Aula 5, Parte 2 com a capa enviada novamente nos dois ambientes; três artes próprias para oferta/checkout. Os originais, manifestos e recibos estão na pasta do curso em Docs.

As últimas provas de banco corrigiram fixtures que dependiam da ordem de execução: renovação em PostgreSQL vazio falhava em seis casos antes e passou nos seis depois; a ampliação registrou 194 aprovações e 523 skips opcionais, sem falha. O ensaio local completo do harness do CI não foi concluído; a qualificação integral é a execução registrada no GitHub.

## Achados editoriais fora da frente comercial

O inventário de repertório ignorava o novo campo `allowBlocks`; a leitura e os artefatos foram corrigidos. A autoria atual usa blocos diferentes de alguns desafios antigos. O inventário agora explicita a falta de fonte local na trilha para Corrida dos bichos (`every_frames`, `random_x`), Pedras (`every_frames`) e Relógio da onda (`spawn_asteroid`), nos dois públicos. Esses projetos ainda precisam de uma revisão editorial própria. A exceção já documentada do desafio opcional noturno foi preservada.

Os casos de regressão das experiências retiradas da Nave foram guardados como fixtures com a origem indicada. Os testes do currículo atual passaram a conferir o movimento, o limite, os materiais e o reinício na organização atual, e os percursos da Patrulha foram acrescentados.


## Benefício permanente do guia e links antigos

O Cadê da última aula do guia foi convertido e conferido em produção como benefício do curso, preservando os dois resgates originais, seus termos e o histórico. A produção tem somente Laopa de 13/11 e Guia de presente como campanhas. O bloco da aula usa benefitCode e depende do acesso autenticado ao guia. O relatório separa a origem do resgate da origem do acesso que abriu o guia; dados históricos ausentes continuam não identificados.

Os oito serviços da leva manual estão online e os onze testes de links passaram. A publicação manual está concluída, mas a regularização do PR 294 ainda aguarda CI completo, merge protegido e publicação oficial. [Funcionamento atualizado](funcionamento-apos-publicacao.md) e [recibo atual](beneficio-permanente-guia.json). A staging local recebeu os commits; a publicação remota continua coordenada pela outra frente.
