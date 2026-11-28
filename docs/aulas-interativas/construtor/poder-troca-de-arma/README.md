# Troca de arma

Poder 5 do posto Construtor(a), em duas aulas: a Aula 1 em 2D, sobre a Nave Contra Asteroides, e a
Aula 2 em 3D, sobre a Patrulha Espacial. Curso reservado pelo seed da Jornada:
`jornada-construtor-poder-5` (adulto: `jornada-construtor-poder-5-adulto`), com as aulas `aula-1` e
`aula-2` já reservadas. Autoria local completa em 28/11/2026; mídia, importação e publicação
pendentes.

Um estado de equipamento que muda o disparo. A nave começa com `arma = "laser"`; um item de plasma
cai a cada 4 segundos e, pego, libera a troca (`plasmaLiberado = true`); a tecla E troca a arma
entre "laser" e "plasma", só com o plasma liberado; a placa (2D) ou o texto (3D) mostra a arma; e o
Espaço pergunta a arma: o laser fino e rápido de sempre ou o plasma grande e lento, no grupo
`tirosPlasma`. Uma partida nova volta ao laser (as variáveis nascem de novo em Ao iniciar). A tecla
é o E porque o Jogo 3D não tem X.

## O Poder (no molde dos Poderes do Faísca)

- **Aulas:** a Aula 1 tem abertura, o Passo a passo, a experiência `weapon-swap`, três construções e
  o envio na quarta, e o quiz (quatro perguntas, três com cena). A Aula 2 tem abertura, três
  construções, o envio na quarta e o quiz (duas perguntas, uma com cena).
- **Etapas:** `item` (o relógio e o encontro que libera), `troca` (a tecla E com a guarda),
  `placar` (a arma à vista; no 3D, escrita de novo a cada troca) e `disparo` (o Espaço que pergunta,
  que envia o projeto).
- **Preparado:** o jogo final da trilha, o desenho e o movimento do item, as variáveis `arma` e
  `plasmaLiberado` e o grupo `tirosPlasma`, que anda mais devagar e acerta as pedras.
- **Verificação:** ver [proposta.md](proposta.md).

## Arquivos

Os mesmos do [Escudo temporário](../poder-escudo-temporario/README.md), com o prefixo `arma`. O
desenho do disparo 2D no caderno sai em duas partes (o projeto intermediário `disparo-senao`, com o
então ainda vazio). A arte (os quatro itens de plasma e os quatro plasmas) está em
[docs/design/construtor-poderes-blender](../../../design/construtor-poderes-blender/README.md).

## Regerar

```sh
SZ_CHECK_CHROMIUM=<chromium> bun docs/aulas-interativas-tecnico/qa/gerar-arma.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capa.ts arma
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/montar-caderno.ts arma
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py arma --paginate
bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capas-das-aulas.ts arma
bun test docs/aulas-interativas-tecnico/qa/arma.test.ts
bun docs/aulas-interativas-tecnico/qa/poderes-objetivos-navegador.ts arma <2d|3d> [etapa] [correto|sem-guarda|sem-liberar|troca-sem-guarda|plasma-no-grupo-errado]
bun test packages/members/tests/integration/arma-poder-import.test.ts
```

## Importar e publicar

⚠️ **Antes de importar:** o members, o Kids e o Admin precisam estar com a cena `weapon-swap` e as
cenas de previsão do quiz (`arma-trancada`, `arma-plasma`, `arma-reinicio` e `arma-placar`) no ar.

Importar nas aulas `aula-1` e `aula-2` já reservadas, no modo preservar. Para o adulto, só trocar
o vínculo para `jornada-construtor-poder-5-adulto`. Anexar o PDF do caderno na Parte 2 da Aula 1,
marcado como caderno do aluno para o Zappy. Produzir e anexar a mídia real antes de publicar.
Existência destes arquivos não comprova publicação.
