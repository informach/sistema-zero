# Conferência do minijogo Jardim que floresce (fase4-10)

Pacote: [docs/desafios-do-jogo/nuvens](../desafios-do-jogo/nuvens/README.md). Nenhum desafio foi
cadastrado no Admin e nenhum banco foi usado.

## Provas

| Prova | Resultado |
| --- | --- |
| Pasta: JSON igual à fonte, IR válido, blocos até `avancado-2d`, orçamento de 40 s, uma regra por variação | 3 testes aprovados |
| Contrato: Nuvens do Gênio, quatro desafios, moedas, cobertura dos blocos dos cursos, arte embutida, textos | 3 testes aprovados |
| Blockly: os oito projetos abrem como blocos e geram o mesmo JavaScript | aprovado |
| HTTP em memória: importar, exportar e reimportar sem revisão nova | aprovado (19 no arquivo) |
| Executor real (Chrome local): gabaritos aprovam, iniciais reprovam, 10 casos incorretos reprovam | aprovado |
| Tipos do pacote (`tsc` com 8192 MB) e Biome | limpos |

Os casos incorretos do executor real e o objetivo que cada um derruba:
- tempo parado: tempo e sem água;
- cresce sem água: sem água;
- não gasta água: crescer;
- rega pouca: botões;
- nunca floresce: florescer;
- rega antiga: rega forte;
- sol forte sempre: sol forte (120 em vez de 100);
- chuva dobrada: chuva (sobram 5 de água);
- Enter sem ação: o extra, nas quatro versões.

## Conferência visual

`bun docs/desafios-do-jogo/nuvens/conferir-browser.ts`, Chrome local com SwiftShader, três rodadas
seguidas aprovadas. Em cada tela: regar quatro vezes, dar sol três, a flor floresce (crescimento 100,
recado "O jardim floresceu."), sem rolagem lateral, e Enter recomeça.

- Computador 1280 × 844: [print](2026-10-29-nuvens-desafio-computador.png)
- Celular emulado 390 × 844, toque: [print](2026-10-29-nuvens-desafio-celular.png)
- Janela compacta 640 × 480: [print](2026-10-29-nuvens-desafio-compacto.png)

Observação: o primeiro toque no palco do Jogo 2D só o ativa (não chega ao botão). A conferência faz
um toque no céu antes de regar e espaça os toques em 150 ms (o jogo lê um clique por quadro). O
executor do Estúdio não é afetado (os objetivos aprovam como esperado). É um comportamento do runtime,
não deste pacote; fica anotado para quem cuida do Jogo 2D.

Celular físico continua pendente.
