# Revisão para publicação do Molda em staging — 18/10/2026

## Escopo

Revisão de todas as alterações locais desde `e0d51c984`: giro livre de UV, alças locais de animação em peças redimensionadas, transporte GLB de centros de giro, coleta de pixels antigos, capacidade adaptativa e recuperação independente do salvamento principal.

O primeiro `git fetch origin --prune` confirmou que a branch de trabalho e `origin/staging` partiam do mesmo commit. O remoto será consultado novamente antes da integração e do push. A publicação usa o workflow CI do repositório, que só libera o deploy Railway de staging depois dos gates obrigatórios.

## Achados corrigidos

1. **Um índice de recuperação ilegível bloqueava outras sessões válidas.** A inspeção agora retorna os registros legíveis e informa separadamente que uma cópia foi preservada por não poder ser lida. O editor continua oferecendo a cópia válida. A regressão abre, recupera e salva essa versão enquanto mantém o registro corrompido intacto.
2. **Checkpoints que já estavam integralmente salvos permaneciam acumulados após reabrir.** A abertura compara o conteúdo autoral restaurado com o documento salvo e descarta somente a cópia redundante por comparação transacional. Trabalho diferente e registros alterados por outra aba permanecem preservados. A regressão mistura sessões salvas e não salvas.
3. **O novo fallback da galeria ampliava também os limites de importação de backup.** O JSON de backup e os limites do ZIP foram separados da capacidade de armazenamento, mantendo os orçamentos anteriores de memória. A regressão recusa uma declaração externa de 200 MiB antes de tentar descompactar seu conteúdo.
4. **Versões antigas de uma sessão já salva precisavam ser consideradas superadas.** Ao coletar um checkpoint que coincide com o projeto salvo, a inspeção não deve tentar restaurar depois os registros antigos que acabou de remover. A regressão usa um traço desfeito seguido pelo estado já salvo e exige ausência de recuperação e de avisos falsos.
5. **O divisor da folha não aplicava a coordenada final ao soltar.** O gesto agora aplica a posição de `pointerup` antes de liberar a captura, mesmo sem movimento intermediário. Um teste de componente reproduziu a largura inalterada antes do conserto e verifica também que redimensionar a folha não altera o documento nem o histórico. O cenário WebKit aguarda o layout atualizado por condição, conservando a exigência anterior de crescimento da largura.

Os três testes reproduziram as falhas antes das correções; depois, os 25 testes dos dois arquivos afetados passaram.

O quarto teste também reproduziu o aviso falso antes da correção. O cenário de pintura que troca o tema por navegação passou a esperar o indicador de gravação do último Desfazer; a recuperação de uma recarga com trabalho pendente permanece coberta separadamente, sem dispensar seu diálogo.

## Revisão dos demais caminhos

- O giro UV usa pixels da textura em imagens retangulares, conserva voltas completas, cancela gestos quando muda o dono e confirma uma única operação reversível. O alvo visual acompanha o zoom e permite teclado.
- As alças de animação consideram o transform completo de repouso em movimentos relativos, sem converter uma rotação local válida em cisalhamento. Modelagem e animação mantêm preferências próprias de eixos.
- O transporte compacto GLB conserva `incomingPivot` e sua interpolação como metadados esparsos; campos desconhecidos, canais inválidos, índices repetidos e limites continuam validados.
- O escritor captura os dados antes de consultas assíncronas, confere revisão e dependências na transação e só coleta blobs após certificar as referências. Originais, conteúdo compartilhado e formatos desconhecidos permanecem preservados.
- A recuperação mantém dois pontos por sessão, blocos comprimidos sem perdas, deduplicação, limite próprio e troca atômica. Prévia temporária e movimentos intermediários não geram checkpoints; falhas físicas oferecem backup do conteúdo aberto.
- Recuperar e descartar respeitam revisões e identidade da sessão. Fechar o diálogo não descarta trabalho, e falhas de limpeza não apresentam uma gravação principal concluída como não salva.

## Verificação e publicação

- Suíte completa do Molda: **3.394 aprovados**, zero falhas (1.104 + 1.166 + 1.124).
- Integração com Kids: **67 aprovados**, zero falhas, incluindo nuvem, perfil e contrato do host.
- Playwright completo: 117 cenários descobertos; 111 aprovações iniciais, dois achados investigados e quatro exclusões já existentes para provas específicas do Chromium. Após as correções, **16 cenários afetados passaram** em Chromium, Firefox e WebKit, incluindo os dois que haviam falhado. Isso cobre os 113 cenários executáveis do conjunto.
- Typecheck do Molda e de `community-kids`, build do playground e `git diff --check`: aprovados.
- Biome nos **49 arquivos de código alterados**: zero erros e zero avisos. Biome global: exit 0 em 9.099 arquivos; os avisos e informações existentes fora da entrega não bloqueiam o gate.
- As regressões dos cinco achados falharam antes das correções e passaram depois. Capturas da recuperação nos temas claro e escuro foram inspecionadas.

Logs locais em `.cache/molda-release-review-*`. O banco pessoal do usuário não foi manipulado por ferramentas; os navegadores de teste usam contextos isolados. A recuperação continua sujeita ao espaço físico da origem e oferece baixar o projeto aberto se a gravação falhar.

A publicação segue commit da entrega, atualização de staging local, merge preservando os históricos, novo fetch antes do push e acompanhamento do CI/deploy do SHA integrado. O SHA e o link da execução são informados no retorno de publicação.
