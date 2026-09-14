PO CONTROL - NOVA VERSAO
========================

1) SUPABASE
-----------
Abra o projeto no Supabase.
Vá em SQL Editor > New Query.
Cole TODO o conteúdo de supabase.sql e clique em Run.

IMPORTANTE:
Este SQL RECRIA a tabela purchase_orders do zero para eliminar qualquer conflito com a versão antiga.
Ele apaga a tabela purchase_orders anterior. Como estamos recomeçando o MVP e nenhum PO foi salvo, isso é intencional.
Se por acaso você tiver colocado algum dado manualmente nessa tabela, exporte antes de rodar.

2) CONFIGURACAO
---------------
O arquivo config.js já está preenchido com a Project URL e Publishable Key fornecidas durante a configuração.
Nunca coloque Secret Key ou service_role neste arquivo.

3) GITHUB / VERCEL
------------------
Suba estes arquivos na RAIZ do repositório:
- index.html
- app.js
- styles.css
- config.js
- supabase.sql

Na Vercel, o Root Directory deve apontar para a pasta onde o index.html está.
Se estes arquivos estiverem na raiz do repositório, deixe Root Directory como padrão.

4) TESTE
--------
Abra o site da Vercel.
Faça login com a conta já confirmada.
Clique em + Novo PO.
Preencha pelo menos:
- Número do PO
- Fornecedor
- Estimativa de prontidão
Clique em Salvar PO.

O botão deve mudar para "Salvando...".
Se houver erro do Supabase, ele aparecerá DENTRO do formulário.

5) LOGICA DE ALERTA
-------------------
- Mais de 7 dias: No prazo
- De 1 a 7 dias: Próximo
- Hoje: Vence hoje
- Data passada e ainda não pronto: Atrasado X dias
- Pronto / Embarcado / Concluído ou prontidão real preenchida: Pronto
