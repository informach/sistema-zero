# Integração a2f0 — 20/11/2026

Lote publicado a2f0b0ab6 integrado sobre 5a7c15c0e, conservando os históricos.
Inclui somente fontes publicadas: correções de argumentos e cauda de blocos,
carregamento adiado do editor 3D, contratos de testes do aluno no documento,
rotas de retrato, ajustes visuais do Molda e suas fixtures/documentos. O trabalho
privado e não commitado das outras sessões não foi copiado nem alterado.

## Revisão e resolução

Foram dois conflitos. O teste da casca conserva o ramo WebDriver do Firefox,
com foco e teclas confiáveis em três ciclos. A confirmação explícita de foco do
remoto foi incorporada aos caminhos Chromium/WebKit, sem acrescentar o retorno
que dispensava a tecla no Firefox. O perfil foi regenerado pelo script oficial
após unir os contratos. O módulo Python gerado ficou idêntico ao publicado no
remoto; a comparação e os hashes estão em conflitos.json. Nenhum SDK/motor 3D
foi editado manualmente para esta integração.

O perfil combinado é 18aedaded74dfd6feb7cd37e91493f59939f216831c4c11e0e34765c18790976.
As imagens anteriores não qualificam este perfil. A distribuição Python 132
também precisa ter seus bytes conferidos contra a nova compilação antes de ser
ativada: o fato de já estar armazenada não substitui essa conferência.

## Verificação

Os 16 gates locais passaram, com o código congelado durante sua execução.
Os logs incluem o Core completo, argumentos/mutadores e blocos adiados,
validação dos projetos, componentes, Reino Zero, rotas e Worker, SDK/perfil,
ensaios em três motores de navegador, integração Pinta/Estúdio e tipos completos
de Estúdio/Members. Não somar wrappers e repetições como funcionalidades novas.
Os relatórios preservam os casos e os resultados individuais.

O ensaio Pinta/Estúdio usa um build próprio desta fonte e o Chromium fornecido
pelo Playwright 1.65.1. O caso Firefox usa o mesmo binário desse pacote e o
protocolo nativo documentado no lote anterior. Tudo foi executado nesta máquina
Windows. Não se afirma homologação física de Safari/iPad, outros aparelhos ou
participação infantil.

Esta prova não faz deploy. A CI geral remota, imagem Linux correspondente,
Reader A dos backends/aplicativos, seletor Python, gravador e o ciclo autenticado
com rollback continuam sendo os próximos passos. As pendências da missão,
inclusive etapa 8 e homologação integral, permanecem no plano principal.
Nenhuma produção ou Pull Request está incluída.
