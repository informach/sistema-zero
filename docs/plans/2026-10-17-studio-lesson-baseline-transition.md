# Continuidade dos projetos de aula na transição JS/Python

O vínculo da aula tem duas partes: uma configuração de autoria compartilhada e imutável, sem fonte de aluno, e a referência por perfil/conta/bloco. A sala ao vivo também identifica o workspace. Renovar matrícula ou publicar uma nova semente não substitui o vínculo existente. Novo bloco de uma cadeia só entra se o ambiente for compatível.

## Projetos anteriores à mudança

Antes desta implementação, o produto não registrava a configuração autoral que originou cada rascunho. Datas de envio, hashes de conteúdo e o código do aluno não permitem reconstruir quais modos ou blocos estavam liberados. Não tratamos esses dados como prova de permissão histórica.

Na primeira abertura sem vínculo, o servidor propõe a configuração atualmente publicada e autorizada para aquele bloco, sem gravar um vínculo. O editor confere o trabalho local, da conta ou já entregue; somente depois solicita a confirmação com o identificador da configuração e uma referência restritiva do ambiente, sem fonte ou curadoria. O servidor revalida acesso, publicação e compatibilidade antes da admissão. Uma tentativa incompatível, uma consulta à conta indisponível ou uma confirmação obsoleta não fixam uma nova baseline.

Essa operação é uma **adoção atual**, não uma reconstrução histórica. Os projetos JavaScript Clássico existentes continuam no mesmo ambiente; a fonte e os materiais do aluno são conservados. Daí em diante, alterações na publicação preservam a configuração vinculada. Duas aberturas concorrentes convergem para o primeiro vínculo confirmado. Uma configuração apenas proposta não habilita execução Pro nem fica disponível no cache offline; isso exige admissão confirmada.

Se o aplicativo oferece rascunhos na conta, mas o navegador não suporta esse canal, a primeira admissão também é recusada: não conseguir consultar não significa que a conta está vazia. Um vínculo já confirmado continua permitindo retomar o trabalho local. Aplicativos que deliberadamente não oferecem esse canal mantêm seu fluxo local. Ao tentar novamente uma admissão, o editor busca uma proposta atualizada.

Se um projeto anterior usa outro ambiente/template, ele não é convertido nem substituído pela semente. A abertura informa a incompatibilidade e oferece baixar o documento preservado como `.szproject.json`, usando a validação e o formato de importação do Estúdio. A cópia original continua guardada. Na sala, o workspace existente continua disponível na biblioteca pela sua identidade, com as regras de leitura/exportação já existentes. Retomar a atividade naquele bloco depende de a equipe oferecer uma atividade compatível; não se concede um novo runtime a partir de um documento enviado pelo cliente.

Essa fronteira também vale para um formato futuro ou corrompido: não se promete recuperá-lo com uma versão do editor incapaz de validá-lo. Nada é sobrescrito pela tentativa. Um histórico anterior que nunca foi persistido não pode ser inventado.

## Consulta offline

Depois de uma abertura online, o navegador pode guardar a configuração de autoria por perfil/aula/bloco. Se o serviço não responder, só abre um projeto já existente neste aparelho e compatível com essa configuração. Não cria projeto novo offline nem usa o cache como permissão de execução remota. Uma recusa explícita do servidor prevalece sobre o cache.

A recuperação offline não repete a consulta inicial à nuvem. A sincronização posterior usa o protocolo existente de revisões e conflitos e não confirma uma revisão que não foi lida. A cópia secundária é conservada. Cache limitado a 20 configurações, até 2 MB cada; não armazena a fonte do aluno.

## Evidência local

- PostgreSQL real: vínculo atômico, separação de proprietários, fence de exclusão, ambiente incompatível na cadeia e consultas de predecessor usando a configuração vinculada. Migration0129 gerada e aplicada idempotentemente pelo migrator.
- HTTP: configuração original após republicação, separação entre alunos, acesso/partes fechadas e suporte somente leitura; entregas Python Clássico e Pro.
- Persistência: projeto local, nuvem e envio incompatíveis são recusados antes de gravações ou confirmação de revisão; o documento fica disponível para recuperação explícita.
- Offline: falha antes/depois dos headers, timeout, JSON inválido, cancelamento, recusas de acesso, ausência de cópia local e perfil diferente.

Essa evidência não substitui a qualificação integrada de navegação, publicação no Mural, exportação nativa e desempenho, ainda pendente no plano integral.
