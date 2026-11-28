# Inimigo que atira

Poder 3 do posto Construtor(a), em duas aulas: a Aula 1 em 2D, sobre a Nave Contra Asteroides, e a
Aula 2 em 3D, sobre a Patrulha Espacial. Curso reservado pelo seed da Jornada:
`jornada-construtor-poder-3` (adulto: `jornada-construtor-poder-3-adulto`), com as aulas `aula-1` e
`aula-2` já reservadas. Autoria local completa em 28/11/2026; mídia, importação e publicação
pendentes.

Um inimigo com tiros próprios. Uma nave inimiga patrulha o alto da tela (no 3D, lá na frente) e,
a cada 1,5 segundo, cria um tiro no grupo `tirosInimigos`. O tiro nasce na posição da inimiga
(2D: o centro x e a posição y dela; 3D: a posição x), o que encosta na nave sai e tira uma vida, e
quem sai da tela sai do grupo. Uma partida nova começa sem tiros (o reinício recria o jogo).

## O Poder (no molde dos Poderes do Faísca)

- **Aulas:** a Aula 1 tem abertura, o Passo a passo, a experiência `enemy-fire`, três construções e
  o envio na quarta, e o quiz (quatro perguntas, três com cena). A Aula 2 tem abertura, três
  construções, o envio na quarta e o quiz (duas perguntas, uma com cena).
- **Etapas:** `tiro` (o relógio, só na partida), `origem` (o tiro sai da inimiga), `dano` (o
  encontro com a nave) e `limpeza` (quem sai da tela sai do grupo, que envia o projeto).
- **Preparado:** o jogo final da trilha, a inimiga e a patrulha dela, o grupo `tirosInimigos`, o
  desenho e o movimento dos tiros.
- **Verificação:** ver [proposta.md](proposta.md).

## Arquivos

Os mesmos do [Escudo temporário](../poder-escudo-temporario/README.md), com o prefixo `inimigo`.
A arte (as quatro naves inimigas e os quatro tiros) está em
[docs/design/construtor-poderes-blender](../../../design/construtor-poderes-blender/README.md).

## Regerar

```sh
SZ_CHECK_CHROMIUM=<chromium> bun docs/aulas-interativas-tecnico/qa/gerar-inimigo.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capa.ts inimigo
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/montar-caderno.ts inimigo
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py inimigo --paginate
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capas-das-aulas.ts inimigo
bun test docs/aulas-interativas-tecnico/qa/inimigo.test.ts
bun docs/aulas-interativas-tecnico/qa/poderes-objetivos-navegador.ts inimigo <2d|3d> [etapa] [correto|sem-guarda|sem-limpeza|sem-retirada]
bun test packages/members/tests/integration/inimigo-poder-import.test.ts
```

## Importar e publicar

⚠️ **Antes de importar:** o members, o Kids e o Admin precisam estar com a cena `enemy-fire` e as
cenas de previsão do quiz (`inimigo-meio`, `inimigo-segue`, `inimigo-acerta` e `inimigo-limpeza`)
no ar.

Importar nas aulas `aula-1` e `aula-2` já reservadas, no modo preservar. Para o adulto, só trocar
o vínculo para `jornada-construtor-poder-3-adulto`. Anexar o PDF do caderno na Parte 2 da Aula 1,
marcado como caderno do aluno para o Zappy. Produzir e anexar a mídia real antes de publicar.
Existência destes arquivos não comprova publicação.
