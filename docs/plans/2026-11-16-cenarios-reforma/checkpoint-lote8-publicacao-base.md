# Lote 8.5 — Base da publicação versionada

19/11/2026 · implementação local · `staging` · **8.5 em andamento**

## Implementado neste recorte

- Entrada restrita `molda-cenarios-core/publicacao`, separada dos SDKs do Studio. O pedido fixa ilha, revisão salva, digest da fonte, manifesto, versão esperada e operação UUID. Somente os sete territórios da V2 são destinos.
- Captura dos dados e dos bytes antes dos awaits, SHA-256 do manifesto, leitura UTF-8 estrita, conferência da fonte e inventário deduplicado por conteúdo. O pedido não aceita autor ou espaço informados pelo navegador.
- Serviço de publicação exige equipe sem suporte e ferramenta aberta. Reutiliza `ExportacaoDeCenariosService.preparar` para autorização, revisão, licenças e arquivos da fonte. Recusa fonte do espaço pessoal e procedência diferente da revisão salva.
- Reserva do manifesto e lotes de até 50 recursos no armazenamento/cota existentes. GLBs e imagens já confirmados podem ser reaproveitados, com mesmo tamanho e MIME. Os formatos autorais de terreno continuam distintos dos dados físicos compilados.
- Verificação server-only do pacote no BFF: lê os objetos pelo digest, confere tamanho/MIME/hash, fecha streams em falha/cancelamento e chama `conferirConteudoCompilado`, sem outro parser de GLB/terreno.
- Repositório PostgreSQL de versões, recursos e apontadores. Usa a mesma trava do espaço da autoria e uma trava do perfil. Reconfere fonte/licenças/arquivos, confirma os uploads e troca o apontador em uma transação. Repetição idempotente precede o CAS; outra operação com versão vencida não sobrescreve a corrente.
- Todas as versões mantêm referências aos blobs. A limpeza canônica respeita essas referências e as FKs também impedem remover arquivos publicados. Apagar a fonte ou biblioteca não apaga a publicação nem retira seus bytes da cota.

## Migração

`0164_cenarios_publicacoes`, gerada por `bun run db:generate --name cenarios_publicacoes`, depois da `0163_commerce_blocks` já versionada. Cria três tabelas e amplia somente os tipos compilados fechados de `cenario_blobs`. Não faz backfill nem remove dados da plataforma.

A revisão do primeiro rascunho detectou a ordem de criação dos índices usados por FKs compostas. A definição passou a usar constraints únicas da própria tabela e os artefatos não versionados foram regenerados pelo script. Outra prova vermelha demonstrou que MIME nulo precisava de uma constraint explícita para os novos tipos; a migração foi novamente regenerada. **Nenhum desses rascunhos foi implantado.** A versão atual passou contra PostgreSQL local descartável.

## Evidências locais

| Verificação | Resultado |
| --- | --- |
| Núcleo completo, `bun test` | 361 testes, 10.652 verificações |
| Motor completo, `bun test` | 255 testes, 5.234 verificações |
| Serviço/publicação/histórico, três arquivos | 46 testes, 167 verificações |
| Conteúdo BFF existente e publicação | 15 testes, 53 verificações |
| Publicação no PostgreSQL real | 8 testes, 28 verificações |
| Regressão do repositório existente no PostgreSQL | 42 testes, 378 verificações |
| Tipagem focada de serviço/repositório/testes | Aprovada |
| Tipagem completa do núcleo | Aprovada |
| Tipagem focada do novo leitor BFF, com `noUncheckedIndexedAccess` | Aprovada |

Os ensaios de banco usaram exclusivamente os bancos locais descartáveis `cenarios_publicacoes85` e `cenarios_regressao85`, no PostgreSQL do ambiente de desenvolvimento. As credenciais não foram gravadas nem impressas. Para reproduzir, fornecer `CENARIOS_TEST_DATABASE_URL` de um banco local `cenarios_*` e executar cada arquivo de banco separadamente.

Os logs ficam em `output/cenarios-reforma/lote8-raylib/publicacao-*.log`, fora do Git. Os testes e a migração estão versionados como evidência reproduzível, sem bytes de arte paga.

No diagnóstico do teste negativo de banco, `await expect(promise).rejects.toThrow()` impedia o término normal da consulta nesta execução do Bun. Separar o await da operação e verificar a classe do erro resolveu o ensaio isolado em 422 ms; a suíte completa voltou a passar com o timeout normal de 5 s. Nenhuma alteração de timeout ou desvio no código de produção foi mantido.

## Pendências que impedem fechar 8.5

- Rotas Members/HMAC, composição, allowlist do gateway e autorização da leitura publicada do jogo.
- Fluxo de confirmação da versão concreta na oficina, hosts HTTP/memória e interface de publicação.
- Perfil/consumidor nativo no Arquipélago com o controlador/Rapier, câmera e sistemas existentes.
- Ensaios reais no `/macro`, capturas/vídeos, reentrada e troca de versão, e regressão integrada.
- Tipagem completa do Members/BFF/builds. A primeira checagem global do Members esgotou o heap padrão do Node; a segunda foi interrompida durante pressão de recursos. **Não estão aprovadas por substituição pelos checks focados.**
- Review e fechamento integrado de 8.5/8.6, lotes 9–10, composição final da Faísca, full review, CI e implantação/validação em staging no encerramento global.

Este recorte não liga endpoints, não altera o `/macro`, não muda a campanha ou o inventário e não abre a oficina para membros. Não representa aprovação artística nem implantação.
