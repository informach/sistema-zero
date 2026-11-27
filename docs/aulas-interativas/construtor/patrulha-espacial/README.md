# Patrulha Espacial · curso do Construtor

Curso da trilha 3D, depois de **Nave Contra Asteroides**. O pacote contém cinco aulas, 25 partes, 19 projetos progressivos, duas experiências existentes da Ilha, dois quizzes e os derivados de voz para professora, Debinha e Dedé.

## Por onde revisar

- [Cadastro editorial e módulos](modulos.md): apresentações Kids/adulto, slugs reservados, pré-requisitos, duração estimada e fronteira pedagógica.
- [Mapa das aulas](mapa-de-aulas.md): entrada, conquista e sequência de cada parte.
- [Passo a passo do projeto em PDF](passo-a-passo-do-projeto.pdf), [fonte textual](passo-a-passo.md) e [blocos usados](blocos-usados.md): montagem, testes e inventário oficial. A capa está em [capa.jpg](capa.jpg).
- [Projeto inicial](projeto-inicial.szproject.json) e [projeto final](projeto-final.szproject.json): arquivos importáveis, preservados dos protótipos aprovados.
- [Projetos intermediários](projetos/): uma solução para cada conquista da construção.
- [Fonte estruturada](curso-autoria.json): texto, gestos, passos, testes, critérios e blocos por parte.

Cada aula possui conteúdo `.md`, roteiro `.roteiro.md`, manifesto `.manifesto.json`, master integral `.elevenlabs.txt`, TXT de personagem e índice `.edicao.json`. A fonte reproduzível começa em [construtor-3d.ts](../../../aulas-interativas-tecnico/qa/construtor-3d.ts). O gerador comum produz os derivados; mudanças editoriais devem entrar nas fontes.

## O que o aluno constrói

A nave já se move depois de Enter. A criança monta o disparo, a posição de origem, as velocidades e os limites dos grupos, o intervalo dos asteroides, o contato real, a retirada, os pontos, o placar, a vida e as condições que chamam os resultados. As telas, o estado inicial, Enter e o botão nativo **Voltar ao início** estão preparados. O projeto inicial não antecipa as regras de jogo que serão construídas.

As etapas deixam os efeitos aparecerem em sequência: primeiro uma cópia parada, depois seu lugar, seu caminho e seu limite. O contato funciona antes da contagem; a contagem é criada antes de aparecer no placar. Os avisos da missão já vêm prontos desde o projeto inicial; a última parte testa o ciclo inteiro da partida e envia.

## Modelos do Blender e variações

A cena usa quatro objetos com modelo: **cenário**, **nave**, **asteroide** e **laser**, cada um com quatro variações feitas no Blender ([docs/design/construtor-espaco-blender](../../../design/construtor-espaco-blender/README.md)). O projeto leva a referência de cada peça na biblioteca de modelos dos cursos; os arquivos `projeto-inicial` e `projeto-final` embutem as malhas para importação portátil. Para trocar, a criança clica no nome do modelo no bloco **Criar o objeto … com o modelo …** e escolhe outro (o seletor mostra a miniatura). As quatro opções de cada categoria têm a mesma caixa: tamanho, centro e área de toque não mudam.

| Objeto | Variações (a primeira é a de partida) | Tamanho no bloco |
|---|---|---|
| cenário | `cenario-orbita`, `cenario-aurora`, `cenario-nebulosa`, `cenario-estacao` | 180 |
| nave | `nave-falcao-azul`, `nave-exploradora-coral`, `nave-arraia-lilas`, `nave-cometa-verde` | 3 |
| asteroide | `asteroide-rocha-lunar`, `asteroide-gelo-azul`, `asteroide-cristal-violeta`, `asteroide-lava-laranja` | 1,8 |
| laser | `laser-ciano`, `laser-dourado`, `laser-lilas`, `laser-verde` | 0,9 |

## Verificação feita

O [relatório da progressão](qa-runtime-progressao.json) registra 19 etapas e 83 objetivos de execução. O teste executa os arquivos entregues, resolve as peças da biblioteca e carrega os GLBs do Blender com o loader oficial e confere as conquistas intermediárias, a prioridade dos resultados e o reinício. O desenho WebGL é substituído no adaptador de QA; a partida com WebGL de verdade é conferida em Chromium por `docs/aulas-interativas-tecnico/qa/construtor-navegador.ts` (o mesmo documento do player do Estúdio, com as quatro combinações de variações).

O [relatório das experiências](qa-experiencias.json) registra as ações reais do motor `scene` que fecham as cinco metas das duas bancadas da Ilha. As aulas 2 e 4 retomam duas bancadas da Nave (o relógio e a proteção), as mesmas que o validador do 2D abre e conclui. As atividades começam sem descobertas concluídas. A Ilha permanece identificada como Ilha e sua relação com a Patrulha é explicitada na fala.

## Produção pendente

Os textos de voz e índices estão prontos para revisão e gravação; este pacote não gera áudio pago nem publica curso. Antes das gravações, executar **Verificar plano** com os manifestos cadastrados para conferir os alvos da interface e os tempos das ações. Os campos repetidos de posição e os operandos das duas expressões aninhadas têm notas precisas de captura manual fora dos comandos, porque o resolvedor atual não seleciona um campo pelo nome interno do input. Não tratar essas notas como gestos automáticos já executados.

Revisar o PDF final e a capa, produzir e conferir as mídias, reconciliar os UUIDs e versões existentes de Kids/adulto, anexar o caderno e cadastrar as aulas como rascunho. A publicação no Mural é uma escolha do aluno. A política de certificado e a progressão da Jornada permanecem as do cadastro vigente, sem promessas novas criadas por este pacote.
