# Escudo temporário

Poder 1 do posto Construtor(a), em duas aulas: a Aula 1 em 2D, sobre a Nave Contra Asteroides, e a
Aula 2 em 3D, sobre a Patrulha Espacial. Curso reservado pelo seed da Jornada:
`jornada-construtor-poder-1` (adulto: `jornada-construtor-poder-1-adulto`). Só a `aula-1` vem
reservada: a `aula-2` é criada no Admin, no mesmo curso, antes da importação. Autoria local completa
em 28/11/2026; mídia, importação e publicação pendentes.

A nave ganha um escudo com prazo. A cada 4 segundos, um item de escudo cai pelo meio da tela.
Pegar o item põe 5 em `tempoDoEscudo`; na batida de uma pedra, o jogo pergunta se ainda há tempo
(com escudo, a pedra só sai; sem escudo, a nave perde uma vida); e um relógio de 1 segundo tira 1
do tempo enquanto ele é maior que zero, com a nave piscando.

## O Poder (no molde dos Poderes do Faísca)

- **Aulas:** a Aula 1 tem abertura (jogo pronto), o Passo a passo (material), a experiência
  `timed-shield`, três construções e o envio na quarta, e o quiz de fechamento (quatro perguntas,
  três com cena de previsão). A Aula 2 tem abertura, três construções, o envio na quarta e o quiz
  (duas perguntas, uma com cena).
- **Montagem guiada completa no vídeo,** um gesto por vez, com o destino à vista antes da peça.
  As etapas são `item` (o relógio do item, só na partida), `liga` (o encontro com o item),
  `protege` (a batida que pergunta pelo escudo) e `acaba` (o prazo, que envia o projeto).
- **Preparado:** o jogo final do curso da trilha, inteiro, mais o grupo `itensEscudo`, o desenho
  ou o molde do item, o movimento e a limpeza do grupo, a variável `tempoDoEscudo` e o placar do
  Escudo.
- **Verificação:** o Verificar projeto confere no executor de verdade que o item só cai na
  partida, que pegar o item liga o escudo e que o escudo conta para trás e para no zero. Nos
  blocos: o intervalo do item, o 5 posto (não somado) com o item saindo do grupo, o Se da batida
  com o dano só no senão, e a contagem com a guarda e o piscar. Nenhum objetivo depende do
  instante da partida (ver [proposta.md](proposta.md)).
- **Personagens:** a Debinha (Aula 1) e o Dedé (Aula 2) dizem as perguntas das montagens.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `escudo-aula-1.*`, `escudo-aula-2.*` | Manifesto, roteiro, falas para ElevenLabs (professora e personagem), edição e resumo |
| `modulos.md` | Cadastro do curso, módulo e ordem das partes |
| `passo-a-passo.md` e `passo-a-passo-do-projeto.pdf` | O caderno do aluno |
| `escudo-2d[-inicio].szproject.json`, `escudo-3d[-inicio].szproject.json` | Projetos portáteis (o 3D leva os modelos inteiros) |
| `blocos.json` | Os blocos liberados em cada dimensão |
| `zappy-etapas.json` | As falas do Zappy dentro da experiência |
| `capas-das-aulas/` | As capas das partes |
| `capa.jpg` | A capa do curso e do caderno |
| [proposta.md](proposta.md) | O que cada etapa cobra e por quê |

A arte (os itens, com as quatro molduras de cada um) está em
[docs/design/construtor-poderes-blender](../../../design/construtor-poderes-blender/README.md).

## Regerar

```sh
# curso
SZ_CHECK_CHROMIUM=<chromium> bun docs/aulas-interativas-tecnico/qa/gerar-escudo.ts
# caderno e capas
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capa.ts escudo
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/montar-caderno.ts escudo
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py escudo --paginate
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capas-das-aulas.ts escudo
# conferir
bun test docs/aulas-interativas-tecnico/qa/escudo.test.ts
bun docs/aulas-interativas-tecnico/qa/poderes-objetivos-navegador.ts escudo <2d|3d> [etapa] [correto|sem-guarda|sem-retirada|sem-cinco|sem-contagem|sem-guarda-da-contagem]
bun test packages/members/tests/integration/escudo-poder-import.test.ts
```

## Importar e publicar

⚠️ **Antes de importar:** o members, o Kids e o Admin precisam estar com a cena `timed-shield` e as
cenas de previsão do quiz (`escudo-protege`, `escudo-acabou`, `escudo-renova` e
`escudo-sem-guarda`) no ar; sem elas, a importação recusa o manifesto.

Criar a `aula-2` no Admin, no mesmo curso. Importar nas aulas `aula-1` e `aula-2` no modo
preservar, sem recriar o curso nem a `aula-1`. Para o adulto, só trocar o vínculo para
`jornada-construtor-poder-1-adulto` (`manifestoParaDestino`). Anexar o PDF do caderno na Parte 2 da
Aula 1, marcado como caderno do aluno para o Zappy. Produzir e anexar a mídia real antes de
publicar. Existência destes arquivos não comprova publicação.
