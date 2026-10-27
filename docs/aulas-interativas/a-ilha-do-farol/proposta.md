# Proposta implementada — A Ilha do Farol

O objetivo é reconstruir a relação causal do Farol em um mundo 3D: mover, recolher, guardar, consultar e responder. A novidade está em enxergar e alcançar objetos com profundidade. A criança já conhece quadros, eventos, memória e condição; essas ideias recebem uma retomada breve, seguida da montagem completa, sem novas experiências repetindo o curso 2D.

## Percurso das aulas

1. **Uma ilha com profundidade:** jogar a versão pronta, conhecer o material de consulta, comparar a mesma ilha de frente/lado/cima e programar o movimento. A experiência distingue a posição da câmera da posição dos objetos. O projeto já traz cenário, câmera, caminhos, HUD e reinício; o aluno acrescenta a regra de controle e testa as quatro direções.
2. **A chave está ao seu alcance:** explorar os três eixos com referências visuais, colocar a chave em outro lugar, investigar a diferença entre sobreposição na imagem e contato real, programar coleta, guardar `temChave` e mudar o aviso. A posição entra antes de ser usada na montagem. Uma chave alta demais não pode ser recolhida, mesmo que pareça sobre o personagem de cima.
3. **A luz volta ao farol:** montar primeiro a resposta do `senão`, depois a vitória no `então`; responder ao quiz; escolher uma posição pessoal para a chave; testar os dois caminhos e o reinício; enviar a versão atual. O quiz antecede a entrega final para permitir aplicar a descoberta ao próprio jogo. Fechamento sem certificado.

## Experiências e linguagem

Os controles ficam livres desde o início, depois do carregamento da cena. A sugestão do Zappy orienta uma comparação sem impor ordem. Aumentar e diminuir cada eixo registra evidência; no contato, só o teste executado registra contato ou separação. Trocar a vista não inventa uma coleta. A marca inicial permanece na experiência de posição, e a marca anterior ajuda a comparar movimentos. As áreas exibidas no contato são as mesmas usadas na conta da experiência.

Desfazer restaura o estado anterior. Voltar à posição inicial conserva descobertas. Recomeçar experiência limpa o percurso. A pessoa continua explorando depois de completar as comparações. O estado entra na sessão persistida e passa pela validação do servidor.

O destaque principal indica uma ação sugerida; alternativas de resposta têm o mesmo estilo. O vídeo conceitual explica uma situação e convida a observar. O roteiro de construção ensina destino, caminho da paleta, bloco, encaixe, campos, valores, teste, correção e saída. Mudar uma regra, pressionar uma tecla e executar um teste são ações nomeadas separadamente.

## Quiz e objetivos

Quatro questões: ponto de vista; mudança de x sem mudar altura; separação escondida pela vista superior; teste após reposicionar a chave. Cada pergunta tem demonstração “Ver o que acontece”, explicação concreta, nova tentativa e correção pelo servidor. A cena é igual para qualquer escolha: não se altera para premiar uma resposta.

Os objetivos de montagem dizem quais relações entre blocos conferir. Os objetivos executados observam movimento nas quatro direções, chave visível antes do contato, coleta no lugar atual, memória persistente, farol sem chave, vitória e reinício. A navegação automática usa as posições e dimensões atuais, caminha com teclas reais pelos caminhos preparados e não escreve em variáveis do aluno. Mensagens não precisam repetir as palavras da professora.

Há nove retratos de projeto para entrada e solução das partes. A solução de uma parte intermediária não contém silenciosamente a construção da parte seguinte. O envio acontece uma vez por aula, depois das alterações; a versão enviada precisa corresponder ao projeto atual.
