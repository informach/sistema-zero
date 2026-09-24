# Desafio do Primeiro Jogo: migração pedagógica dos dias 2 a 5

## Decisão aprovada

Aplicar aos dias 2, 3, 4 e 5 o padrão aprovado no piloto do Dia 1. A prioridade é a compreensão da criança, mesmo quando isso exigir clipes novos. Introdução e certificado não mudam. Preservar o projeto acumulado de um dia para o seguinte, os valores canônicos e as regras de conferência do Estúdio.

## Percurso de cada aula

- Uma seção de conceito reúne um vídeo que explica a ideia com analogia concreta, uma ponte curta do Zappy que convida a experimentar sem repetir a tarefa, e uma experiência em que a criança manipula a relação e observa o resultado. Vídeo e experiência ficam disponíveis juntos; os dois são necessários para concluir.
- Uma seção de construção reúne um vídeo com o passo a passo real no Estúdio, uma única fala curta que passa a vez à criança, e a ferramenta com conferências do projeto. A fala não repete os blocos e campos já narrados. Vídeo e construção são necessários para concluir.
- Palpite só permanece se confrontar uma hipótese relevante. A instrução manda fazer e observar, sem entregar o resultado; cada meta obrigatória deve corresponder a uma etapa explícita. Pergunta final só permanece se exigir interpretação nova.
- O quiz ocupa seção própria, com apenas uma apresentação curta do Zappy e o quiz, antes da entrega. Cada seção tem no máximo um vídeo e um diálogo. A entrega mantém um vídeo de teste e envio e o Estúdio; no Dia 5, o fecho gravado será integrado ao vídeo final ou deslocado para uma seção própria se a análise de duração justificar.

## Decisões por dia

- **Dia 2:** apoiar por vídeo os conceitos de evento, número escrito versus lido, sinal da velocidade e permanência do tiro fora da tela. Conferir o caso de três áreas e os caminhos das quatro experiências; reduzir palpite e pergunta duplicados. Substituir os balões de passo a passo por pontes.
- **Dia 3:** apoiar por vídeo relógio, sorteio/nascimento acima da tela e apelidos da colisão. Conservar o teste real do tiro que atravessa a pedra como dor antes da solução. Conferir que cena, instrução e metas mostram o ritmo de nascimento, a posição sorteada e apenas o par da colisão.
- **Dia 4:** apoiar por vídeo variável, janela de proteção e vidas dadas uma vez. A experiência das vidas deve exigir testar tanto `Ao iniciar` quanto `Enquanto estiver rodando`; hoje a meta cai após o primeiro arranjo. Conferir também a contagem das três batidas e a distinção entre guardar, somar e mostrar pontos.
- **Dia 5:** separar os dois vídeos atualmente misturados na seção dos quatro momentos. Apoiar por vídeo o estado do jogo e o reinício, preservar o teste do relógio independente e o retorno à abertura após reiniciar. Deixar um único vídeo na entrega e o quiz isolado antes dela. Revisar a carga das seções práticas sem quebrar uma manobra no meio.

## Arquivos e dados

Cada aula possui análise (`desafio-dia-N.md`), roteiro de gravação (`desafio-dia-N.roteiro.md`) e manifesto importável (`desafio-dia-N.manifesto.json`), sob `docs/aulas-interativas/aulas/`. As três fontes devem contar o mesmo percurso, com chaves de clipe, fala, experiência, critérios e continuidade coerentes. Os novos vídeos são planejados no manifesto, não publicados nem gravados automaticamente. Alterações de cena, quando necessárias, devem corrigir a causa no motor, catálogo ou palco compartilhado, com teste de regressão, sem afetar os outros cursos que reutilizam a cena.

## Verificação

Adicionar os quatro manifestos à lista protegida pelo validador do novo modelo somente depois da migração. Validar o formato e as convenções, os caminhos de conclusão das experiências, os critérios de projeto, a consistência entre roteiro e manifesto e a continuidade dos cinco dias. Executar testes focados de core e player quando a cena mudar, além de typecheck/lint proporcionais. Fazer revisão final dos arquivos alterados e confirmar que introdução e certificado permaneceram intactos. Não fazer push nem deploy nesta etapa sem pedido novo.
