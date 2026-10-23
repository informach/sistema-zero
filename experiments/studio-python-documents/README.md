# Documentos Python — corpus local

Execute `bun experiments/studio-python-documents/corpus.ts` na raiz da worktree, depois de preparar o corpus Pac-Man do L0. O script não baixa nem redistribui os arquivos de terceiros: lê o cache existente e grava a evidência em `.cache/studio-python-l0/l2-pacman-document-evidence.json`.

O ensaio passa módulos, GIFs e WAVs reais pelo leitor Python Pro, pelo materializador de binários e pela captura/serialização JSON da revisão Pro v2, comparando os hashes de todos os arquivos antes/depois. Confere os bytes contra o manifesto upstream fixado; diferenças de CRLF do checkout Windows são registradas e preservadas, sem converter a fonte lida. A identidade de runtime é uma fixture estrutural de teste, sem autorização de execução.

Não é teste de execução do jogo, do renderer Turtle, do ZIP de produto ou de publicação no Mural. Esses aceites continuam pendentes no roteiro do corpus.
