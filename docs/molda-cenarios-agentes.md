# Oficina de cenários para agentes (Molda › Cenários)

Este guia é para quem programa um agente (MCP ou linha de comando) que monta cenários 3D na
oficina do Molda. O agente faz o mesmo caminho da mão: as mesmas regras, o mesmo histórico de
desfazer e as mesmas peças do relevo. Não precisa de aba aberta.

O pacote é `packages/molda-cenarios-agente`. As ferramentas são as mesmas no MCP
(`bun run mcp`) e no CLI (`bun run cli <ferramenta> '<JSON>'`); a lista completa sai em
`bun run cli ajuda` ou no `tools/list` do MCP.

## Acesso

O agente fala com o servidor do app que serve a oficina (o mesmo `/api/cenarios` do navegador),
com um token de acesso no cabeçalho `Authorization`. Nada de segredo em arquivo do repositório.

| Variável | Para quê |
|---|---|
| `MOLDA_CENARIOS_APP` | Endereço do app (para a equipe, o da comunidade adulta). Obrigatório. |
| `MOLDA_CENARIOS_TOKEN` | Um token de acesso já emitido (vale pouco tempo). |
| `MOLDA_CENARIOS_GATEWAY`, `MOLDA_CENARIOS_EMAIL`, `MOLDA_CENARIOS_SENHA` | Ou entrar com uma conta da equipe: o agente entra e renova sozinho. |
| `MOLDA_CENARIOS_CHROMIUM` | Opcional: caminho do Chrome para a captura sem janela. |

A conta precisa ser da equipe, na própria conta (fora de um perfil de criança), enquanto a
oficina estiver no modo `equipe`.

## Unidades e eixos

- Tudo em **metros**. `x` e `z` são o chão; `y` é a altura.
- Giros em **radianos** em volta do eixo vertical.
- O mar fica no nível `0` quando há mar.

## Revisão e desfazer

- Cada comando de intenção vira **um lote**, ou seja, **um passo de desfazer** na oficina.
- Passe `revisaoEsperada` (a revisão que você leu por último) para não gravar por cima de outra
  pessoa: se o cenário mudou, nada é gravado e a resposta traz `revisaoAtual`.
- `operacaoId` (8 a 80 letras, números, `-` ou `_`): repetir o mesmo id depois de uma resposta
  perdida não aplica duas vezes.
- `desfazer` e `refazer` são os mesmos botões da oficina.
- Com a oficina aberta no mesmo cenário (aba à vista), ela abre sozinha a versão que o agente
  guardou, em até uns 4 segundos (edição ao vivo).

## Ferramentas

Organização e leitura: `listar_espacos`, `listar_bibliotecas`, `buscar_modelos`,
`buscar_modelos_no_espaco`, `listar_conjuntos`, `listar_mundos`, `criar_mundo`,
`ligar_bibliotecas`, `listar_cenarios`, `criar_cenario`, `ler_cenario`, `duplicar_cenario`,
`editar_cenario` (lote cru de comandos do documento).

Intenções (um passo de desfazer cada):

| Ferramenta | O que faz |
|---|---|
| `gerar_terreno` | Relevo inteiro por receita: `ilha` (altura acima do mar), `colinas`, `vale`, `plano`... Cria o relevo se ainda não houver. |
| `esculpir_terreno` | Passa uma ferramenta pelos pontos: `elevar`, `abaixar` (`metros`), `aplainar`, `suavizar`, `nivelar` (`altura`), `plato`, `rampa`, `ruido`, `erosao`, `morro`, `cratera`, `furar`, `fechar`. `raio` e `forca` controlam o pincel. |
| `pintar_chao` | Pinta com uma camada de solo (criada se não existir, até oito). |
| `encher_agua` | `mar`, `lago` (enche a bacia a partir de um ponto, até o `nivel`), `rio` (cava o leito), `represa`, `cachoeira`. |
| `tracar_caminho` | `trilha`, `praca`, `estrada`, `cerca`, `muro`, `ponte` (dois pontos). Trilha, praça e estrada moldam o relevo por baixo. |
| `colocar_modelo` | Põe um modelo da biblioteca em `(x, z)`, pisando no chão. |
| `montar_conjunto` | Monta um conjunto da biblioteca, na versão publicada dele. |
| `espalhar` | Espalha modelos numa área redonda, sem encostar nos objetos e fora da água. `densidade` é quantos por 100 m². |
| `alinhar_ao_chao` | Faz objetos pisarem no relevo. |
| `desfazer`, `refazer` | O histórico da oficina. |

Consultas (não gravam nada): `consultar_pontos` (há chão? altura? água?), `consultar_regiao`
(o que existe num retângulo), `conferir_implantacao` (objetos mal assentados e campos do jogo),
`validar_lote` (passaria no servidor?), `orcamento` (objetos, triângulos e bytes contra os tetos
de cada destino) e `capturar_cenario` (foto).

### Conferir a implantação

`conferir_implantacao` (`cenarioId`) lê o cenário e o relevo guardado e aponta, objeto por objeto:

| Tipo | Quando |
|---|---|
| `flutuando` | Um canto da base fica mais de 15 cm acima do chão. Só para quem pisa no relevo: apoio em outro objeto, na água ou absoluto fica de fora. |
| `enterrado` | Mais de 30% da altura abaixo do chão, no centro da base. Com `arquipelago.enterrada`, o limite passa a ser a parte marcada mais 10%. |
| `solido-no-caminho` | Objeto com colisão invade a faixa de uma trilha, praça, estrada ou ponte, entre 10 cm e 2 m acima do piso. Cerca e muro não contam; peças com `arquipelago.fisica` `ponte`, `escada` ou `solo` também não (fazem parte do piso). O tronco (`tronco`) conta pelo cilindro do jogo, não pela copa. |
| `quase-no-mesmo-plano` | Peça com menos de 6 cm de altura cujo topo fica a até 2 cm do chão, do piso de um caminho ou da água: pode piscar. |
| `ator-repetido`, `ator-invalido`, `placa-incompleta`, `fisica-invalida`, `raio-do-tronco-invalido`, `enterrada-invalida`, `fundacao-invalida` | Campos `arquipelago.*` que o jogo recusaria ao abrir o cenário (o campo vai em `campo`). |
| `transformacao-do-papel` | A Íris, o tronco ou a fundação inclinados, ou com escala que o jogo não aceita. |

A resposta traz `total`, `mostrados` e `grupos` (`tipo`, `quantidade` e até 50 exemplos no
total, repartidos entre os tipos). A faixa dos caminhos é medida em trechos retos da curva já
suavizada: as esquinas ficam arredondadas. Peças de conjuntos entram com o id da peça e o
`conjunto` de onde vieram.

### Captura

- `modo: "sem-janela"` (padrão): um Chrome local, sem tela, monta o palco da oficina e devolve a
  foto. Escolha `vista` (`livre`, `cima`, `frente`, `lado`) e, se quiser, `enquadrar` alguns ids.
  Precisa do Chrome neste computador.
- `modo: "oficina"`: espera a oficina aberta no cenário (aba à vista) abrir a versão atual e
  fotografá-la, com a câmera de quem está nela.

No MCP a foto volta como imagem; no CLI, como arquivo (terceiro argumento).

### Trazer modelos e exportar

As duas usam o Chrome deste computador, sem tela, com o mesmo código da oficina; o envio à
biblioteca e a leitura do cenário continuam pelo token do agente.

- `trazer_modelos`: `bibliotecaId` e `caminhos` (arquivos ou pastas deste computador). Aceita GLB,
  glTF (com os arquivos que ele usa), OBJ, FBX e ZIP. Uma pasta inteira vira a pasta dos modelos
  na biblioteca, como na oficina. Cada modelo é conferido, medido e fotografado; volta a lista
  `trazidos` (id, nome, digest, triângulos e medidas em metros) e a lista `recusados`, com o
  motivo de cada arquivo que não serviu. Até 5.000 arquivos e 512 MB por vez.
- `exportar_cenario`: `destino` `three` (ZIP com o carregador three.js e um exemplo), `glb` (um
  arquivo só) ou `raylib` (ZIP para Raylib; sempre junta as peças). `juntar` une as peças
  estáticas por região (`tamanhoDaRegiao`, em metros; o Estúdio usa 128) para desenhar mais
  leve. `saida` é o arquivo ou a pasta onde gravar (sem ela, a pasta atual); um arquivo que já
  existe não é sobrescrito (o novo ganha " (2)"). Volta o caminho gravado, as medidas e os
  avisos. Com `revisaoEsperada` vencida, nada é exportado.

### Jogar no `/macro` o que foi publicado

O jogo integrado ainda não lê cenários publicados: o mundo V2 e as publicações só existem no
`/macro`, o playground local do Arquipélago. Para andar com o personagem de verdade (Rapier) no
que está no ar numa ilha:

```
MOLDA_CENARIOS_APP=... MOLDA_CENARIOS_GATEWAY=... MOLDA_CENARIOS_EMAIL=... MOLDA_CENARIOS_SENHA=... \
  bun packages/molda-cenarios-agente/scripts/levar-publicacao-ao-macro.ts sua-ilha
cd packages/arquipelago && CENARIOS_PUBLICADOS_QA_DIR=<pasta que o script mostrou> bun run dev
```

e abrir `http://127.0.0.1:4520/macro`. O script lê pelas mesmas rotas do jogo (perfil da ilha,
manifesto e arquivos em lote), confere o hash de cada arquivo e grava em
`output/cenarios-reforma/macro-staging` (ou na pasta passada depois da ilha). Rodar de novo só
baixa o que mudou; o perfil só é gravado no fim, com tudo no lugar. Publicar continua pela tela da
oficina.

## Receitas

### Uma ilha com um lago, uma trilha até um farol e árvores em volta

1. `listar_espacos` → pegue o espaço; `listar_bibliotecas` e `buscar_modelos_no_espaco`
   (`busca: "farol"`, depois `busca: "arvore"` com `alturaMin: 3`) para escolher os modelos.
2. `criar_mundo`, `ligar_bibliotecas` (as que têm esses modelos) e `criar_cenario`.
3. `gerar_terreno` com `{ "tipo": "ilha", "altura": 16 }`.
4. Uma bacia para o lago: `esculpir_terreno` com `abaixar` (`raio` 8, `forca` 1, `metros` 4)
   num ponto da encosta. Leia a altura do fundo com `consultar_pontos`.
5. `encher_agua` com `{ "tipo": "lago", "ponto": <o mesmo ponto>, "nivel": <fundo + 1> }`.
   ⚠️ O lago enche a bacia até o nível: num pico, sem bacia, a água cobriria a ilha inteira.
6. `encher_agua` com `{ "tipo": "mar", "nivel": 0 }` para o mar em volta.
7. `colocar_modelo` com o farol perto da costa.
8. `tracar_caminho` com uma `trilha` de pontos que vão de perto do lago até o farol.
9. `espalhar` as árvores com `centro` no meio da ilha, `raio` que cubra a ilha e `densidade`
   1 a 2. Elas evitam a água e os objetos que já existem.
10. `capturar_cenario` para conferir, e `orcamento` para saber em quais destinos o cenário cabe.
11. `exportar_cenario` com o destino que você quer (por exemplo `glb`), se for usar fora da
    plataforma.

Sem um farol na biblioteca? Traga um do computador antes do passo 7: `trazer_modelos` com a
biblioteca do mundo e o caminho do arquivo, e use o `id` e o `digest` que voltarem.

Cada passo é um desfazer: se algo ficou ruim, `desfazer` e refaça com outros números.

### Um vilarejo num platô

`esculpir_terreno` com `plato` (`altura` desejada) numa área, `tracar_caminho` com uma `praca`
(pontos do contorno), `colocar_modelo` para as casas em volta e `espalhar` flores fora da praça.

## Limites

- Até 2.000 objetos espalhados por passada e o teto de objetos do documento.
- O `orcamento` é uma estimativa a partir dos dados de cada modelo: a exportação junta peças e
  comprime, então o pacote final costuma ficar menor.
- Biblioteca de licença restrita (o acervo da equipe) não sai do espaço da equipe.
