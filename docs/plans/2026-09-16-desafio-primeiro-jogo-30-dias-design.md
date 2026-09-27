# Desafio do Primeiro Jogo: oferta de 30 dias e funil reposicionado

Status: decisões comerciais aprovadas em 16/09/2026. A direção de copy deste documento foi
superada em 17/09/2026 por `2026-09-17-copy-infantil-tecnologia-criacao-design.md`; não reutilizar
as frases de tela registradas abaixo como copy pública.

Este documento registra a decisão comercial, a jornada, a arquitetura de acesso e a
copy aprovada para o Desafio do Primeiro Jogo. A implementação deve preservar todas
as matrículas existentes e manter o acesso vitalício como opção permanente do
catálogo.

## Resumo da decisão

| Tema | Decisão |
| --- | --- |
| Produto | Manter o produto `desafio-primeiro-jogo` e a mesma entrega |
| Oferta pública nova | Compra única de R$ 67, com 30 dias de acesso |
| Oferta em escolas e clínicas | A mesma oferta pública, com cupom nominal de R$ 30; total de R$ 37 |
| Oferta vitalícia atual | Preservar, retirar do funil público e não alterar compradores existentes |
| Vitalício no catálogo | Manter como uma política de acesso disponível para qualquer oferta futura |
| Início dos 30 dias | Instante da aprovação do pagamento |
| Garantia | 7 dias, sem confundir garantia com duração do acesso |
| Comunidade dos Criadores | Manter assinatura mensal e anual como estão |
| Acesso ao Desafio pela Comunidade | Continuar incluído enquanto a assinatura estiver ativa |
| Reajuste das assinaturas | Fora deste projeto; editar a oferta não muda assinaturas já contratadas |
| Mensagem central | “Não é mais tela. É outra direção para uma parte dela.” |

O preço público de R$ 67 preserva a função de produto de entrada, deixa o desconto de
evento concreto e evita transformar R$ 37 no preço percebido permanente. O cupom é
preferível a uma segunda oferta promocional porque concentra a medição por evento,
controla validade e quantidade e mantém um só contrato de entrega.

## Objetivos

- Criar urgência legítima para a família começar e concluir o Desafio.
- Transformar R$ 37 em uma condição de evento rastreável, não no preço público.
- Preservar integralmente compradores vitalícios e a capacidade de vender acesso
  vitalício no futuro.
- Explicar o produto sem tentar convencer pais de que “tempo de tela é bom”.
- Mostrar que o Desafio redireciona uma parte do tempo de tela que já existe para uma
  criação concreta.
- Levar a criança do primeiro jogo à Comunidade dos Criadores sem esconder a diferença
  entre compra única e assinatura.
- Tornar preço, duração, cupom e data final consistentes no catálogo, checkout,
  pagamento, matrícula, mensagens e área de membros.
- Medir o funil inteiro por origem e por evento.

## Fora de escopo

- Reajustar automaticamente assinaturas mensais ou anuais já ativas.
- Alterar o conteúdo pedagógico dos cinco dias do Desafio.
- Prometer redução de uso de tela, mudança clínica, melhora escolar, organização do
  quarto ou transferência automática de comportamento.
- Aplicar cupom às assinaturas da Comunidade na primeira versão.
- Apagar a oferta vitalícia, remover o modo vitalício do catálogo ou reduzir a validade
  de uma matrícula já concedida.
- Automatizar estorno e revogação em todos os produtos. Até esse fluxo existir, o
  procedimento operacional continua exigindo estornar e revogar a matrícula.

## Alternativas consideradas

### Duas ofertas novas, uma de R$ 67 e outra de R$ 37

Essa opção cria dois links comerciais para a mesma entrega e o mesmo prazo. Ela serve
quando as condições jurídicas, os bônus ou a duração são diferentes. Neste caso,
porém, fragmentaria relatórios, facilitaria o vazamento permanente do link barato e
duplicaria manutenção sem criar um benefício real.

### Uma oferta pública e um cupom genérico permanente

Essa opção é simples, mas perde atribuição e controle. Um código como `ESCOLA37`
acabaria circulando fora do evento, e o sistema deixaria de informar qual escola,
clínica ou palestra originou a venda.

### Uma oferta pública e um cupom por evento — escolhida

Cada evento recebe um código, uma validade, um limite de resgates e UTMs próprios. A
oferta continua única; o desconto vira uma condição contextual e mensurável. É a
solução com menor custo operacional e maior clareza de dados.

## O ponto de partida da copy

### Transcrição limpa do áudio

> Não. Você falou que, se eu tentar convencer os pais de que o uso de tela é bom, eu
> vou perder. Eu não posso falar isso. E aí você falou que tem uma frasezinha em algum
> balão que eu preciso explorar mais, mas você não falou qual é essa frase. Que frase é?
> Você fala que a criança vai usar a tela. Isso já é do mundinho deles. Então, que seja
> usado de forma produtiva. Esse pedaço é o que você mais vai ter que alimentar para os
> pais. Só que, antes disso, você tem que concordar que o uso de telas não é legal. E
> mostrar para eles: “Olha, a gente não tem como extinguir esse uso, porque faz parte do
> mundo atual.” Uma criança de até dois anos, você pode falar “eu não vou dar tela”, ok.
> Mas uma criança de seis, sete anos já encontra tela na escola. Não tem saída. Então,
> já que a gente não tem como fugir, entre aspas, desse vilão, vamos tirar proveito e
> tornar produtivo o tempo a que ela já tem acesso, que a gente já não consegue reduzir.
> É nesse ponto que você vai pegar. E aí você vai escrever tudo isso. Fala: “Gente, olha,
> esse jogo trabalha essas habilidades.” Exemplo: sua criança tem dificuldade de
> arrumar o quarto, e você gostaria de ensiná-la. Pega o [nome de jogo pouco nítido], o
> Minecraft, tem outro de bonequinha que as meninas amam, em que você constrói a própria
> casinha. Vamos fazer a bonequinha arrumar o quarto e ganhar estrelinhas e moedinhas; com
> isso você trabalha a habilidade da própria criança. [Trecho final pouco nítido.] Entendeu?

A transcrição foi limpa apenas para pontuação e legibilidade. Dois trechos cujo áudio
não permite identificação segura permanecem marcados. O exemplo de “arrumar o quarto”
não entra na copy: o Desafio atual não comprova essa transferência de comportamento.

### Tese editorial

O funil não defende mais tempo de tela. Ele reconhece a preocupação dos pais, aceita que
telas já fazem parte do cotidiano e apresenta uma troca concreta: durante cinco etapas,
a criança usa parte desse tempo para construir um jogo próprio.

Frase-mãe:

> Seu filho não precisa de mais tempo de tela. Precisa descobrir o que consegue criar
> com uma parte dele.

Frase de sustentação:

> Não é mais tela. É outra direção para uma parte dela.

Prova concreta:

> Em cinco dias guiados, ele cria um jogo com nave, tiros, asteroides, pontos, vidas,
> vitória e derrota, e publica um link para jogar e compartilhar.

## Arquitetura de acesso

### Estado atual

Hoje, `pricingMode: 'one_time'` implica acesso vitalício no fluxo automático. O members
já representa uma matrícula vitalícia com `expiresAt = null` e uma matrícula temporária
com uma data, mas a oferta não declara uma política de acesso própria. O único prazo
parametrizado no fluxo atual usa meses e atende casos específicos.

Consequências:

- alterar apenas o preço no catálogo não transforma o Desafio em acesso de 30 dias;
- a copy pode dizer “30 dias” enquanto a matrícula continua vitalícia;
- o sistema não diferencia uma compra única vitalícia de uma compra única com prazo;
- uma mudança global em `one_time` quebraria ofertas presentes ou futuras que precisam
  continuar vitalícias.

### Modelo alvo

Cada oferta declara sua política de acesso:

```ts
type AccessMode = 'lifetime' | 'fixed' | 'billing_cycle'
type AccessDurationUnit = 'days' | 'months'

interface OfferAccessPolicy {
  accessMode: AccessMode
  accessDurationValue: number | null
  accessDurationUnit: AccessDurationUnit | null
}
```

Regras de coerência:

| Cobrança | Política permitida | Resultado |
| --- | --- | --- |
| Compra única | `lifetime` | `expiresAt = null` |
| Compra única | `fixed` + valor + unidade | `expiresAt = approvedAt + duração` |
| Assinatura | `billing_cycle` | validade renovada a cada ciclo pago |
| Assinatura | `lifetime` ou `fixed` | cadastro inválido |
| Compra única | `billing_cycle` | cadastro inválido |

`fixed` exige valor inteiro positivo. `lifetime` e `billing_cycle` exigem valor e
unidade nulos. Uma oferta em rascunho pode estar incompleta; ativá-la exige a política
coerente, como já ocorre com intervalo de assinatura.

### Compatibilidade e migração

A migração de catálogo apenas explicita o comportamento que já existe:

- toda oferta existente com `pricingMode = 'one_time'` recebe `accessMode = 'lifetime'`;
- toda oferta existente com `pricingMode = 'subscription'` recebe
  `accessMode = 'billing_cycle'`;
- nenhuma matrícula existente é atualizada;
- nenhum `expiresAt` existente é recalculado;
- nenhum comprador vitalício perde acesso;
- o admin continua oferecendo “Vitalício” ao criar ou editar uma compra única.

Os campos devem ter defaults seguros durante a implantação em duas fases. O serviço
passa a ler a nova política somente depois da migração e do backfill estarem aplicados.

### Snapshot da compra

A política precisa viajar congelada com a venda. Uma edição posterior da oferta não
pode mudar o contrato comprado. O contexto da compra deve registrar, no mínimo:

```ts
interface PurchasedOfferSnapshot {
  offerId: string
  offerSlug: string
  pricingMode: 'one_time' | 'subscription'
  billingIntervalMonths: number | null
  accessMode: 'lifetime' | 'fixed' | 'billing_cycle'
  accessDurationValue: number | null
  accessDurationUnit: 'days' | 'months' | null
  listPriceCents: number
  couponCode: string | null
  discountCents: number
  chargedPriceCents: number
  currency: 'BRL'
  guaranteeDays: number | null
  termsVersion: string
}
```

O catálogo continua sendo a fonte da verdade no momento da cotação. O funnel guarda o
snapshot aceito; o evento de pagamento referencia essa compra; o members calcula a
validade a partir do snapshot, não da oferta atual.

### Cálculo e término dos 30 dias

Para o Desafio novo:

```text
approvedAt = instante confirmado pelo provedor de pagamento
expiresAt  = approvedAt + 30 dias corridos
```

O cálculo usa instantes UTC e a interface mostra datas em `America/Sao_Paulo`. Não há
carência de assinatura em uma compra única de prazo fixo. A matrícula deixa de autorizar
o curso exatamente em `expiresAt`; o sweep existente pode mudar o status para
`expired`, mas a leitura já deve negar o acesso quando a data passou.

Expirar a matrícula remove o acesso ao curso, não os artefatos do aluno. Projetos,
progresso, certificado já emitido e jogo publicado permanecem armazenados. Se a família
assinar a Comunidade depois, o acesso volta pelo entitlement da Comunidade, sem apagar
ou reiniciar o trabalho.

### Acessos sobrepostos

Uma pessoa pode ter mais de uma matrícula para o mesmo curso. A autorização deve manter
a regra já existente de escolher o acesso mais forte:

1. matrícula vitalícia ativa;
2. matrícula ativa com a validade mais distante;
3. chave-mestra Kids ativa da Comunidade.

Comprar o Desafio de 30 dias nunca deve encurtar um acesso vitalício nem uma assinatura
ativa. Uma pessoa já coberta pela Comunidade deve receber uma mensagem clara antes de
comprar: “Este desafio já está incluído na sua assinatura.”

## Configuração comercial

### Oferta antiga

| Campo | Valor |
| --- | --- |
| Slug | `desafio-primeiro-jogo` |
| Cobrança | Compra única |
| Política | Vitalícia |
| Situação após a virada | Fora do funil público; manter cadastrada e recuperável |
| Compradores existentes | Sem qualquer alteração |

Não reutilizar o slug antigo para o novo contrato. Isso evita que integrações ou
relatórios confundam vendas vitalícias com vendas de 30 dias.

### Oferta pública nova

| Campo | Valor |
| --- | --- |
| Slug | `desafio-primeiro-jogo-30-dias` |
| Produto | `desafio-primeiro-jogo` |
| Preço | R$ 67,00 (`6700` centavos) |
| Cobrança | Compra única |
| Política | `fixed` |
| Duração | 30 dias |
| Garantia | 7 dias |
| Cupom | Permitido |
| Status inicial | Rascunho; ativar somente após homologação ponta a ponta |

### Cupom de evento

Cada escola, clínica ou palestra recebe um cupom próprio.

| Campo | Regra |
| --- | --- |
| Tipo | Valor fixo |
| Desconto | R$ 30,00 (`3000` centavos) |
| Aplicação | Somente `desafio-primeiro-jogo-30-dias` |
| Preço final | R$ 37,00 |
| Código | Identificável, sem dados pessoais; exemplo `COLEGIOALFA-SET26` |
| Validade com responsáveis presentes | 48 horas após a palestra |
| Validade quando a comunicação chega depois aos pais | 5 a 7 dias |
| Limite | Público estimado do evento, com pequena margem operacional |
| UTMs | Origem, campanha e evento no QR Code |

O QR Code abre a página com `coupon`, `utm_source`, `utm_medium` e `utm_campaign`.
O servidor valida o cupom e mostra o preço final antes de coletar o pagamento. Se o
cupom estiver inválido, expirado ou esgotado, o checkout não pode cobrar R$ 67 em
silêncio. Ele mantém a compra bloqueada e oferece duas escolhas explícitas: remover o
cupom e continuar pelo preço público ou voltar.

## Fluxo técnico

```text
página/QR
  → oferta ativa + cupom opcional
  → cotação autoritativa do catálogo
  → resumo: preço, desconto, total e política de 30 dias
  → checkout cria contexto congelado
  → provedor confirma pagamento
  → funnel envia concessão idempotente ao members
  → members calcula expiresAt com o snapshot
  → área de membros mostra acesso e data final
  → lembretes de uso e expiração
  → sweep marca a matrícula vencida
  → curso bloqueia, trabalho continua preservado
  → convite transparente para a Comunidade
```

O cliente nunca calcula preço, desconto ou validade de forma autoritativa. Valores de
query string servem apenas para pedir a cotação. O servidor decide o total e a política.

## Jornada completa do usuário

### Jornada pública

1. Um anúncio, conteúdo ou busca leva o responsável à landing do quiz.
2. A landing reconhece a preocupação com o tempo de tela e convida para um diagnóstico
   rápido sobre como a criança usa jogos e tecnologia.
3. O responsável responde às dez perguntas.
4. O resultado apresenta um perfil sem diagnóstico clínico e conecta o interesse atual
   a uma primeira criação possível.
5. O CTA abre a página de oferta.
6. A página mostra o projeto concreto de cinco dias, informa que o acesso dura 30 dias e
   apresenta o preço público de R$ 67.
7. O checkout repete produto, duração, data final estimada, garantia e total.
8. Depois da aprovação, o responsável recebe acesso, data exata de término e orientação
   para criar o perfil da criança.
9. A área de membros conduz ao Dia 1 e exibe “30 dias de acesso” com a data final.
10. Mensagens de ativação combatem o adiamento e celebram o progresso.
11. Ao concluir, a família recebe o link do jogo, o certificado e o próximo passo para a
    Comunidade.
12. Antes do vencimento, o sistema avisa sem ameaça ou urgência falsa.
13. Depois do vencimento, o curso fica bloqueado, o trabalho permanece salvo e a página
    explica como continuar pela Comunidade.

### Jornada de palestra em escola ou clínica

1. A apresentação termina com uma demonstração do jogo e um QR Code exclusivo.
2. O QR abre a mesma página pública com o cupom do evento já preenchido.
3. No topo, uma faixa confirma: “Condição para participantes: R$ 30 de desconto até
   [data e hora].”
4. A página não simula uma oferta diferente; ela mostra R$ 67, desconto de R$ 30 e total
   de R$ 37.
5. O checkout preserva o código e as UTMs mesmo após login, erro ou troca de pagamento.
6. A aprovação inicia os mesmos 30 dias e a mesma jornada pedagógica da venda pública.
7. O relatório do evento mostra visitas, início de checkout, pagamentos aprovados,
   ativações, Dia 1, conclusão e conversão posterior na Comunidade.

### Família que já comprou o vitalício

1. Continua acessando sem data final.
2. Não vê contagem regressiva nem convite para recomprar o Desafio.
3. Pode receber o convite para a Comunidade, mas nunca uma mensagem de “renove seu
   Desafio”.

### Assinante da Comunidade

1. Continua acessando o Desafio enquanto a assinatura estiver ativa.
2. Ao chegar à oferta do Desafio autenticado, vê que o conteúdo já está incluído.
3. O CTA abre diretamente a área de membros, sem nova cobrança.
4. O término de uma oferta avulsa de 30 dias não bloqueia o curso se a assinatura ainda
   conceder acesso.

## Ciclo de ativação

O prazo cria foco, mas a ativação depende de mensagens ligadas ao comportamento.

| Momento | Condição | Mensagem principal |
| --- | --- | --- |
| Imediato | Pagamento aprovado | Acesso, data final e criação do perfil da criança |
| 24 horas | Ainda não entrou | “O primeiro passo leva poucos minutos.” |
| 48 horas | Entrou, mas não iniciou | Abrir diretamente o Dia 1 |
| Após o Dia 1 | Progresso registrado | Celebrar a primeira vitória e apontar o Dia 2 |
| 7 dias antes | Curso incompleto | Informar o tempo restante e o ponto de retomada |
| 3 dias antes | Curso incompleto | Reforçar que o trabalho está salvo e indicar a próxima etapa |
| Conclusão | Curso concluído | Entregar link, certificado e convite para continuar criando |
| Expiração | Sem outro entitlement | Explicar o bloqueio e oferecer a Comunidade |

Cada mensagem deve ser idempotente e respeitar preferências de canal. Nunca mandar
aviso de expiração a quem possui acesso vitalício ou uma chave-mestra Kids ativa.

## Copy do funil

### Regras de voz e promessa

- Falar com o responsável, não persuadir diretamente a criança a comprar.
- Reconhecer a preocupação com telas antes de apresentar o produto.
- Dizer “uma parte do tempo que já existe”, nunca “mais tempo de tela”.
- Prometer o que a experiência entrega: um primeiro jogo jogável em cinco dias guiados.
- Usar “pode desenvolver” ou descrever a atividade concreta; evitar garantias sobre foco,
  comportamento, notas, carreira ou futuro profissional.
- Não comparar o produto com terapia, tratamento ou acompanhamento clínico.
- Informar R$ 67, 30 dias e garantia de 7 dias juntos nos pontos de decisão.
- Em tráfego de evento, mostrar o desconto como desconto real sobre R$ 67.
- Usar apenas depoimentos verificados e preservar as palavras reais das famílias.

### Landing do quiz

**Selo**

> Quiz rápido para mães, pais e responsáveis

**Título**

> Seu filho já vive entre jogos e telas. Descubra como transformar uma parte desse
> tempo em criação.

**Subtítulo**

> Responda 10 perguntas sobre o jeito como ele explora jogos e tecnologia. Em menos de
> 3 minutos, você recebe um perfil com um primeiro caminho possível — sem diagnóstico e
> sem promessas mágicas.

**Botão**

> Descobrir o perfil de criador

**Linha de confiança**

> Gratuito · menos de 3 minutos · resultado na hora

**Bloco de contexto**

> Tela demais preocupa. E você tem razão em se preocupar.
>
> Jogos, vídeos e tecnologia já aparecem em casa, na escola e nas conversas das
> crianças. A proposta aqui não é aumentar esse tempo nem fingir que toda tela educa.
> É descobrir se uma pequena parte do tempo que já existe pode deixar de ser só consumo
> e virar uma criação feita pelo seu filho.

**Frase de destaque**

> Não é mais tela. É outra direção para uma parte dela.

### Quiz

O quiz mantém dez passos e os quatro perfis atuais. A nova versão reduz absolutos e
liga cada resposta a comportamento observável.

1. **Quando seu filho se interessa muito por alguma coisa, o que mais parece acontecer?**
   - Quer explorar tudo: testa, pergunta, clica e logo procura outra novidade.
   - Mergulha em um tema e aprende detalhes que pouca gente percebe.
   - Começa com muita energia, mas pode perder o interesse se o resultado demora.
   - Quer entender regras, peças, comandos e como tudo funciona por dentro.
2. **Em média, quantas horas por dia ele passa em telas só consumindo — jogando,
   assistindo ou pesquisando?**
3. **Onde esse interesse aparece mais hoje?**
   - Jogos e suas fases, personagens, regras e estratégias.
   - Tecnologia: testar, configurar, montar ou entender como funciona.
   - Temas específicos, como espaço, animais, dinossauros, mapas ou histórias.
   - Vídeos e tutoriais que raramente viram algo criado por ele.
4. **Já aconteceu de ele começar algo animado e perder o interesse antes de terminar?**
5. **O que mais incomoda você nessa relação com jogos e tecnologia?**
   - Ele consome muito, mas quase nada vira uma criação própria.
   - Ele acompanha tutoriais, mas trava quando precisa mudar alguma coisa.
   - O assunto às vezes vira só mais tempo de tela e tensão em casa.
   - Existe muito interesse, mas ainda falta um projeto concreto para canalizá-lo.
6. **Vamos colocar na ponta do lápis: quanto tempo de consumo isso representa em um
   ano?**
   - Resultado: “São cerca de {resultado} horas por ano. A meta não é transformar tudo.
     É começar com uma pequena parte.”
7. **O quanto você gostaria de direcionar uma pequena parte desse tempo para uma
   criação própria?**
8. **O que você mais gostaria de ver primeiro?**
   - Ele chamando a família para mostrar algo que criou.
   - Ele compartilhando um projeto com colegas.
   - Ele abrindo o computador também para criar, não só para consumir.
   - Ele concluindo um projeto curto e querendo experimentar o próximo.
9. **O que mais pesa ao escolher uma atividade assim?**
   - Um caminho curto, com começo, meio e fim visíveis.
   - Um investimento pequeno antes de um compromisso maior.
   - Conseguir acompanhar mesmo sem entender de tecnologia.
   - Ver um resultado funcionando logo nos primeiros dias.
10. **O que você gostaria que esse interesse pudesse se tornar com o tempo?**
    - Autoria: criar coisas próprias, além de consumir as dos outros.
    - Uma habilidade que ele tenha prazer em desenvolver.
    - Orgulho de terminar e compartilhar o que fez.
    - Aprendizado que continue para além de um passatempo.

### Resultado do quiz

**Estrutura comum**

> Você disse que gostaria de ver {resposta_p8}. E que, com o tempo, quer ver
> {resposta_p10}.

> Hoje, {resposta_p5}. Pelas suas respostas, o melhor primeiro passo não é uma jornada
> longa. É um projeto curto, guiado e com resultado visível.

> Não é mais tela. É outra direção para uma parte dela.

**Explorador**

> Seu filho tem perfil Explorador
>
> Ele aprende testando, abre caminhos rápido e se anima com novidade. Para transformar
> curiosidade em autoria, o primeiro projeto precisa ser curto e mostrar uma vitória por
> etapa antes que outra ideia chame a atenção.

**Especialista**

> Seu filho tem perfil Especialista
>
> Ele mergulha nos assuntos que ama e constrói um repertório rico. O próximo passo é
> usar esse conhecimento como matéria-prima para algo que tenha as escolhas dele.

**Foguete**

> Seu filho tem perfil Foguete
>
> Ele começa com energia e quer ver a ideia ganhar vida. Um caminho com resultados
> rápidos ajuda a manter a conexão entre esforço e conquista até o final.

**Investigador**

> Seu filho tem perfil Investigador
>
> Ele quer entender o mecanismo por trás das coisas. Uma base guiada, mas aberta para
> testar regras e comandos, permite que ele deixe de apenas seguir o jogo e passe a
> decidir como o jogo funciona.

**Fecho comum**

> No Desafio do Primeiro Jogo, seu filho usa esse interesse para criar, em cinco dias,
> um jogo com começo, desafio, pontos, vidas, vitória e derrota.

**Botão**

> Ver como funciona o Desafio

### Página de oferta

#### Hero

**Selo**

> Para crianças a partir de 9 anos que gostam de jogos e tecnologia

**Título**

> Seu filho não precisa de mais tempo de tela. Precisa descobrir o que consegue criar
> com uma parte dele.

**Subtítulo**

> Em cinco dias guiados, ele transforma comandos visuais em um jogo de nave feito por
> ele — com tiros, asteroides, pontos, vidas, vitória, derrota e um link para compartilhar.

**Apoio**

> Sem instalar programas. Você não precisa entender de programação para acompanhar.

**Botão**

> Quero transformar parte desse tempo em criação

**Linha comercial pública**

> R$ 67, pagamento único · 30 dias de acesso · garantia de 7 dias

**Linha comercial com cupom válido**

> De R$ 67 por R$ 37, pagamento único · cupom {codigo} aplicado · 30 dias de acesso ·
> garantia de 7 dias

#### Reconhecimento do problema

**Título**

> Tela demais preocupa. Você tem razão em se preocupar.

**Corpo**

> Quando a tarde termina e ficam apenas horas de jogo, vídeo e rolagem, é natural sentir
> que aquele interesse poderia ter levado a algum lugar.
>
> Ao mesmo tempo, telas já fazem parte do cotidiano: aparecem em casa, na escola e no
> jeito como as crianças conversam, pesquisam e brincam. A proposta do Desafio não é
> aumentar esse tempo nem chamar qualquer tela de aprendizado.
>
> É fazer uma troca pequena e concreta: durante cinco etapas, uma parte do tempo que já
> iria para a tela passa a ter um projeto, decisões e um resultado criado pela criança.

**Destaque**

> Não é mais tela. É outra direção para uma parte dela.

#### A mudança visível

**Título**

> O mesmo computador. Uma postura diferente diante dele.

**Antes**

> O jogo chega pronto. Seu filho segue as regras, vence fases criadas por outra pessoa e
> fecha a tela sem algo próprio para mostrar.

**Durante o Desafio**

> Ele escolhe, monta, testa, encontra um erro, ajusta e vê o jogo responder ao que fez.
> No fim, chama alguém para jogar uma criação que antes existia apenas como ideia.

#### O projeto dos cinco dias

**Título**

> Cinco dias. Uma parte nova do jogo funcionando a cada dia.

| Dia | Copy |
| --- | --- |
| 1 | **A nave ganha vida.** Seu filho conhece o estúdio, monta a base e vê o primeiro comando aparecer na tela. |
| 2 | **A nave responde.** Ele cria movimento e tiro e percebe que cada bloco muda o comportamento do jogo. |
| 3 | **O desafio aparece.** Asteroides entram em cena, se movem e transformam a criação em algo jogável. |
| 4 | **O jogo passa a lembrar.** Pontos, vidas, colisões e feedback dão consequência às escolhas. |
| 5 | **Começo, vitória e derrota.** Ele fecha o ciclo, testa e publica um link para outras pessoas jogarem. |

**Nota**

> A trilha fica disponível por 30 dias. Os “cinco dias” são a sequência recomendada;
> cada família pode organizar os encontros dentro desse período.

#### O que está incluído

**Título**

> Tudo o que ele precisa para chegar ao primeiro jogo pronto

- Trilha guiada de cinco dias, com uma vitória visível por etapa.
- Estúdio de programação em blocos criado para crianças.
- Aulas em vídeo e instruções dentro da própria atividade.
- Mapa dos pais, em linguagem para quem não é de tecnologia.
- Jogo publicado com link para compartilhar.
- Certificado de conclusão.
- 30 dias de acesso contados da aprovação do pagamento.

#### O papel dos pais

**Título**

> Você não precisa saber programar.

**Corpo**

> Seu papel é ajudar a reservar o momento, garantir um computador compatível e celebrar
> as pequenas entregas. O caminho técnico aparece passo a passo para a criança. Se ela
> precisar retomar, o progresso fica salvo durante o período de acesso.

#### O que a experiência exercita

**Título**

> Enquanto cria o jogo, seu filho pratica ações que não aparecem quando ele só joga.

- Dividir um projeto em etapas curtas.
- Relacionar um comando ao efeito que aparece na tela.
- Testar, observar e ajustar quando algo não funciona como esperava.
- Tomar decisões de regra, movimento e dificuldade.
- Levar uma criação até uma versão jogável e compartilhável.

**Nota de responsabilidade**

> Cada criança vive a experiência de um jeito. O Desafio oferece prática guiada; não
> promete resultado escolar, clínico ou comportamental específico.

#### Quem criou

**Título**

> Feito por uma família de desenvolvedores para crianças que querem sair do jogar e
> experimentar o criar.

**Corpo-base**

> Somos Helena e Júlio, desenvolvedores de sistemas e pais. Criamos o Sistema Zero para
> encurtar a distância entre o interesse por jogos e a primeira criação funcionando.
> O Desafio organiza essa primeira experiência em etapas pequenas, visuais e possíveis
> de acompanhar em família.

Usar apenas dados biográficos confirmados pela equipe. Não transformar a história de
uma criança em promessa universal.

#### Prova social

**Título**

> O que as primeiras famílias perceberam

Manter somente depoimentos reais, autorizados e atribuídos corretamente. Não editar uma
fala para incluir foco, autonomia, comportamento ou aprendizagem que a família não
tenha relatado. Sempre que possível, ligar a prova a fatos observáveis: iniciou,
terminou, mostrou o jogo ou quis modificar uma regra.

#### Oferta

**Título**

> Um primeiro projeto com começo, meio e fim — e 30 dias para concluir com tranquilidade.

**Cartão público**

> Desafio do Primeiro Jogo
>
> Trilha guiada de cinco dias<br>
> Estúdio infantil de programação em blocos<br>
> Vídeos, mapa dos pais, publicação e certificado<br>
> 30 dias de acesso a partir da aprovação
>
> **R$ 67 à vista**<br>
> Pagamento único. Não é assinatura.

**Cartão com evento**

> Preço público: R$ 67<br>
> Desconto do evento: R$ 30<br>
> **Total hoje: R$ 37**
>
> Cupom {codigo} válido até {data_hora} ou enquanto houver resgates disponíveis.

**Botão**

> Quero dar esse primeiro passo ao meu filho

#### Garantia

**Título**

> Você tem 7 dias para conhecer por dentro.

**Corpo**

> Depois da compra, entre na plataforma e veja a proposta com seu filho. Se perceber que
> o Desafio não faz sentido para sua família, peça o reembolso dentro de 7 dias pelos
> canais informados no checkout. A garantia não aumenta nem reinicia os 30 dias de
> acesso.

#### FAQ

**Isso significa mais tempo de tela?**

> A proposta é substituir uma pequena parte do tempo de consumo que já existe, não
> acrescentar horas à rotina. Cada família continua decidindo seus limites e horários.

**Para qual idade foi criado?**

> Para crianças a partir de 9 anos que já leem e usam o computador com alguma autonomia.
> Um responsável pode ajudar na organização e no primeiro acesso.

**Precisa saber programar?**

> Não. A criança começa com blocos visuais e segue um caminho guiado. Os pais também não
> precisam entender de programação.

**Funciona no celular ou tablet?**

> As aulas e o jogo publicado podem ser vistos em outros dispositivos, mas a criação no
> Estúdio deve ser feita em um computador compatível. A página deve listar navegadores e
> requisitos depois de uma validação técnica final.

**São cinco dias corridos?**

> Cinco dias é a sequência recomendada, com uma etapa por encontro. O acesso completo
> fica disponível por 30 dias a partir da aprovação do pagamento.

**O que acontece depois dos 30 dias?**

> O acesso às aulas do Desafio termina. O progresso e os projetos permanecem salvos. Se
> a família entrar na Comunidade dos Criadores, o Desafio volta a ficar disponível
> enquanto a assinatura estiver ativa.

**É assinatura?**

> Não. O Desafio é um pagamento único de R$ 67, ou R$ 37 quando um cupom de evento
> válido aplica R$ 30 de desconto. Não há renovação automática.

**Quem comprou o acesso vitalício perde alguma coisa?**

> Não. Compras vitalícias anteriores continuam vitalícias. A condição de 30 dias vale
> somente para a nova oferta e para quem a comprar depois da mudança.

**A Comunidade dos Criadores inclui o Desafio?**

> Sim. Assinantes têm acesso ao Desafio enquanto a assinatura estiver ativa, além das
> outras experiências incluídas no plano contratado.

**Tem garantia?**

> Sim. Você pode conhecer a plataforma e pedir reembolso em até 7 dias após a compra,
> conforme as instruções do checkout.

**Meu filho vai melhorar foco ou desempenho escolar?**

> O Desafio oferece uma prática curta de criação, teste e conclusão de projeto. Cada
> criança responde de um jeito, por isso não prometemos resultado escolar, clínico ou
> comportamental específico.

#### Fecho

**Título**

> O primeiro jogo não precisa ficar para “um dia”. Pode começar com uma pequena parte
> do tempo que já existe.

**Corpo**

> Em cinco etapas, seu filho deixa de apenas seguir as regras de um jogo e experimenta
> criar as próprias. Você acompanha sem precisar programar, e os dois terminam com algo
> concreto para abrir, jogar e compartilhar.

**Botão**

> Quero transformar parte desse tempo em criação

**Linha comercial**

> R$ 67, pagamento único · 30 dias de acesso · garantia de 7 dias

### Checkout

**Título**

> Falta um passo para começar o primeiro jogo.

**Resumo público**

> Desafio do Primeiro Jogo<br>
> Pagamento único: R$ 67<br>
> Acesso: 30 dias a partir da aprovação<br>
> Garantia: 7 dias<br>
> Renovação automática: não

**Resumo com cupom**

> Preço: R$ 67<br>
> Cupom {codigo}: − R$ 30<br>
> Total: R$ 37<br>
> Acesso: 30 dias a partir da aprovação

**Campo de cupom**

> Código de palestra, escola ou clínica

**Estados do cupom**

- Aplicado: “Cupom {codigo} aplicado. Você economizou R$ 30.”
- Inválido: “Não encontramos esse cupom para esta oferta. Confira o código.”
- Expirado: “A validade deste cupom terminou em {data_hora}.”
- Esgotado: “Os resgates disponíveis para este evento terminaram.”
- Falha técnica: “Não foi possível validar o cupom agora. Nenhuma cobrança foi feita.”

**Consentimento**

> Li e concordo com os Termos e com a Política de Privacidade. Entendo que esta compra
> libera 30 dias de acesso e não cria uma assinatura.

**Botão**

> Pagar e liberar os 30 dias

### Página de obrigado

**Título**

> Pagamento aprovado. Os 30 dias do Desafio começam agora.

**Resumo**

> Seu acesso vai até **{data_hora_expiracao}**. Enviamos para **{email}** o link para
> criar sua senha e entrar na área da família.

**Passos**

1. Abra o e-mail de acesso e crie sua senha.
2. Cadastre o perfil do seu filho dentro da plataforma.
3. Separe o primeiro encontro e abra o Dia 1.
4. Salve esta data: **{data_expiracao}**.

**Botão**

> Criar acesso e começar

**Ajuda**

> Se o e-mail não chegar em alguns minutos, confira spam e promoções. Persistindo o
> problema, fale com o suporte e informe o e-mail usado na compra.

### Área de membros

**Cartão do curso**

> Desafio do Primeiro Jogo<br>
> {progresso}% concluído<br>
> Acesso até {data}<br>
> Continuar do Dia {n}

Não usar contagem regressiva agressiva durante todo o curso. Mostrar “faltam 7 dias” e
“faltam 3 dias” apenas nas janelas correspondentes.

**Estado expirado**

> Seus 30 dias do Desafio terminaram em {data}. Seu progresso e seus projetos continuam
> salvos.

**Botão principal**

> Conhecer a Comunidade dos Criadores

**Apoio**

> Na Comunidade, o Desafio e as demais experiências incluídas ficam disponíveis enquanto
> a assinatura estiver ativa.

### Convite para a Comunidade

O convite aparece depois da conclusão ou da expiração, nunca como interrupção no meio de
uma aula.

**Título**

> O primeiro jogo mostrou que ele consegue criar. Qual será o próximo?

**Corpo**

> A Comunidade dos Criadores é o próximo ambiente para continuar praticando, publicar
> novos projetos e avançar pelas experiências disponíveis. O Desafio também permanece
> incluído enquanto a assinatura estiver ativa.

**Botão**

> Conhecer a Comunidade dos Criadores

**Transparência**

> A Comunidade é uma assinatura separada, com plano mensal e anual. Preço, renovação e
> cancelamento aparecem antes da contratação.

## Mensagens transacionais

### Pagamento aprovado

**Assunto:** O Desafio começou: acesso até {data}

> Olá, {nome}. O pagamento foi aprovado e os 30 dias do Desafio do Primeiro Jogo
> começaram. Seu acesso vai até {data_hora}. Crie sua senha, cadastre o perfil do seu
> filho e abra o Dia 1. [Criar acesso]

### Ainda não entrou — 24 horas

**Assunto:** O primeiro passo do jogo ainda está esperando

> O acesso já está liberado até {data}. Hoje, basta criar a senha e o perfil da criança.
> O Dia 1 fica pronto para começar logo depois. [Abrir meu acesso]

### Entrou, mas não começou — 48 horas

**Assunto:** Abra o Dia 1 e veja a primeira parte ganhar vida

> Vocês já entraram na plataforma. Agora falta abrir a primeira etapa. O caminho está
> preparado para começar com uma vitória pequena e visível. [Começar o Dia 1]

### Sete dias restantes

**Assunto:** Faltam 7 dias para concluir o Desafio

> O acesso termina em {data}. Seu filho parou em {ponto_de_retomada}, e o trabalho está
> salvo. [Continuar de onde parou]

### Três dias restantes

**Assunto:** O próximo passo do jogo está salvo

> Restam 3 dias de acesso. Abra diretamente {ponto_de_retomada} para continuar sem
> refazer as etapas anteriores. [Retomar o Desafio]

### Conclusão

**Assunto:** O primeiro jogo está pronto

> Parabéns, {nome_crianca}. O jogo já pode ser aberto e compartilhado. Aqui estão o link
> e o certificado. Quando a família quiser conhecer os próximos projetos, a Comunidade
> dos Criadores é o próximo caminho. [Ver o jogo] [Conhecer a Comunidade]

### Expiração

**Assunto:** O acesso terminou, e o trabalho continua salvo

> Os 30 dias do Desafio terminaram em {data}. O progresso e os projetos permanecem
> guardados. Para voltar ao Desafio e continuar em novas experiências, conheça a
> Comunidade dos Criadores. [Conhecer a Comunidade]

## Administração

### Formulário da oferta

Quando a cobrança for “Compra única”, o admin mostra:

- Vitalício;
- Prazo fixo;
- valor inteiro;
- unidade em dias ou meses.

Quando a cobrança for “Assinatura”, o admin fixa a política em “Enquanto a assinatura
estiver ativa” e mantém a periodicidade mensal ou anual. Trocar a cobrança deve limpar
campos incompatíveis apenas depois de confirmação explícita.

Na listagem, cada oferta mostra um resumo inequívoco:

- `R$ 67 · pagamento único · 30 dias`;
- `R$ 497 · pagamento único · vitalício`;
- `R$ 97/mês · assinatura`.

### Gestão de eventos

A primeira versão pode usar a tela de cupons existente, desde que ela permita:

- restringir à oferta do Desafio;
- definir desconto fixo de R$ 30;
- configurar início, fim e limite;
- copiar link completo com cupom e UTMs;
- visualizar uso e saldo de resgates.

Gerar QR Code no próprio admin é uma melhoria útil, mas não bloqueia a primeira
publicação se o link puder ser copiado com segurança.

## Eventos e métricas

Todos os eventos devem carregar, quando disponíveis: `funnel`, `offer_slug`,
`coupon_code`, `utm_source`, `utm_medium`, `utm_campaign` e um identificador de evento
sem dados pessoais.

| Etapa | Evento |
| --- | --- |
| Entrada | `view_landing` |
| Quiz | `start_quiz`, `answer_quiz`, `complete_quiz` |
| Oferta | `view_offer` |
| Cupom | `apply_coupon`, `coupon_error` |
| Checkout | `start_checkout`, `payment_method_selected` |
| Venda | `payment_approved`, `payment_failed`, `refund_requested` |
| Ativação | `account_activated`, `child_profile_created` |
| Curso | `challenge_started`, `challenge_day_completed`, `challenge_completed` |
| Ciclo | `expiry_reminder_sent`, `challenge_expired` |
| Continuidade | `view_community_offer`, `community_subscription_approved` |

O painel mínimo por evento deve mostrar:

```text
QR/visitas
→ quiz concluído
→ oferta vista
→ checkout iniciado
→ pagamento aprovado
→ conta ativada
→ Dia 1 iniciado
→ Desafio concluído
→ Comunidade assinada
```

Indicadores principais: conversão para compra, ativação em 24 horas, início do Dia 1,
conclusão antes do vencimento, uso do cupom, reembolso e conversão para a Comunidade em
30 e 60 dias.

## Falhas e mensagens seguras

- Oferta pausada: bloquear checkout e mostrar que a condição está indisponível.
- Cupom inválido: não retirar desconto silenciosamente.
- Pagamento pendente: os 30 dias ainda não começaram.
- Pagamento duplicado: concessão idempotente, sem matrícula ou cobrança duplicada.
- Evento repetido: reutilizar o mesmo snapshot e a mesma data de aprovação.
- Members indisponível: manter retentativa idempotente e não confirmar acesso antes da
  concessão.
- Relógio ou timezone: persistir UTC, apresentar em São Paulo.
- Entitlement mais forte existente: preservar o mais forte e não encurtar acesso.
- Mudança posterior da oferta: não alterar snapshot, preço, duração ou matrícula antiga.

## Rollout

1. Adicionar a política de acesso de forma compatível e migrar ofertas existentes.
2. Atualizar catálogo, contratos HTTP, admin e documentação, sem mudar o funil ativo.
3. Propagar o snapshot até o members e provar os três modos de acesso.
4. Criar a nova oferta em rascunho e cupons de homologação.
5. Atualizar a copy e remover todos os textos de acesso vitalício do novo funil.
6. Homologar cartão, Pix e boleto quando aplicáveis, incluindo aprovação tardia.
7. Testar comprador novo, comprador vitalício e assinante da Comunidade.
8. Ativar a oferta de 30 dias e trocar a referência do funil.
9. Retirar a oferta vitalícia antiga do tráfego público, sem apagá-la.
10. Acompanhar sete dias de métricas e suporte antes do primeiro evento amplo.

Rollback comercial: pausar a oferta nova e restaurar a referência pública antiga. O
rollback nunca altera matrículas já concedidas; compradores da oferta de 30 dias
continuam com o contrato de 30 dias adquirido.

## Critérios de aceite

- Uma oferta de compra única pode ser vitalícia ou ter prazo fixo.
- A opção vitalícia permanece visível no admin e coberta por testes.
- Ofertas de assinatura usam somente ciclo de cobrança.
- A migração classifica compras únicas atuais como vitalícias e não toca entitlements.
- Uma compra da nova oferta concede exatamente 30 dias a partir da aprovação.
- Editar a oferta depois da compra não muda a data final concedida.
- O cupom correto reduz R$ 67 para R$ 37 e só funciona na oferta do Desafio.
- Cupom inválido, expirado ou esgotado nunca causa cobrança silenciosa de R$ 67.
- Reentrega do mesmo pagamento não duplica nem amplia o acesso.
- Acesso vitalício ou da Comunidade prevalece sobre a matrícula temporária.
- O comprador vê duração e data final na oferta, checkout, obrigado, e-mail e members.
- A copy pública não contém “acesso vitalício” para a nova oferta.
- Compradores antigos continuam com acesso vitalício.
- A expiração bloqueia o curso, mas preserva projetos, progresso, certificado e jogo.
- Os lembretes não são enviados a quem já concluiu, tem vitalício ou possui outro acesso
  ativo mais forte.
- O funil registra origem, cupom e conversão posterior para a Comunidade.

## Decisão sobre reajustes da Comunidade

Este projeto não muda as assinaturas. Alterar o preço de uma oferta no catálogo afeta
novas contratações depois da atualização do cache; não reescreve o valor das assinaturas
vigentes. Um reajuste futuro exige um fluxo próprio: política comercial, aviso prévio,
data efetiva, atualização no provedor, trilha de auditoria e tratamento de falhas. Essa
separação preserva o contrato atual e evita que uma simples edição de catálogo cobre um
valor novo de assinantes sem processo explícito.
