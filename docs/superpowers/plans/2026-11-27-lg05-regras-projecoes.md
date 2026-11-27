# LG05 — regras e projeções do Pinta

**Objetivo:** preservar autoria nativa 9 (autorregras, isométrico e hexagonal), na edição, conta, recuperação e destinos compatíveis, sem antecipar a liberação pública de um percurso incompleto.

**Arquitetura:** continuar usando a autoridade local e a fila causal V4, o manifesto existente e a prova de bytes do BFF. O formato é uma capacidade negociada, sem flags. Separar a preparação do leitor da ativação do gravador público: a versão anterior de retorno deve ler os dados que a seguinte poderá gravar.

**Tecnologias:** TypeScript, Bun, IndexedDB, React e protocolo HMAC/R2 existentes. Nenhuma dependência nova.

**Escopo aprovado:** [plano gradual](../../plans/2026-11-23-plano-de-liberacao-gradual.md), LG05; autorização da responsável em 27/11/2026. Execução nesta sessão, na staging compartilhada, preservando alterações concorrentes.

## Restrições

- Não elevar o teto do editor nem o escritor público apenas para passar um upload. Nativo 9 e nuvem 8 só são anunciados ao público quando o percurso estiver completo.
- Não converter hexágonos ou isométrico em mapas ortogonais. Não descartar o livro de regras, camadas, propriedades, transformações, colisões ou referências.
- Manter a política do gravador legado (`PINTA_MAX_READ_FORMAT_VERSION`/`PINTA_MAP_WRITE_FORMAT_VERSION` 6): a LG05 usa o canal causal, não o canal legado.
- Preservar nativo 8/nuvem 7 e a recusa dos clientes antigos; arquivos futuros/inválidos não podem gerar selo nem confirmação.
- Não editar Molda Cenários nem os catálogos Python de áreas/raylib. Distribuição Python permanece na LG08; não declarar o destino Python projetado pronto sem sua qualificação.
- Uma tarefa pesada por vez, pela trava `C:/Users/tocha/backup-pinta-codex-20261122/pesado.mjs`.
- Não publicar posts de QA, enviar recados, alterar cursos ou conceder progresso.

## Diagnóstico inicial

As três variantes nativas 9 já fazem ida e volta pelo codec físico, exportador, leitor e recuperação privada. A base focada passou em 27/11: 15 testes, 188 expectativas, zero falhas.

O bloqueio da conta está em três pontos: inventário causal com leitor máximo 7, BFF condicionado ao leitor 8 e host com leitor/escritor 7/teto nativo 8. Há outro bloqueio funcional: projetados são preservados na galeria, mas não têm editor nem cartão. O PNG público permanece 5/cena 4. Portanto, desbloquear somente os três primeiros pontos e anunciar teto 9 não conclui a LG05.

## Entrega A — leitor compatível e prova da conta

### 1. Admissão de nativo 9 no servidor

**Arquivos:** `packages/core/src/creations/pinta-format.ts`, `packages/core/src/creations/pinta-format.test.ts`, `packages/member-shell/src/server/pinta-causal-proof.ts`, `packages/member-shell/tests/pinta-causal-regions-routes.test.ts`.

**Interfaces:** `PINTA_INVENTORY_READER_VERSION` admite 8 nos schemas causais; `readPintaCausalBlob` e `inspectPintaCausalDocument` verificam os mesmos bytes e formato; `readerOptions` habilita apenas a capacidade efetivamente anunciada.

- [x] Rodar a base focada antes de alterar o código.
- [x] Reproduzir a recusa de nuvem 8 pela rota real do BFF com livro, hexágono com livro e isométrico sem livro.
- [x] Preparar o leitor causal 8; manter o gravador público em nuvem 7 e a oficina pública no teto 8.
- [x] Conferir selo byte a byte, atestado, manifesto e recusa de corpo 9 declarado como nuvem 7, futuro ou adulterado. O leitor 9 continua inválido.

### 2. Preparação do host para ler sem antecipar escrita

**Arquivos:** `packages/member-shell/src/components/creator/pinta-client.tsx`, contrato puro compartilhado de capacidades do host, fixture/testes de host e conta em `packages/member-shell/tests/`.

**Interfaces:** separar o leitor causal do escritor e teto público; a fila pode ler 8 sem ter permissão para enfileirar uma autoria 9. O canal legado continua em 6. Preservar o escopo conta/perfil e a ausência de flags.

- [x] Compartilhar a seleção explícita das capacidades entre a montagem real e as provas, sem repetir números divergentes.
- [x] Provar que o host público lê e reexporta os três documentos completos sem rebaixamento, mas recusa criar/editar nativo 9 antes da entrega B. O backup integral e a recuperação também passaram nas suítes existentes.
- [x] Provar armazenamento frio, fila após interrupção, repetição de confirmação e edição offline na mesma autoridade, sem canal de upload paralelo; gravador 8 somente na fixture de qualificação.
- [x] Provar que o leitor 7 é recusado quando o piso sobe a 8, tanto num aparelho vazio quanto numa aba que compartilha a fila.

### 3. Qualificação e registro da entrega A

- [x] Executar testes focados de protocolo, BFF, conta, persistência e recuperação, depois os conjuntos relevantes completos de Pinta, Core e Member Shell. Condicionais e tentativas anteriores discriminados no recibo.
- [x] Executar tipos dos pacotes tocados, Biome e conferências dos gerados afetados.
- [x] Executar guardas das aulas antes de integrar: `bun test docs/aulas-interativas-tecnico/qa`, `protected-lessons.spec.ts`, `ilha-do-farol-browser.ts`, pelos comandos oficiais do repositório. Cinco aulas e sete objetivos de execução aprovados no Chrome.
- [x] Registrar o resultado real, limitações e código no plano gradual. Não marcar LG05 entregue nem anunciar o gravador 8.
- [ ] Qualificar e implantar o leitor compatível antes de ativar a entrega B. Registrar fonte, serviços e retorno compatível; a implementação local não comprova deploy.

## Entrega B — autoria e destinos públicos

Depende da entrega A qualificada. Não é substituída pela elevação de constantes.

- [ ] Integrar abertura/edição dos mapas projetados à oficina com persistência transacional, desfazer/refazer, coordenadas e seleção próprias de cada projeção. Preservar livros e dependências.
- [ ] Qualificar captura, PNG 6/cena 5 e destinos compatíveis usando a mesma admissão integral; explicitar recusas dos destinos incompatíveis. Não achatar o material.
- [ ] Provar importar → editar → salvar → fechar → reabrir em contexto vazio → exportar → usar no Estúdio → publicar/atualizar no mesmo link com preservação autoral. Publicação hospedada de QA depende da autorização específica do projeto preparado.
- [ ] Só então elevar o escritor causal a 8 e o teto público a 9, com retorno para o leitor A. Manter a distribuição Python na LG08.
- [ ] Qualificar CI, staging e produção separadamente e atualizar LG05 no plano geral somente após observar a entrega.

## Acompanhamento

27/11: plano geral reconciliado com LG03/LG04 e autorização de execução LG05. Base focada: 15 testes, 188 expectativas, zero falhas. Leitor A implementado e qualificado localmente: Core 3.371, Pinta 3.010 aprovados/18 condicionais, Member Shell 2.832 aprovados/dois condicionais; 893 guardas, cinco aulas e sete objetivos do Farol aprovados. Tipos, Biome e gerados aprovados. [Recibo local e limites](../../qa/2026-11-27-lg05-leitor-compativel.md). Qualificação hospedada do leitor A, entrega B e liberação pública pendentes.
