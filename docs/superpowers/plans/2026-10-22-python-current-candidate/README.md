# Candidata Python atual

Este diretório contém o plano **offline** da implantação inicial atual. Ele foi
gerado pelo promotor canônico sobre uma configuração Python vazia; não é uma
leitura das variáveis ou do estado remoto de staging. Não deve ser aplicado sobre
uma configuração existente sem conferir e conciliar explicitamente esse estado.

Leitura remota em 22/10/2026, após o usuário corrigir o login Railway:
Members, Community, Community Kids e Admin de staging não possuem as variáveis
`STUDIO_AUTHORING_POLICY_JSON` e `STUDIO_RUNTIME_HOSTS_JSON`. O Worker staging
está na versão `97cbc9af-1659-4db7-bfa0-9e841a757510`; seu catálogo R2 observado
tem SHA `40ce822aab07184da90bec7a0902296d4889c011740063be6c859bc5b60c57b2`
e contém a release Python `2026-10-19-1`, cujos metadados antecedem o contrato
atual. O download foi conferido pelo hash, sem alterar o objeto. Não transformar
esse catálogo antigo em um baseline atual por conversão: a troca da configuração
Python não ativada precisa ser explícita, mantendo JavaScript e a origem do
runtime. Nenhuma variável, chave, release ou namespace remoto foi alterado por
essas consultas. O plano abaixo continua offline até essa conciliação.

- Distribuição: `476d32e78da6b528730b8b0535ad026f64fe4e61c03f20a195a7438bc56ace2c`.
- Release: `python-browser/2026-10-22-visual-games-3`.
- Manifesto: `bc5710a137facb82e4f1a24df6e370406217f5fc4707c64861adf381d10d3e80`.
- Plano: `57e25c2c3fd303e4ede148d211f8bb1942d7c3a37b507869f6628e37837487b5`.
- Paleta de autoria: 256 IDs (os 255 da candidata anterior mais `sz_py_lambda`).

Em relação à candidata anterior (`e3188c84…`, release `-2`), mudou um arquivo
da distribuição: `turtle-renderer.mjs` (com sua cópia gzip e o `distribution.json`
que lista os hashes). O canvas descarta traços de comprimento zero, então
`turtle.dot()` não pintava nada no navegador; o renderizador agora pinta o disco,
como o Tk. A construção foi reproduzida duas vezes com o mesmo hash a partir dos
inputs fixados. A release nova também carrega a paleta com herança no bloco de
classe e o bloco de função rápida (`lambda`).
- 41 arquivos; CPython 3.14.2/Pyodide 314.0.7, Turtle com formas compostas e
  módulo portátil `sz_audio` explícito. As versões efetivas são verificadas pelo
  builder e pelo protocolo de análise.

`canonical-plan.json` é a referência atual dos comandos locais, da reprodução e
do relatório F1. Os planos anteriores são somente evidência histórica e não
fornecem defaults, conversores ou caminhos alternativos ao runtime atual.

## Reproduzir em outro computador

Use Bun **1.3.11**, Node **24** e as dependências do lockfile. Na raiz do checkout,
escolha diretórios novos para cada construção:

```powershell
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts fetch-vendor --vendor .cache/python-current-inputs/vendor
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts build --vendor .cache/python-current-inputs/vendor --output .cache/python-current-build
```

O primeiro comando obtém somente os sete inputs oficiais fixados. O segundo
prepara a biblioteca padrão com o compilador fixado, confere os inputs e exige
o hash exato acima; divergências interrompem a construção e preservam o recibo.
Não é necessário transportar um ZIP privado desta máquina. Uma biblioteca padrão
preparada pode ser fornecida por `--stdlib ZIP`, mas será conferida pelo pin
versionado. Não substitua o pin por um resultado divergente.

Para a pilha local, use o diretório produzido como `--distribution`; o SHA do
plano continua obrigatório. Nenhum desses comandos ativa um catálogo remoto.

## Implantação

A autorização de implantação já faz parte do trabalho solicitado. A aplicação
ainda depende da leitura das configurações reais e dos gates técnicos abaixo:

1. Conferir o ambiente, o Worker, o bucket e as origens efetivamente usados.
2. Reconciliar explicitamente as configurações Python não ativadas que possam
   existir no Worker, Members e nos aplicativos. Preservar as configurações e o
   comportamento JavaScript. Não acrescentar leitores antigos ao código para
   acomodar configuração abandonada.
3. Gerar um plano canônico a partir dessa configuração conferida e do artefato
   atual. O caminho de artefato no plano deste diretório pertence à máquina que
   o gerou; promoção e upload revalidam os arquivos locais e o hash do plano.
4. Construir e qualificar a imagem atual do runtime; seu fingerprint é separado
   do hash da distribuição de navegador. Não usar uma imagem antiga.
5. Seguir [a troca de namespace do serviço de linguagem](../../../../packages/studio-language-service/DEPLOYMENT.md):
   pausar os callers, drenar sessões conhecidas e comprovar zero containers
   antigos antes de excluir o namespace anterior.
6. Executar os testes autenticados e de ciclo de vida no ambiente aplicado antes
   de considerar a ativação homologada.

A rotação de credenciais Railway está sob responsabilidade de outra sessão.
Este lote não altera chaves nem usa configuração não conferida para contornar
falhas de deploy.

## Evidências e limites

[Os recibos versionados](../../../continuity/2026-10-22-python-reference-games-visual-evidence/)
distinguem autoria, execução gráfica e isolamento. Os 20 recibos de autoria
vigentes usam a distribuição `476d32…` e o manifesto `bc5710…`, sem blocos opacos,
com roundtrip do workspace e reanálise da fonte. Explicitamente não certificam
execução nem capacidades do runtime.

Na conciliação de `dd8dc807a` com o lote de oficinas e CI, a distribuição atual
foi conferida novamente. O Turtle passou nos 24 testes de Chrome e Edge, sem
skips, falhas ou retries. Pac-Man, Space Arena e Cobrinha passaram nos seis
percursos Classic/Pro do Chrome: edição, Ponte no Classic, salvar/reabrir,
revisão exata, entrada causal em pixels e Stop. A sequência serial dos outros 17
exemplos também passou: no total, 40 percursos gráficos dos 20 jogos, sem falhas,
skips ou retries. Os processos e portas próprios foram encerrados em cada lote.
Os 204 testes nativos dos modelos dos 20 jogos também passaram, assim como a
tipagem completa do Studio e a conferência dos geradores. O
[recibo local atual](../../../continuity/2026-10-22-python-reference-games-visual-evidence/current-476-local-ui-r1.json.snapshot)
registra os 64 testes gráficos com os hashes dos relatórios originais.

`ui-r13`, a qualificação R4 e as reproduções de `e3188c84…` são provas históricas
da release anterior. Não qualificam o renderizador `476d32…`. A rodada parcial
dos jogos novos em `e3188c84…` teve três passes, uma falha de pixels em Spinner e
cinco skips; não é aceite gráfico da candidata atual.

Essas provas usam um host local controlado. Não substituem autenticação real,
isolamento de containers no provedor, medição F1/F3, áudio audível, teste no
computador de 8 GB ou aceite integrado de aulas/salas/Mural hospedados. A
validação no outro computador continua prevista para depois da validação local,
conforme combinado.
