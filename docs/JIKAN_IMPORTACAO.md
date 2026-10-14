# Importação e atualização via Jikan

O painel administrativo, na aba **Importação**, oferece uma fonte Jikan independente da importação legada.

- **Catálogo completo:** varredura paginada por identificador MAL, com 25 registros por página.
- **Temporada atual:** consulta `/seasons/now` para inserir e atualizar títulos da temporada.
- **Importar uma página:** executa apenas um lote; **Retomar** continua a partir da última página salva.
- **Pausar:** conclui a página em andamento antes de interromper. Fechar a tela também impede novas páginas.
- **Reiniciar progresso:** não apaga registros do catálogo.

O Jikan não oferece um feed de alterações equivalente ao delta da fonte legada. Atualizar aqui significa consultar novamente o catálogo completo ou a temporada atual; não há remoção automática de títulos ausentes.

## Conteúdo preservado

O importador nunca envia `synopsis_pt`. Títulos e sinopses já preenchidos também são omitidos das atualizações, independentemente do idioma, evitando substituir conteúdo editorial em PT-BR. Gêneros e estúdios existentes são preservados; novos registros recebem os dados da fonte. Notas, episódios, situação e outros metadados são atualizados.

As capas HTTPS do CDN do MAL são baixadas em grupos limitados e salvas no armazenamento de imagens existente. Falhas de download não apagam a capa anterior; a URL original permanece disponível. Tipos Music, CM e PV são excluídos.

## Segurança e execução

Todas as ações exigem sessão válida e papel de administrador verificado no servidor. O estado `jikan_import` é separado da importação legada. A aquisição condicional do estado impede páginas simultâneas. Uma chamada do Jikan por página, com intervalo mínimo conservador de 1,2 segundo, respeita os limites documentados de 3 consultas/segundo e 60/minuto. Erros interrompem a sequência sem repetição automática infinita.

Uma importação completa somente continua enquanto a tela estiver aberta. A retomada é manual após interrupção, indisponibilidade ou limite de consultas. Não foi adicionado agendamento automático.

## Opções de tradução automática pesquisadas

Nenhuma tradução foi ativada nem credencial solicitada. Os serviços abaixo utilizam modelos de tradução automática, mesmo quando não são ferramentas de IA generativa.

| Opção | Português | Requisitos e observações |
| --- | --- | --- |
| DeepL API | Variante explícita PT-BR | Conta e chave de API. Plano Free documenta 500 mil caracteres/mês; confirmar disponibilidade e condições na contratação. |
| Google Cloud Translation | Português; conferir variantes do modelo escolhido | Projeto Google, faturamento e credencial. A tabela de preços distingue tradução padrão e modelos avançados. |
| LibreTranslate | Idiomas dependem dos modelos instalados | Hospedagem própria ou serviço contratado. Confirmar PT-BR na instância antes de escolher; hospedagem própria tem custos operacionais. |

**Recomendação:** avaliar DeepL pela variante PT-BR, traduzindo somente `synopsis_pt` vazio em lotes e persistindo o resultado. Qualquer integração deve ser aprovada antes de enviar textos para um serviço externo, com custos e tratamento de dados definidos. Preservar as traduções existentes continua obrigatório.

### Fontes

- [Jikan: documentação e limites](https://docs.api.jikan.moe/)
- [DeepL: variantes de idioma](https://developers.deepl.com/docs/learning-how-tos/examples-and-guides/customizations-for-variants)
- [DeepL: planos da API](https://support.deepl.com/hc/pt-br/articles/360021200939-Planos-da-API-do-DeepL)
- [Google: preços](https://cloud.google.com/translate/pricing?hl=pt-br)
- [Google: idiomas](https://docs.cloud.google.com/translate/docs/languages)
- [LibreTranslate: documentação](https://docs.libretranslate.com/)