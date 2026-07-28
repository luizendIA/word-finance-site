# WashGo

MVP profissional de um marketplace brasileiro para coleta, lavagem e entrega de roupas. O produto coordena clientes, trabalhadores parceiros, lavanderias e administradores em uma única experiência.

## Estado desta versão

Esta entrega é uma demonstração funcional para investidores:

- landing page completa e responsiva;
- onboarding de conta única com cliente, trabalhador e lavanderia como papéis combináveis;
- quatro perfis navegáveis;
- criação de pedido em três etapas;
- fluxo obrigatório para roupas delicadas;
- minicurso e aceite do trabalhador;
- pedido, rastreamento, chat e notificações simulados;
- fila operacional da lavanderia;
- dashboard executivo com KPIs, mapa, gráfico e unit economics;
- API de saúde e contrato REST demonstrativo;
- modelo PostgreSQL/Prisma preparado.
- base Android nativa via Capacitor, testada em um BISON conectado por USB;
- landing e CTAs principais localizados em português brasileiro, inglês, espanhol, francês e japonês.

Pagamentos, mapas, localização, chat em tempo real, autenticação, fotos e persistência estão claramente identificados como simulados na interface. O banco dedicado já possui o esquema de conciliação Asaas, mas a criação de cobrança pelo app continua bloqueada até a publicação e homologação das Edge Functions. Nenhuma cobrança foi criada por este projeto nesta versão.

O onboarding demonstra Google, Apple e e-mail como opções de entrada. A conexão OAuth real ainda depende da configuração de provedores e URLs de retorno. Google Pay e Apple Pay também aparecem somente como estrutura de checkout tokenizado: cartões ou dados de carteira nunca são importados pelo app.

## Tecnologias

- Next.js, React e TypeScript
- Tailwind CSS 4 e CSS de produto
- vinext para saída compatível com Cloudflare Workers
- PostgreSQL e Prisma como arquitetura de persistência planejada
- API REST versionada
- Cloud Storage para futuras evidências fotográficas

## Estrutura

```text
app/
  api/health/                 saúde do produto
  api/v1/marketplace/         contrato REST demonstrativo
  globals.css                 design system e responsividade
  layout.tsx                  metadata e social card
  page.tsx                    entrada da aplicação
components/
  WashGoApp.tsx               landing e experiência dos quatro perfis
lib/
  i18n.ts                     idiomas e fallback da experiência inicial
  contracts.ts                contratos centrais de domínio
  mock-data.ts                dados explicitamente simulados
prisma/
  schema.prisma               modelo alvo PostgreSQL
docs/
  ARCHITECTURE.md             arquitetura, eventos e segurança
```

## Executar localmente

Requisitos: Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Validar

```bash
npm run build
npm test
```

## Android

O pacote Android usa o identificador `com.wordfinance.washgo`.

```bash
npm run android:debug
```

O APK de teste é gerado em `android/app/build/outputs/apk/debug/app-debug.apk`.

Para Google Play, crie uma listagem **separada** para o WashGo, mantenha uma chave de assinatura protegida e gere o AAB somente depois de configurar a assinatura de release. Não envie este app para uma listagem existente de outro produto WordFinance.

## Rotas

- `/` — landing e demonstração do marketplace
- `/api/health` — saúde e modo do MVP
- `/api/v1/marketplace` — recursos previstos na API v1

## Próxima fase

1. autenticação moderna e controle de acesso por perfil;
2. conexão OAuth/telefone e persistência de papéis múltiplos;
3. PostgreSQL gerenciado e migrações Prisma;
4. storage privado para fotos obrigatórias;
5. motor de matching por distância, capacidade e avaliação;
6. rastreamento em tempo real e ETA com Google Maps;
7. chat WebSocket e notificações push/e-mail;
8. publicar e homologar as Edge Functions Asaas de criação de Pix e conciliação autenticada;
9. painel antifraude, conciliação e suporte;
10. piloto controlado em uma região;
11. instrumentação de conversão, CAC, recompra, SLA e margem.

## Publicação

O projeto usa a estrutura Sites/vinext. O build gera o Worker e ativos estáticos necessários para criar uma versão e publicar pelo Sites.

## Princípios

- UX simples, inclusiva e mobile-first.
- Separação explícita entre demonstração e integração real.
- Pagamentos fail-closed e sem segredos no cliente.
- Arquitetura modular antes de microsserviços prematuros.
- LGPD, acessibilidade e observabilidade desde o piloto.
