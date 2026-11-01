# Arquipélago Vagalume: proposta v3 e Jornada do Criador contra o código (31/10/2026)

Levantamento pedido pela dona em 31/10/2026, sobre o `staging` local em `871549e6e`. Nessa base,
o lote 10 está quase todo integrado (A27, A28, A34, A35, A36); o A33 estava em andamento na outra
sessão, ainda sem commit. Compara a base com:

- a proposta do jogo, `Arquipélago Vagalume.html` (versão 3, com as fichas das 8 ilhas);
- a proposta pedagógica por posto, `Proposta Jornada do Criador - revisao aprofundada.html` (25/10).

Sucede o [levantamento de 30/10](arquipelago-levantamento-proposta-v3-2026-10-30.md). Desde ele
entraram:

- a lista A, lotes 1 a 9 e quase todo o 10;
- a lista B (B1 a B8, com a arte de 31/10);
- as correções C1 a C3 e N3 e N4 da [revisão de 31/10](../.audits/architectural-analysis-2026-10-31-arquipelago-revisao-dos-lotes.md);
- a Noite das Lanternas.

**Critério desta análise (pedido da dona em 31/10):** quando a proposta e uma decisão registrada
divergem (regras §6.27, §6.28, §6.29 ou planos), vale a proposta. A decisão não fecha o item. Ele
aparece como diferença frente à proposta, com a decisão citada ao lado.

**Como foi feito:** leitura do código em quatro frentes:

- mundo e ilhas;
- casa, viver e economia;
- pedagogia por posto;
- família e arquitetura.

Os achados de maior peso foram conferidos de novo no código antes de entrar aqui (✔). Nada foi
executado: nem testes, nem tipagem, nem navegador, nem banco, nem aparelho. "Feito" quer dizer
código no staging local, não publicação nem uso por uma conta real.

Legenda:

- **Feito**;
- **Parcial**;
- **Falta**;
- **Diverge**: o código faz diferente da proposta. Quando há decisão registrada, ela vem citada.

## 0. Situação em 01/11/2026: as lacunas resolvidas

As lacunas deste levantamento viraram os lotes L1 a L12 (plano e registro com commits e provas em
[`docs/superpowers/plans/2026-11-01-arquipelago-lacunas.md`](superpowers/plans/2026-11-01-arquipelago-lacunas.md)).
As seções 1 a 7 abaixo continuam como a foto de 31/10; a situação de cada item é esta. Os merges
estão em `origin/staging`.

**Seção 5, item a item**

| Item | Situação | Lote (merge) |
| --- | --- | --- |
| 1. Cursos-base da Jornada | Fora do jogo, pela decisão do plano: fica para a produção de cursos | |
| 2. O minijogo da ficha no Quadro das Cores | Feito: os quadros 1 a 5 de cada ilha montam o minijogo do gênero do posto, um passo por quadro, e o quadro 6 na linguagem do posto vira atração | L7c a L7f, L7j, L9d |
| 3. Vale e Nuvens | Feito: refeitos só com a trilha (desfaz a A43); a lista "esperam os cursos" ficou vazia | L7e, L7f |
| 4. Quadros 1 a 5 com o conteúdo do posto | Feito: Mira do Recife, Fase do Pico, Guardião dos ninhos, Jardim em grade | L7c a L7f |
| 5. Dicas na ordem da Jornada | Feito | L6a (`5574d6d8a`) |
| 6. Subida do Farol | Feito: o planador conferido na largada, a entrada na varanda e o foco em "Entrar na sala do alto" | L2a (`bd37187d9`) |
| 7. Projeto autoral da Lenda | Feito: cenário aberto no Python e no Pro com ficha, critério de combinar três postos, versão 2 e revisão humana na Sala do Professor. A ligação com a Maestria não entrou: a Maestria ainda não existe na plataforma | L7l (`de0cb4adf`) |
| 8. Quadro 6 sem copiar a missão | Feito (Recife, Pico, Nuvens; a Vila pela ficha) | L7g, L7h, L7i |
| 9. Lumis da praia | Feito: só aparecem presos | L2b (`de0e2acab`) |
| 10. Mapa com o tamanho de cada ilha | Feito | L2b |
| 11. Ordem dos cartões dos Lumis | Feito: por posto, repetição primeiro (desfaz a decisão de 27/10) | L7b (`c9e28d624`) |
| 12. Regra causal | Feito: as quatro brechas, com negativos | L7a (`875e95006`) |
| 13. Roupas de festa | Feito na outra sessão (B16): só conquistadas na festa | |
| 14. Pedido de morador como fonte baixa | Feito: 5 e 2 moedas | L6a |
| 15. Fotos no Clube | Já estava certo (correção do plano): canal sem aprovação vira `sem-clube` | |
| 16. Contrato com versão | Feito: `negociarVersao` | L8 (`d060b3994`) |
| 17. Medição estrita | Feito: o Admin lê com o esquema tolerante | L8 |
| 18. Salvamento perto do teto | Feito: V23 e teto de 80 KB (escolha da dona) | L1 (`6d2d8a3b6`) |
| 19. Brinquedos de ilha | Feito: trenó, montaria e a volta das boias viram minijogo | L3a, L3b |
| 20. Borrões que desbotam em volta | Feito | L2c (`8ba0ed6f1`) |
| 21. Cochilo | Feito | L2b |
| 22. Mais de um bicho adotado | Feito: até três | L4 (`db5a100a5`) |
| 23. Luneta com o bicho e o segredo | Feito: um bicho de cada ilha e o Lumi de luz da família; a Vila ganhou a ovelhinha | L11c (`accfef376`) |
| 24. Placa da ponte sem a Íris | Feito | L2d (`e60ffd8be`) |
| 25. Concordância do A34 | Feito: "Visitas de irmãos começam ligadas" | L12 |
| 26. Visita do irmão com andar e terreno | Feito | L2e (`6b5544603`) |
| 27. `terrenoComAObra` | Feito: usado no aplicar | L2e |
| 28. Medição sem fonte | Feito | L8 |

**Seção 3, as diferenças frente à proposta**

| Item | Situação | Lote |
| --- | --- | --- |
| Ilhas de posto alto mais altas | Feito: Bosque 14,4, Vila 15,5, Recife 16,8, Pico 18,2, Vale 19,8, Nuvens 24 m, nas duas versões | L11a |
| Silhueta, média e completa | Feito: as três versões, com a média de cada ilha feita no Blender | L10, L11b |
| Íris só pelas páginas | Feito: a abertura e a placa sem ela | L2d |
| Final: subida pelo Farol | Feito | L2a |
| Sua ilha: a chave abre o cômodo | Feito | L5 (`1fb1c6aff`) |
| Bosque: adotar mais | Feito | L4 |
| Pico: o planador condiciona a subida sem aviso | Feito: conferido na largada, com a fala que manda ao Pico | L2a |
| Ordem das fontes de moeda | Feito | L6a |
| Chocolate quente aquece no Pico | Feito | L2e |
| Objetos com função no andar de cima | Feito | L5 |
| A sua ilha pinta por quadro | Feito (§7.11.1) | L6b |
| Desafio do dia na sua ilha e pedido de morador em cada ilha | Feito | L6c, L6d |
| Desafios em 3D (a Jornada em par 2D e 3D) | Feito: um desafio 3D por posto, como desafio do dia | L7k |
| Publicação separada, Admin do jogo em pacote, CSP sem `unsafe-eval` | Feito (desfaz a A11) | L9 (`97e69030f`) |
| Adulto sem currículo | Feito: os cursos-base saem das etapas | L8 |
| Ponte e Pro pela Jornada | Feito: o seed concede a Ponte no Explorador e o Pro no Gênio | L8 |
| Corrida da Vila: telhados, chaminés e bolo dourado | Feito: o bolo dourado no L7g e a corrida pelos telhados com a arte nova no L11d | L7g, L11d |

**Fica fora:** os cursos-base da Jornada (produção de cursos), a operação da publicação no CDN
(lista em `docs/plans/2026-11-01-arquipelago-publicacao-separada.md`) e a conferência ponta a ponta
em staging (criança envia, a equipe revisa, o cartão mostra).

## 1. Em uma página

O mundo da proposta está praticamente todo construído. Desde 30/10 vieram:

- Lumis em todas as ilhas;
- rotina com o jogo fechado;
- Farol que só acende no final;
- carta e páginas da ficha;
- Nico carteiro;
- peixe com coco;
- dino em casa;
- ondas de cinza nos ninhos;
- jardim do céu;
- fósseis;
- galeria com três versões;
- iglu, segundo andar, terreno e subida do Farol;
- nove segredos com Lumis de luz;
- roupas por amizade;
- venda na feira;
- Python e Pro no jogo com curso exigido;
- medição de tentativas.

Onde está feito, quase sempre está bem feito: regra pura com teste, servidor que confere, moedas à
prova de duplicar, nada se perde.

O que separa o jogo da proposta agora são cinco coisas:

1. **A pedagogia ainda não está à altura dos postos do meio e do alto.**
   - Do Explorador em diante, os quadros 1 a 5 das ilhas não trabalham o que o posto ensina e saem de uns quatro moldes repetidos.
   - O quadro 6 na linguagem do posto copia a lista de critérios da missão do curso.
   - O minijogo de cada ficha (Mira de bolhas, Fase de plataforma, Proteja os ninhos, Jardim que floresce) saiu do Quadro das Cores e virou desafio do dia, e os quadros da sua ilha não dão cor.
   - O projeto autoral da Lenda ainda mede o Faísca.
   - Nenhum desafio usa 3D, e a Jornada é toda em pares 2D e 3D.
2. **Os cursos-base de que o jogo depende ainda não existem.** Do Construtor ao Gênio, os cursos novos da Jornada são rascunhos do seed ✔. O quadro 6 do Recife, do Pico, do Vale e das Nuvens fica em `falta-curso` até eles saírem, então essas ilhas param em 5 de 6 cores. Os blocos do Vale, publicados como estão por decisão (A43), dependem de um curso que, pela Jornada, é Canvas e three.js, não a extensão Jogo 2D.
3. **A ajuda nas dicas ficou ao contrário** ✔. O lote 9e pôs o texto técnico antigo como primeira dica, então o primeiro clique entrega a montagem. A Jornada pede ajuda que diminui.
4. **Alguns finais de experiência não fecham:**
   - A subida por fora do Farol exige o planador sem conferir se a criança o tem ✔.
   - O elo da varanda com a sala do alto é só um botão no resultado ✔.
   - Os Lumis da praia estão à vista desde o primeiro minuto, antes de qualquer captura ✔.
   - O mapa que se revela cobre só 13 m de cada ilha, e o Recife vai a 24 m ✔.
5. **Os documentos de estado e as regras contradizem o código em pontos que convidam a "consertar" no sentido errado.** O excedente do teto é um exemplo; a lista está na seção 6.

## 2. O que está excelente

| Área | Por quê | Onde |
| --- | --- | --- |
| História | Abertura, as oito páginas e a última repetem a ficha. O Farol só acende nos fachos, por uma regra única. A Íris volta só depois do final | `sistemas/abertura.ts`, `sistemas/diario.ts`, `sistemas/final-do-farol.ts`, `mundo/farol.tsx` |
| Cena da subida de posto | Zappy voa, a cor escorre, a ponte se monta tábua por tábua, há travessia. Tem versão com menos movimento e espera a criança sair de casa | `mundo/chegada-da-ponte.ts`, `cena-da-chegada.tsx` |
| Silhuetas | Uma malha, até 3 mil triângulos (2.866 a 2.998), mesma forma da ilha completa; névoa pelo shader. Teste com o GLB real | `tests/silhuetas-das-ilhas.test.ts`, `mundo/pintura-da-ilha.ts` |
| Tempo real sem castigo | Chuva e rotinas dos Lumis rodam com o jogo fechado, com teto. Horta de 4 a 16 horas, colheita especial pelo clima. Ondas de cinza sem dano | `sistemas/jogo-fechado.ts`, `sistemas/ondas-de-cinza.ts` |
| Terceira estrela | O segredo de cada percurso sai da geometria, igual em todas as ilhas, e quem já tinha a estrela continua com ela | `sistemas/percurso.ts` |
| Obra estendida | Depois do C1: o envio fica guardado antes do PUT e a gravação com resposta perdida é reconhecida. No conflito, a obra do aparelho fica para recuperar. O Desfazer confere o andar nos dois sentidos | `estado/obra-estendida.ts`, `estado/construcao.ts` |
| Economia | Uma carteira no Members, teto com uma política só (o excedente espera a semana seguinte), chave por prêmio, pendente quando o Members cai | `members/.../arquipelago-coins.repository.ts`, `servico-dos-*.ts` |
| Aconchego | Comprar nunca tira ponto; o feito por você conta pelas aparências guardadas | `construcao/aconchego.ts` |
| Fim do tempo | Espera a ação acabar (até 30 s) e o servidor continua contando; desafio e caminho para a aula não contam | `sistemas/fim-do-tempo.ts`, `estado/relogios.tsx` |
| Porta única e pele adulta | O contrato `Plataforma` não expõe sessão nem rota; o Kids não baixa a pele adulta | `entrada.tsx`, `contracts/src/plataforma.ts`, `adulto/` |
| Medição dos desafios | A tentativa só conta depois de o executor responder: a falha do sistema não consome tentativa, como a Jornada pede. Há dicas uma a uma, acerto na primeira e reenvios | `servico-dos-desafios.ts` |
| Vila e Bosque refeitos | Seguem as aulas do Corre, Dino! e da Nave, um passo por quadro, conferidos com execução de verdade | `docs/desafios-do-jogo/vila-doce`, `bosque` |

## 3. Mapa da proposta: feito, parcial, falta e diverge

### 3.1 Mundo e história

| Item da proposta | Situação | Observação |
| --- | --- | --- |
| Sua ilha no centro, seis em anel, Farol ao lado da casa | Feito | |
| Ilhas de posto alto maiores ou mais altas | Diverge (§6.28.13) | Vila 12 m e Recife 9 m ficam abaixo do Bosque (14 m). A ordem pela altura não segue o posto |
| Silhueta, ilha média na ponte, ilha completa | Diverge (§6.27, N15) | Duas versões em vez de três |
| Ponte quebrada, barco depois do Recife | Feito | A placa da ponte vem assinada "Íris" (diverge, sem registro) |
| Luneta: morador acenando, bicho correndo, segredo brilhando | Parcial | O morador acena. O bicho é um vulto genérico e o segredo, um octaedro, iguais em toda ilha (`mundo/luneta.tsx:129-146`) |
| Cor por partes e subida de posto | Feito | Depende de publicar e importar (seção 4) |
| Abertura, "só o quarto tem cor" | Feito | A casa ganha cor com a porta nova, a horta com a colheita, o píer com o peixe |
| Íris só pelas páginas até o final | Diverge (§6.27) | Ilustração na abertura e assinatura na placa da ponte |
| Páginas do diário pela ficha | Feito | As oito frases batem, inclusive a do Recife |
| Final: subida pelo Farol com tudo o que aprendeu, facho, volta da Íris | Parcial | Ver seção 5, itens 4 e 5: exige planador sem conferir, e o elo varanda → sala é só um botão no resultado. A porta de baixo leva direto à sala |

### 3.2 As oito ilhas pela ficha

| Ilha | O que falta ou diverge (o resto da ficha está feito) |
| --- | --- |
| Sua ilha (Faísca) | Estrelinha e Búzio (Lumis) fixos na praia desde o começo ✔, contra "o Zappy, a última luz" e "Lumis nascem do Cinza". A chave libera o acabamento do cômodo, não o cômodo (§6.16.2a) |
| Bosque (Construtor) | Uma vaga só de bicho adotado; a ficha diz "adotar mais" |
| Vila Doce (Inventor) | Nada de mundo pendente. O desafio agora é o do Inventor |
| Recife (Explorador) | O mapa que se revela não chega ao navio nem ao labirinto (`sistemas/mapa-da-ilha.ts:19-27` ✔) |
| Pico (Mestre) | Sem baú de segredo (§6.29). O planador, prêmio do Pico, condiciona a subida final sem aviso |
| Vale (Arquiteto) | Feito (ondas de cinza, fósseis, dino em casa, quintal grande) |
| Nuvens (Gênio) | Feito (jardim do céu, florescer, clima, terreno) |
| Farol (Lenda) | Subida e final ainda não fecham (3.1); o projeto autoral está abaixo do posto (seção 4) |

### 3.3 Casa, criação e economia

| Item | Situação | Observação |
| --- | --- | --- |
| Mesmo quarto, nos dois sentidos | Feito, de outro jeito (§6.28.10) | O jogo relê o quarto; editar abre o editor da plataforma por cima do jogo |
| Construir: grade, paredes, portas, corte, fora de casa | Feito | |
| Cabana, iglu, segundo andar, terreno, quintal grande | Feito | Objetos com função só no térreo e móveis de cima só em cômodos (decisão de 31/10; a proposta não detalha) |
| Projeto azul, Pinta e Molda no molde, "criação minha que cabe" | Feito | Pinta no Construtor e Molda no Explorador seguem a proposta do jogo. A Jornada põe outra ordem (seção 6) |
| Galeria com 3 modelos | Feito | 27 aparências. Os objetos da galeria têm de 8 mil a 10 mil triângulos: não violam o teto de 5 mil, que é de objeto criado, mas pesam no celular |
| Geladeira guarda 4 → 12 e conserva | Feito | "Conserva" virou bônus ao comer, sem castigo |
| Uma carteira, teto semanal, função se conquista | Feito | |
| Ordem das fontes (curso > quadro > dia > pedidos/feira > repetido) | Diverge, sem registro | O pedido de morador no Estúdio paga 20 + 10, igual ao quadro e acima do dia (`contracts/src/desafios.ts:53-57` ✔); a proposta o põe como "baixo" |
| Sem caixa surpresa nem sorteio pago | Feito | Regra e teste do A28 (`46ad605e3`) |

### 3.4 Viver, aventura, Lumis e ritmos

| Item | Situação | Observação |
| --- | --- | --- |
| Necessidades como humor bom e visível | Feito | |
| Energia zerada: cochila onde está, acorda em casa | Parcial | Leva para casa com fala, sem o cochilo onde está. A condição não exclui barco, balão, mergulho nem corrida (`estado/relogios.tsx:82-94` ✔); comportamento na tela não conferido |
| Moradores com amizade que libera receitas, roupas e página | Feito | |
| Bichos que seguem, truques, crescem; dino em casa | Feito | Uma vaga de adotado (3.2) |
| Horta em tempo real com clima | Feito | 4 a 16 horas: coerente com "planta hoje, colhe amanhã" |
| Receitas da tabela | Feito | O chocolate quente não "aquece no Pico" (não há frio) |
| Profissões na Vila, feira semanal | Feito | |
| Festas da estação com roupas, receitas, decoração | Diverge | As quatro estão ativas. As roupas de época ficam à venda o ano todo (`members/.../avatar3d-catalog.ts:194` ✔, regras §6.29). A proposta diz "de época, que voltam todo ano", e a dona confirmou em 31/10: só conquistadas na festa, sem compra. Código e regras ainda vendem |
| Percursos com checkpoint, 3 estrelas, fantasma da família | Feito | Todas as ilhas têm percurso |
| Exploração com mapa que se revela | Parcial | O mapa cobre 13 m de terra em todas as ilhas do anel ✔ (Recife visitável até 24 m, Nuvens 19,2 m, Vale 16 m) |
| A noite tem o Cinza: borrões desbotam o que está fora | Parcial | Um disco cinza no chão; não desbota casa, plantas e objetos em volta |
| Brinquedos de ilha: cada um é um minijogo e um jeito de chegar | Parcial | Só o balão tem minijogo (a corrida). Trenó, montaria e barco são só meio de ir (sem registro) |
| Segredos: baús, Lumis raros, páginas extras pelo kit de movimento | Feito | Nove baús, sete Lumis de luz, nove páginas |
| Lumis: família por ilha, jeito próprio, rotina em cartões | Feito | A ordem dos cartões está na seção 4 |
| Os seis ritmos e a sessão de 20 minutos | Feito no código | O bolo de fubá do Bento é sorteado, não garantido no dia; o desafio na feira depende da importação |

### 3.5 Família, adulto e arquitetura

| Item | Situação | Observação |
| --- | --- | --- |
| Cartão: desafios da semana (com ilhas anteriores), tempo livre, voltou ao curso | Feito | "Anteriores" é medido contra a ilha mais nova aberta hoje |
| Cartão: objetos criados por ela, Pinta e Molda | Parcial (A33 em andamento) | Contava desde o começo e por aparência aplicada |
| Limite de 30 min do tempo livre, fim no fim da ação | Feito | |
| Interruptores com padrão restrito (ECA, art. 21) | Feito | Conferidos no servidor e no BFF. O texto novo do A34 tem erro de concordância ("Visitas de irmãos começa ligada") |
| Fotos no Clube com aprovação | Parcial | A rota publica direto se o canal estiver sem pré-moderação e responde `publicada` (`member-shell/src/routes/arquipelago-clube.ts:143` ✔). O texto aos pais promete que a equipe olha antes de cada foto |
| Adulto pelas etapas, sem limite, resumo, visitas, pele | Feito | Risco: se a política adulta do banco não tiver `curriculum`, Python, Ponte e Pro (inclusive o Farol) ficam trancados para adultos. Não conferido no banco |
| Fronteira de importação com teste | Feito (A36) | |
| Porta única, falha contida, liga e desliga, moedas idempotentes | Feito | |
| Publicação separada (manifesto, estável e teste, voltar = trocar manifesto) | Diverge (§6.28, A11) | O jogo vai na imagem do serviço; voltar é reimplantar |
| Admin do jogo como módulo do pacote do jogo | Diverge (A11) | Mora em `packages/admin` |
| CSP própria da página | Parcial (A27) | Agora é própria nas duas comunidades, mas ainda com `unsafe-eval`, `blob:` e quadros do WebContainer para o Pro abrir sobre o jogo |
| Contrato com versão atual e anterior | Parcial (A35) | Os dois lados aceitam [atual, anterior], mas o host entrega a versão dele (`arquipelago-host.tsx:279` ✔). Um jogo v1 com host v2 recusa, e um host v1 com jogo v2 também. Só funciona se o lado novo se adaptar ao antigo. Hoje não se nota, porque só existe a v1 |
| Orçamento de desempenho, modo leve automático | Feito no código | Sem medição em aparelho físico |
| Medição: D1/D7, curso em 24 h, feitos contra comprados, minijogos | Parcial | D1, D7 e o curso em 24 h só no Kids. Satisfação dos pais e permanência não têm fonte nem aparecem como "sem fonte" no Admin |

## 4. Coerência pedagógica por posto

A Jornada pede para cada posto:

- uma pergunta central;
- um par de cursos-base 2D e 3D;
- uma missão em outro contexto;
- Poderes que ampliam o jogo-base;
- ajuda que diminui.

O jogo cumpre a parte de "aprender no curso, aplicar no desafio" de forma desigual:

| Posto e ilha | O que existe | Alinhamento | Publicar | Problemas |
| --- | --- | --- | --- | --- |
| Faísca, sua ilha | 6 quadros Pega-conchas (blocos), 1 pedido de morador (Nico) | **Bom** no conteúdo, **Parcial** na proposta | 6/6 | Os seis quadros não dão cor (§7.11.1). A proposta diz que cada pedido do Quadro pinta um pedaço da ilha, e a ficha deixa horta e píer cinzas; hoje eles ganham cor pela colheita e pelo peixe. O quadro 6 pede um Se dentro do outro para três informações, que é o Poder opcional "Duas peças para abrir". Não há desafio do dia na Faísca. O pedido do Nico dita a solução |
| Construtor, Bosque | Quadros 1 a 5: chuva de pinhas (grupos, relógio, encontro, vidas, fim e recomeço). Quadro 6: corrida dos bichos | **Bom** (1 a 5), **Parcial** (6) | 6/6, dia 2/3 | O quadro 6 repete uma regra quatro vezes e confere só presença de blocos; a primeira dica dita tudo |
| Inventor, Vila Doce | 6 quadros, um por aula do Corre, Dino! (pulo, relógio, recomeçar, área justa, sorteio com limite, teto) | **Bom** na Jornada, **Parcial** na proposta | 6/6, dia 3/3 | O exemplo da proposta são telhados, chaminés e um extra de bolo dourado que vale o dobro. Hoje é a rua com pedras e a arte do Corre, Dino!, sem o bolo dourado (N09, lote 9a); só a receita de brigadeiro do extra segue a proposta. O tema e os critérios são a própria missão "O Entregador da Tempestade". Vem da ficha da proposta, mas fere "missão e desafio são conteúdos diferentes". "Pombos na praça" usa o abaixar, que é Poder |
| Explorador, Recife | Quadros 1 a 5 em blocos (alternar, capacidade, marca, uma bolha por vez, chave). Quadro 6 em Python (Pygame Zero). 4 do dia em blocos | **Parcial** | 6/6, dia 4/4 | O minijogo da ficha, "Mira de bolhas", deixou de ser quadro e virou desafio do dia ✔ (A2). Os quadros 1 a 5 não tocam em clique, sorteio, tempo nem Python. O quadro 6 acerta o posto, mas os objetivos são a missão "Resgate dos Vagalumes" quase item por item, com o enunciado ditando função por função. Desafios do dia são "troque um número", com o número na dica |
| Mestre, Pico | Quadros 1 a 5 em blocos (pulo com apoio, freio, recolher, mochila, passagem). Quadro 6 em Python (fases como dados). 4 do dia (duas fases) | **Parcial** | 6/6, dia 4/4 | "Fase de plataforma", o minijogo da ficha, virou desafio do dia ✔ (A2). Os quadros 1 a 5 não têm funções, listas nem colisão por eixo. O quadro 6 replica a missão "Entrega pelos Telhados" |
| Arquiteto, Vale | Quadros 1 e 2 com lista em blocos, 3 a 5 com marca e estoque, quadro 6 em JavaScript na Ponte | **Diverge** | 6/6, dia 4/4 | "Proteja os ninhos" virou desafio do dia ✔ (A2). O quadro 6 é o melhor encaixe do jogo. Os quadros 1, 2 e os quatro do dia usam blocos do Jogo 2D que nenhum curso ensina; foram publicados como estão (decisão A43). A Jornada descreve o curso do Arquiteto em Canvas e three.js, então essa espera pode não se cumprir, e a barreira C01a seguraria a importação |
| Gênio, Nuvens | Quadros 1 a 4 em blocos (limites, faixa, ocupação, recursos), 5 com lista, 6 no Pro (grade, custo, produção, salvar) | **Bom** na Jornada, **Parcial** na proposta | 6/6, dia 4/4 | "Jardim que floresce" virou desafio do dia ✔ (A2). O quadro 5 pede blocos que nenhum curso ensina (A43). O Pro replica a missão "A Base da Lua". O Pro é TypeScript; a Jornada fala em JavaScript. O quadro 5 espera curso |
| Lenda, Farol | 4 projetos autorais: blocos, Python, Ponte e Pro | **Abaixo do posto** | 4/4 | Os critérios continuam os do Faísca (andar, encontro, lembrar, decidir, recomeçar), com o cenário fixo no Python e no Pro. Falta o que a Lenda pede: escolher a Maestria, objetivo e três funcionalidades, teste com outra pessoa, versão 2 e revisão humana |

Padrão transversal: os 20 quadros de retomada do Recife, do Pico, do Vale e das Nuvens saem de
uns quatro moldes repetidos (`docs/desafios-do-jogo/quadros-compartilhados.ts`): marca e contador,
uma vez só, duas condições, capacidade. Exemplos: "Uma bolha por vez" é igual a "Uma onda por vez",
e "Dois corais" é igual a "Floco recolhido" e a "Canteiros". A criança sente que repete, e o posto
não aparece.

Regras da proposta para os desafios:

| Regra | Situação |
| --- | --- |
| O minijogo da ficha é um quadro do Quadro das Cores e depois vira atração | Diverge (A2): do Recife às Nuvens, o minijogo da ficha virou desafio do dia ✔, e o quadro 6 na linguagem do posto não tem atração |
| Montado no Admin | Parcial: Python, Ponte e Pro só entram por manifesto |
| Três tipos (Quadro, do dia, dos moradores) | Parcial: um único pedido de morador (o Nico); nenhum desafio do dia na sua ilha |
| Só blocos já conquistados | Diverge (A43): Vale e Nuvens pedem publicação com blocos que nenhum curso ensina. Na hora de jogar, o bloqueio por "faltam blocos" continua. O apoio pronto pode trazer blocos não aprendidos |
| Python e Pro só depois do curso | Feito (`falta-curso`). No Farol não restringe nada, porque a Lenda já tem todos os cursos-base |
| "Aprenda isso em" | Feito; para Python, Ponte e Pro fica vazio até o curso-base ser publicado |
| A cor é o prêmio principal, a moeda é extra | Feito, menos na sua ilha, onde os quadros não dão cor. A receita do extra só existe na Vila |
| O minijogo aprovado vira atração | Parcial: os quadros 6 em Python, Ponte e Pro não têm atração |
| O jogo nunca trava a aula; o posto vem só dos cursos | Feito |

## 5. Ajustes e melhorias, por prioridade

### Alto impacto

1. **Cursos-base da Jornada.** Produzir pelo menos os cursos-base 2D do Explorador ao Gênio (Acerte o Alvo, Mina das Portas, Guardiões do Cristal, Ilha que Floresce). Sem eles, os quadros 6 ficam em `falta-curso`, e a cor dessas ilhas para em 5/6.
   - É trabalho de conteúdo da plataforma, fora do jogo.
   - Se a política Kids publicada já usa o currículo novo, também confirmar que ninguém fica parado no Construtor por falta da Patrulha Espacial.
2. **O minijogo da ficha de volta ao Quadro das Cores** nas quatro ilhas do anel (Mira de bolhas, Fase de plataforma, Proteja os ninhos, Jardim que floresce), dando cor e virando atração, como a proposta descreve. Hoje são desafios do dia (A2). O quadro na linguagem do posto pode continuar, mas o minijogo da ficha é o que a proposta põe no Quadro.
3. **Vale e Nuvens.** Decidir se o curso do Arquiteto vai ensinar os blocos do Jogo 2D que os quadros 1 e 2 e os quatro do dia usam. Pela Jornada, não vai. Se não for, refazer esses desafios com o que a trilha ensina.
4. **Quadros 1 a 5 do Explorador ao Gênio com o conteúdo do posto.** Em vez dos quatro moldes:
   - clique, sorteio e tempo no Recife;
   - funções, listas e fases no Pico;
   - ondas, alcance e seleção de alvo no Vale;
   - grade e persistência nas Nuvens.

   Podem ficar em blocos, mas com a ideia do posto.
5. **Dicas na ordem da Jornada.** O texto técnico antigo deve sair da primeira dica e ir para a última: lembrar o objetivo, depois pista de raciocínio, depois estrutura e, por último, a montagem. Fonte: `docs/desafios-do-jogo/pedidos-dos-moradores.ts:4` e `:122`.
6. **Subida do Farol:**
   - conferir o planador antes da largada, com uma fala que mande ao Pico se faltar;
   - pôr o ponto de entrada na varanda, para a sala do alto não depender do botão do resultado;
   - focar "Entrar na sala do alto" no resultado (hoje o foco vai para "Continuar", `interface/hud.tsx:760-763`).
7. **Projeto autoral da Lenda.**
   - Critérios do posto 8: objetivo e funcionalidades escolhidas, uma variação, teste e versão 2.
   - Cenário aberto nas quatro linguagens.
   - Ligação com a Maestria escolhida.

### Médio impacto

8. **Quadro 6 sem copiar a missão do curso.** Outros critérios no mesmo conceito, para a missão continuar sendo a prova de transferência (Recife, Pico, Nuvens; Vila pela ficha).
9. **Lumis da praia.** Esconder a Estrelinha e o Búzio até a primeira captura na sua ilha (ou até a primeira noite), como as outras ilhas.
10. **Mapa que se revela com o tamanho de cada ilha** (Recife 24 m, Nuvens 19,2 m, Vale 16 m, o Bosque com a cabana).
11. **Ordem dos cartões dos Lumis.** A proposta diz "repetição no começo, condições e variáveis depois". Hoje os cartões seguem os blocos conquistados (decisão de 27/10), e:
    - o Faísca entrega Se e variável primeiro;
    - nos cursos do repositório, nenhum ensina repetir nem "para cada";
    - o exemplo "para cada canteiro" pode nunca abrir.

    Conferir no banco quais cursos concedem `sz_js_repeat` e `sz_js_for_each`.
12. **Regra causal (`packages/core/src/learning/game-causality.ts`).** Quatro brechas achadas só lendo o código, ainda não executadas:
    - encontro com um desenho que não existe ou um evento que nunca dispara;
    - `Se pontos < 0` com um contador que só sobe;
    - um texto igual ao nome da variável tira a variável das constantes (burla da N3);
    - `x = x` conta como efeito.

    Confirmar com o executor e fechar com negativos.
13. **Roupas de festa.** Decisão da dona (31/10): só conquistadas na festa, sem compra. Hoje as oito peças estão como pagas no catálogo do Members (`members/src/domain/avatar/avatar3d-catalog.ts:194-197`, "fora dela, à venda") e as regras §6.29 dizem "fora da festa, quem quiser compra". Tirar da loja, manter a concessão da festa (A21) e corrigir §6.29.
14. **Pedido de morador** pagando abaixo do desafio do dia, como fonte "baixa".
15. **Fotos no Clube.** Recusar canal sem pré-moderação, para a promessa aos pais não depender da configuração do hub.
16. **Contrato com versão (A35).** O lado novo entrega ao antigo a porta da versão antiga.
17. **Implantação do lote 8.** O relatório de medição é estrito (`contracts/src/medicao.ts:31`): subir o Admin antes da API, ou aceitar campo novo.
18. **Salvamento a ~180 bytes do teto** (estimativa depois da cocada). Qualquer campo novo pede documento próprio.
19. **Brinquedos de ilha.** Meta, tempo ou estrela no trenó, na montaria e no barco, como a corrida de balão.
20. **Borrões que desbotam o que está em volta** (saturação local, como a da sua ilha), não só o disco no chão.

### Baixo impacto

21. Cochilo: cochilar onde está e não disparar em barco, balão, mergulho nem corrida.
22. Mais de um bicho adotado.
23. Luneta com o bicho e o segredo da ilha.
24. Placa da ponte sem assinatura da Íris.
25. Concordância do texto do A34.
26. A visita de irmão não mostra o andar de cima nem o terreno moldado (sem registro).
27. Código morto `terrenoComAObra` (`sistemas/construcao/terreno.ts:150`).
28. Medição: satisfação dos pais e permanência, pelo menos como "sem fonte".

## 6. Incoerências

### Entre as duas propostas (decisão da dona)

- **Pinta e Molda.** O jogo segue a proposta do Arquipélago: Pinta no Construtor, Molda no Explorador. A Jornada põe o primeiro desenho no Pinta como extra do Faísca e a primeira peça no Molda como extra do Construtor.
- **Ponte e Pro.** O seed concede o Pro depois do curso-base do Explorador e a Ponte depois do par do Construtor (`members/.../creator-journey-seed.ts:250-252`). O jogo pede o Arquiteto para a Ponte e o Gênio para o Pro (`POSTO_DA_LINGUAGEM`).
- **3D.** A Jornada faz cada posto em par 2D e 3D; nenhum desafio do jogo usa 3D. A proposta do jogo não exige, mas a transferência que a Jornada mede fica só no 2D.
- **Lumis.** A ordem "repetição antes" da proposta do jogo não combina com o Faísca da Jornada, que ensina condição e memória primeiro (seção 5, item 11).
- **Pro.** A Jornada fala em JavaScript; o desafio do Gênio é TypeScript e Vite.

### Entre o texto do jogo e o comportamento

- Os Lumis da praia contradizem "o Zappy, a última luz" e "nascem do Cinza".
- A fala do começo da subida do Farol cita o planador sem conferir se a criança o tem.
- "Cada foto só aparece depois que a equipe olhar" depende do canal.
- O cartão dos pais conta objetos de forma diferente do que diz (A33 em andamento).

### Documentos que contradizem o código (lote 11, A47)

- **`docs/arquipelago-estado-atual.md`:**
  - V20 (o atual é V22);
  - 54 de 130 entradas (hoje 132, quase todas pedindo publicação);
  - os três defeitos de visitas ainda abertos (corrigidos em `83a9dfbab`);
  - baús sem conteúdo;
  - criação avançada pendente.
- **`docs/arquipelago-regras.md`:**
  - §6.16.2b, o iglu "adiado";
  - linha ~2622, a subida "escondida até B7";
  - linha ~3559, o Nico "não entrega cartas";
  - linha ~4354, o excedente do teto "não se acumula para a semana seguinte", o contrário do código e da §6.28.12;
  - §6.29, as roupas à venda, contra a decisão de 31/10.
- **`packages/arquipelago/CLAUDE.md`:**
  - "Salvamento atual V20";
  - "Resultado de teto é terminal e não acumula dívida".
- **`packages/arquipelago-api/CLAUDE.md:24`:** manda subir "só então o jogo", o que é impossível com o jogo dentro da imagem do serviço.
- **`docs/desafios-do-jogo/conteudo-por-posto.md`:**
  - "resgate dos vagalumes" (108);
  - "`publicar: false`" (114);
  - "Vale em texto sem pedido" (138).
- **Sem registro:** o caminho direto pela "escada de dentro", alternativa à subida por fora.

## 7. O que este levantamento não verificou

- Nada foi executado: testes, tipagem, executor, navegador e aparelho. Os números de triângulos e alturas vêm dos testes de aceite, lidos e não rodados.
- Quais políticas da jornada (Kids e adulta) e quais cursos estão publicados no banco, e com que blocos. Isso decide os itens 1, 3 e 11 da seção 5 e o risco do adulto.
- A configuração de pré-moderação do canal do Clube.
- A folga exata do salvamento depois da cocada (o valor da seção 5 é uma estimativa).
- Se o cochilo funciona bem nos modos de movimento, e a cena da chegada, a subida e a luneta na tela.
- As quatro brechas da regra causal no executor real.
- A importação e a publicação remota dos desafios.
