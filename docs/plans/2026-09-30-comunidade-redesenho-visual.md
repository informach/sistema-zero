# A página da oferta da Comunidade dos Criadores com olho de diretor de arte (30/09/2026)

Pedido: a página de vendas da Comunidade dos Criadores (funil kids,
`packages/funnel/src/components/funnel/oferta/ComunidadeOfertaBody.astro`) com a paleta e a
identidade visual da plataforma kids, mais elegante, visual e atrativa, "parecendo que foi um
diretor de arte que fez". A copy v2 (`2d068edf`, dez seções) ficou intacta por decisão dela; as
sugestões de copy estão no fim deste documento, à parte.

## Decisões dela (antes de implementar)

1. Os bonecos 3D ficam: Dedé, o menino no computador, o casal e o Zappy são a marca.
2. A copy é fixa. Só o desenho muda. Micro-copy nova (eyebrow, preço no topo, chips, o bloco do
   Mural na banda dos relatos) foi aprovada junto com a implementação.
3. Telas REAIS da plataforma entram como prova, no lugar dos mockups com dados fictícios.
4. Maquete descartável das três seções-chave antes de implementar (herói, provas, planos). Ela
   escolheu o herói A (a tela real no cartão azul, com o Dedé e o Zappy) e os planos P1 (o anual
   como o cartão da marca).

## O conceito: a oficina do criador

A página é a vitrine da própria plataforma: as telas reais são o cenário, os bonecos
apresentam, o Zappy guia. Ritmo por seção:

| Seção | Fundo | Peça |
|---|---|---|
| Topo | navy | logo kids, "a partir de R$ X por mês", botão compacto |
| 01 Herói | chão | eyebrow amarelo, h1 Baloo 800 com destaque azul, 3 benefícios com ladrilho, CTA 3D + link, selos; à direita a tela real da aula no `.kof-marca`, Dedé, Zappy, chips flutuantes, estrelas |
| 02 Argumento | chão | texto + a ilustração do menino montando blocos no Estúdio com o Zappy; a regra dos pontos com a "Ilustração da experiência"; o fecho em carta com ladrilho amarelo |
| 03 A aula por dentro | chão | tela real da aula (vídeo + experimento), o Estúdio ilustrado, o Pinta real; fechos em carta |
| 04 Relatos | **navy** | três cartas-criador (foto, nome, fala literal, chip) e o Mural real com CTA branco |
| 05 Depois do primeiro jogo | chão | a fita dos 8 postos da Jornada, a Jornada real, os Recados em carta com ladrilho, o Meu perfil e o Clube reais |
| 06 Família | chão | a arte da foto do casal com os bonecos; a história do André intacta |
| 07 Rotina | chão | quatro cartas com ladrilho por unidade |
| 08 Assinatura | chão-alt | prose + duas notas com ladrilho; o mensal em carta 3D, o anual como `.kof-marca` com o selo amarelo de economia; a garantia em carta com ladrilho verde |
| 09 Dúvidas | chão-alt | `<details>` em cartas com chevron |
| 10 Convite | **navy** | título branco, lead, CTA branco e a ilustração da vitória |

Regras seguidas (as do Pen): cartão branco liso de raio 24, o 3D só no clicável, a única sombra
difusa é a do herói (e do plano em destaque, que é a mesma peça), eyebrow e selo de recompensa em
amarelo, azul claro só sobre o navy, cores de unidade só em ladrilho e chip, corpo Nunito, botões
em pílula de 44px, `color-mix in oklab`, nada de hexadecimal nos consumidores.

## Arquitetura

- `src/styles/kids-oferta.css` (novo): aliases `--kof-*` e as receitas, por token.
- O body ficou com o layout num `<style is:global>` prefixado por `.cdc`, um `<script>` para o
  reveal (`.kof-reveal`, só sob `html.kof-js`, visível com menos movimento) e a barra fixa do
  celular (`.kof-mobar`: aparece depois de 0,9 janela, some com os planos ou o rodapé à vista).
- Telas reais por `scripts/captura-telas-kids.ts` (Chrome instalado + CDP; cookies por env;
  esconde o skip-link, fecha o diálogo tardio do Clube; 1x e @2x).
- Ativos copiados do kids: `zappy-*.webp`, `jornada-<slug>.webp`, `logo-kids-{claro,escuro}.svg`.
  Os `print-*.webp` saíram.
- Testes: `comunidade-offer-copy.test.ts` (telas obrigatórias, `print-` proibido, um
  `fetchpriority="high"` amarrado ao preload, a barra sem `data-checkout-cta`),
  `comunidade-offer-css.test.ts` (sem cor própria, `oklab`, sem `!important`, namespaces, Baloo
  800), `comunidade-offer-contrast.test.ts` (29 pares + o chip azul; e a restrição do link azul
  sobre o chão-alt).

## Medições

- Contraste: todos os pares novos ≥ 4,5 (texto) ou ≥ 3 (ícone, texto grande); o link azul sobre
  o chão-alt dá 4,27 e por isso só aparece dentro de carta nessas seções.
- Altura da página a 1440px: 13.581px (era ~15.900px); a 390px: 23.787px.
- Prints por seção, nas duas larguras e nas duas variantes (`?origem=desafio`), feitos pelo
  `tmp/print-pagina.ts` da sessão contra o dev server.

## Full review (30/09, três revisores)

Código/CSS/a11y: 1 ALTO (o anel de foco azul sumia sobre o azul do plano anual e sobre o navy:
hoje é branco ali), 3 MÉDIOS (nomes da fita colidindo a 360-390px: `hyphens`; a logo espremida
abaixo de 385px: `width: min(279px, 100%)`; o `FILL` da fonte de ícones não existia na instância
estática) e 14 baixos aplicados (barra escondida sem sombra, `@media print`, `scroll-margin-top`
do `main`, alias para o token cru, raio da moldura clicável, alvos de 44px, espaços antes de
`<strong>`, `aria-labelledby` na continuidade). Visual: 5 ALTOS (a logo para fundo claro sobre o
navy; o eyebrow em duas linhas no celular; a ilustração com a TV cortada; linhas de 140
caracteres nos cartões largos, agora com 52rem; o buraco entre título e parágrafo, agora
`align-items: start`) e 8 médios (telas recortadas em 16:9 pelo alto; o selo de economia
centrado e quebrável; o mensal sem buraco; o chão-alt só nos planos; estrelas presas ao
container; o degradê no pé da arte da família; sem sombra nas molduras das seções nem 3D no
cartão não clicável; o anual primeiro no celular). Copy/testes/docs: a copy v2 íntegra palavra
por palavra; legendas do Meu perfil e da aula corrigidas para o que a tela mostra; guardas dos
testes endurecidas (índices e contagens não podem ser vazios; as 8 artes da Jornada; `on-action`
nos pares brancos; nenhum `var(--sz-` no layout).

Decisões dela que seguem abertas: a legenda do herói antigo ("Uma ideia ganha regras, personagens
e um jogo para experimentar.") caiu junto com a figura; o chip "Jogo publicado" lido sozinho pode
soar como garantia; o topo diz "a partir de" sem nomear o anual; a marca d'água "Perfil b788735c"
aparece miúda no vídeo da tela da aula; o rodapé compartilhado tem outro grid e sombra difusa.

## O que ficou de fora (e por quê)

- A sequência de três quadros reais do experimento (regra → teste → ajuste) na seção 02: exigiria
  capturar o console da aula em três estados; a "Ilustração da experiência" cumpre o papel e é o
  que o teste de copy exige. Fica como evolução.
- A tela do Estúdio livre: o perfil de teste não tem projeto, então a lista sai vazia; a
  ilustração `preview-estudio` segue no lugar.
- O jogo publicado (`/jogar/<id>`): a captura sai em branco antes de a criança apertar Enter.

## Sugestões de copy (não entram sem o ok dela)

1. A prova chega tarde (depois de ~1.200 palavras). O desenho compensa com a banda navy e as
   telas reais; um relato no herói ajudaria.
2. "Pode/podem/poderia" 69 vezes e "seu filho" 52 vezes em 3.500 palavras.
3. A cena "convidar para jogar" aparece quatro vezes; o ciclo testar e ajustar, três.
4. A seção 05 virou catálogo de funções; os Recados são o único canal de ajuda.
5. Os planos não listam o que está incluído (a lista existe só na página de obrigado); o h2 fala
   do mensal e o cartão em destaque é o anual.
6. O mesmo CTA se repete e três seções (05, 06, 07) não têm CTA.
7. `?origem=desafio` ainda lê "Se seu filho nunca programou" na seção 03.
8. Alts e rótulos: corrigidos no redesenho ("Helena e Júlio" na foto do casal; "Julio" sem acento
   segue na arte).
9. Nenhuma imagem mostra um pai ou uma mãe com a criança, embora a promessa seja jogar juntos.
