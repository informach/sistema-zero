# Ilhas completas, segunda metade (Blender)

Pico Gelado, Vale dos Dinos, Ilha das Nuvens e o alto do Farol, feitos no Blender sem tela (o mesmo
`bpy` do mundo). Cada script grava GLBs em `src/assets/ilhas/`. Bosque, Vila Doce e Recife moram em
`arte/ilhas/`, com as mesmas convenções.

## Rodar

```sh
# tudo, com a conferência do contrato (nós, âncoras, clipes, tetos) e o relatorio.json
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/build_all.py

# um script só (pico.py e nuvens.py aceitam ilha | props | treno | balao no fim)
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/pico.py ilha

# prévias em Cycles numa pasta qualquer (pico vale nuvens alto alto-escada balao)
/tmp/claude-0/blender-venv/bin/python -B arte/ilhas-b/render.py /tmp/previas pico
```

`ILHAS_OUT=/outra/pasta` grava os GLBs em outro lugar.

## Convenções

- **Ajudantes:** `lib_ilhas_b.py` lê o `lib_mundo` (paleta, formas, `_juntar`) e o
  `ilhas_anel.py` (o chão da ilha leve), sem copiar. O `relatorio.json` é próprio desta pasta.
- **Mesmo tamanho da versão leve:** cada ilha usa o mesmo chão da leve, com a mesma semente e o
  mesmo contorno. O tampo é plano em y = 1 até ~12,5 de raio, e a completa troca a leve sem mudar de
  tamanho. A montanha e o vulcão sobem do tampo. Os colisores continuam no código.
- **Referencial:** o centro da ilha, com y = 0 no mar. A Ilha das Nuvens fica num grupo a y = 7 no
  jogo. O alto do Farol é uma sala: o centro fica no meio do piso, com y = 0 no piso.
- **Chegada da ponte:** é o +x de cada ilha. O jogo gira o nó como faz com as leves. O corredor
  x > 5,5 e |z| < 2,5 fica livre na altura do corpo, e `conferir_corredor` reprova o build se
  algo cair ali.
- **Materiais:** o jogo acha cada material pelo nome.
  - Acendem à noite: `lava`, `luz`, `lanterna`, `chama`, `estrela` e os `fio1` a `fio6`, que têm
    um brilho baixo.
  - Transparentes: `janelaFarol`, `lenteFarol`, `gelo` e `geloClaro`.
- **Nomes:** nenhum nó tem o nome de uma âncora (o three.js renomearia para `nome001`), e o build
  confere isso.
- **Faces sobrepostas:** caminhos que se cruzam ficam em alturas um pouco diferentes. Faces no
  mesmo plano piscam no jogo e saem pretas no render.

## Arquivos, nós e âncoras

As âncoras são nós vazios: o jogo lê a posição de cada uma. Todas as ilhas têm `chegada` (na
borda do +x), `morador` e `lumi-1` a `lumi-4`.

| Arquivo | Nós | Âncoras próprias | Clipes | Triângulos | Tamanho |
|---|---|---|---|---|---|
| `pico.glb` | `chao`, `montanha` (com a trilha em espiral), `cenario` | `palco` (no tablado), `iglu` (na porta), `trilha-inicio`, `trilha-fim`, `cume`, `parede-de-gelo` (no pé), `topo-da-parede`, `lago-congelado`, `treno` | | 21.029 | 639 KB |
| `pico-props.glb` | `pinheiro-nevado-a`, `pinheiro-nevado-b`, `bloco-de-gelo`, `boneco-de-neve`, `painel-de-gelo` (base em y = 0) | | | 3.300 | 96 KB |
| `pico-treno.glb` | `treno` (frente para −z do jogo) | | | 668 | 33 KB |
| `vale-dos-dinos.glb` | `chao`, `vulcao`, `lava` (cratera, rios e poças), `cenario` | `observatorio` (na porta), `varanda` (do observatório), `escavacao`, `ninho-1` a `ninho-3`, `cratera`, `pe-do-vulcao` | | 22.500 | 584 KB |
| `vale-dos-dinos-props.glb` | `samambaia-gigante`, `cavalinha`, `ninho`, `ovo-dino`, `osso`, `cranio-fossil` | | | 4.278 | 100 KB |
| `nuvens.glb` | `chao`, `cenario`, `fio-1` a `fio-6`, `plataforma-1` a `plataforma-4` | `tear`, `ninho` (dentro do ninho, no alto da árvore), `pe-da-arvore`, `balao`, `arco-iris`, `topo-plataforma-1` a `-4` | | 19.560 | 471 KB |
| `nuvens-balao.glb` | `balao` (base do cesto em y = 0) | | `flutuar` (3 s, laço) | 848 | 36 KB |
| `alto-do-farol.glb` | `sala`, `escada`, `mesa-da-iris`, `vidros`, `lente` (pivô no centro da lâmpada) | `entrada` (onde a escada chega), `lanterna`, `mesa`, `rascunhos`, `quadro`, `janela`, `varanda` | `girar` (4 s, uma volta, laço) | 14.436 | 479 KB |
| **total** | | | | **86.619** | **2,38 MB** |

### O que o jogo pode ligar

- **Pico:** a trilha é uma rampa que dá 1,25 volta na montanha, do `trilha-inicio` ao `trilha-fim`.
  O colisor dela é do código (a rampa é larga, de ~1,2 m). A parede de gelo tem três painéis em
  degraus, e no alto dela fica o platô do `topo-da-parede`.
- **Vale:** o nó `lava` pode pulsar o brilho, e a fumaça fica no `cenario`. As pegadas de dino vão
  da ponte até o observatório.
- **Nuvens:**
  - cada `fio-N` tem a cor do arco-íris e um material próprio (`fio1` a `fio6`): o jogo pode
    deixá-los cinza e acender um por vez;
  - as plataformas sobem em degraus atrás da ilha (−x, de 2,2 a 7,6 acima do tampo). Os degraus de
    nuvem da beira até a primeira estão no `cenario`;
  - o balão fica amarrado no poste do `balao`.
- **Alto do Farol:**
  - a `lente` gira com `girar`, e a `luz` é a lâmpada;
  - os `vidros` estão separados para o jogo poder trocar a transparência;
  - o vão da escada é um furo de verdade no piso, com o poço descendo 3,2 m.
