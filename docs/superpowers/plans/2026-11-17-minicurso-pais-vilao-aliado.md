# Revisão do minicurso para pais Transformando o vilão em aliado

> Execução nesta sessão, pela skill executing-plans. A proposta foi aprovada pelo usuário em 17/11/2026; não há nova etapa de aprovação para editar os materiais locais.

**Objetivo:** transformar o curso em um minicurso de conscientização que pode ser assistido em uma sentada, sem tarefas ou quizzes; a prática é o presente do Cadê Todo Mundo.

**Referência:** proposta aprovada na conversa, palestra de 13/11/2026, transcrição integral do DOCX, legendas da gravação e notas dos 42 slides v7. Extrações de consulta em `output/revisao-vilao-aliado-2026-11-17/`.

**Organização:** seis aulas, com explicação completa e exemplos; nenhum alvo de duração. Preservar slugs das aulas, as 13 chaves de vídeo, `apostila`, `presente`, itens do presente e `certificado`. Remover blocos de quiz e tarefas e suas referências de conclusão. A chave técnica de um vídeo pode conservar seu nome antigo; o título editorial e a fala definem o conteúdo novo.

**Restrições:** Helena grava em câmera, sem ElevenLabs; sem relato inventado, promessa clínica, transferência automática de habilidades ou tempo garantido de adaptação. A autorização da Isabela para curso continua pendente. A ausência de atividades é decisão expressa do usuário e prevalece sobre o formato dos cursos infantis. Não alterar nem publicar o curso remoto nesta revisão dos arquivos de Docs.

## 1. Refazer a fonte editorial

- [x] Reescrever os seis `*.md` e seis `*.roteiro.md` em `docs/aulas-interativas/pais/transformando-o-vilao-em-aliado/` com as aulas: usos da tela; habilidades ao criar; criação de jogos; interesse e apoio; relações com a vida; presente.
- [x] Recuperar decisões e consequências, repertório, suporte gradual, escola, reciprocidade e demonstração. Usar perguntas na explicação sem exigir resposta, pausa ou participação do filho.
- [x] Atualizar `README.md`, `modulos.md` e `fontes.md`, incluindo o mapa de argumentos da palestra, produção e exceções de formato.

## 2. Sincronizar a experiência e a apostila

- [x] Atualizar os seis manifestos existentes: vídeos e textos opcionais coerentes, nenhum quiz/tarefa, conclusão por vídeos e registro por certificado na última parte, conforme o contrato existente da plataforma; presente acessível sem exigir resgate ou certificado como condição de acesso.
- [x] Reescrever `docs/aulas-interativas-tecnico/recursos/transformando-o-vilao-em-aliado/caderno-conteudo.json` como consulta opcional, sem formulários ou observação semanal.
- [x] Corrigir a capa do gerador da apostila para seis aulas e revisar comentários ligados à nova demonstração.

## 3. Verificar e gerar a entrega

- [x] Validar os manifestos pelo validador real do core e a correspondência de todos os clipes com as falas por `validar-roteiros.py`.
- [x] Conferir referências de blocos e conclusão, chaves preservadas e ausência dos comandos de atividades removidos. Comparar fala, notas visuais, textos e apostila.
- [x] Gerar `apostila.pdf` pelo gerador e conferidor de layout existentes. Renderizar e inspecionar todas as páginas; corrigir até não haver cortes ou sobreposição.
- [x] Executar `git diff --check`, registrar verificações e distinguir material local revisado de gravação/publicação ainda pendentes.

## Verificação final

- Os seis manifestos passaram em `isLearningManifest` e na regra real de publicação `sectionCompletionIssues` do core. A conferência comparou com `HEAD`: 13 chaves de vídeo e os slugs preservados; 11 blocos antigos de tarefa/quiz explicitamente retirados.
- `python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py transformando-o-vilao-em-aliado`: seis aulas, 13 clipes, zero erros, incluindo citações do Na tela.
- `bun test docs/aulas-interativas-tecnico/qa/guia-da-plataforma.test.ts`: dez testes aprovados.
- Biome: oito arquivos JSON/TypeScript conferidos, sem erros na execução final.
- Gerador e conferidor da apostila: 14 páginas, fontes, imagens e limites aprovados. As 14 páginas foram renderizadas e inspecionadas visualmente. O texto extraído do PDF não contém tarefas semanais, palavra guardada ou referência antiga a sete aulas.
- `git diff --check`: sem erros no escopo editorial.

**Ajuste ao plano:** o core exige o certificado como critério da parte que contém esse bloco. Preservada essa regra existente e o identificador do certificado; a emissão não é condição para receber o presente. Nenhuma mudança no produto foi necessária.

**Estado:** arquivos locais e PDF concluídos. Gravação, edição dos 13 clipes, confirmação de autorização para eventual corte da Isabela, importação no Admin e publicação não foram executadas. A arte provisória existente da capa foi conservada.