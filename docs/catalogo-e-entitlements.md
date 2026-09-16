# Catálogo & Entitlements — manual de operação

> Guia conceitual para quem **opera o painel** (produtos, ofertas, combos, bônus e
> acessos). O "como funciona por dentro" de cada serviço está nos `CLAUDE.md` dos
> pacotes ([catalog](../packages/catalog/CLAUDE.md), [members](../packages/members/CLAUDE.md),
> [admin](../packages/admin/CLAUDE.md)); este documento explica o **modelo de negócio**
> e responde "onde eu cadastro isso?".
>
> O modelo foi validado contra o mercado (Kajabi, Hotmart, Teachable/Thinkific/Kiwify/
> Podia e Stripe/RevenueCat) em jun/2026 — é o padrão profissional dessas plataformas.

## Os 3 conceitos

| Conceito | O que é | O que carrega |
|---|---|---|
| **Produto** | O *entregável* — o curso, o e-book, o combo. **Não tem preço.** | O conteúdo e **a entrega** (o que a compra libera) |
| **Oferta** | A *unidade de venda* — um link de checkout | O **preço**, prazo de acesso, parcelas, garantia, janela, bônus de campanha |
| **Matrícula** (entitlement) | O *acesso de UM aluno* a UM produto, gravado na compra | Status, validade, snapshot congelado do que foi vendido |

A regra de bolso para operar:

| Quer mudar… | Mexa em… |
|---|---|
| **O que** o comprador recebe | **Produto** (campo Entrega, ou componentes do combo) |
| **Preço / condição / promoção** | **Oferta** (ou crie outra oferta do mesmo produto) |
| O acesso de **uma pessoa específica** | **Matrícula** dela (Membros → aluno → revogar/estender) |

Mudar ou apagar uma oferta **não afeta quem já comprou**: as matrículas são gravadas
com uma "foto congelada" (snapshot) no momento da compra.

## A entrega (card "Entrega / Acesso" do produto)

Toda entrega acontece **na área de membros, como curso** (modelo Hotmart Club).
Um e-book vendido avulso é um curso com o bloco de livro 3D; checklists e templates
são anexos das aulas. No cadastro do produto há uma única pergunta:

**"O que esta compra libera?"**

- **Um curso específico** → escolha qual curso (pelo slug). É o produto comum.
- **Todos os cursos (atuais e futuros)** → a **chave-mestra**: uma única matrícula
  cobre TODOS os cursos **da plataforma principal (adultos)** publicados, **inclusive
  os lançados depois da compra**, sem nenhum reprocessamento. Use para "acesso total"
  (Black Friday, plano anual, plano da comunidade).
- **Acesso a um recurso da comunidade** (uma *ferramenta* ou um *espaço*, **não** um
  curso de trilha) → a entrega **"comunidade"**: a compra concede uma **CHAVE de acesso**
  (não um curso). É como o **Estúdio Completo** (kids) é vendido — quem tem a chave
  `estudio-completo` vê o editor completo na comunidade kids (item **"Estúdio"** no menu);
  quem não tem vê um recado gentil de "ainda não liberado". Recursos assim **NÃO aparecem
  em "Meus cursos"** (não são curso) e a chave-mestra **Kids** (`all_kids_courses`) também
  os cobre, se você vender um "acesso total kids".

> ⚠️ **Cursos Kids ficam FORA da chave-mestra** (decisão de 06/2026). Cada curso tem
> uma **Audiência** (campo no cadastro do curso): **Adulto** (plataforma principal,
> comunidade.sistemazero.com.br) ou **Kids** (plataforma infanto-juvenil). A chave-mestra
> "todos os cursos" significa "todos os cursos ADULTOS" — acesso a curso Kids é sempre
> por matrícula específica (concessão manual ou compra do produto kids). A equipe
> interna (superadmin/admin/staff) continua enxergando as duas plataformas, para suporte.

**A entrega mora no PRODUTO, nunca na oferta.** Motivo: reuso — o mesmo produto pode
ser vendido por N ofertas sem reconfigurar nada:

```
Produto "Acesso Total" (entrega: todos os cursos)   ← configurado UMA vez
   ├── Oferta "Black Friday"       → R$ 497 vitalício  (compra única)
   ├── Oferta "Assinatura mensal"  → R$ 97/mês   (a validade renova a cada ciclo pago)
   ├── Oferta "Assinatura anual"   → R$ 970/ano  (mesma entrega, cobra de 12 em 12 meses)
   └── Combo "Comunidade Pro"      → componente do combo (futuro)
```

Para **combo**, o card de Entrega **não aparece**: combo não entrega nada por si —
quem entrega são os produtos de dentro (componentes).

## Combos

Combo é um **produto** do tipo "Combo" que agrupa outros produtos (componentes; um
deles marcado como **principal**, o destaque da vitrine). Na compra, o sistema expande
o combo e cria **1 matrícula por produto de dentro** — o aluno ganha acesso a tudo,
e cada acesso é gerenciável individualmente (revogar/estender um sem mexer nos outros).

⚠️ Limitação conhecida: o combo é uma **foto no momento da compra**. Adicionar um
produto a um combo já vendido **não** concede o novo item a quem comprou antes
(workaround: concessão manual; melhoria futura: reconciliação automática, estilo
Teachable). Para "tudo que eu lançar", use a **chave-mestra** — ela cobre o futuro
por definição.

## Bônus — as 3 formas

"Bônus" **não existe como entidade no sistema** — é rótulo de copy na página de
vendas. Por trás, um bônus é sempre uma destas 3 formas:

| O bônus é… | Cadastra como… | Onde no admin |
|---|---|---|
| **Material de apoio** (checklist, template, PDF) — não tem vida comercial própria | Anexo/bloco **dentro do curso** (não passa pelo catálogo) | Membros → Cursos → aula |
| **Produto que SEMPRE acompanha o pacote**, em qualquer oferta | Componente do **combo** | Produto (tipo Combo) → Componentes |
| **Produto que só UMA campanha entrega** ("só nesta Black Friday você leva o Curso Y") | Item extra da **oferta** | Oferta → Bônus/Itens extras |

A pergunta que decide: **"ele entrega junto em TODA venda, ou só nesta oferta?"**
(E se não é vendível sozinho nunca, nem produto é — vai pra dentro do curso.)

Produtos-bônus que nunca são vendidos sozinhos: desmarque **"Vendável"** no cadastro.

## O que acontece na compra (resumo do fluxo)

```
compra confirmada (Pix/cartão/boleto)
  → expande a oferta: produto principal + bônus da oferta + componentes de combos
  → grava 1 MATRÍCULA por produto-folha (com snapshot congelado, idempotente)
  → o aluno acessa: checagem local "tem chave do curso OU chave-mestra ativa?"
```

- Compra única vitalícia → matrícula **sem validade**.
- Compra única com prazo fixo → matrícula válida pela duração da oferta (dias ou meses), contada
  a partir da aprovação do pagamento.
- Assinatura → matrícula com validade = ciclo + carência, **estendida a cada ciclo
  pago**; cancelou/expirou → todas as matrículas daquela assinatura caem juntas.

## Regras que o sistema valida (coerência do cadastro)

O rascunho é livre (cadastro progressivo). **Ativar** um produto exige ele pronto:

- Produto ativo (não-combo) → precisa de entrega definida (curso escolhido OU
  chave-mestra).
- Combo ativo → precisa de **≥1 componente**; combo nunca tem entrega própria.
- Produto não-combo não aceita componentes.
- Oferta ativa → preço maior que zero, produto principal ativo e todos os produtos
  entregues pela oferta (componentes do combo + bônus/itens extras) ativos e com
  entrega definida. Oferta em rascunho pode apontar para cadastro incompleto até
  ficar pronta.
- Oferta de **assinatura** ativa → além do acima, exige o **intervalo de cobrança**
  (mensal ou anual). Sem ele a ativação é bloqueada (o checkout não teria como montar o
  plano recorrente no provedor).
- Oferta de compra única com **prazo fixo** ativa → exige duração inteira positiva e unidade
  (dias ou meses). Rascunhos e ofertas pausadas podem ficar incompletos durante o cadastro.

O formulário bloqueia com aviso e o backend valida de novo (defesa em profundidade).

## Cobrança e prazo de acesso

Toda oferta tem um **modo de cobrança**, escolhido no cadastro da oferta:

- **Compra única vitalícia** — o cliente paga uma vez e o acesso não vence. Essa opção continua
  disponível para ofertas atuais e futuras.
- **Compra única com prazo fixo** — o cliente paga uma vez e acessa pelo número de dias ou meses
  definido na oferta. O prazo começa na aprovação do pagamento, não no primeiro login.
- **Assinatura** — cobrança **recorrente**; a matrícula vale por um ciclo e **renova a cada
  pagamento**. Cancelou, ou a cobrança falhou até o fim da carência → as matrículas daquela
  assinatura caem juntas (ver "O que acontece na compra").

Preço e acesso são decisões separadas. Alterar apenas o preço não transforma uma oferta vitalícia
em temporária (nem o contrário). A mudança vale para novas compras; acessos já concedidos conservam
o snapshot da compra.

O mesmo vale para assinaturas: editar o preço no catálogo muda a condição oferecida a **novos
assinantes**, mas não reajusta em massa os contratos recorrentes que já estão ativos no provedor.
Um reajuste da base, como os praticados por serviços de streaming, é uma operação própria: exige
definir a data, comunicar os assinantes e migrar/recriar os planos no provedor. Não use a simples
edição da oferta como se ela executasse esse processo.

Na oferta de assinatura você ainda escolhe a **periodicidade**:

- **Mensal** (cobra todo mês) ou **Anual** (cobra a cada 12 meses).
- A periodicidade é **obrigatória para ativar** a oferta — sem ela o checkout não sabe montar
  o plano no provedor de pagamento (Efí), então o sistema barra a ativação. O **rascunho** pode
  ficar sem, para cadastro progressivo.

**Oferecer "mensal OU anual" na mesma página (o alternador do checkout):** cadastre **duas
ofertas** do mesmo produto — uma mensal e uma anual — e **ligue uma na outra** pelo campo
**"Oferta irmã / alternador"**, nos **dois sentidos** (a mensal aponta a anual e a anual aponta
a mensal). No checkout aparece um **alternador** ("Economize no anual") que troca entre os dois
preços; o funil valida a oferta escolhida contra esse vínculo (anti-forja). O texto do alternador
é livre — deixe em branco para o padrão por periodicidade. Quem já assinou continua no plano que
comprou (snapshot congelado): editar ou trocar as ofertas não mexe em assinante ativo.

## A oferta no funil de vendas (o que muda onde)

Cada funil aponta para **uma oferta "base"** pela env **`FUNNEL_OFFER_<CHAVE_DO_FUNIL>`** e
**não tem preço próprio** — busca a oferta no catálogo em runtime (cache ~60s) e cobra sempre
pela cotação do servidor. Quando a oferta-base tem uma **irmã ligada** (o par mensal↔anual acima),
o checkout mostra o **alternador** e pode cobrar pela irmã que o cliente escolher; fora esse par,
o funil vende só a oferta-base. Três camadas:

| Quero mudar… | Onde | Precisa deploy? |
|---|---|---|
| Preço, prazo de acesso, preço "de", parcelas, garantia, janela, cupom on/off, bônus, cupons | **Painel → Catálogo** (Ofertas/Cupons) | Não — reflete em ~1 min |
| **Parar a venda** (emergência) | Oferta → status `paused` (checkout passa a responder "oferta não disponível") | Não |
| QUAL oferta o funil vende | env `FUNNEL_OFFER_<CHAVE_DO_FUNIL>` no host do funil | Restart |
| Copy/layout/imagens da página de vendas | Código do funil (`src/content/`) | Sim |

Promoção do dia a dia = editar o preço da oferta ou criar **cupom** (quem já comprou mantém o
acesso — snapshot congelado). Para uma campanha com prazo diferente, prefira outra oferta do mesmo
produto; assim preço, copy, métricas e promessa não se misturam. Trocar a env é só quando o funil
muda de **oferta/produto**.

Os funis Kids do **Desafio do Primeiro Jogo** e da **Comunidade dos Criadores** já possuem checkout.
No Desafio, `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO` deve apontar para a oferta pública de 30 dias;
na Comunidade, `FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES` aponta para a mensal e o alternador
permite escolher a anual. Produtos Kids sem funil próprio ainda podem ser concedidos manualmente no
admin.

### Contrato comercial do Desafio do Primeiro Jogo

- **Oferta pública:** `desafio-primeiro-jogo-30-dias`, compra única, R$ 67, acesso fixo por 30 dias.
- **Evento presencial:** a mesma oferta, com um cupom de desconto fixo de R$ 30 e escopo restrito à
  oferta; o total exibido e cobrado fica em R$ 37.
- **Oferta histórica:** `desafio-primeiro-jogo`, compra única vitalícia. Ela continua no sistema e
  não deve ser excluída nem convertida em prazo fixo. Pode permanecer fora do funil público e ser
  reutilizada no futuro em uma campanha específica.
- **Comunidade:** mensal e anual continuam sendo assinaturas. Uma matrícula válida da Comunidade
  que cubra o curso é mais forte que o vencimento do Desafio; o aluno não perde acesso nem recebe
  avisos de expiração indevidos.

Use **cupom, e não uma segunda oferta de evento**, quando a única diferença for o preço. Assim o
mesmo contrato de 30 dias, a mesma página e a mesma mensuração servem para todos; o código do evento
e o cupom identificam a origem e o preço efetivamente pago. Crie outra oferta apenas quando prazo,
entrega, garantia ou outra promessa comercial também forem diferentes.

## A página de vendas do curso (o cadeado do catálogo)

Na área do aluno, a página "Todos os cursos" mostra **cadeado** nos cursos que o aluno
não tem — e o clique abre a **página de vendas** daquele curso em nova aba. Esse link é
cadastrado **no curso** (não no produto/oferta): painel → **Membros → Cursos → editar →
"Página de vendas (URL)"**.

- Preenchido → o cadeado leva para essa URL (ex.: a página da oferta no funil).
- Vazio → cai no fallback: a página padrão do funil (`FUNNEL_URL` configurada no community).

Por que no curso? Porque o cadeado aparece **por curso** na vitrine da área de membros —
e um curso pode ser vendido por várias ofertas; você escolhe QUAL página de vendas é a
"oficial" daquele curso.

## Gestão de acessos no admin

- **Conceder acesso** (cortesia/teste/suporte) — Usuários → "Conceder acesso" ou
  Membros → aluno: por **curso**, por **oferta** (entrega tudo que a oferta dá,
  combos/bônus inclusos) ou **"Todos os cursos (chave-mestra)"** — com validade
  (7/30/90 dias, vitalício ou data). Idempotente: re-conceder algo ativo devolve o
  existente.
- **Revogar / Expirar / Estender** — por matrícula, no detalhe do aluno.

⚠️ Limitação conhecida: **estornar um pagamento NÃO revoga a matrícula sozinho** —
hoje são 2 passos manuais (estornar em Pagamentos + revogar em Membros). Melhoria
futura já mapeada.

## Limitações conhecidas / backlog

| Item | Estado hoje | Plano |
|---|---|---|
| Combo alterado pós-venda | Não re-concede a compradores antigos | Reconciliação automática (futuro) |
| Estorno → revogação | 2 passos manuais | Automatizar (próxima fatia sugerida) |
| Liberação agendada (drip) | Campo "Liberação" é salvo mas **não aplicado** (acesso é sempre imediato) | Aplicar no members (futuro) |
| Comunidade com planos/níveis | Não existe ainda | Fatia da comunidade; plano = combo [comunidade + acesso total] |
