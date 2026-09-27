# Implementação das aulas Kids v5

Proposta aprovada: [exploração direta e composição livre](2026-09-12-exploracao-direta-aulas-kids-proposta-v5.md). A sequência abaixo organiza o trabalho técnico; não determina a ordem das seções de uma aula.

Código e roteiros implementados localmente. [Relatório de verificação e limites](../aulas-interativas/qa/piloto-v5-2026-09-12.md). Mídias, homologação com alunos e publicação permanecem na etapa externa abaixo.

Revisão completa posterior: [seis achados corrigidos e verificações adicionais](../aulas-interativas/qa/revisao-completa-v5-2026-09-12.md).

## Código e conteúdo

- [x] Contrato versionado de missão, ações, estado recuperável e evidência; compatibilidade v1 e marcos anteriores.
- [x] Explorações de referência: camadas, gravidade/impulso e colisão, com gesto direto, alternativa por toque/teclado, comparação, desfazer, pistas e retomada.
- [x] Demais cenas do Dino: existir/desenhar, som, ritmo, limpeza, estado, controles, reinício, pontos, sorteio e aceleração; acontecimentos reais no modelo e escala/tempo coerentes.
- [x] Reconhecimento sem reprodução artificial; interação durante salvamento, confirmação do servidor e reenvio em falha.
- [x] Autoria de missões, resumo pedagógico, critérios únicos, avisos editoriais e validações técnicas.
- [x] Prévia livre e ensaio local do percurso, incluindo falha/retomada, sem escrever progresso ou enviar trabalhos reais.
- [x] Criação com orientação em notebook/tablet e mesmo projeto em seções intercaladas, com objetivos independentes.
- [x] Estudo restrito de observação do comportamento real no Estúdio, aula 3; evidência estrutural nomeada honestamente.
- [x] Painel docente legível para missão, contrastes, montagem, pistas e revisão.
- [x] Quiz visual e retomada das questões pendentes; entrega e Mural distintos, prévia e confirmação explícita.
- [x] Caderno reencontrável e alternativa de leitura; regressões de vídeo isolado, legado, ações e galeria.
- [x] Manifestos e roteiros das 13 aulas revisados; aula 3 alterna duas explorações e dois trechos no mesmo projeto.
- [x] Guia de autoria e relatório de verificação atualizados.

## Verificação

- [x] Testes de modelo: caminhos válidos, contraste necessário, casos incompletos, eventos equivalentes, tempo, limites, sorteio e versão.
- [x] Testes de percurso: explorar A → criar A → explorar B → criar B; recarga, reentrada, mesmos trabalhos, critérios independentes e entrega apenas no fechamento.
- [x] Verificações de tipos, formatação e regressões pertinentes nos pacotes afetados.
- [x] Prévia no navegador: cenas, notebook 1280/1366 e viewport 768; arraste, teclado e alternativa por dois cliques. Dispositivo físico e Estúdio autenticado completos ficam na homologação.
- [x] Validação de todos os manifestos, com quantidade/ordem flexível das etapas de aprendizagem.

## Produção e homologação externas

- [ ] Professor revisa as prévias e grava/vincula vídeos e áudios finais.
- [ ] Publicar gradualmente em ambiente de teste com mídias prontas e conferir o curso completo.
- [ ] Observação qualitativa com 6–8 crianças, incluindo leitores iniciantes e uso por toque.
- [ ] Liberação gradual após homologação. Não publicar nem migrar automaticamente aulas existentes.

## Decisões de implementação

- Manter o avaliador v1 para aulas existentes; novas missões usam versão própria e não reinterpretam tentativas antigas.
- A seção autorada define o avanço; o aluno segue essa ordem, que pode repetir qualquer tipo pertinente.
- Conferir estrutura do projeto, observar um modelo de exploração e observar o jogo real são evidências diferentes.
- Testes técnicos não comprovam aprendizagem e não substituem mídias ou homologação com crianças.
- Ensaio de retomada é local à prévia aberta. Os limites de histórico, de autoria curada e da prévia do Pinta estão explicitados no relatório.
