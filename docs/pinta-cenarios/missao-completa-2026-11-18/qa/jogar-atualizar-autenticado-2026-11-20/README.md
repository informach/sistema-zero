# Jogar e atualizar sem perder programação — staging, 20/11/2026

Chrome real nesta máquina, conta de staging autorizada, somente recursos próprios
de QA. O botão Jogar meu mapa criou um projeto real a partir do mapa nativo 7
protegido na issue 026: duas camadas, um tileset, objeto com propriedade inteira
e marca de contornos precisos. A cena 3 e o vínculo personal:<id> chegaram completos.
O personagem gerado moveu-se com ArrowRight, medido nos pixels: x 8 → 56.

Na Ponte, uma variável qaPinta20261120 foi acrescentada pelo teclado ao script.js.
Sua presença foi conferida no arquivo e no IR persistidos. Depois, a borracha
do Pinta apagou a segunda célula do chão. A biblioteca pessoal recebeu a nova
cena; o jogo vinculado foi reconciliado sem tocar na programação. Código, IR e
blocos juntos conservaram o SHA-256 214cb639… enquanto a cena mudou de 5bc850f9…
para 40cef27d… . Uma nova página do aplicativo reabriu o projeto com os mesmos
hashes e a mesma variável. O jogo executou novamente e o personagem voltou a mover.

## O que esta prova cobre

Criação pelo botão real, edição de código, gesto de autoria, atualização do jogo
aberto, salvamento e reabertura locais no host autenticado. A primeira execução
usou a casca isolada; a execução após reabrir usou o srcdoc configurado pelo host
naquela sessão. Não alteramos essas opções do host. O mesmo leitor de cena foi usado.

O Chrome headless manteve ambas as páginas como visíveis. A primeira tentativa
de trazer a aba à frente não acionou o observador. Foi então emulado o evento
normal de foco consumido por DrawingSyncWatcher, sem chamar stores ou APIs da
aplicação. Isso está marcado nos resultados; não é ensaio físico de troca de abas.

Implantações concorrentes do staging removeram dois chunks JS de uma página já
aberta e, depois, o CSS do editor de código de outra. As tentativas nessas páginas
falharam; páginas novas conservaram os dados e carregaram o fluxo. O ensaio não
conta essas tentativas como sucesso nem como falha de conversão do mapa.

## Limites

Mapa de QA 8 × 8 com duas camadas: não é a homologação da Vila de 18 camadas.
Não prova contato físico contra todos os tipos de colisão; esses ensaios permanecem
nas regressões específicas. O gravador 6 e o Python 132 ainda não estão ativos,
e esta prova não inclui publicação nem sincronização do documento nativo 7 pela
nuvem. A aba legada permanece aberta e com rede suspensa para a próxima fase.
Nenhuma credencial, cookie, captura de login ou estado de autenticação foi salvo.
