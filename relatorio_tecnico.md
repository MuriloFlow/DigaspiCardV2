# Relatório Técnico: Arquitetura e Comportamento Atual do Sistema Card+

Este documento descreve o estado atual da aplicação, detalhando suas camadas de banco de dados, fluxos de autenticação, permissões de usuários e lógicas de negócio ativas.

## 1. Visão Geral da Arquitetura
A aplicação é construída com **Next.js 16 (App Router)** e hospedada na **Vercel**. O banco de dados utilizado é o **PostgreSQL gerido pelo Supabase**, acessado de forma segura no backend (Server Components e API Routes) através da **Service Role Key** (bypassando limitações públicas do RLS).
O frontend utiliza `Tailwind CSS`, `Framer Motion` e `Lucide React` para entregar uma experiência fluida, premium (glassmorphism) e gamificada.

## 2. Modelagem do Banco de Dados (Supabase)
O sistema suporta nativamente uma arquitetura *Multi-Tenant* (Rede de Lojas).
O esquema de tabelas atual (`supabase-setup.sql`) contém:

- **`stores`**: Cadastra as unidades da rede (ex: "Digaspi 41", "Digaspi 42").
- **`app_users`**: Armazena as credenciais de acesso ao sistema (Login, Senha em Hash BCrypt, Papel/Role e vínculo com uma `store_id`).
- **`collaborators`**: Funcionários/Operadores de caixa da empresa. Relaciona a uma loja, possui a flag `is_active` para Soft Delete e `merged_into_id` para Soft Merge.
- **`records`**: Tabela de registros de produção de cartões. Vinculada a um colaborador, armazena dados de produtividade, valor, status de ativação (`activated`) e também está preparada para referenciar uma loja (`store_id`).
- **`audit_logs`**: Tabela de rastreamento de ações sensíveis na plataforma.
- **Segurança (RLS)**: Row Level Security está **ativado** em todas as tabelas, negando 100% de acesso anônimo (cliente final). Toda leitura/escrita ocorre através das APIs Node.js autenticadas do Next.js.

## 3. Sistema de Autenticação e Autorização (RBAC)
O sistema não utiliza o Supabase Auth, mas sim um sistema de JWT customizado (usando a biblioteca `jose`).

**Fluxo de Login:**
1. O usuário submete usuário/senha em `/login`.
2. A rota `/api/auth/login` busca o usuário em `app_users`, verifica o hash da senha (Bcrypt) e gera um Token JWT contendo `userId`, `username`, `role` e `storeId`.
3. O token é persistido em um cookie `HttpOnly` e `Secure` (chamado `session`).

**Níveis de Acesso (Roles):**
- **`GLOBAL_ADMIN`** (Admin Global): Acesso total. Pode ver todas as abas. É a única role que tem acesso à página `/admin` para criar novas Lojas e cadastrar novos perfis de Usuários (credenciais). Pode editar e deletar qualquer registro.
- **`MANAGER`** (Gerente de Unidade): Acesso a abas gerenciais. Pode acessar `/colaboradores` para cadastrar, desativar, mesclar ou reverter mesclagem de funcionários. Pode visualizar métricas e deletar cartões errados.
- **`EMPLOYEE`** (Funcionário Operacional): Acesso restrito apenas para envio de dados e visualização de ranking. Pode cadastrar cartões no dashboard e editar os dados de um cartão registrado (nome do cliente/status), mas **não pode deletar registros** e **não tem acesso** à tela de configuração da equipe.

**Proteção de Rotas:**
O arquivo `src/proxy.ts` intercepta todas as requisições de página.
- Se o token JWT não for válido ou estiver ausente, redireciona para `/login`.
- Se um `EMPLOYEE` tentar acessar `/colaboradores`, é redirecionado de volta ao início.

## 4. Lógicas de Negócio e Comportamentos da Interface

### A. Dashboard e Registro de Cartões (Página Inicial)
- Exibe métricas consolidadas diárias. O backend soma a quantidade de cartões que os colaboradores registraram "Hoje" (da meia-noite atual em diante).
- No momento em que um usuário (seja `EMPLOYEE` ou `MANAGER`) cadastra um cartão, a API chama a função `createRecord`.
- *Comportamento Atual Técnico*: Na interface o usuário preenche Operador, Cliente, Valor e Status. A API salva na tabela `records`.

### B. Histórico de Performance
- A tela consolida o volume diário em agrupamentos. Ao invés de valores financeiros monetários, os cartões (cards) dos colaboradores agora mostram o **volume bruto de cartões aprovados** no lado direito, transformando a tela em um relatório visual gamificado.
- Os cartões listados no histórico permitem **Edição Inline** (alterar cliente e status, disponível para todos) e **Exclusão** (botão lixeira, restrito apenas para MANAGER e GLOBAL_ADMIN).

### C. Gestão de Equipe (Soft Merge e Soft Delete)
- Localizado na rota `/colaboradores`.
- A remoção de um funcionário não apaga o registro do banco. Ela atualiza a flag `is_active = false`. O histórico antigo do funcionário fica preservado, impedindo que gráficos passados quebrem.
- **Reverter Mesclagem**: Caso um funcionário "A" seja mesclado no funcionário "B", os registros de "A" passam a contabilizar para "B". Isso é feito via a coluna `merged_into_id`. A tela possui uma função específica para clicar no usuário inativado pela mesclagem e clicar em "Desfazer", limpando o `merged_into_id` e retornando sua independência.

### D. Multi-Tenant (Painel Admin)
- A tela `/admin` possui duas vias de atuação: Criação de Lojas (`stores`) e Criação de Contas (`app_users`).
- O formulário vincula estritamente Gerentes (`MANAGER`) e Funcionários (`EMPLOYEE`) a uma loja recém-criada, enquanto Administradores Globais não possuem loja atrelada (`store_id = null`), indicando visão global.

## 5. Ponto de Atenção Técnico (Observações do Fluxo de Lojas)
O Banco de Dados já suporta isolamento completo de Lojas (`store_id`), e o painel Admin cria usuários atrelados às lojas com sucesso.
*Comportamento Atual das Rotas de API:* Atualmente as APIs de Listagem (`listRecords`, `listCollaborators` em `repository.ts`) ainda estão lendo todos os registros de forma genérica, não efetuando o filtro `.eq('store_id', userStoreId)`. Consequentemente, o registro de um cartão também ainda não injeta dinamicamente o `store_id` associado ao usuário logado no momento do insert. Esse é o fluxo principal que requer integração backend com os JWT Claims na próxima iteração arquitetural.
