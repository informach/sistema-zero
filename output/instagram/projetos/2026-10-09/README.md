# Projetos — produção de 09/10/2026

Oito stories estáticos, em pares: jogo e habilidade. As copies, os rótulos, as chamadas e os destinos dos links vêm de PJ01–PJ08 em `01-destaques.md` e de `apoio/links-e-publicacao.md`.

As imagens foram compostas com HTML/CSS e capturas dos jogos e do Estúdio. Não há novas imagens geradas por IA. Os contornos amarelos destacam os comandos sem alterar seu conteúdo.

## Capturas

- Farol: projeto completo de `desafio-farol-projeto.ts`. Percurso por teclado até coletar a chave e acender o farol; captura final após o barco chegar à costa.
- Cadê Todo Mundo?: projeto completo de `cade-todo-mundo-projeto.ts`. Mesmos personagens e esconderijos; cliques nos três esconderijos levam de Achados 0 a Achados 3.
- Nave Contra Asteroides: `projetoNave(9)`, programa final das aulas. A mesma partida foi capturada com 3 pontos, tiros e asteroide visíveis, e depois com vitória ao alcançar os 26 pontos exigidos pelo jogo. O controle automático envia teclas de movimento e disparo; não altera pontuação, vidas, colisões ou condição de vitória.
- Corre Dino: `projetoDino(13)`, programa final das aulas. A primeira captura mostra um salto com 2 pontos; a segunda mostra o fim da mesma corrida, com 4 pontos e o convite de recomeço do próprio jogo.
- Blocos: capturas nativas no Estúdio local. A seleção mantém o evento ou temporizador e a regra correspondente. A posição e o zoom do espaço de trabalho foram ajustados para a captura; os comandos permaneceram intactos.

## Arquivos de trabalho

`preparar-projetos.ts` gera os quatro projetos e seus previews. `capturar-jogos.mjs` captura Nave e Dino; aceita `dino` para capturar somente esse projeto. As capturas do Farol e do Cadê foram feitas pelo navegador com os controles reais. `capturar-blocos.mjs` prepara os recortes e as coordenadas dos destaques. `montar-stories.mjs` lê a copy do documento e monta as oito telas. `renderizar-e-conferir.mjs` renderiza, compara os textos e verifica o layout.

`verificacao-layout.json` registra a conferência geométrica e textual. `conferencia.png` reúne as oito telas para revisão visual. A revisão mecânica de `copy-revisao.txt` não encontrou ocorrências. A revisão editorial conferiu a relação entre cada texto, o jogo e a regra apresentada; não foi realizado teste de conversão.

Os arquivos de publicação ficam somente em `docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/projetos`: oito PNGs e `publicacao.txt`.
