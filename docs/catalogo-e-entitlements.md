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
| **Oferta** | A *unidade de venda* — um link de checkout | O **preço**, parcelas, garantia, janela, bônus de campanha |
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
  cobre TODOS os cursos publicados, **inclusive os lançados depois da compra**, sem
  nenhum reprocessamento. Use para "acesso total" (Black Friday, plano anual, plano
  da comunidade).

**A entrega mora no PRODUTO, nunca na oferta.** Motivo: reuso — o mesmo produto pode
ser vendido por N ofertas sem reconfigurar nada:

```
Produto "Acesso Total" (entrega: todos os cursos)   ← configurado UMA vez
   ├── Oferta "Black Friday"       → R$ 497 vitalício
   ├── Oferta "Assinatura mensal"  → R$ 97/mês (a validade renova a cada ciclo pago)
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

- Compra única → matrícula **vitalícia** (sem validade).
- Assinatura → matrícula com validade = ciclo + carência, **estendida a cada ciclo
  pago**; cancelou/expirou → todas as matrículas daquela assinatura caem juntas.

## Regras que o sistema valida (coerência do cadastro)

O rascunho é livre (cadastro progressivo). **Ativar** um produto exige ele pronto:

- Produto ativo (não-combo) → precisa de entrega definida (curso escolhido OU
  chave-mestra).
- Combo ativo → precisa de **≥1 componente**; combo nunca tem entrega própria.
- Produto não-combo não aceita componentes.

O formulário bloqueia com aviso e o backend valida de novo (defesa em profundidade).

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
