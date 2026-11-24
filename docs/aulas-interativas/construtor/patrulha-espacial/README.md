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

As etapas deixam os efeitos aparecerem em sequência: primeiro uma cópia parada, depois seu lugar, seu caminho e seu limite. O contato funciona antes da contagem; a contagem é criada antes de aparecer no placar. A última montagem aplica quatro avisos fixos fornecidos e testa o ciclo inteiro da partida.

## Modelos provisórios

Nave, asteroide e laser usam **três GLBs embutidos**, reaproveitados da galeria Patrulha Espacial. Cada arte entra por um bloco nativo de modelo; não há uma preparação visual extensa com formas. Helena produzirá as artes definitivas e as variações no Blender. A edição atual não cobra uma escolha de variações 3D que ainda não existem. As futuras trocas de aparência devem conservar as regras e as dimensões de contato.

## Verificação feita

O [relatório da progressão](qa-runtime-progressao.json) registra 19 etapas e 84 objetivos de execução. O teste executa os arquivos entregues, carrega os GLBs com o loader oficial e confere as conquistas intermediárias, a prioridade dos resultados e o reinício. O desenho WebGL é substituído no adaptador de QA; este resultado não é uma inspeção visual do Estúdio publicado.

O [relatório das experiências](qa-experiencias.json) registra as ações reais do motor `scene` que fecham as cinco metas das duas bancadas. As atividades começam sem descobertas concluídas. A Ilha permanece identificada como Ilha e sua relação com a Patrulha é explicitada na fala.

## Produção pendente

Os textos de voz e índices estão prontos para revisão e gravação; este pacote não gera áudio pago nem publica curso. Antes das gravações, executar **Verificar plano** com os manifestos cadastrados para conferir os alvos da interface e os tempos das ações. Os campos repetidos de posição e os operandos das duas expressões aninhadas têm notas precisas de captura manual fora dos comandos, porque o resolvedor atual não seleciona um campo pelo nome interno do input. Não tratar essas notas como gestos automáticos já executados.

Revisar o PDF final e a capa, produzir e conferir as mídias, reconciliar os UUIDs e versões existentes de Kids/adulto, anexar o caderno e cadastrar as aulas como rascunho. A publicação no Mural é uma escolha do aluno. A política de certificado e a progressão da Jornada permanecem as do cadastro vigente, sem promessas novas criadas por este pacote.
