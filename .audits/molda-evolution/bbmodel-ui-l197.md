# Revisão bbmodel na oficina — lote 197

Implementação e verificações concluídas; homologação visual/hardware permanece pendente.

## Direção de interface

Criança a partir de 9 anos trazendo uma criação para montar e pintar. Precisa
entender o que vai entrar, ver a aparência e poder voltar sem perder o que fez.
Vocabulário: oficina, peças, pintura, grupo, movimento, prévia e desfazer.
Mundo de cores existente: céu suave, papel branco, tinta azul-escura, azul de
ação, laranja de pintura; perigo usa vermelho com mensagem, nunca só cor.
Reusar tokens mld, Nunito/Baloo herdadas do host, bordas e superfícies suaves,
espaçamento em múltiplos de 4 px e alvos de pelo menos 44 px.

Assinatura: uma bancada de ensaio antes de substituir a criação. Aparece na
preparação separada, prévia somente leitura, relatório de adaptações, download
dos originais, consentimento e uma única ação desfazível. Formulário gigante
de codec vira grupos por pintura/peças/conteúdo deixado fora; jargão cru vira
explicação de efeito; importação imediata vira preparação mais confirmação.

Alternativas consideradas: fluxo próprio (mais duplicação e novos estados),
assistente automático que aceita perdas (oculta decisões), composição no fluxo
existente (escolhida, preserva expectativas e guardas). Não há nova etapa de
aprovação da usuária entre lotes, conforme sua autorização de execução contínua.

Componentes novos de escolhas/arquivos/status mantêm a intenção, paleta,
profundidade, superfícies, tipografia e escala acima. Controles semânticos e
estilos existentes de importação têm prioridade para manter teclado/toque e
consistência com a plataforma, sem introduzir outro sistema de dropdowns.
Prévia e relatório reutilizados não recebem novo tratamento visual.
Os ajustes de aparência sugeridos são visíveis; omissões continuam recusadas
por padrão. Sem promessa de aparência idêntica, animação de peças, camadas ativas
ou PBR completo.

## Sequência e verificação

1. Adaptador local bbmodel e fluxo de arquivos compartilhado com OBJ, mantendo
   sessão/revisão, cancelamento e consentimento existentes.
2. Interface lazy, escolhas e cópia completa dos diagnósticos; originais,
   resumo de custos e prévia antes de substituir.
3. Exercitar worker real + UI, políticas/limites, mudanças de formato, interrupções,
   troca de editor, guardas reentrantes e undo/redo; regressões OBJ/glTF.
4. Review e verificações integrais. Browser indisponível desde o lote 160;
   testes DOM/CPU não substituem inspeção visual/GPU/hardware.

## Implementação e review

Painel bbmodel lazy no seletor comum, sem ativar formato público. Adaptador de
arquivos locais compartilha o preflight de metadados/tetos antes do primeiro IO;
append conserva buffers anteriores da sessão. Não há procura automática por nome
base, alteração dos arquivos originais ou fallback após recurso inválido/faltante.

Extraído useSceneFileImport do hook OBJ, com adaptadores estáveis, opções de
entrada/normalizadas e resultado tipados. Mantém sessão/revisão/generation,
worker próprio, cancelamento e confirmação existentes; glTF conserva sua etapa
adicional de inspeção. Componentes de arquivos/seleção/status e choice controlada
também compartilhados com OBJ. Regressões originais mantidas e passando.

Todas as 25 folhas de opções do codec têm representação: 22 descritores tipados,
preferência de origem, cor RGBA e lados sem textura. Teste compara esse inventário
ao normalizador e confere que cada alternativa muda somente a folha declarada.
Iluminação/normais nativas, lados automáticos duplos e branco sem textura são
sugestões visíveis, não detecção. Omissões e demais incompatibilidades continuam
reject por padrão. Nenhum preset aceita todas as perdas automaticamente.

Cor do seletor é sRGB de tela; converte para RGB linear nativo ao escolher uma
nova cor, sem transformar alpha. Só mostrar uma cor não quantiza o dado. Mudar
apenas alpha preserva todos os canais RGB de precisão completa e vice-versa.
Teste direto com números não representáveis em 8 bits confirma a separação.

Relatório exige cópia para todo código do produtor, resumo de custos/omissões,
prévia somente leitura e consentimento antes de um commit. Lista técnica limitada
a 50 avisos na tela, download completo e download dos bytes originais intactos;
texto de arquivo/caminhos não vira HTML. Troca de formato desmonta o hook/worker
e a prévia, descartando preparação e consentimento sem mudar o documento.

## Evidências

11 regressões OBJ passaram após cada extração. Novos testes: 9 passes/78 asserts
de bundle/hook, 5 passes/82 asserts do painel, 2 passes/166 asserts de opções.
Fluxo com worker real, transação e undo/redo reais; só a porta GPU é substituída.
Inclui consentimento revogado, mudança de editor com mesmo ID, gate atual de pose
e mutação reentrante, campos de todas as políticas, recursos faltantes, download
integral, texto inerte, foco de retorno, erros e troca de formato durante IO.

Tipos e Biome (1.029 arquivos) passaram. Uma asserção de igualdade dos testes
precisou expressar Record versus resultado tipado no sentido compatível com os
overloads de Bun; produção não mudou. Focal ampliado: **158 passes, zero falhas,
2.496 asserts, 11 arquivos, 14,61 s**. Integral: **2.431 passes, zero falhas,
327 arquivos, 8.322.853 asserts, 146,85 s**, exit 0. Vite 1,23 s; painel bbmodel
lazy 46,27 kB e worker próprio 171,09 kB, alcançáveis pelo seletor. Extração do
fluxo compartilhado gerou chunk de 5,69 kB e painel OBJ passou de 42,93 para
38,32 kB; isso não é benchmark nem prova de aceleração. CSS 53,82 kB, entrada
principal 360,81 kB e aviso Three 579,29 kB mantidos. Kids: compilação 6,1 s,
tipos 9,0 s, 59 páginas em 663 ms, exit 0. Diff passou com os três avisos CRLF
anteriores. Nenhuma dependência nova, ativação pública ou benchmark.

## Limites mantidos

Importa cópia de modelos free com geometrias/hierarquia/pintura e dados de flipbook.
Movimentos de peças ainda só podem ser recusados ou explicitamente omitidos;
controladores/Molang não são executados. Camadas ativas e PBR completo continuam
pendentes. Não há homologação visual infantil, GPU, toque ou benchmark neste lote.
