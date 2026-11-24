# Lote 8 — Garantias iniciais de geometria, licenças e orçamento

18/11/2026 · `staging` após `dac38c6ee` · **8.1 em andamento; lote 8 aberto.** Este recorte implementa regras puras do compilador, sem declarar um exportador v2 ou o manifesto final pronto.

O subpath `@sistemazero/molda-cenarios-core/compilar` começa com funções compartilháveis por todos os destinos:

- `dividirMalhaParaExportacao`: divide por triângulos, remapeia índices em Uint16 e conserva atributos numéricos decodificados, winding e costuras. Até 65.000 vértices e 390.000 índices por parte, com orçamento explícito de fonte/saída e número de partes. Não altera buffers originais nem funde vértices por proximidade. Fontes enormes são recusadas antes da leitura dos valores; a conta de saída inclui duplicações nas juntas.
- `conferirLicencasDaCompilacao`: usa apenas bibliotecas referenciadas, recusa ausentes/duplicadas/licença inválida e impede exportar recursos restritos sem equipe. A conferência retorna identificação nominal. O serviço construirá o contexto a partir do ator/revisão reais; o helper não transforma uma declaração do cliente em autorização.
- `avaliarOrcamentoDaCena`: mede malhas e bytes finais, soma conteúdo existente no destino Estúdio e informa separadamente excedentes de malhas, modelo, projeto e pacote. Usa os tetos previstos de 48 malhas, 5 MiB/modelo e 24 MiB/projeto; os limites adicionais da representação de assets do Estúdio também serão respeitados na integração. Exceder o Estúdio não bloqueia um destino externo válido. Junção é sugestão para avaliação, não alteração automática ou promessa de resolver bytes excedidos.
- `conferirCaminhoCompilado`: recusa URL, caminho absoluto, segmentos vazios/traversal e nomes não portáteis. Caminhos duplicados são recusados também por diferença apenas de maiúsculas/minúsculas, evitando pacotes incompatíveis com Windows.

Os limites de trabalho estão centralizados. O teto de pacote externo é 256 MiB; uma fonte/saída numérica de malha tem teto de 128 MiB e até 8 milhões de vértices de origem. Esses são limites de compilação, não aprovação de desempenho de um jogo.

## Verificação e revisão

Os testes específicos falharam inicialmente porque os módulos não existiam e passaram após a implementação. **15 testes / 88 verificações** cobrem 65.000/65.001 vértices, fonte sem índices/vazia/densa, winding, UV/normal/tangente, invalidade numérica/layout/índices, limites antes da leitura e amplificação de buffers na divisão; licenças e três tetos independentes do Estúdio; destinos e caminhos inválidos/duplicados.

Suíte completa do núcleo: **318 testes / 10.452 verificações**, zero falhas. Tipagem e Biome aprovados. Revisão acrescentou a contagem de bytes gerados nas juntas, um teto de índices/partes e a validação de contexto de licença em execução. Não houve alteração de SQL, motor, interface ou dados de conta neste recorte.

**Próxima tarefa exclusiva dentro de 8.1:** contrato/leitor da cena portátil e preparação de conjuntos, apoios, metadados e dependências usados. Depois, materialização pelo motor em 8.2. [Plano integral do lote 8](../../superpowers/plans/2026-11-18-cenarios-lote8-exportacao.md). Lotes 0–7 continuam fechados localmente; 8–10 e encerramento global pendentes.
