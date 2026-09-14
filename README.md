# Norte Financeiro

PWA do desafio de poupança das 500 casinhas. São 500 números, de 1 a 500, e cada número é um
valor em reais: você guarda a quantia de verdade e risca a casinha. Riscar todas significa ter
guardado **R$ 125.250** — a soma de 1 até 500, ou `500 × 501 ÷ 2`.

A ordem é livre: dá para marcar a 345 hoje e a 7 amanhã.

Duas rotas:

| Rota     | O que é                                                         |
| -------- | --------------------------------------------------------------- |
| `/`      | Landing gamificada, com hero jogável, calculadora de meta e FAQ  |
| `/app`   | O desafio: grid das 500 casinhas, estatísticas e configurações   |
| `/admin` | Painel do dono: usuários, pagamentos e analytics do negócio      |

Sem backend, sem cadastro, sem chamada de rede. Tudo vive no `localStorage` do aparelho.

---

## Rodando

Requer Node 20+.

```bash
npm install
```

```bash
npm run dev
```

Abre em `http://localhost:5173`. O service worker fica desligado em desenvolvimento
(`devOptions.enabled: false`) para o HMR não brigar com o cache.

## Build e conferência local

```bash
npm run build
```

```bash
npm run preview
```

O `build` roda `tsc -b` antes do Vite, então erro de tipo quebra o build. Para checar só os tipos:

```bash
npx tsc -b --force
```

Lint:

```bash
npm run lint
```

> Os avisos remanescentes do `oxlint` são intencionais: `only-export-components` (arquivos que
> exportam um provider e o hook correspondente — afeta só a granularidade do Fast Refresh) e
> `purity` em `Date.now()` dentro de cálculos derivados, onde capturar o instante junto com as
> entradas é justamente o que mantém o resultado estável entre renders.

## Publicando

O app é estático. O único requisito do servidor é **devolver `index.html` para qualquer rota**,
senão `/app` dá 404 ao recarregar. Os dois arquivos de configuração já estão no repositório.

### Vercel

```bash
npx vercel deploy --prod
```

Ou conecte o repositório no painel. O preset do Vite já é detectado (`npm run build` → `dist`).
O [`vercel.json`](vercel.json) cuida do rewrite de SPA e impede que `sw.js` e
`manifest.webmanifest` fiquem presos em cache.

### Netlify

```bash
npx netlify deploy --prod
```

O [`netlify.toml`](netlify.toml) define build, pasta publicada e o redirect `/* → /index.html`.
`public/_redirects` e `public/_headers` cobrem o caso de deploy manual por arrastar a pasta `dist`.

### Depois de publicar

Confirme em `DevTools → Application`: **Service Workers** com um worker ativo e **Manifest** sem
erros. Com isso o app instala na tela inicial e abre offline. Precisa de HTTPS (ou `localhost`) —
service worker não registra em `http://` comum.

---

## Como o estado funciona

Um único objeto versionado na chave `norte:state`:

```ts
{
  version: 1,
  challengeName: string,
  targetDate: string | null,   // "AAAA-MM-DD"
  entries: { [numero: number]: number },  // timestamp em ms de quando foi guardada
  theme: 'light' | 'dark' | 'system'
}
```

Regras que o código segue:

- **Só `entries` é fonte de verdade.** Total, percentual, média semanal, projeção, sequência de
  dias e o gráfico são todos derivados em [`useStats`](src/state/useStats.ts) com `useMemo`. Nada
  de total duplicado no storage para sair de sincronia.
- **Leitura defensiva.** [`storage.ts`](src/state/storage.ts) faz `try/catch` no `JSON.parse` e
  saneia cada campo: chave fora de 1–500, timestamp inválido ou tema desconhecido são descartados.
  JSON corrompido cai no estado inicial em vez de quebrar o app.
- **Migração centralizada.** `migrate()` normaliza qualquer versão anterior para o formato atual.
  Versões futuras entram como novos passos nessa função — e ela também valida arquivos importados.
- **Uma única porta de entrada.** [`ChallengeProvider`](src/state/ChallengeContext.tsx) envolve as
  duas rotas, salva a cada alteração e escuta o evento `storage` para manter abas em sincronia.
  Por isso as casinhas riscadas no hero da landing já chegam prontas no `/app`.

## Decisões de implementação

**Performance do grid.** As 500 casinhas são `<button>` reais, sem virtualização.
[`House`](src/components/House.tsx) é `memo` e recebe só primitivos mais um callback estável
(guardado num ref em [`AppPage`](src/routes/app/AppPage.tsx)), então marcar uma casinha
re-renderiza exatamente uma das 500. Medido em dev com React StrictMode: mediana de 11,5 ms por
toque, p95 de 31 ms — em produção fica bem abaixo disso. Se algum dia passar disso, o caminho é
virtualizar o `HouseGrid`, que já está isolado para isso.

**Animações fora do React.** O grid em loop da landing e o confete escrevem direto no DOM e no
canvas (`classList`, `textContent`, contexto 2D). O React renderiza esses nós uma vez e não
participa dos frames. O Framer Motion fica só onde a animação é de interface: modal, painel
lateral, toast, entrada de blocos na viewport e o CTA fixo.

**Tokens de design.** Cores vivem como canais RGB em variáveis CSS
([`index.css`](src/index.css)) e são expostas ao Tailwind em
[`tailwind.config.js`](tailwind.config.js), o que preserva os modificadores de opacidade
(`bg-brand-500/20`). Trocar de tema troca as variáveis — landing e app mudam juntos, sem tema
duplicado. Um script inline no [`index.html`](index.html) aplica a classe antes do React montar,
para não piscar o tema errado no carregamento.

**Dinheiro.** Todo valor passa por `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
em [`format.ts`](src/lib/format.ts). Como as casinhas são sempre reais inteiros, há duas variantes:
a completa (`R$ 1.234,00`) nos números financeiros do app e a compacta (`R$ 1.234`) onde o espaço
é curto — chips, eixos do gráfico e textos da landing.

## Acessibilidade

- Cada casinha é um `<button>` com `aria-pressed` e rótulo explícito: `Guardar R$ 345` quando
  pendente, `Guardado: R$ 345` quando riscada.
- Setas navegam pelo grid (o número de colunas é lido do layout real, então funciona em qualquer
  breakpoint); `Home`/`End` vão para a primeira e a última casinha.
- Foco sempre visível (`:focus-visible` com anel de 2px), link "Pular para o conteúdo", modais com
  foco preso e `Escape` para fechar, e devolução do foco ao elemento de origem.
- Área de toque mínima de 44px em tudo que é clicável.
- `prefers-reduced-motion` é respeitado em três camadas: regra global no CSS, `useReducedMotion`
  do Framer Motion e checagem explícita no confete, no contador animado e no grid em loop.
- Contraste AA medido em todos os pares dos dois temas. O verde de marca (`#22C55E`) reprova como
  texto em fundo claro (2,14:1), então existe um token separado só para isso — `--c-accent`, que
  vale `#4ADE80` no escuro (11,2:1) e `#15803D` no claro (4,71:1). Cor de marca em `background`
  continua sendo `brand-*`; cor de marca em texto é sempre `text-accent`.

## Estrutura

```
src/
  lib/          constantes, formatação, datas, marcos, download de backup
  state/        tipos, storage versionado, reducer, contexto, estatísticas derivadas
  hooks/        contador animado, prompt de instalação, celebrações, efeitos de rota
  components/   primitivos de UI, casinha, grid, confete
  routes/
    app/        /app — cabeçalho, ferramentas, painéis de estatísticas/histórico/configurações
    landing/    /  — hero, calculadora, como funciona, grid em loop, marcos, FAQ, CTAs
scripts/        geração dos ícones do PWA a partir de SVG (npm exec node scripts/generate-icons.mjs)
```

## Painel de admin

`/admin` mostra quem se cadastrou, quem pagou, por qual meio, e o analytics do negócio —
aquisição, receita, funil de conversão, mix de pagamento, uso do produto, retenção por coorte e
saúde da carteira. Tem exportação em CSV nas abas de usuários e pagamentos.

**Como chegar lá.** Entre com a conta de administrador e abra `/app`: o ícone de escudo aparece
no cabeçalho, à esquerda do de estatísticas. Digitar `/admin` na barra de endereço dá no mesmo — o
atalho é conveniência, não segurança, e só aparece para quem administra.

**Quem entra.** O portão é a Edge Function [`admin-dados`](supabase/functions/admin-dados/index.ts),
não a tela: ela valida o JWT e compara o **ID do usuário** com a lista de administradores. A
rota não está escondida, e não precisa estar — sem ID na lista a resposta é 403 e nenhum dado
de cliente chega ao navegador.

**Por que ID e não e-mail.** E-mail é auto-declarável: com a confirmação desligada no Supabase,
quem se cadastra com um endereço ganha sessão sem provar que o endereço é dele. Enquanto a
lista fosse de e-mails, bastava um endereço administrativo ainda não cadastrado para alguém
reivindicá-lo e sair com a base inteira de clientes — inclusive as chaves de licença, que
`vincular-licenca` resgata em acesso pago. E o endereço nem era segredo: o bundle do front é
público. O UUID vem do banco; ninguém se cadastra escolhendo o seu.

A lista vem do secret `ADMIN_USER_IDS` (separado por vírgula) nas Edge Functions. Sem ele,
vale o ID do dono que já está no código. O atalho nas Configurações tem a própria lista, em
`VITE_ADMIN_USER_IDS` — ela decide só o que a tela mostra, então mantenha as duas iguais para
o botão não sumir para quem tem acesso, nem aparecer para quem vai levar 403.

O ID sai de `select id from auth.users where email = 'voce@exemplo.com'`.

```bash
npx supabase secrets set ADMIN_USER_IDS=<uuid> --project-ref utjxgqwsrehqxwrvkqbb
```

**Por que uma função e não uma consulta direta.** A RLS de `licenses` não tem policy nenhuma e a de
`challenges` só devolve a linha de quem está logado. Afrouxar isso para o painel ler tudo
transformaria a anon key, que é pública, em chave de leitura da base de clientes. O service_role
fica no servidor, e a função só lê.

**Forma de pagamento.** A Stripe não diz no webhook como a compra foi paga — isso está na cobrança,
não na sessão. A função descobre na primeira vez que o painel abre e grava em `licenses.payment_method`,
fora do caminho crítico do pagamento. Compra pelo AbacatePay é sempre Pix; assinatura é sempre
cartão, porque no modo recorrente a Stripe não oferece Pix.

**O que o painel não sabe.** Visita na landing, demo jogada e clique no CTA acontecem antes de
existir conta: esses eventos vão para o Plausible, e o painel linka para lá em vez de fingir que
os tem. Configure `VITE_ANALYTICS_DOMAIN` para eles começarem a sair do navegador.

## Backup

Configurações → **Exportar JSON** baixa o estado inteiro; **Importar JSON** valida o arquivo pela
mesma `migrate()` do storage e pede confirmação antes de substituir o desafio atual. Zerar exige
dupla confirmação, sendo a segunda digitando `APAGAR`.

Como os dados vivem só no navegador, limpar os dados do site apaga o desafio. O backup é a forma
de trocar de aparelho.
