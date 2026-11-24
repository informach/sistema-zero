# Lote 1 concluído: implementação, testes e revisão

Data: 17/11/2026. Base: `staging`, `3beeaf9ad`. Critério confirmado pela usuária: cada lote fecha após implementação, testes e revisão; a tarefa global fecha somente depois de todos os lotes, full review, implantação e validação em staging.

## Entrega conferida

Módulo Members com espaços, bibliotecas, modelos, mundos e cenários; gateway e BFF com autorização, cotas, envio direto assinado e conferência de integridade; palco Three genérico separado do Arquipélago; quatro telas com a composição aprovada, gaveta, importação de GLB e edição básica de objetos; rotas nas comunidades adulta e Kids, restritas à equipe. O CLI e o MCP existentes usam a API nova.

A revisão requisito por requisito está em [carregamento e agentes](revisao-lote1-carregamento-agentes.md). As [capturas e provas nos dois apps](revisao-lote1-dois-apps.md) cobrem os fluxos básicos já implantados; os resultados locais da integridade mais recente estão em [revisão do contrato](revisao-integridade-importacao.md). A corrida de reentrada de modelos foi reproduzida e corrigida, com evidência antes/depois. A última conferência corrigiu somente a formatação dos três JSONs dessas evidências, sem mudar seus resultados.

## Verificação final local

| Área | Testes aprovados | Asserções |
|---|---:|---:|
| Núcleo | 51 | 122 |
| Motor | 10 | 34 |
| Oficina e cliente HTTP | 33 | 157 |
| Agentes | 8 | 40 |
| BFF e conteúdo | 26 | 108 |
| Members serviço e HTTP | 32 | 111 |
| Repositório em Postgres descartável | 12 | 76 |
| Rotas e política do gateway/Kids | 5 | 182 |
| **Total desta conferência** | **177** | **830** |

Tipagem do núcleo, motor, oficina e agentes passou. O lint global passou sobre 15.043 arquivos, sem erros. As verificações anteriores de tipagem Members/member-shell, imagem Members e navegador permanecem registradas nas revisões vinculadas; não foram substituídas por testes fictícios ou por exclusão de checagens.

O Postgres usado foi exclusivamente o container descartável na porta 55439, banco `cenarios_reforma`. Nenhum banco real da plataforma foi recriado. Os ensaios autenticados anteriores limparam seus objetos temporários; credenciais e arte licenciada permanecem fora do Git. As capturas de interface e toque emulado não representam testes em aparelhos físicos.

## Pendências globais explícitas

Estas pendências não bloqueiam a sequência dos lotes, por orientação da usuária, nem podem desaparecer da entrega final:

- Concluir todos os lotes 2–10 e fazer o full review da ferramenta integrada.
- Obter CI completo verde e implantar Members, gateway e apps com contratos compatíveis. O último CI falhou na formatação das três evidências, corrigida nesta passada, e na preparação do playground do Estúdio/WebKit, antes de executar os testes (build excedeu a janela de inicialização de 120 s). Investigar e validar essa preparação na etapa global; não pular o job.
- Conferir os commits realmente implantados e executar `CENARIOS_QA_EXIGIR_INTEGRIDADE=1` no ensaio completo dos dois apps. Os fluxos básicos remotos anteriores e a prova direta de PUT condicional no R2 não substituem essa passagem.
- Manter `CENARIOS_MODO=equipe`, sem abertura a membros ou publicação em produção.

**Decisão:** lote 1 concluído no critério de implementação, testes e revisão. A tarefa global permanece aberta. Próximo e único lote em execução: 2, bibliotecas completas.
