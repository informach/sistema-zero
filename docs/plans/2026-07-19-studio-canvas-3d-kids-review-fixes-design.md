# Canvas 3D infantil — correções do review

Data: 19/07/2026

## Objetivo

Corrigir todos os achados do review da categoria Canvas 3D sem quebrar projetos existentes. A criança deve montar uma cena funcional com os facilitadores e entender os textos dos blocos sem precisar conhecer a API do Three.js. A experiência de programação é desktop-first; largura de blocos no celular não é critério desta categoria.

## Decisão aprovada

A correção preserva os tipos e campos serializados. Os blocos largos ganham linhas curtas dentro do mesmo bloco; não serão criados blocos auxiliares nem rolagem horizontal. A Ponte continua responsável por mostrar o código exato.

## Contratos e progressão

- Um contrato central do Canvas 3D descreve nível, posicionamento, declarações, nomes locais e criação de recursos.
- A categoria aparece no nível intermediário 3D com um caminho completo de facilitadores. Recursos técnicos continuam no avançado 3D.
- Imports ficam restritos ao início do projeto.
- O gerador inclui a biblioteca 3D quando um facilitador precisa dela, mesmo sem bloco de import explícito.
- Blocos que criam renderizadores, mundos, objetos físicos ou listeners não podem nascer dentro do laço de animação.

## Nomes e escopo

Todos os blocos que declaram variáveis ou funções alimentam os seletores de nome. Parâmetros locais respeitam o ramo que os declara: o modelo só aparece no sucesso do carregamento, o erro só aparece no ramo de falha e os dados de colisão ou gatilho só aparecem dentro do evento correspondente.

## Experiência infantil

- Textos e tooltips explicam a ação em português direto; detalhes de API ficam na Ponte.
- Cada subgrupo usa um tom próprio da cor da categoria.
- Soquetes de objeto nascem com um valor útil, inclusive o bloco de percorrer partes.
- Blocos densos distribuem campos em várias linhas para leitura confortável no desktop.

## Compatibilidade

Os identificadores, nomes de campos e nós da IR permanecem estáveis. A mudança de linhas afeta somente a apresentação. Imports automáticos são normalizados no gerador e continuam reconhecíveis pela Ponte.

## Verificação

Cada achado recebe um teste de regressão. Uma auditoria permanente cobre inventário, grupos, níveis, cores, defaults, posicionamento, ciclo de vida, declarações, escopo, linguagem e geração dos blocos. O E2E mede blocos reais no desktop e executa o caminho manual Canvas → cena → renderizador → câmera → luz. A entrega exige testes focados, typecheck, lint e a suíte proporcional do Studio.
