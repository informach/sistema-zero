# Construtor — projetos para importar e aprovar

**24/11/2026 · protótipos dos cursos base · jogos para revisão de Helena**

Este pacote contém **seis projetos**: três combinações visuais do jogo 2D completo, um inicial 2D, um jogo 3D completo e um inicial 3D. Os arquivos `.szproject.json` são JSONs nativos do Estúdio, com blocos editáveis, código gerado e materiais incorporados.

No 2D e no 3D, a arte vem do Blender ([docs/design/construtor-espaco-blender](../../../design/construtor-espaco-blender/README.md)), com quatro variações de cada elemento. No 2D as imagens vão embutidas; no 3D os projetos levam referências da biblioteca de modelos dos cursos.

## Comece pelos dois jogos completos

| Dimensão | Arquivo principal |
| --- | --- |
| 2D — Nave Contra Asteroides | [nave-2d-completo.szproject.json](2d/nave-2d-completo.szproject.json) |
| 3D — Patrulha Espacial | [patrulha-espacial-3d-completo.szproject.json](3d/patrulha-espacial-3d-completo.szproject.json) |

No Estúdio, abra **Meus Jogos → Importar** e selecione o arquivo `.szproject.json`. O conteúdo é um projeto inteiro; não cole o JSON no editor de JavaScript. Se estiver usando o ZIP, extraia os arquivos primeiro. O perfil usado na revisão precisa ter acesso à extensão Jogo 2D ou Jogo 3D correspondente.

## Todos os arquivos importáveis

| Arquivo | Finalidade |
| --- | --- |
| [nave-2d-completo.szproject.json](2d/nave-2d-completo.szproject.json) | 2D completo: Falcão azul, Aurora, Rocha lunar, laser ciano |
| [nave-2d-orbita.szproject.json](2d/nave-2d-orbita.szproject.json) | Mesmo jogo: Exploradora coral, Órbita, Gelo azul, laser dourado |
| [nave-2d-nebulosa.szproject.json](2d/nave-2d-nebulosa.szproject.json) | Mesmo jogo: Arraia lilás, Nebulosa, Cristal violeta, laser lilás |
| [nave-2d-inicial.szproject.json](2d/nave-2d-inicial.szproject.json) | Inicial 2D: cenário, nave parada e fluxo de telas preparado |
| [patrulha-espacial-3d-completo.szproject.json](3d/patrulha-espacial-3d-completo.szproject.json) | 3D completo, com as 16 peças do Blender (referências da biblioteca de modelos) |
| [patrulha-espacial-3d-inicial.szproject.json](3d/patrulha-espacial-3d-inicial.szproject.json) | Inicial 3D: nave pilotável, apoios e fluxo de telas preparados |

### Fronteira pedagógica aprovada

**Começo, telas de resultado, controle do estado da partida, Enter e reinício vêm preparados nos projetos iniciais.** No Construtor, a criança concentra sua autoria nas regras do jogo e nas condições que pedem vitória ou derrota. A construção integral das telas e do fluxo entre elas fica para o Inventor.

Os iniciais foram ajustados a essa decisão. Continuam intencionalmente incompletos: não criam tiros ou asteroides, não atribuem pontos ou vidas e não decidem vitória ou derrota. No inicial 2D, a nave ainda está parada. No inicial 3D, o movimento lateral já vem como apoio. As condições de fim serão conectadas ao fluxo de apresentação que já existe.

Os quatro jogos completos foram preservados byte a byte; a mudança da fronteira de autoria foi aplicada aos dois iniciais.

## Controles dos jogos completos

- **Enter:** começar.
- **Setas esquerda/direita:** mover a nave.
- **Espaço:** um tiro por aperto.
- **Depois do resultado, no 2D:** Enter retorna à abertura; Enter novamente começa.
- **Depois do resultado, no 3D:** clicar em **Voltar ao início**; Enter começa novamente.

A meta é 20 acertos, com três vidas. Cada acerto conta uma vez. Somente batidas na nave tiram vida; asteroides que passam são retirados sem dano. Vidas, pontos, objetos, relógios e posição voltam ao começo em uma nova partida.

## Personalização exclusivamente visual

### 2D: dezesseis imagens e 256 combinações

Cada projeto 2D contém quatro naves, quatro cenários, quatro asteroides e quatro lasers: **4 × 4 × 4 × 4 = 256 combinações**. Naves, asteroides e lasers são vetores projetados dos modelos 3D (`svg2d.py`); os fundos são os próprios cenários 3D vistos pela câmera do jogo, em WebP (`previa.mjs fundos2d`). As escolhas mudam só a imagem: tamanho de desenho, área de contato e regras continuam iguais. O [catálogo](2d/catalogo-aparencias-2d.png) mostra as dezesseis.

### 3D: quatro modelos para cada objeto

Cenário, nave, asteroide e laser têm quatro modelos cada, feitos no Blender. Cada objeto usa um bloco nativo **Criar o objeto … com o modelo …**, e a troca acontece no seletor do bloco. Os modelos de uma categoria têm a mesma caixa (marcos de 1 mm nos cantos), então trocar não muda tamanho, centro nem área de toque. A frente da nave aponta para -Z, e o tiro nasce logo à frente do bico.

## O que foi verificado

- **Seis arquivos** aprovados pelo sanitizador oficial de projetos salvos do Estúdio, preservando código, IR, blocos, materiais e extensões.
- **Seis arquivos** carregados no Blockly real, com os campos oficiais, e convertidos novamente para o mesmo código.
- Programas inteiramente representados por blocos editáveis, sem blocos de JavaScript cru.
- Comparação dos três completos 2D confirmando mudanças apenas nas quatro escolhas visuais.
- Vinte verificações funcionais na versão anterior 2D, cujos três jogos completos foram preservados; oito verificações focadas adicionais para o inicial 2D atualizado; 13 grupos de verificações para os projetos 3D atuais. Os ensaios incluem disparo, surgimento, colisão, contagem única, vida, proteção, resultado simultâneo e reinício.
- Três GLBs da galeria carregados pelo leitor assíncrono oficial, com geometria real, sem recurso a formas de reserva; cópias e reinício também conferidos.
- Preservação dos quatro jogos completos por hash durante a revisão dos projetos iniciais.

Os testes executaram o motor oficial e o código gerado. No 2D houve desenho Canvas2D real; no 3D, DOM, geometrias Three.js e carregamento GLB reais, com o desenho WebGL substituído no teste. A importação pela interface completa, a renderização WebGL no navegador e a sensação de jogo ainda precisam da revisão no Estúdio. Os relatórios e hashes dos seis projetos estão em [validacao/](validacao/).

Nos iniciais, os testes acionaram vitória e derrota externamente para conferir as telas prontas e o retorno ao começo. Esses estímulos existem somente no ambiente de teste; os projetos iniciais continuam sem as condições de resultado que serão construídas nas aulas.

## Reprodução no repositório

As fontes autorais acompanham os projetos em `fontes/`. A reprodução exige o repositório completo e suas dependências instaladas. A partir da raiz do monorepo:

```bash
node docs/aulas-interativas/construtor/prototipos-base/fontes/2d/prepare.mjs
python3 docs/aulas-interativas/construtor/prototipos-base/fontes/3d/generate-sources.py
bun docs/aulas-interativas/construtor/prototipos-base/fontes/exportar-projetos.ts
```

No Windows, o comando do Python 3 pode ser `python` em vez de `python3`, conforme a instalação. As fontes são gravadas explicitamente em UTF-8, inclusive quando o modo UTF-8 do Python está desligado.

Os dois primeiros comandos preparam os programas intermediários; o último usa os conversores e a fábrica oficiais do Estúdio para atualizar os seis `.szproject.json`. Os GLBs já estão incorporados em `fontes/3d/assets.json`; não é preciso regenerá-los para exportar os projetos.

Para reproduzir também a conversão dos modelos existentes da galeria, há um comando opcional, executado antes dos anteriores:

```bash
node docs/aulas-interativas/construtor/prototipos-base/fontes/3d/export-gallery-models.mjs
```

Esse script resolve Three.js pelas dependências do pacote do Estúdio, verifica o hash da fonte de origem e atualiza `fontes/3d/assets.json`, o registro de origem e `3d/modelos/`. Não cria novas artes para o curso.

Uma nova geração exige renovar a verificação antes de substituir a versão revisada. Os relatórios incluídos correspondem aos hashes registrados nesta entrega.

Referência do código estudado e testado: `informach/sistema-zero`, `staging`, commit `9ca0696aef5a536846525704b9d01261e2bd0da7`. Planejamento e revisão: [PR #287](https://github.com/informach/sistema-zero/pull/287).
