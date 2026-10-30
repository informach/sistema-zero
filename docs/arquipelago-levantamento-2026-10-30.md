# Arquipélago Vagalume: levantamento integrado de 30/10/2026

Leitura do staging local em `0ca840100` (remoto em `0285b4284` no começo da leitura). Junta, num
lugar só, três registros que já existiam e o levantamento feito nesta data contra a proposta:

| Fonte | O que traz |
| --- | --- |
| [Estado atual](arquipelago-estado-atual.md) | Matriz por funcionalidade: código, prova local e implantação |
| [Programa L01 a L14](plans/2026-10-29-arquipelago-entrega-integral-design.md) | Os 14 lotes da entrega integral, critérios e dependências |
| [Lotes da auditoria](plans/2026-10-30-arquipelago-ajustes-da-auditoria.md) | A01 a A06, C01 a C03, E01 a E04, S01 e Q01, com commits e provas |
| [Auditoria de 30/10](../.audits/architectural-analysis-2026-10-30-arquipelago.md) | Achados A1 a A10 na base `f7bee3d3a` |
| Este levantamento | Conferência item por item no código contra a proposta v3 do jogo e a revisão da Jornada do Criador de 25/10 |

Referências da dona: `Downloads/Arquipélago Vagalume.html` (proposta v3) e
`Downloads/Proposta Jornada do Criador - revisao aprofundada.html` (25/10/2026). Os hashes estão
na auditoria.

**Limites.** Leitura de código e documentos. Não rodei testes nem tipagem nesta leitura (a
tipagem fica com uma sessão só). Nenhum banco remoto foi consultado. "Feito" abaixo quer dizer
código no staging local, não publicação nem uso por uma conta real. As provas de cada item
continuam nos registros de QA citados no estado atual.

## 1. Resumo

O mundo está quase todo construído e a base técnica é forte. O que ainda não acontece para uma
criança de verdade é o ciclo central da proposta: aprender no curso, fazer o desafio no Estúdio,
a cor voltar à ilha por partes e o minijogo virar atração. Nenhum desafio está marcado para
publicar e os postos de Python e JavaScript ainda não têm desafio na linguagem do posto.

Além do que a auditoria já registrou, esta leitura achou lacunas que não estavam em nenhum dos
três registros (seção 5): os Lumis só se pegam na Vila Doce, a subida de posto não tem a cena
que a proposta descreve, a horta e o clima mudaram o ritmo diário, faltam percursos em três
ilhas, não há resumo do dia e dois interruptores dos pais não fazem nada.

## 2. Por ilha: feito e falta

| Ilha e posto | Feito no staging local | Falta da proposta | Lote |
| --- | --- | --- | --- |
| Sua ilha, Faísca | Quarto real, porta nova, abertura "O Cinza" com leitura manual, primeiros passos do Zappy, primeiro pedido (horta e geladeira), bancada, construção, praia com Nico, coleção de conchas, pesca tranquila, luneta, placas das pontes, Farol | Chave de cada cômodo, percursos da praia e das pedras, Pega-conchas (pacote da Faísca), Lumis da praia (Estrelinha, Búzio) sem captura | L02, L03/C03, L08, L10 |
| Bosque, Construtor | Capi, esconde-esconde, 4 bichos, adoção, cuidar, truque e crescer, cipó, escalada, percurso nas copas com 3 estrelas, cabana construível, lago, Corrida dos bichos (C01b2a) | Lumis do Bosque (Pitanga, Ipê) sem captura; o pet do quarto não é o bicho que segue | L08, S01 |
| Vila Doce, Inventor | Bento, receitas por amizade, turnos em 3 balcões, feira semanal, entrega pelos telhados (dá os patins), festa na praça, borrões e Lumis, controles da corrida (C01b2b) | Desafio que aplique pulo, gravidade e dificuldade do Inventor | L03/C01b |
| Recife, Explorador | Maré, mergulho, navio, labirinto, achados, corais, aquário em casa, mapa, barco e rede de portos (E02) | Percurso com estrelas; Mira de bolhas em blocos, não em Python | L10, C02 |
| Pico, Mestre | Floco, subida ao cume com estrelas, trenó, caverna e cristal, planador, festival, banda, chocolate quente | Segundo andar da casa, construir o iglu; desafio em blocos, não em Python | L11/E04, C02 |
| Vale, Arquiteto | Jade, pegadas, escavação, ninhos, filhote, museu, montaria, Proteja os ninhos | Percurso com estrelas, quintal grande; desafio em blocos, não em JavaScript | L10, L11, C02 |
| Nuvens, Gênio | Iriê, saltos, corrida de balão, constelações, clima da ilha, Jardim que floresce | Moldar o terreno; desafio sem grade, custo e persistência do Pro | L11/E04, C02 |
| Farol, Lenda | Sala do alto, última página, seis fachos, volta da Íris, prioridade do guia (A04) | Subida final como aventura, modo livre, Farol como galeria, projeto autoral | L11/E04, C03 |

## 3. Por lote do programa L01 a L14

Estado em código local. Implantação e aceite autenticado ficam todos em L14/Q01.

| Lote | Situação | O que ainda falta | Lotes da auditoria ligados |
| --- | --- | --- | --- |
| L01 Salvamento e continuidade | Fechado localmente (V18, teto 65.536 bytes, conflito, diário) | Jornada autenticada | A05 |
| L02 História e descoberta | Abertura, diário das seis ilhas, final e volta da Íris | Subida de posto como cena (N02), chave dos cômodos (N11) | A03b, A04 |
| L03 Quadro das Cores | 108 entradas (54 atividades em dois públicos), barreira de repertório C01a a C01e2, Bosque e Vila revisados | Todos com `publicar: false` (N14); Faísca e pós-Farol; Python, texto e Pro; demais ilhas | C01b, C02, C03 |
| L04 Galeria e autoria | Posse no Members, compra atômica, Pinta e Molda no molde | Adoção remota das compras antigas; regra de posto do Pinta e do Molda (N10) | |
| L05 Atrações e Mural | Aprovação, cópia, fliperama, Mural | Ciclo autenticado; depende de conteúdo publicado | |
| L06 Moradores e vida | Amizade nas seis ilhas, visitas, festas por aconchego | Resumo do dia (N06) | |
| L07 Economia | Turnos, insumos, pedidos remunerados, teto 100 por semana | Implantação | |
| L08 Lumis, horta, receitas | Jeitos das espécies, rotina, colheita especial, 12 receitas | Captura fora da Vila (N01); ritmo da horta (N03); clima antes das Nuvens (N04) | |
| L09 Festas e semana | Tema da semana, feira, Carnaval e Junina, roupas e receitas sazonais | Datas das Lanternas e do fim de ano (decisão da dona) | |
| L10 Exploração | Mapa de visitas, rede de barcos, fantasma familiar | (Tratado: segredos com o planador, regras §6.24; percursos nas três ilhas, V19; mapa que se revela andando, regras §6.25) | E02, E03 |
| L11 Criação avançada e Lenda | Construção atual e final narrativo | Segundo andar, terraformação, cabanas fora do Bosque, modo livre, exposição | E04 |
| L12 Adultos e social | Pele adulta, visitas adultas por código (local) | Paridade de conteúdo; interruptores dos pais sem efeito (N08) | S01 |
| L13 Medição | Fotografia e mudanças de aparência (A06), voltou ao curso | Eventos de compra e criação, retorno adulto, satisfação | A06 |
| L14 Entrega | | Jornada real nos dois públicos, aparelhos físicos, implantação; limite no fim da ação (N07) | A01, Q01 |

## 4. Lotes da auditoria já registrados

Resumo do [registro de lotes](plans/2026-10-30-arquipelago-ajustes-da-auditoria.md), que continua
sendo a fonte dos commits. Integrado = merge no staging local.

| Lote | Situação |
| --- | --- |
| A01 Descarte dos personagens animados | Integrado (`00adca1df`) |
| A02 Cor conquistada | Integrado (`165e94c10`) |
| A03a, A03b, A03c Pausa do quarto, leitura da abertura, ritmo básico | Integrados |
| A04 Prioridade do guia no Farol | Integrado (`16345a590`) |
| A05 Índice canônico e relatórios de arte | Integrado (`9b5fcdd01`) |
| A06 Medição de aparências | Integrado (`85ee77ecf`) |
| C01a, C01b1, C01b2a, C01b2b, C01c, C01d, C01e, C01e2 | Integrados; C01b2b com envio autorizado pela dona |
| E01 Coleções da praia | Implementado (plano e QA próprios) |
| E02 Rede do barco | Feito por outra sessão; segredos (§6.24) e mapa detalhado (§6.25) tratados em 30/10 |
| E03 Fantasma familiar | Integrado (`ae68922b1`) |
| C01f | Rascunho local fora do staging |
| C02, C03, E04, Q01 | Não começados |
| S01 Companhia | Tratado em 30/10: o bichinho do quarto acompanha; com bicho adotado, a criança escolhe (regras §6.26) |

Orientação vigente da dona (30/10): depois do envio do C01b2b, pausar novos lotes.

## 5. Achados novos deste levantamento

Não constam da auditoria nem dos três registros. Cada um traz a evidência no código.

| Id | Achado | Evidência | Peso | Lote |
| --- | --- | --- | --- | --- |
| N01 | **(Tratado: Lumis e borrões nas sete ilhas, lanterna pelo Zappy na primeira noite.)** **Os Lumis só se pegam na Vila Doce.** Os borrões só existem lá; 12 das 14 espécies, incluindo a Pitanga do exemplo da proposta, não têm como ser pegas. A lanterna só chega no posto 3. A proposta pede uma família por ilha, com borrões à noite e nos cantos cinzas de todas as ilhas. A auditoria registrou "captura" como existente, sem essa ressalva | `mundo/borroes-da-vila.tsx` é o único que chama `prenderBorrao`; montado só em `mundo/vila-viva.tsx`; `FAMILIA_DA_VILA` em `sistemas/borroes.ts` | Alto | L08 |
| N02 | **(Tratado: cena com o voo do Zappy, a ponte se montando com a cor e a travessia; espera a criança fora de casa; Pular e Esc.)** **A subida de posto não tem a cena da proposta.** Ao abrir, a ponte se monta e a cor escorre em 4,5 s onde a criança estiver, às vezes dentro de casa, sem câmera na travessia e sem o Zappy voar até a ilha. A proposta chama isso de "o momento mais esperado do jogo" | `useChegada` em `mundo/anel.tsx` | Alto | L02 |
| N03 | **(Tratado: horas reais, primeiro pedido rápido.)** **A horta cresce em 3 a 8 minutos.** A proposta diz "planta hoje, colhe amanhã" e põe a horta no ritmo de um dia. Com tempo curto, o motivo diário de voltar e a cena "os Lumis guardaram tudo" enfraquecem. Foi escolha deliberada (comentário no código), mas muda a proposta | `CRESCIMENTO_MS` em `arquipelago-contracts/src/horta.ts` | Médio, decisão da dona | L08 |
| N04 | **(Tratado: clima natural por dia do jogo; as Nuvens dão a escolha.)** **Não há clima antes das Nuvens.** Na proposta, chuva que rega, sol que pede água e colheita especial fazem parte do viver; o prêmio das Nuvens é controlar o clima. Hoje a criança não vê chuva até o posto 7 | `sistemas/clima.ts` (vale com as Nuvens abertas) | Médio | L08 |
| N05 | **(Tratado no lote S+N05: três percursos novos na V19.)** **Faltam percursos com estrelas em três ilhas.** Existem copas, telhados, cume, saltos e balão. Sua ilha, Recife e Vale não têm; a proposta dá percursos curtos a cada ilha | `PERCURSOS` em `arquipelago-contracts/src/salvamento.ts` | Médio | L10 |
| N06 | **(Tratado: resumo ao deitar e na tela de descanso.)** **Não há resumo do dia.** A proposta fecha a sessão com "decora e dorme: resumo do dia" e mantém o resumo no adulto | Nenhuma ocorrência em `src/` fora do fim dos primeiros passos | Médio | L06, L12 |
| N07 | **(Tratado: espera a ação acabar, até 30 s.)** **O limite corta na hora.** A tela de descanso cobre o jogo quando o tempo acaba; a proposta diz que o Zappy põe o avatar para dormir no fim da ação | `TelaDescanso` em `interface/telas.tsx`, `jogo.tsx` | Baixo | L14 |
| N08 | **(Tratado: "Visitas de outras crianças" abre as casas de amigos, com convite entre famílias e os dois responsáveis liberando, regras §6.22; "Fotos no Clube" manda a foto do modo foto para a moderação do Clube, regras §6.23. Em produção, falta a equipe criar o canal `fotos-do-arquipelago` com aprovação prévia.)** **Dois interruptores dos pais não fazem nada.** "Visitas de outras crianças" e "Fotos no Clube" gravam, mas o jogo não lê; o texto promete o comportamento. Risco de confiança com os pais | `community-kids/src/app/pais/_components/arquipelago-familia.tsx`; regras §3 ("ainda só se gravam") | Médio | L12 |
| N09 | **Rótulos dos minijogos divergem da Jornada** (seção 7) | Proposta v3, seção das ilhas | Médio, decisão da dona | L03 |
| N10 | **Pinta e Molda: as duas propostas não concordam.** O jogo abre o Molda no Explorador, como o Arquipélago pede. A Jornada põe a primeira peça no Molda como extra do Construtor e o primeiro desenho no Pinta como extra do Faísca | `POSICAO_DO_MOLDA` em `sistemas/construcao/projeto-azul.ts` | Baixo, decisão da dona | L04 |
| N11 | **(Tratado: quatro chaves na sua ilha, cada uma libera o acabamento do seu cômodo no Construir, regras §6.16.2a; a praia e as pedras ganharam o percurso na V19.)** **A aventura da sua ilha é a mais curta.** Faltam a chave de cada cômodo e os percursos da praia e das pedras, justamente na ilha em que todo mundo começa | Busca por "chave" só acha a abertura | Médio | L02, L10 |
| N12 | **(Tratado: um baú no alto de um vento nas quatro ilhas antes do Pico, só o planador chega, registrado no álbum, regras §6.24. O conteúdo dos baús, Lumis raros e páginas extras do diário, pede conteúdo novo.)** **Nenhum segredo usa o kit de movimento nas ilhas antigas.** Planador e patins valem em qualquer ilha, mas nenhum baú, caverna ou telhado foi feito para eles. Princípio "segredos para voltar" sem entrega | `sistemas/exploracao.ts` só marca ilha visitada | Médio | L10/E02 |
| N13 | **Trechos antigos nas regras e no código.** `arquipelago-regras.md` ainda diz V10 na seção 5, "só Bosque e Vila completas" em 6.9 e "único percurso" em 5. O código mantém a fala "Os moradores e os bichos chegam aqui na próxima fase", que nunca aparece porque as seis ilhas são vivas | `docs/arquipelago-regras.md`; `ILHAS_VIVAS` e `useInterativo` em `mundo/anel.tsx` | Baixo | A05 |
| N14 | **Nenhum desafio está marcado para publicar.** É uma decisão consciente do C01b1, mas deixa Quadro das Cores, desafio do dia e fliperama vazios e impede a cor de voltar por partes | `docs/desafios-do-jogo/conteudo-por-posto.md`; manifestos | Alto, sequência | L03 |
| N15 | **Duas versões de ilha, não três.** A proposta tem silhueta, versão média e completa; o jogo usa leve e completa, com a busca começando na ponte. Ajuste técnico aceitável, sem registro de escolha | `mundo/ilha-completa.tsx`, regras §6.9 | Baixo, registrar | L14 |

Também confirmados, já conhecidos: a Íris aparece numa ilustração da abertura (a proposta diz
"só pelas páginas"); o pet do quarto não segue pela ilha (só o bicho do Bosque, `sistemas/seguir.ts`).

## 6. O que está excelente

1. **Separação entre jogo e plataforma** como a proposta pediu: quatro pacotes com teste de
   fronteira (`tests/fronteira.test.ts`), uma porta de entrada, publicação por manifesto, chave
   de liga e desliga sem deploy, CSP própria na página e falha contida.
2. **Movimento.** Física em passos fixos, tolerância de pulo, agarrar borda, equilíbrio, sala de
   testes com um caso que passa e outro que não passa por estação.
3. **Salvamento.** 18 versões migradas, revisão e conflito sem perda, diário no aparelho, teto
   testado com documento cheio.
4. **Autoridade no servidor.** Tempo livre por concessão, prêmio pago uma vez, pendente quando o
   Members cai, teto semanal.
5. **ECA Digital e família.** Permissões restritas por padrão, suporte só lê, o serviço não sabe
   nomes, o cartão some na dúvida.
6. **"Nada se perde por faltar."** Cochilo que acorda em casa, horta que não estraga, turno sem
   relógio, percurso sem castigo, cansaço que não deixa o avatar lento (A03c).
7. **Pinta e Molda no molde**, com as conferências do molde e "feito por você não custa moeda".
8. **Barreira de currículo (C01)**: um desafio só publica se um curso daquela comunidade ensina
   os blocos que ele pede. Coerente com a Jornada.
9. **Lumis com jeito próprio** (voo, carga, trabalho e brilho por espécie, `lumis-trabalho.ts`),
   num intérprete único para o jogo e o editor. Falta só poder pegá-los (N01).

## 7. Coerência entre as duas propostas

| Posto | Minijogo na proposta do Arquipélago | O que a Jornada ensina no posto |
| --- | --- | --- |
| Faísca | Pega-conchas: sequência e eventos | Evento, informação verdadeira ou falsa, se/senão |
| Construtor | Corrida dos bichos: movimento e colisão | Grupos, relógio, pontos, vidas, estados e reinício |
| Inventor | Corrida do entregador: repetição e pontos | Gravidade, pulo, sorteio com limite, ritmo (o jogo do entregador combina; o rótulo não) |
| Explorador | Mira de bolhas: alvos e pontuação | Mesmo gênero, em Python |
| Mestre | Fase de plataforma: fases e níveis | Mesmo gênero, em Python |
| Arquiteto | Proteja os ninhos: ondas e listas | Defesa de torre, em JavaScript |
| Gênio | Jardim que floresce: simulação e variáveis | Grade, custo, produção, salvar e reabrir, em JavaScript Pro |

- Lumis: a proposta diz "repetição no começo, condições depois"; a Jornada ensina condição já no
  Faísca. A decisão da dona de 27/10 (cartões pelos blocos conquistados) resolve.
- O contrato dos desafios só aceita JavaScript em blocos (`desafios.ts`); os postos 4 a 7 da
  Jornada são em Python e JavaScript textual. É o lote C02.
- Coincidências para aproveitar como desafios: o curso "A Chave do Farol" e a chave e o Farol da
  história; a missão "Resgate dos Vagalumes" do Explorador e o Zappy; o curso "Ilha que Floresce"
  do Gênio e as Nuvens.

## 8. Decisões que são da dona

- Datas da Noite das Lanternas e da festa de fim de ano (hoje só Carnaval e Junina ligam; a
  próxima festa no jogo é em fevereiro).
- Se a horta volta a "planta hoje, colhe amanhã" (N03) e se o clima entra desde o começo (N04).
- Se a subida de posto ganha câmera e o voo do Zappy (N02).
- Os rótulos dos minijogos (N09) e o posto do Pinta e do Molda (N10).
- Esconder ou marcar como "em breve" os dois interruptores sem efeito (N08).
- Registrar como escolhas as adaptações já feitas: duas versões de ilha (N15) e a Íris na abertura.

## 9. Ordem sugerida, depois da pausa

1. Conteúdo e publicação (L03: C01b, C02, C03), porque destrava a cor, o desafio do dia e o
   fliperama.
2. Lumis em todas as ilhas (N01) e a cena da subida de posto (N02): são o coração da proposta e
   já têm arte e regras prontas.
3. Ajustes de confiança: interruptores dos pais (N08), resumo do dia (N06), limite no fim da ação
   (N07), documentação (N13).
4. Exploração: percursos que faltam (N05), aventura da sua ilha (N11), segredos (N12).
5. Criação avançada e Lenda (E04), festas com datas aprovadas, e a qualificação Q01/L14.

## Como manter

Este arquivo é uma fotografia de 30/10. A matriz viva continua no
[estado atual](arquipelago-estado-atual.md) e os commits no
[registro de lotes](plans/2026-10-30-arquipelago-ajustes-da-auditoria.md). Ao fechar um achado
N, registrar lá o commit e a prova, e marcar aqui o id como tratado.
