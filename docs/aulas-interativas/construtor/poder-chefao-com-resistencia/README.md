# Chefão com resistência

Poder 4 do posto Construtor(a), em duas aulas: a Aula 1 em 2D, sobre a Nave Contra Asteroides, e a
Aula 2 em 3D, sobre a Patrulha Espacial. Curso reservado pelo seed da Jornada:
`jornada-construtor-poder-4` (adulto: `jornada-construtor-poder-4-adulto`), com as aulas `aula-1` e
`aula-2` já reservadas. Autoria local completa em 28/11/2026; mídia, importação e publicação
pendentes.

A vida de um inimigo. Um chefão fica no alto da tela (no 3D, lá na frente) e começa com
`vidaDoChefao = 5`, mostrada numa barra (2D) ou no texto "Chefão: N" (3D). Cada laser que acerta
sai do grupo e tira 1; no zero o chefão sai da tela e dá 10 pontos, uma vez só, pela guarda
`chefaoDerrotado`. A etapa `fim` deixa de propósito o prêmio sem guarda, e o placar dispara: a
etapa `uma-vez` conserta.

## O Poder (no molde dos Poderes do Faísca)

- **Aulas:** a Aula 1 tem abertura, o Passo a passo, a experiência `boss-health`, três construções e
  o envio na quarta, e o quiz (quatro perguntas, três com cena). A Aula 2 tem abertura, três
  construções, o envio na quarta e o quiz (duas perguntas, uma com cena).
- **Etapas:** `vida` (a variável e a barra ou o texto), `acerto` (o laser sai e a vida perde 1),
  `fim` (no zero, o chefão sai e dá o prêmio) e `uma-vez` (a guarda, que envia o projeto).
- **Preparado:** o jogo final da trilha e o chefão parado no meio, onde a nave começa.
- **No 3D o acerto é um encontro** (`Quando chefao encostar em algum do grupo tiros`), como os
  itens dos outros Poderes; o fim no zero continua no quadro, que é onde o prêmio sem guarda
  dispara.
- **Verificação:** ver [proposta.md](proposta.md).

## Arquivos

Os mesmos do [Escudo temporário](../poder-escudo-temporario/README.md), com o prefixo `chefao`.
A arte (os quatro chefões) está em
[docs/design/construtor-poderes-blender](../../../design/construtor-poderes-blender/README.md).

## Regerar

```sh
SZ_CHECK_CHROMIUM=<chromium> bun docs/aulas-interativas-tecnico/qa/gerar-chefao.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capa.ts chefao
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/montar-caderno.ts chefao
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py chefao --paginate
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capas-das-aulas.ts chefao
bun test docs/aulas-interativas-tecnico/qa/chefao.test.ts
bun docs/aulas-interativas-tecnico/qa/poderes-objetivos-navegador.ts chefao <2d|3d> [etapa] [correto|sem-retirada|sem-guarda|sem-saida]
bun test packages/members/tests/integration/chefao-poder-import.test.ts
```

## Importar e publicar

⚠️ **Antes de importar:** o members, o Kids e o Admin precisam estar com a cena `boss-health` e as
cenas de previsão do quiz (`chefao-um-tiro`, `chefao-sem-retirada`, `chefao-sem-guarda` e
`chefao-guarda`) no ar.

Importar nas aulas `aula-1` e `aula-2` já reservadas, no modo preservar. Para o adulto, só trocar
o vínculo para `jornada-construtor-poder-4-adulto`. Anexar o PDF do caderno na Parte 2 da Aula 1,
marcado como caderno do aluno para o Zappy. Produzir e anexar a mídia real antes de publicar.
Existência destes arquivos não comprova publicação.
