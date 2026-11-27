# Ofertas avulsas: publicação de 27/11/2026

A dona autorizou a publicação manual urgente, mantendo CI e PR em paralelo. A seleção saiu
de main `0a8d77918`, sem promover a staging inteira. O fluxo normal está no
[PR 300](https://github.com/informach/sistema-zero/pull/300), onde fica o recibo final da promoção.

## Onda manual inicial

Fonte: `99523390de4128b8ff3954cf254be5bc096b1383`. Todos os deployments abaixo foram
confirmados como publicados, com identidade conferida e predecessores retirados.

| Serviço | Deployment |
| --- | --- |
| Members | `545d0274-a4e6-4b81-8868-f167e9554e29` |
| Auth | `20a2145b-b995-484e-8010-c4d72f8f587f` |
| Indicações | `e3d95089-de3b-4997-bdc6-884963947f64` |
| Funil | `b4c08d3e-9ba2-4b0e-9d92-d37340e00987` |
| Admin | `e1423163-4d6f-49d1-83e0-5cb8eae9eb62` |

Members e Auth passaram pela barreira canônica antes de Indicações, Funil e Admin. A jornada
Kids continuou publicada na versão 4. Os triggers nativos do Railway permaneceram desativados.
Não foi necessário cadastrar variável de ambiente.

O ajuste adicional da confirmação de compra, `f00682b14`, foi publicado no Funil na fonte
`93a2fd50b`, deployment `7201ecff-189a-4b1c-a821-8f409766cc4c`, às 15:43 de 27/11.
A correção do teste de pixels do Estúdio, `bbbfdecb7`, não altera o motor.

A revisão adicional do member-shell alinha o painel interno de presentes em meses à unidade
da oferta, preservando os dias anunciados do Cadê. Esse complemento foi publicado nos apps
Kids e adulto na fonte `9f2c862d4`, com os predecessores retirados:

| App | Deployment |
| --- | --- |
| Kids | `da3c3c88-d79f-47ad-97c5-d24b0862493b` |
| Adulto | `fc31747e-e0ff-4744-9cd4-4335bd1840c1` |

Os cinco cenários do painel real passaram. No Chromium, as duas aparências mostraram seis
meses e sete dias do Cadê sem rolagem lateral a 390 px, sem ativação de presente.

Os Termos do Cadê também distinguem meses de calendário e dias de 24 horas. As versões novas
são `cade-kids-2026-11-27` e `cade-adulto-2026-11-27`. É uma correção de texto; o cálculo do
acesso já estava correto. As compras antigas conservam a versão aceita no snapshot.

## Catálogo e funcionamento

As alterações foram feitas pelas APIs administrativas, sem escrita direta de dados de negócio
no SQL e sem seed irrestrito. Slugs, IDs, preços, itens e garantias foram preservados.

| Compra avulsa | Preço | Acesso para compras novas |
| --- | --- | --- |
| Transformando o vilão em aliado | R$ 27 | 6 meses |
| Cadê Todo Mundo, Kids e adulto | R$ 37 | 6 meses |
| Desafio do Primeiro Jogo, Kids e adulto | R$ 67 | 6 meses |
| Curso da Vivianne | R$ 67 | 6 meses, já estava correto |
| Pinta, Pensa, Molda e Estúdio completo | R$ 97 cada | 6 meses |

Os nove ajustes pendentes de prazo e nome foram aplicados. A oferta antiga vitalícia do Desafio
Kids foi pausada depois de conferir ausência de referências nas ofertas principais, campanhas,
listas ativas dos embaixadores e benefícios. As assinaturas não mudaram.

A mesma oferta de venda pode ser entregue gratuitamente como presente, com os mesmos seis
meses e itens. A exceção é o Cadê, que conserva `cade-todo-mundo-7-dias` e
`cade-todo-mundo-adulto-7-dias`: quinze dias reais, sete anunciados. Depois do prazo, continua a
visita ao Mural para ver e jogar, conforme a política existente.

A campanha `vilao-em-aliado` passou a usar `transformando-o-vilao-em-aliado-1-ano`. Não foi
duplicada, preservou os 17 resgates e suas datas. A oferta antiga `-presente` saiu da lista de
presentes dos embaixadores; links que citam esse slug continuam resolvendo a oferta atual do
mesmo curso. O nome histórico `-1-ano` no endereço não representa mais o prazo de compra nova.

O presente permanente do Cadê dentro da última aula do guia continua no benefício
`vilao-em-aliado-cade`, independente da data de encerramento de campanhas. Ele conserva a
oferta especial do Cadê, com o Mural e sete dias anunciados. A origem de um resgate continua
distinta da aquisição que deu acesso ao curso principal.

O link antigo do guia mantém o redirecionamento cadastrado até **26/12/2026 às 09:52:08,
horário de Brasília**. A campanha continua até **01/01/2030 às 00:00**, equivalendo ao fim de
31/12/2029. Essas datas não foram alteradas nesta entrega.

Os lembretes de Desafio não ativado, Kids e adulto, agora dizem que o prazo começou na
aprovação, sem prometer seis meses a compradores antigos. Só o corpo desses dois templates
foi alterado; assuntos, variáveis, personalizações e estado ativo foram preservados. Nenhum
e-mail foi disparado pela manutenção.

## Conferência com dados reais

- Os 84 acessos históricos do baseline mantiveram oferta, origem, início, vencimento e hash do snapshot.
- Os 17 resgates anteriores da campanha do guia foram preservados.
- Vinte URLs públicas responderam com sucesso e com os prazos esperados: vendas, presentes,
  links antigos, cupom da Laopa e links da Vivianne, incluindo checkout.
- As ofertas dos seis cursos passaram pelo schema e pela autorização usados no mini checkout
  da plataforma. O formatter exibiu "Acesso por 6 meses" em todas.
- A consulta do presente dentro da aula, usando um acesso real sem ativá-lo, retornou o Cadê
  `-7-dias`, com Mural. O catálogo confirmou quinze dias reais e sete divulgados nos dois públicos.
- A cotação do checkout interno com `LAOPA131126` respondeu R$ 67, desconto de R$ 33,50 e
  total de R$ 33,50. Foi uma cotação, sem cobrança.
- As consultas internas não alteraram as contagens de leads, checkouts ou resgates.

Nenhum cliente, compra, resgate ou curso de QA foi criado em produção. Respostas com dados
pessoais e baselines individuais ficaram fora do Git. A prova local adicional da confirmação
usa Postgres descartável e cobre nove cenários, incluindo prazos antigos de trinta dias e doze
meses e compras novas de seis meses.

Após a publicação adicional do Funil, os vinte links passaram novamente, e os 84 acessos e
17 resgates continuaram preservados. Três confirmações reais mostraram a data contratada:
Vivianne com doze meses, Vivianne com seis meses e Desafio adulto com trinta dias. A consulta
foi somente leitura, sem criar compra ou contato.
