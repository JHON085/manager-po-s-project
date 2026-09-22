# PO Control

Sistema web interno para acompanhamento de **Purchase Orders (POs)**, follow-up de fornecedores, prontidão de pedidos, cobranças à origem e controle de cotações.

A aplicação foi desenvolvida para centralizar informações que antes dependiam de planilhas, oferecendo uma visão operacional única do processo: recebimento da PO, envio ao fornecedor, confirmação, produção, estimativa de prontidão, prontidão real, follow-up, conclusão e acompanhamento de cotações.

> **Versão documentada:** v6.2  
> **Frontend:** HTML, CSS e JavaScript  
> **Backend / Banco:** Supabase  
> **Deploy:** Vercel

---

## Visão geral

O **PO Control** organiza o acompanhamento diário de pedidos de compra em uma interface web simples, permitindo que a equipe acompanhe o status de cada processo sem depender exclusivamente da planilha de FOLLOW UP.

O sistema possui dois módulos principais:

- **Pedidos / FOLLOW UP**
- **Cotações China**

Além do acompanhamento operacional, cada PO possui uma **Planilha do processo**, que reproduz os principais campos da planilha original dentro do próprio registro.

---

## Principais funcionalidades

### Gestão de POs

O módulo de pedidos permite:

- Cadastrar novas POs manualmente.
- Editar processos existentes.
- Buscar por PO, fornecedor, cliente e outros campos.
- Filtrar por status, situação e cobrança à origem.
- Ordenar POs por data.
- Registrar estimativa de prontidão.
- Registrar prontidão real.
- Concluir uma ordem.
- Excluir uma PO por meio de função protegida no Supabase.
- Sincronizar registros com a planilha Excel de FOLLOW UP.

### Dashboard operacional

O dashboard apresenta indicadores em tempo real:

- **Total de POs**
- **POs ativos**
- **No prazo**
- **Próximos**
- **Atrasados**
- **Aguardando origem**
- **Concluídos**

Também existe uma área de **Atenção necessária**, que prioriza os processos que exigem acompanhamento.

### Controle de prazo

O sistema compara automaticamente a data atual com a estimativa de prontidão e classifica o pedido como:

- No prazo
- Próximo da prontidão
- Vence hoje
- Atrasado
- Sem data
- Concluído

### Confirmação do fornecedor

É possível registrar quando a PO foi enviada ao fornecedor e medir o tempo até a confirmação.

O sistema mantém:

- Data/hora original do envio.
- Tempo acumulado de espera.
- Data/hora da confirmação.
- Retomada da contagem quando necessário.

### Notificação / cobrança à origem

Cada processo possui um controle visual para indicar se a origem já foi notificada.

Fluxo:

1. Marcar **Notificado**.
2. O sistema registra data e hora.
3. O processo passa para **Aguardando resposta**.
4. Ao receber retorno, registrar **Resposta recebida**.
5. Caso necessário, usar **Notificar novamente**.

O dashboard contabiliza automaticamente os processos que continuam aguardando retorno da origem.

### Conclusão de ordem

Ordens em andamento podem ser concluídas diretamente pela lista de POs.

Ao concluir:

- O status passa para **Concluído**.
- A data/hora de conclusão é registrada.
- O processo deixa de aparecer entre os pedidos ativos.

### Exclusão protegida

A exclusão de uma PO é realizada por uma função RPC no Supabase.

A função:

- exige sessão autenticada;
- valida se o usuário possui permissão;
- executa a exclusão no banco de forma centralizada.

A operação exige confirmação explícita no frontend antes de ser executada.

---

## Planilha do processo

Cada PO possui duas visualizações dentro da edição:

- **Dados do processo**
- **Planilha do processo**

A aba **Planilha do processo** apresenta uma linha no formato da planilha operacional, com dados como:

- NO.
- Customer
- Purchase Order
- ZPMC
- Supplier
- Amount of PO
- Supplier Price
- Profit
- Profit %
- Supplier Quotation nº
- Sales
- Quotation NO.
- Work Order
- SAP Posting Number
- SAP Picking Number
- LSP Consulted
- Tracking (LSP)
- PO Received
- PO Processing Date
- ETD
- Prontidão
- Transportation

Alguns campos são lidos diretamente das colunas normalizadas do banco. Campos existentes somente na planilha original são recuperados de `source_data`.

### Cálculo de Profit

Quando o valor não vem preenchido do Excel:

```text
Profit = Amount of PO - Supplier Price
```

### Cálculo de Profit %

Quando o percentual não vem preenchido do Excel:

```text
Profit % = Profit / Supplier Price × 100
```

---

## Sincronização com Excel

O sistema suporta arquivos:

- `.xlsx`
- `.xlsm`
- `.xls`

A sincronização procura preferencialmente a aba:

```text
FOLLOW UP
```

O processo compara a planilha com os registros já existentes no Supabase e separa:

- novas POs;
- POs alteradas;
- POs sem alteração;
- registros removidos da planilha.

Somente as diferenças precisam ser gravadas novamente.

POs cadastradas manualmente são tratadas separadamente dos registros importados.

> Recomenda-se sempre revisar o resumo apresentado pelo sistema antes de confirmar uma sincronização.

---

## Cotações China

O módulo **Cotações China** permite controlar RFQs e o tempo de resposta dos fornecedores.

Campos principais:

- Referência / RFQ
- Fornecedor
- Cliente
- Data/hora de envio
- Meta de resposta em horas
- Data/hora de resposta
- Responsável
- Observações

Indicadores:

- Aguardando
- Dentro do prazo
- Atenção
- Atrasadas
- Tempo médio de resposta

Por padrão, novas cotações usam uma meta de **24 horas**, mas o valor pode ser alterado individualmente.

O sistema também destaca cotações próximas do vencimento e cotações atrasadas.

---

## Perfis de acesso

A aplicação possui dois modos principais.

### Editor

Usuários autorizados podem:

- cadastrar POs;
- editar POs;
- sincronizar Excel;
- registrar follow-ups;
- concluir ordens;
- excluir registros;
- cadastrar e atualizar cotações.

Os e-mails autorizados como editores são definidos na configuração do frontend.

### Espectador

O modo espectador é somente leitura.

Esse perfil pode consultar as informações disponíveis sem alterar registros.

---

## Atualização em tempo real

O PO Control utiliza **Supabase Realtime** para refletir alterações no banco.

São monitoradas alterações nas tabelas:

```text
purchase_orders
china_quotes
```

Além do Realtime, existe um fallback de sincronização periódica para manter a interface atualizada caso a conexão em tempo real esteja temporariamente indisponível.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3 e JavaScript |
| Banco de dados | PostgreSQL / Supabase |
| Autenticação | Supabase Auth |
| Atualização em tempo real | Supabase Realtime |
| Integração Excel | SheetJS / XLSX |
| Hospedagem | Vercel |
| Controle de versão | Git / GitHub |

Bibliotecas são carregadas pelo navegador através de CDN.

---

## Estrutura do projeto

```text
/
├── index.html
├── styles.css
├── app.js
├── config.js
├── migration_v5_7_cobranca_origem.sql
├── migration_v5_9_acoes.sql
└── README.md
```

### `index.html`

Estrutura da interface e componentes principais.

### `styles.css`

Estilos, responsividade, tabelas, modais, badges, menus e visual da aplicação.

### `app.js`

Contém a lógica da aplicação:

- autenticação;
- leitura e gravação no Supabase;
- filtros;
- dashboard;
- sincronização Excel;
- follow-up;
- cronômetros;
- cotações;
- Realtime;
- ações de edição, conclusão e exclusão.

### `config.js`

Arquivo local de configuração do Supabase.

Não coloque nesse arquivo nenhuma chave administrativa ou `service_role`.

---

## Configuração do Supabase

O frontend espera que `config.js` defina:

```javascript
window.PO_CONFIG = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_KEY: 'SUA_PUBLISHABLE_KEY'
};
```

Use somente uma **Publishable Key** apropriada para uso no navegador.

Nunca publique:

```text
service_role
secret key
credenciais administrativas
```

A segurança das operações deve continuar sendo controlada no banco por autenticação, RLS, policies e funções protegidas.

---

## Banco de dados

A aplicação depende principalmente da tabela:

```text
public.purchase_orders
```

A funcionalidade de cotações utiliza:

```text
public.china_quotes
```

### Migrations incluídas

#### `migration_v5_7_cobranca_origem.sql`

Adiciona o controle de follow-up da origem:

```text
origin_followup_sent
origin_followup_sent_at
origin_followup_answered_at
```

Também cria índice para consultas de registros aguardando retorno.

#### `migration_v5_9_acoes.sql`

Garante os campos de follow-up e cria:

```text
public.delete_purchase_order(uuid)
```

Essa função centraliza a exclusão de POs para usuários autenticados e autorizados.

> As migrations incluídas são incrementais e pressupõem que a tabela `purchase_orders` já exista.

### Cotações

Se a tabela `china_quotes` ainda não existir, o próprio sistema informa que a migration correspondente deve ser executada no Supabase.

A migration de criação inicial dessa tabela não faz parte deste pacote v6.2.

---

## Instalação

### 1. Clone o repositório

```bash
git clone <URL-DO-REPOSITORIO>
cd <PASTA-DO-PROJETO>
```

### 2. Configure o Supabase

Crie o arquivo:

```text
config.js
```

e informe a URL e a Publishable Key do projeto.

### 3. Execute as migrations necessárias

No Supabase:

```text
SQL Editor → New Query
```

Execute uma única vez, conforme necessário:

```text
migration_v5_7_cobranca_origem.sql
migration_v5_9_acoes.sql
```

### 4. Publique na Vercel

Importe o repositório GitHub para a Vercel.

Como o projeto é frontend estático, não existe etapa obrigatória de compilação.

O arquivo principal é:

```text
index.html
```

### 5. Teste

Após o deploy:

1. abra o Production Domain;
2. faça login;
3. verifique o status de sincronização;
4. teste a leitura das POs;
5. abra um processo;
6. teste a aba **Planilha do processo**;
7. valide a notificação à origem;
8. teste conclusão e exclusão em um registro de teste;
9. valide a sincronização Excel.

---

## Deploy e atualização

Fluxo recomendado:

```text
Alteração local
      ↓
GitHub
      ↓
Vercel
      ↓
Production
```

Depois de alterar os arquivos:

```bash
git add .
git commit -m "Descrição da alteração"
git push
```

A Vercel pode criar automaticamente um novo deployment a partir do repositório conectado.

Se o navegador continuar exibindo uma versão anterior, faça uma atualização forçada:

```text
Ctrl + F5
```

---

## Segurança

Boas práticas obrigatórias:

- Nunca versionar `service_role`.
- Nunca colocar Secret Keys do Supabase no frontend.
- Usar somente Publishable Key no navegador.
- Manter RLS e policies habilitadas nas tabelas expostas.
- Restringir ações administrativas no banco.
- Manter a função de exclusão protegida.
- Revisar a lista de editores quando houver mudanças na equipe.
- Utilizar HTTPS no ambiente publicado.
- Não armazenar senhas diretamente no código.

---

## Fluxo operacional sugerido

```text
PO recebida
   ↓
Cadastro / sincronização
   ↓
PO enviada ao fornecedor
   ↓
Aguardando confirmação
   ↓
Em produção
   ↓
Estimativa de prontidão
   ↓
Notificação à origem, quando necessária
   ↓
Prontidão real
   ↓
Conclusão
```

A aplicação não substitui SAP, e-mail ou sistemas corporativos oficiais. Ela funciona como uma camada de acompanhamento e controle operacional.

---

## Status do projeto

Funcionalidades atualmente implementadas:

- [x] Autenticação
- [x] Modo espectador
- [x] Dashboard de POs
- [x] Cadastro e edição de PO
- [x] Controle de estimativa de prontidão
- [x] Prontidão real
- [x] Alertas visuais de atraso
- [x] Sincronização com Excel
- [x] Confirmação de fornecedor
- [x] Cronômetro de espera
- [x] Notificação à origem
- [x] Controle de resposta da origem
- [x] Conclusão de ordem
- [x] Exclusão protegida
- [x] Planilha individual por processo
- [x] Cotações China
- [x] Supabase Realtime
- [x] Deploy compatível com Vercel

---

## Próximas evoluções possíveis

Algumas melhorias compatíveis com a arquitetura atual:

- autenticação e permissões gerenciadas diretamente no banco;
- tela administrativa de usuários;
- histórico completo de alterações por PO;
- anexos por processo;
- notificações automáticas por e-mail;
- indicadores de performance por fornecedor;
- SLA de resposta por origem;
- exportação de relatórios;
- auditoria de ações;
- integração com sistemas corporativos.

---

## Manutenção

Ao adicionar novos campos à tabela `purchase_orders`:

1. crie uma migration SQL;
2. mantenha compatibilidade com registros existentes;
3. atualize a leitura e gravação em `app.js`;
4. atualize a interface em `index.html`;
5. revise a sincronização Excel;
6. documente a mudança neste README.

Evite alterações destrutivas diretamente em produção sem backup.

---

## Autor

**João Rafael**

Projeto desenvolvido para apoio ao acompanhamento operacional de POs, fornecedores e cotações.

---

## Observação

Este sistema foi construído como ferramenta interna de acompanhamento. Antes de disponibilizá-lo para um ambiente mais amplo, revise permissões, RLS, políticas de acesso, usuários autorizados, domínio de produção e regras internas de segurança da informação.
