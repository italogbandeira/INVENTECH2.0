# INVENTECH2.0

Sistema web para controle de máquinas, usuários, funcionários, documentos, auditoria, importação CSV e exportação Excel.

---

## 1. Visão geral

O **INVENTECH2.0** foi desenvolvido para centralizar o controle operacional de equipamentos e registrar as alterações feitas no sistema de forma rastreável.

O sistema permite:

- cadastrar, editar e excluir máquinas
- vincular máquinas a usuários
- cadastrar e editar usuários
- anexar documentos por usuário
- gerenciar funcionários que acessam o sistema
- controlar permissões por perfil
- registrar auditoria das alterações
- importar máquinas via CSV
- exportar dados para Excel

---

## 2. Objetivo do projeto

O projeto tem como objetivo substituir controles manuais ou planilhas dispersas por uma aplicação web com:

- inventário centralizado
- filtros e consultas rápidas
- controle de acesso
- histórico de alterações
- capacidade de operação em lote
- base mais consistente para evolução futura

---

## 3. Stack utilizada

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma**
- **MariaDB / MySQL**
- **JOSE** para autenticação com JWT
- **bcryptjs** para hash de senha
- **exceljs** para geração de planilhas
- **csv-parse** para importação CSV

---

## 4. Perfis de acesso

O sistema possui dois perfis principais de funcionário.

### 4.1 Operador
Pode acessar os recursos operacionais, como:
- listar máquinas
- cadastrar máquina
- editar máquina
- listar usuários
- cadastrar usuário
- editar usuário
- vincular máquinas
- anexar documentos

### 4.2 Master
Além de tudo que o operador faz, também pode:
- acessar auditoria
- gerenciar funcionários
- importar máquinas por CSV
- executar ações administrativas sensíveis

---

## 5. Fluxo geral de uso

### Primeiro acesso
Quando o sistema ainda não possui conta master:
1. acessar `/primeiro-acesso`
2. preencher nome, e-mail e senha
3. criar a conta master
4. fazer login em `/login`

### Uso operacional
Depois do login, o usuário pode:
1. cadastrar ou consultar máquinas
2. cadastrar usuários
3. vincular máquinas a usuários
4. anexar documentos
5. exportar relatórios
6. consultar a auditoria, se tiver permissão

---

## 6. Estrutura principal do projeto

```txt
app/
  api/
    auditoria/
    contratos/
    dashboard/
    funcionarios/
    login/
    logout/
    maquinas/
    maquinas-detalhadas/
    me/
    modelos/
    origens/
    primeiro-acesso/
    setores/
    tipos-equipamento/
    usuarios/
  auditoria/
  editar-maquina/
  funcionarios/
  importar-maquinas/
  login/
  nova-maquina/
  primeiro-acesso/
  usuarios/

components/
  BotaoLogout.tsx
  MultiSelectFilter.tsx

lib/
  auditoria.ts
  auth.ts
  prisma.ts

prisma/
  migrations/
  schema.prisma

scripts/
  criar-funcionario.ts
  criar-master.ts
  gerar-hash.ts
  resetar-senha-master.ts
