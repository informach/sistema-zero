# A Ilha do Farol — implementação do curso

> Execução nesta sessão, por etapas, com revisão e verificação antes da entrega.

**Objetivo:** transformar o protótipo aprovado em um curso completo de três aulas no Faísca, com projetos reais de Jogo 3D, experiências, quiz, objetivos, roteiros e material de consulta.

**Arquitetura:** conservar os contratos de manifesto, sessão de experiência, correção de quiz e verificação de projeto existentes. As artes são arquivos GLB identificados por nomes estáveis, substituíveis pelos projetos do Molda sem reescrever as regras. O curso usa a identidade curricular já reservada `jornada-faisca-base-3d`.

**Tecnologias:** TypeScript/Bun, React, Blockly/IR do Estúdio, Jogo 3D/Three.js, manifestos JSON, Chrome/Playwright, PDF.

**Especificação aprovada:** `docs/design/ilha-do-farol-prototipo/README.md`, protótipo HTML e decisões do responsável nesta conversa.

## Restrições

- Três aulas: Uma ilha com profundidade; A chave está ao seu alcance; A luz volta ao farol.
- Sem certificado. Retomadas breves de quadros, movimento, memória e condição; montagem completa de todas as regras.
- Experiências novas: ponto de vista, chão x/z e altura y, contato em 3D. Controles livres, descobertas em qualquer ordem, desfazer, reinício e continuação.
- Alternativas de perguntas neutras; destaque principal apenas para ações sugeridas.
- Só Programação e Jogo 3D nos projetos; nenhum bloco HTML, CSS ou Canvas e nenhum código solto escondendo regras ensinadas.
- Não publicar mídia inexistente, não gerar áudio pago nem implantar serviços durante a implementação local.
- Preservar alterações de outras tarefas e os arquivos do Molda devolvidos pelo autor. Revisão completa, correção dos achados, commit e merge em staging local autorizados na etapa de revisão.

## Etapas

- [x] **Artes e projetos:** criar fonte de assets substituíveis e gerador de projetos progressivos em `docs/aulas-interativas-tecnico/qa/ilha-do-farol-{assets,projeto}.ts`; gerar GLBs dos projetos atuais, criar preparação/soluções e jogo final. Validar IR, Blockly, execução e ausência de blocos proibidos.
- [x] **Experiências reais:** adicionar três cenas ao catálogo/motor do core com estado validado; portar interface aprovada para o member-shell e renderização 3D com ciclo de vida controlado. Testar ações alternativas, evidências, restauração e acessibilidade.
- [x] **Objetivos executados:** ampliar a observação de objetos 3D quando necessário e criar critérios de movimento, posição alcançável, coleta, memória e porta com/sem chave. Testar soluções corretas e erros plausíveis sem fixar o lugar personalizado da chave.
- [x] **Quiz:** cadastrar quatro situações aprovadas na fonte do curso com demonstração 3D e retorno personalizado. Conservar gabarito privado e submissão do quiz no servidor.
- [x] **Autoria:** escrever proposta, módulo, três roteiros completos e gerador `gerar-ilha-do-farol.ts`, com projetos de entrada/solução por parte, cadeia de trabalho, falas e manifestos. Registrar o curso novo nos índices e validadores.
- [x] **Materiais e integração:** gerar falas ElevenLabs e edição, Passo a passo do projeto e PDF; vincular a identidade curricular existente sem invalidar progresso. Documentar substituição de arte e estado de produção/publicação.
- [x] **Revisão final:** rodar contratos, testes afetados, validação editorial, ensaio no navegador e revisão visual do PDF; corrigir os achados e registrar limitações reais de mídia e implantação.
