# Piloto autenticado da Vila e Floresta — 20/11/2026

Conta de staging autorizada, Chrome real nesta máquina, recursos próprios de QA.
A fixture oficial recebeu IDs e nomes independentes e opt-in de contornos precisos.
A importação pela interface produziu seis recursos, dois mapas nativos 7 e 18 camadas.
IDs de mapas, objetos e portas foram religados pelo importador real.

Jogar meu mapa levou a Vila e a cabana completas ao Estúdio: cena 3, 18 camadas,
dois tilesets, seis objetos e um conjunto na Vila; cabana com duas camadas e dois
objetos. O personagem foi movido somente pelo teclado. Ele parou com o lado
direito em x 48, exatamente a borda da pedra, sem atravessá-la.

O percurso Vila → Cabana → Vila foi concluído com teclas, sem alterar a posição
do personagem por API. A API pública do motor foi usada somente para leitura:
o mundo mudou de 512 × 384 para 128 × 128 e voltou, com os marcadores esperados.
A navegação inicial parou na cerca porque a amostragem grossa ultrapassou a
passagem; a repetição usou amostragem mais fina das mesmas teclas. Não foi
retirada colisão nem alterada a fixture para fazer o percurso passar.

A água mudou os pixels da região 32 × 32 amostrada enquanto o personagem ficou
parado. Depois, a copa ocultou parte do personagem: 144 pixels verdes visíveis
caíram para 139 ao entrar no primeiro plano. As capturas são somente do canvas
do jogo, sem dados de autenticação ou da conta no restante da interface.

Uma nova página do Pinta reabriu o mapa. Os hashes completos dos seis documentos
nativos permaneceram idênticos aos capturados antes dessa reabertura.

## Lacuna encontrada e limites

O arquivo editável produzido pela interface de staging ainda contém cinco
recursos e omite a cabana. Os cinco documentos presentes conservam seus hashes,
mas a porta fica sem o destino no pacote. Esse resultado é vermelho, não uma
prova de exportação completa. A correção está sendo verificada localmente em
exportacao-nativa-de-mundos.md; a prova verde em staging ainda precisa ser feita.

Este piloto não encerra os dez passos da homologação. Não inclui publicação,
sincronização nativa na nuvem 6, atualização autenticada de um projeto Python
com o runtime 132 nem ensaios físicos adicionais ou participantes infantis.
O gravador novo permanece desativado. Nenhuma operação em produção.
