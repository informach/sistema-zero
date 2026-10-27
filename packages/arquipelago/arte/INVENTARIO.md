# Inventário de arte do Arquipélago Vagalume

Pedido da dona (27/10/2026): **todo** elemento do jogo é modelado no Blender, com capricho e bem
acabado, por script reproduzível nesta pasta (`arte/<grupo>/`), no estilo do avatar, do quarto e do
Zappy (cores chapadas, formas arredondadas, leve para o navegador). Fonte das peças: a proposta no
Canvas (<https://claude.ai/artifact/5eNo1oqsndxmV6MPLxaz1W>) e o código do jogo.

Legenda: ✅ pronto no jogo · 🟡 modelado, falta ligar ao jogo · ⏳ em modelagem · ⬜ a fazer.
Personagens e criaturas são modelados antes do sistema que os usa (moradores, Lumis, festas);
até lá ficam na galeria de modelos do playground.

## Lote 1: a sua ilha (Fase 0)

| Peça | Estado | Observação |
|---|---|---|
| Zappy, o vagalume (voar, parado, cauda que brilha) | ✅ | `arte/zappy` |
| Terreno da ilha central (grama, areia, espuma, tufos, flores, pedras, caminho) | ✅ | mesma conta da física |
| Árvores (variações), arbustos e pedras | ✅ | |
| Casa: paredes, telhado separado, varanda, janelas que acendem, porta nova | ✅ | o quarto é o da plataforma |
| Horta: 6 canteiros, alface, tomate e milho em 3 estágios | ✅ | |
| Bancada com o projeto azul | ✅ | |
| Farol da sua ilha (apagado e aceso, feixe que gira) | ✅ | |
| Píer com boia e barquinho | ✅ | |
| Tábuas, cordas e postes das pontes | ✅ | |
| As 6 ilhas do anel em versão leve (cinza até a cor chegar) | ✅ | |

## Lote 2: personagens

| Peça | Estado | Observação |
|---|---|---|
| Íris, a faroleira (aparece no final e no retrato do diário) | 🟡 | `arte/personagens/iris.py`: peças do avatar no esqueleto dele, boné e lampião; bocas de fala |
| Capi, capivara do Bosque dos Bichos | 🟡 | `arte/personagens`; todos: parado, andar, falar, acenar, feliz; olhos com piscar e feliz |
| Bento, tamanduá confeiteiro da Vila Doce | 🟡 | chapéu, avental e batedor |
| Maré, tartaruga cartógrafa do Recife Coral | 🟡 | óculos, bússola e mapa |
| Floco, pinguim músico do Pico Gelado | 🟡 | cachecol e cavaquinho |
| Jade, coruja dos fósseis e ninhos do Vale dos Dinos | 🟡 | chapéu de safári e lupa |
| Iriê, arara que tece o arco-íris da Ilha das Nuvens | 🟡 | tear com o arco-íris |

## Lote 3: Lumis e o Cinza

| Peça | Estado | Observação |
|---|---|---|
| Borrão de névoa do Cinza (flutuar, ser preso pela lanterna, virar Lumi) | 🟡 | `arte/lumis/borrao.py`: flutuar, fugir, preso, virar |
| Família de Lumis do Bosque (Pitanga e irmãos; comum e raro) | 🟡 | Pitanga e Ipê; cada Lumi: parado, andar, pular, trabalhar, feliz e o material `luz` para a noite (`arte/lumis`) |
| Família da Vila Doce | 🟡 | Quindim e Brigadeiro |
| Família do Recife | 🟡 | Bolha e Pérola |
| Família do Pico | 🟡 | Gelinho e Cristal |
| Família do Vale dos Dinos | 🟡 | Ovinho e Brotinho |
| Família das Nuvens | 🟡 | Algodão e Pluma |

## Lote 4: bichos

| Peça | Estado | Observação |
|---|---|---|
| Bichos do Bosque para adotar (filhote e adulto, truques) | 🟡 | `arte/bichos/adotar.py`: cachorro caramelo, gato frajola, coelho e porquinho-da-índia, filhote e adulto; parado, andar, correr, sentar, feliz e o truque de cada um |
| Bichos de cada ilha (peixes e tartaruguinhas do recife, pinguins, filhotes de dino, pássaros das nuvens) | 🟡 | `arte/bichos`: peixe-palhaço, cirurgião-azul, baiacu e tartaruguinha (nadar); pinguim e filhote (andar, deslizar); rex e tricerátops bebês (andar, pular); pássaro das Nuvens, bem-te-vi e borboleta do Bosque (voar, pousado) |
| Dino de montaria do Vale | 🟡 | `arte/bichos/montaria.py`: parassaurolofo de sela; parado, andar, correr, pular; vazio `sela` no assento |

## Lote 5: itens, comida e coleção

| Peça | Estado | Observação |
|---|---|---|
| Sementes e colheita (alface, tomate, milho e as das outras ilhas) | 🟡 | `arte/itens/colheita.py` e `sementes.py`: 8 colheitas (morango, alga, batata-doce, abóbora, flor de algodão nas outras ilhas) e 8 pacotinhos; ícones do HUD em `src/assets/icones` |
| Comidas: salada, pipoca, pão de queijo, bolo de fubá, brigadeiro, açaí, moqueca, peixe com coco | 🟡 | `arte/itens/comidas.py`, cada uma no seu prato, tigela ou panela |
| Ferramentas na mão: lanterna, regador, pá, rede, vara de pescar | 🟡 | `arte/itens/ferramentas.py`, nó vazio `mao` na pegada; a lanterna acende (`luz`) |
| Chave e carta da chegada, páginas do diário, baús, moedas | 🟡 | `arte/itens/colecao.py`; baú com a `tampa` e o clipe `abrir`, moeda com `girar` |
| Luneta do píer, Quadro das Cores, placas | 🟡 | `arte/itens/lugares.py`; luneta com o `tubo` que gira, quadro com `cor-1` a `cor-6`, três placas com a face `texto` |
| Fogão e utensílios da cozinha da casa | 🟡 | `arte/itens/cozinha.py`: fogão a lenha com o nó `fogo`, panela, frigideira, colher de pau e tábua; móveis do quarto vêm da plataforma |

## Lote 6: as ilhas completas

| Ilha | Estado | Peças |
|---|---|---|
| Bosque dos Bichos | 🟡 | `arte/ilhas/bosque.py`: percurso nas copas (4 deques, pontes de corda, escada em espiral, escorregador), casa na árvore, cabana da Capi, cercadinho, lago, 3 cipós soltos, toras, flores |
| Vila Doce | 🟡 | `arte/ilhas/vila_doce.py`: padaria, sorveteria com terraço, feira de 6 barracas, 3 casinhas de telhado plano (o percurso), fonte de chocolate |
| Recife Coral | 🟡 | `arte/ilhas/recife.py`: corais de 4 tipos, 10 algas que balançam, caverna submarina, cais e `barco.glb` (balançar), casa da Maré, mapas |
| Pico Gelado | 🟡 | `arte/ilhas-b/pico.py`: montanha com a trilha em espiral até o cume, iglu, pinheiros nevados (2), parede de gelo em degraus, lago congelado, palco do Floco; trenó em `pico-treno.glb` |
| Vale dos Dinos | 🟡 | `arte/ilhas-b/vale.py`: vulcão com o nó `lava` (material que acende), escavação com o esqueleto, três ninhos com ovos, samambaias gigantes, cavalinhas, observatório da Jade |
| Ilha das Nuvens | 🟡 | `arte/ilhas-b/nuvens.py`: tear com `fio-1` a `fio-6`, ninho da Iriê na árvore alta, `plataforma-1` a `-4` em degraus; balão com `flutuar` em `nuvens-balao.glb` |
| O alto do Farol (final) | 🟡 | `arte/ilhas-b/alto_do_farol.py`: sala da lanterna com a `lente` que gira (`girar`), escada em caracol, mesa e quadro com os rascunhos da Íris, janelas e varanda |

## Lote 7: movimento, veículos e festas

| Peça | Estado | Observação |
|---|---|---|
| Kit de movimento: cipó, equipamento de mergulho, planador, patins | 🟡 | `arte/festas/movimento.py`: cipó com `pegada` e `balancar`, máscara e pés de pato e patins vestidos no avatar (`cabeca`, `pe-esq`, `pe-dir`), planador com `pegada` e `planar` |
| Veículos: barquinho da chegada, barco entre ilhas, trenó, balão | 🟡 | `arte/festas/veiculos.py`: barquinho com os remos e `remar`, barco com cabine e `balancar`, os dois com `assento`; trenó e balão ficam nas ilhas completas (Lote 6) |
| Carnaval, Festa Junina (bandeirinhas, fogueira, barracas), Noite das Lanternas, fim de ano | 🟡 | `arte/festas`: um arquivo por festa, uma peça por nó (fogueira com `crepitar`, lanterna do lago com `flutuar`, fogos com `estourar`); roupas de época são peças do avatar (plataforma) |
