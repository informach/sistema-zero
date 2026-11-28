# Tiro triplo

Poder 2 do posto Construtor(a), em duas aulas: a Aula 1 em 2D, sobre a Nave Contra Asteroides, e a
Aula 2 em 3D, sobre a Patrulha Espacial. Curso reservado pelo seed da Jornada:
`jornada-construtor-poder-2` (adulto: `jornada-construtor-poder-2-adulto`). Só a `aula-1` vem
reservada: a `aula-2` é criada no Admin, no mesmo curso, antes da importação. Autoria local completa
em 28/11/2026; mídia, importação e publicação pendentes.

Vários projéteis com trajetórias diferentes. A cada 4 segundos cai um item de tiro triplo (no 2D
pelo meio, no 3D pela esquerda). Pegar o item põe 5 em `tempoTriplo`; o Espaço pergunta se ele é
maior que zero e, se for, cria três lasers, cada um numa direção (2D: vx −2, 0 e 2; 3D: os grupos
`tirosEsquerda`, `tiros` e `tirosDireita`, porque as cópias do Jogo 3D não têm velocidade própria);
um relógio de 1 segundo tira 1 do tempo enquanto ele é maior que zero, e o tiro simples volta.

## O Poder (no molde dos Poderes do Faísca)

- **Aulas:** a Aula 1 tem abertura, o Passo a passo, a experiência `spread-shot`, três construções
  e o envio na quarta, e o quiz (quatro perguntas, três com cena). A Aula 2 tem abertura, três
  construções, o envio na quarta e o quiz (duas perguntas, uma com cena).
- **Etapas:** `item` (o relógio do item e o encontro que liga o triplo), `tres` (o Espaço pergunta
  e cria três lasers, o de sempre no senão), `direcoes` (cada laser para um lado) e `volta` (o
  prazo, que envia o projeto). Montagem guiada completa no vídeo; duplicar um bloco vai em captura
  manual (o robô de gravação não tem marca para esse gesto).
- **Preparado:** o jogo final da trilha, o grupo e o desenho ou molde do item, o movimento e a
  limpeza dos itens, a variável `tempoTriplo` e o placar do Triplo. No 3D, também os grupos
  `tirosEsquerda` e `tirosDireita`, que andam em diagonal e acertam as pedras.
- **Verificação:** ver [proposta.md](proposta.md).

## Arquivos

Os mesmos do [Escudo temporário](../poder-escudo-temporario/README.md), com o prefixo `triplo`.
A arte (os itens, com as quatro molduras) está em
[docs/design/construtor-poderes-blender](../../../design/construtor-poderes-blender/README.md).

## Regerar

```sh
SZ_CHECK_CHROMIUM=<chromium> bun docs/aulas-interativas-tecnico/qa/gerar-triplo.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capa.ts triplo
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/montar-caderno.ts triplo
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py triplo --paginate
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capas-das-aulas.ts triplo
bun test docs/aulas-interativas-tecnico/qa/triplo.test.ts
bun docs/aulas-interativas-tecnico/qa/poderes-objetivos-navegador.ts triplo <2d|3d> [etapa] [correto|sem-guarda|sem-cinco|um-laser-so|sem-contagem|sem-guarda-da-contagem]
bun test packages/members/tests/integration/triplo-poder-import.test.ts
```

## Importar e publicar

⚠️ **Antes de importar:** o members, o Kids e o Admin precisam estar com a cena `spread-shot` e as
cenas de previsão do quiz (`triplo-juntos`, `triplo-leque`, `triplo-um` e `triplo-grupos`) no ar.

Criar a `aula-2` no Admin, no mesmo curso. Importar nas aulas `aula-1` e `aula-2` no modo
preservar. Para o adulto, só trocar o vínculo para `jornada-construtor-poder-2-adulto`. Anexar o PDF
do caderno na Parte 2 da Aula 1, marcado como caderno do aluno para o Zappy. Produzir e anexar a
mídia real antes de publicar. Existência destes arquivos não comprova publicação.
