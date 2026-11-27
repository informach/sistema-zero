# A Estação de Reciclagem

Missão do posto Construtor(a), em duas aulas: a Aula 1 em 2D e a Aula 2 no galpão em 3D. Curso
reservado pelo seed da Jornada: `jornada-construtor-missao` (adulto: `jornada-construtor-missao-adulto`),
com as aulas `aula-1` e `aula-2`. Autoria local completa em 27/11/2026; mídia, importação e
publicação pendentes.

Uma esteira traz peças recicláveis (aro verde, valem um ponto) e pilhas e lâmpadas (aro vermelho,
tiram uma vida). O jogador move o coletor por baixo de três esteiras, junta a meta antes de perder
as três vidas e, no fim, a equipe pede uma meta nova. É o mesmo jogo da Nave Contra Asteroides e da
Patrulha Espacial com outro tema: tiros e asteroides viram coletor e peças, e relógio, grupos,
encontros, pontos, vidas e estados são reaplicados.

## Missão do posto (no molde do Jardim Secreto)

A missão não ensina o passo a passo: montar o jogo é o desafio para subir de posto, e tudo o que
ele usa já foi ensinado nos cursos da trilha.

- **Aulas:** cada uma tem a abertura com o jogo pronto, quatro etapas e o fim. As etapas são
  `esteira` (os relógios, só na partida), `coleta` (ponto pela reciclável, vida pela proibida),
  `resultado` (derrota e vitória) e `meta-nova` (o pedido da equipe, que envia o projeto).
- **Etapas:** o vídeo roda o projeto do começo da etapa e mostra o que ainda não funciona. As
  animações da edição mostram o que o jogo precisa fazer, e a professora diz em que aula da Nave
  (2D) ou da Patrulha (3D) aquilo foi ensinado. Nenhum bloco é montado nem enviado no vídeo.
- **Preparado:** telas de início, vitória e derrota, Enter e reinício, estado inicial (placar,
  meta e três vidas), o coletor andando para os lados e os dois grupos vazios. No 3D, também o
  galpão, a câmera e o transporte da esteira. A criança programa os relógios, os encontros, os
  dois finais e a meta nova.
- **Verificação:** o Verificar projeto confere pelo que o jogo faz no executor de verdade (nada
  nasce antes do Enter, as peças nascem na partida, a reciclável dá ponto sem disparar o placar,
  a proibida tira vida) e, no que não cabe no tempo do executor, pelos blocos, com os nomes do
  projeto pronto: os intervalos do pedido, a vida que sai uma vez, a derrota, a vitória pela
  variável `meta` e a meta nova. Os objetivos de cada etapa somam os das anteriores.
- **Variante:** a equipe muda a meta (15 no 2D, 12 no 3D) e a criança identifica a condição que
  precisa acompanhar. Com o número escrito na condição, a vitória chega cedo e o Verificar reprova.
- **Sem dicas e sem quiz:** quem tiver dúvida volta na aula do curso da trilha.
- **Passo a passo:** um caderno só, com as duas aulas, na última parte da Aula 1, depois do envio.
  Na publicação, anexar o PDF só na Aula 1, marcado como caderno do aluno para o Zappy.
- **Personagens:** a Debinha (Aula 1) e o Dedé (Aula 2) dizem as frases das tabelas do roteiro.
- **Duas aulas:** cada aula tem seis partes, no tamanho das aulas da Nave. Dividir em mais aulas
  mudaria a lista de aulas do currículo, que entra no hash do seed e nas aulas reservadas.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `aula-1.*`, `aula-2.*` | Manifesto, roteiro, falas para ElevenLabs (professora e personagem), edição e resumo |
| `modulos.md` | Cadastro do curso, módulo e ordem das partes |
| `passo-a-passo.md` e `passo-a-passo-do-projeto.pdf` | O caderno do aluno (28 páginas) |
| `estacao-2d[-inicio].szproject.json`, `estacao-3d[-inicio].szproject.json` | Projetos portáteis (o 3D leva os modelos inteiros) |
| `blocos.json` | Os blocos liberados em cada dimensão |
| `capas-das-aulas/` | As 12 capas das partes |
| `capa.jpg` | A capa do curso e do caderno |
| [proposta.md](proposta.md) | O que cada etapa cobra e onde foi ensinado |

A arte (4 coletores, 4 recicláveis, 4 proibidos e 4 galpões, com o 2D tirado dos mesmos modelos)
está em [docs/design/construtor-estacao-blender](../../../design/construtor-estacao-blender/README.md).

## Regerar

```sh
# arte (só quando os modelos mudam)
ESTACAO_OUT=docs/design/construtor-estacao-blender/out /tmp/claude-0/blender-venv/bin/python -B docs/design/construtor-estacao-blender/build_all.py
ESTACAO_OUT=docs/design/construtor-estacao-blender/out bun docs/aulas-interativas-tecnico/qa/publicar-estacao-modelos.ts
# curso
SZ_CHECK_CHROMIUM=<chromium> bun docs/aulas-interativas-tecnico/qa/gerar-estacao-reciclagem.ts
# caderno, capas
bun docs/aulas-interativas-tecnico/recursos/estacao-reciclagem/gerar-capa.ts
bun docs/aulas-interativas-tecnico/recursos/estacao-reciclagem/montar-caderno.ts
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py estacao-reciclagem --paginate
bun docs/aulas-interativas-tecnico/recursos/estacao-reciclagem/capas-das-aulas/gerar-capas.ts
# conferir
bun test docs/aulas-interativas-tecnico/qa/estacao-reciclagem.test.ts docs/aulas-interativas-tecnico/qa/missao-padrao.test.ts
bun docs/aulas-interativas-tecnico/qa/estacao-objetivos-navegador.ts <2d|3d> [etapa] [correto|sem-guarda|sem-retirada|sem-ponto|sem-dano]
bun docs/aulas-interativas-tecnico/qa/estacao-navegador.ts <pasta-das-fotos>
bun test packages/members/tests/integration/estacao-missao-import.test.ts
```

## Importar e publicar

Importar nas aulas `aula-1` e `aula-2` já reservadas, no modo preservar. Não recriar o curso nem as
aulas. Renomear o módulo reservado "Plano de produção" para **Monte a estação**, preservando o ID.
Para o adulto, só trocar o vínculo para `jornada-construtor-missao-adulto` (`manifestoParaDestino`).
Produzir e anexar a mídia real antes de publicar. Existência destes arquivos não comprova
publicação.
