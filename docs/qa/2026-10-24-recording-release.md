# Interface e fontes para gravação

## Escopo e revisão

- Menu adulto usa os tokens e fontes existentes do app, com foco visível, títulos completos, rolagem própria e estados distintos de aula atual, concluída e bloqueada. A extração do conteúdo do menu preserva os controles de abertura/fechamento, navegação, classificação e regras de acesso do player.
- As duas comunidades compartilham “Objetivos do projeto” e “Verificar projeto”. Pendências da parte, conclusão da aula e envio do projeto continuam sendo ações distintas.
- Fontes canônicas dos cursos, manifestos, roteiros, TXT do ElevenLabs, âncoras de edição, tutoriais e referências comerciais afetadas foram sincronizados. Os dois PDFs afetados foram regenerados.
- A auditoria compara todas as falas e intervenções com `6067b14e78dbc0db788d986e78407ed6185bf562`, permitindo somente os dois rótulos. Confere também o conteúdo pedagógico dos manifestos; notas de produção e âncoras são derivados regenerados e validados. Não altera critérios, projetos, IDs ou ordem dos clipes.

## Evidências locais

- Auditoria: 37 aulas, 203 clipes, 87 clipes com trecho afetado. [Lista para gravação](2026-10-24-project-label-recording-impact.md).
- `bun test docs/aulas-interativas-tecnico/qa`: 311 testes, 44.318 asserções, zero falhas.
- `validar-manifestos.ts`: 37 válidos, zero reprovados; `validar-roteiros.py`: 203 clipes, zero erros; exportador ElevenLabs `--check`: todos os derivados atualizados.
- Comunidade adulta: 89 testes, 445 asserções, zero falhas; inclui navegação do menu.
- Kids, objetivos/atualização de aula: 15 testes, 44 asserções, zero falhas. Copy compartilhada: 3 testes, 11 asserções, zero falhas.
- Quiz do Desafio e espelhos editoriais: 21 testes, 14.400 asserções, zero falhas após regenerar os espelhos afetados.
- Tutoriais: 78 Kids e 50 adultos aceitos pelos validadores; recomendações editoriais existentes de imagens e tamanho não foram ocultadas.
- PDFs: Cadê, 7 páginas; Farol, 29 páginas. Geradores conferiram fontes, imagens e limites. Extração não encontrou os rótulos antigos; inspeção visual das páginas 4 e 29 confirmou a nova ação sem cortes.
- Biome: 28 arquivos TS/TSX/CSS afetados, zero erros; `git diff --check` sem erros.

## Publicação e material gravado

Por orientação da responsável, não há migração direta dos textos das aulas em staging ou produção: os manifestos serão reimportados por ela. Não se deve substituir gravações existentes nem recriar progresso durante esta entrega.

Os TXT são fontes para síntese/gravação. Atualizá-los não gera nem substitui automaticamente o áudio/vídeo publicado. A lista de impacto identifica os clipes que contêm o nome antigo; os demais trechos permanecem iguais.

As funções financeiras ficam em `feat/subscription-recovery`, fora deste lote. CI, builds e verificação dos deployments são etapas de publicação separadas das evidências locais acima.
