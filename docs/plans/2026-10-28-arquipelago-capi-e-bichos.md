# Arquipélago: a Capi e os bichos do Bosque (Fase 1)

Plano da próxima parte da Fase 1, escrito em 28/10/2026 a partir da proposta no Canvas
(<https://claude.ai/artifact/5eNo1oqsndxmV6MPLxaz1W>, "Fase 1: moradores, amizade, bichos que
crescem") e do que já existe no código e na arte. Itens do acompanhamento: fase1-04 (a Capi), fase1-05
(bichos seguindo), fase1-06 (adotar e cuidar) e fase1-07 (esconde-esconde).

## A história que isto conta

A Capi é a capivara que cuidava dos bichos do Bosque. Quando o arquipélago perdeu a cor, os bichos
se esconderam no Cinza. A criança chega pela ponte, conhece a Capi, acha os bichos escondidos, e
cada bicho achado volta para o cercadinho da cabana da Capi. Um deles a criança adota: ele vai para
a casa dela, segue pela ilha, come, toma banho, aprende truques e cresce de filhote para adulto.

## O que já existe

- Modelos: `capi.glb` (parado, andar, falar, acenar, feliz; olhos com piscar e feliz) e os quatro
  bichos de adotar, filhote e adulto (cachorro caramelo, gato frajola, coelho e porquinho-da-índia:
  parado, andar, correr, sentar, feliz e o truque de cada um).
- No `bosque.glb`: a cabana da Capi, o cercadinho, o lago, as toras e as flores.
- No jogo: horta, receitas, inventário, necessidades, interativos com "E" e o Zappy que dá dicas.
- Salvamento com versão (V2) e migração.

## Regras (puras, em `sistemas/`, com testes)

### A Capi (`sistemas/moradores.ts`)

- **Amizade:** de 0 a 500 pontos, mostrada em 5 corações (um a cada 100). Conversar pela primeira
  vez no dia dá 10. Entregar o pedido do dia dá 30. Um presente que ela gosta dá 20, um comum 8, e
  só o primeiro presente do dia conta.
- **Conversa:** cada nível de amizade abre falas novas. Ela comenta o que a criança fez (bichos
  achados, horta, percurso). A primeira conversa do dia é nova; as outras repetem um "até amanhã".
  Os textos ficam num arquivo de falas, não espalhados no código.
- **Gostos:** milho e salada são os preferidos; pipoca é comum; ela não gosta de nada que não seja
  comida (o item volta para a criança).
- **Pedido do dia:** um por dia, sorteado de forma estável pelo dia e pelo perfil (o mesmo pedido o
  dia inteiro, em qualquer aparelho). Exemplos: 2 alfaces, 1 salada, achar mais um bicho. Entregar
  tira os itens do inventário.
- **Aniversário:** 12 de março. No dia, ela fala diferente e o presente vale o dobro.
- **Um dia** vai da meia-noite à meia-noite no horário do aparelho (o mesmo que o jogo já usa para o
  dia e a noite).

### Esconde-esconde (`sistemas/esconde.ts`)

- Os quatro bichos ficam escondidos em quatro lugares do Bosque, sempre os mesmos (a criança pode
  contar para outra onde achou): atrás de uma moita, dentro de uma toca, embaixo da casa na árvore e
  atrás da cabana. Os pontos são âncoras novas no `bosque.glb` (`esconderijo-1` a `esconderijo-4`).
- Cada esconderijo mostra só uma pista quando a criança está perto (um rabinho, um farfalhar). O
  Zappy diz "está quentinho" ou "está frio" se ela pedir ajuda.
- Achar (E perto do esconderijo) faz o bicho sair feliz e correr para o cercadinho. Fica salvo.
- Achar todos os quatro é um pedido que a Capi agradece com um presente.

### Bichos (`sistemas/bichos.ts`)

- **Adotar:** depois de achar o primeiro, a Capi oferece adotar um dos que estão no cercadinho. A
  criança escolhe e dá um nome (de 1 a 16 caracteres, só letras, espaço e hífen). O nome fica só no
  salvamento dela e ninguém mais vê, por isso não passa por moderação. Só um bicho adotado nesta
  fase.
- **Cuidar:** três medidas de 0 a 100, que caem devagar com o tempo jogado (não com o tempo de
  relógio, para não punir quem ficou longe): fome (alimentar com ração do armazém ou comida da horta),
  limpeza (banho no lago ou na bacia de casa) e carinho (fazer carinho, brincar).
- **Truques:** cada bicho tem um truque. Ensinar é repetir: 5 sessões em dias diferentes, com o bicho
  bem cuidado (as três medidas acima de 50). Depois disso ele faz o truque quando a criança pede.
- **Crescer:** de filhote para adulto depois de 7 dias com cuidado (em cada um, as três medidas
  passaram de 60 em algum momento). Troca o modelo com uma festinha.
- **Seguir:** o bicho adotado segue a criança pela ilha central e pelo Bosque, a dois passos, pelo
  chão (anda, corre, espera quando ela para, senta depois de um tempo). Não segue no cipó, na
  escalada, nadando nem dentro das ferramentas: espera onde está e alcança depois.
- **Nunca morre nem foge.** Medida baixa só deixa o bicho tristinho e sem truques até ser cuidado.

### Moedas

Nada disto paga moedas por enquanto. Toda moeda nova precisa ser autorizada no servidor antes
(`docs/arquipelago.md`). Os prêmios são amizade, itens e o crescimento do bicho.

## Salvamento V3

```ts
moradores: { capi: { amizade, conversaEm, presenteEm, pedido: { dia, id, entregue } | null } }
bichos: {
  achados: BichoId[],
  adotado: { id, nome, fase: 'filhote' | 'adulto', fome, limpeza, carinho,
             diasCuidados, diaCuidadoEm, truque: { sessoes, ultimaEm, aprendido } } | null,
}
```

Migração da V2: Capi com amizade 0, nenhum bicho achado e nenhum adotado. O serviço aceita a V3 (o
contrato é o mesmo pacote) e continua aceitando V1 e V2.

## Ordem de entrega

1. Contrato: salvamento V3 com migração e testes (contrato e serviço).
2. Regras puras da Capi, do esconde-esconde e dos bichos, com testes.
3. A Capi no Bosque: modelo, animações, olhar para a criança, conversa com corações e o pedido do
   dia na tela, presente pelo inventário.
4. Esconde-esconde: âncoras no Blender, pistas, achar, o cercadinho com os bichos achados.
5. Adotar e cuidar: escolher e dar nome, painel do bicho, alimentar, banho, carinho, truque.
6. Seguir pela ilha e crescer.
7. Docs (`arquipelago-regras.md`, `CLAUDE.md`), conferência no navegador com prints e GIFs, full
   review, commit.

## Fora desta parte

O modo construção, a galeria, o Pinta no molde e o aconchego dos cômodos (fase1-10 a fase1-15), o
diário do Bosque (fase1-16), o minijogo da corrida dos bichos (fase1-17) e o cartão completo dos
pais (fase1-18).
