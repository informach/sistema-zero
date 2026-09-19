# Arquivos da aula: uma fonte, usos independentes

## Decisão aprovada

A biblioteca de arquivos pertence a **uma aula**, não ao curso inteiro. O arquivo é enviado uma vez e pode ser escolhido por vários blocos dessa mesma aula. O bloco Livro 3D, o bloco Materiais complementares, o Zappy e os critérios de avanço têm papéis independentes.

## Problema atual

- O upload do Livro 3D cria automaticamente um anexo e um item em Materiais complementares. Isso mistura apresentação e download.
- O Livro 3D guarda a localização do PDF, enquanto Materiais complementares aponta para o anexo da aula. A mesma fonte tem duas representações.
- A marcação `Caderno do aluno` para o Zappy existe apenas no Livro 3D.
- A validação da seção `Material do curso` aceita apenas Livro 3D como critério, embora o editor também ofereça downloads de Materiais complementares. O critério aparece desabilitado com mensagem confusa.

## Modelo de autoria

Evoluir a aba atual de anexos para **Arquivos da aula**. Cada arquivo enviado tem uma identidade estável, nome, tipo, tamanho e localização privada. PDFs podem receber a marcação explícita **Caderno do aluno para o Zappy**. A ficha do arquivo mostra onde ele é usado: Livro 3D, download em Materiais complementares e fonte do Zappy. Um arquivo pode ter mais de um uso.

Somente arquivos enviados para download ou leitura entram nessa biblioteca. Texto, link, vídeo incorporado e imagem exibida diretamente continuam como itens do bloco Materiais complementares. Uma imagem oferecida para download é um arquivo da biblioteca; uma imagem apenas exibida na aula permanece no bloco. A biblioteca não vira um segundo editor dos conteúdos do bloco.

O envio pode começar na aba Arquivos da aula ou dentro de um bloco; ambos criam o mesmo tipo de arquivo na biblioteca da aula. Um bloco também pode selecionar um arquivo já enviado, sem novo upload.

## Blocos e aluno

- **Livro 3D:** seleciona um PDF da aula e o renderiza. Mantém a leitura por páginas e o próprio botão de download protegido. Não cria automaticamente um item de Materiais complementares.
- **Materiais complementares:** itens do tipo arquivo selecionam anexos da aula de qualquer tipo permitido para download. Os outros tipos de item continuam sendo editados no próprio bloco. Só os arquivos selecionados explicitamente como critérios tornam o download obrigatório.
- **Zappy:** a opção Caderno do aluno fica no PDF da biblioteca, independentemente de ele aparecer no Livro 3D. A indexação usa apenas a versão publicada e precisa ser atualizada quando o PDF ou essa opção mudarem.

## Avanço da seção

Em `Configurar avanço`, o Admin mostra ações concretas dos blocos da seção: acessar o Livro 3D (abrir ou usar seu download protegido), baixar cada arquivo explicitamente selecionado em Materiais complementares e os demais critérios existentes. A seção `Material do curso` aceita Livro 3D, downloads e vídeo, isolados ou combinados. Critérios combinados exigem todos os itens marcados; o resumo e a publicação deixam isso explícito. Nenhum arquivo se torna obrigatório só por ter sido anexado ou mostrado.

## Segurança, integridade e dados existentes

Os arquivos continuam privados. Downloads de PDF passam pela entrega com marca d'água do comprador e falham fechados se ela não puder ser aplicada. Um arquivo referenciado não pode desaparecer silenciosamente: a autoria mostra seus usos e impede exclusão sem antes remover as referências. Trocar o arquivo mantém sua identidade e atualiza todos os usos, desde que o tipo continue compatível; caso contrário, a publicação aponta a incompatibilidade.

Converter os PDFs e anexos já publicados e em rascunho para o vínculo por identidade, preservando títulos, ordem, referências, critérios de avanço, marcações de Caderno do aluno e texto do PDF já extraído para o Zappy. Essa conversão não deve exigir novo upload nem alterar o conteúdo que o aluno já recebe. O vínculo automático Livro 3D → Materiais complementares deixa de ocorrer apenas para novos uploads; os materiais já existentes permanecem até que a autora os edite.

## Experiência visual

O Admin mantém seus componentes e tokens atuais: superfícies brancas, texto azul-escuro, azul de ação, amarelo de destaque e cinzas de apoio. A ficha de cada arquivo substitui a lista genérica de anexos por nome, papel pedagógico e usos na aula. Não há paleta nova. A confirmação de avanço usa os nomes reais dos arquivos, não regras técnicas internas.

## Verificação

- Autoria: upload único, seleção em mais de um bloco, restrição PDF no Livro 3D e no Zappy, remoção e troca segura.
- Publicação: seção `Material do curso` com apenas downloads, apenas Livro 3D ou ambos; mensagens e resumos claros.
- Aluno: renderização 3D, download, marca d'água e progresso independente de cada critério.
- Zappy: indexação, atualização e remoção da fonte conforme a versão publicada e a marcação do PDF.
- Regressão: aulas existentes mantêm acesso e progresso; nenhuma alteração paralela da outra sessão é incorporada por acidente.
