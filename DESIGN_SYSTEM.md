# Pricecom — guia de design

Referência rápida para manter telas novas consistentes com o shell (sidebar +
topbar) e as telas já migradas. Não é um sistema à parte do Tailwind — é a
formalização dos padrões que já dominavam o código, mais os tokens de marca.

## Paleta

Definida em `src/assets/main.css` via `@theme`. Uso em qualquer classe
Tailwind normal (`bg-indigo-600`, `text-slate-500` etc.) — nada de classes
novas para decorar.

| Papel | Token(s) | Onde usar |
|---|---|---|
| Ação primária (botão sólido, link ativo, foco, tab ativa) | `indigo-500`…`indigo-700` | Botões primários, tabs ativas, bordas de foco de input, âncoras. **Remapeado para a rampa teal da marca** — ver comentário em `main.css`. |
| Superfície de marca (sidebar, topbar, telas de login) | `bg-[var(--color-brand-navy)]` | Fundo escuro "âncora" do produto. Não usar em botões/controles — é superfície, não ação. |
| Neutro (texto, bordas, fundos de card) | `slate-50`…`slate-900` | Já era o padrão dominante no código; mantido como está. |
| Sucesso | `emerald-50/500/600/700` | Status "conectado", "resolvido", deltas positivos. |
| Alerta | `amber-50/500/600/700` | Status "pendente/divergente", avisos. |
| Erro | `red-50/500/600/700` | Erros, status "não encontrado/rejeitado". |
| Informativo | `blue-50/500/700` | Status neutro tipo "aberto", "previsto" (ver `StatusBadge.vue`). |

Não introduza um novo tom de azul/verde "por conta própria" numa tela nova —
os 5 papéis acima cobrem praticamente todo caso de uso do produto.

## Tipografia

Fonte: **Inter** (Google Fonts, carregada em `index.html`), fallback
`ui-sans-serif`/`system-ui`. Aplicada globalmente via `body { font-family:
var(--font-sans) }` — não precisa de `font-sans` em cada elemento.

Escala já em uso, mantida como padrão:

| Uso | Classes |
|---|---|
| Título de página (`PageHeader`) | `text-2xl font-semibold text-slate-900` |
| Subtítulo de página | `text-sm text-slate-500` |
| Título de card/seção | `text-base font-semibold text-slate-900` ou `text-sm font-semibold text-slate-900` |
| Corpo | `text-sm text-slate-700` |
| Legenda/metadado | `text-xs text-slate-500` / `text-slate-400` |
| Número de destaque (KPI) | `text-3xl font-bold text-slate-900` (ver `KpiCard.vue`) |

## Espaçamento e grid

Múltiplos de 4px via escala padrão do Tailwind (`p-4`, `gap-6`, etc. — nada
de valores arbitrários tipo `p-[13px]`). Padrões de página:

- Container de página: `space-y-6 p-6 lg:p-8` (ou `space-y-8` quando há
  seções bem separadas, como em `Integrations.vue`).
- Grid de cards de KPI/dashboard: `grid gap-6` com `grid-cols-*` responsivo.

## Elevação e bordas

Um único nível de elevação para cards — não criar hierarquia de sombras:

```html
<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
```

- Cards de conteúdo: `rounded-xl`
- Botões, inputs, badges pequenos: `rounded-lg`
- Avatares/dots de status: `rounded-full`
- Modais/dropdowns flutuantes: `shadow-lg` ou `shadow-xl` (mais elevação que
  um card estático, para reforçar que "flutua" sobre o conteúdo)

## Componentes base reutilizáveis

| Componente | Local | Uso |
|---|---|---|
| `PageHeader.vue` | `src/components/PageHeader.vue` | Cabeçalho de toda tela de topo (título + subtítulo + slot `actions` à direita). Ver seção abaixo. |
| `TabNav.vue` | `src/components/TabNav.vue` | Navegação por abas dentro de uma tela (`tabs` + `v-model`). Para abas com contador (badge numérico), ver `ConflictTabs.vue` como exemplo — mesmo visual, com `count` por aba. |
| `StatusBadge.vue` | `src/components/StatusBadge.vue` | Já existia — badge de status com bolinha + cor semântica. Adicionar novos status ao `STATUS_MAP` em vez de criar badge ad-hoc. |
| `KpiCard.vue` | `src/views/Dashboard/KpiCard.vue` | Card de KPI com label + valor + variação percentual. |
| `Sidebar.vue` / `TopBar.vue` | `src/components/layout/` | Shell da aplicação — não duplicar em telas individuais. |

### PageHeader

```html
<PageHeader title="Produtos" subtitle="Cadastro de produtos, kits e giro real por SKU.">
  <template #actions>
    <!-- filtros, botões de ação da tela -->
  </template>
</PageHeader>
```

### TabNav

```html
<TabNav :tabs="TABS" v-model="activeTab" />
<!-- TABS = [{ key: 'overview', label: 'Visão geral' }, ...] -->
```

## Botões (recipes — ainda não componentizados)

Repetidos manualmente hoje; ao criar uma tela nova, copie a recipe em vez de
inventar uma nova combinação de classes.

```html
<!-- Primário -->
<button class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">

<!-- Secundário -->
<button class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">

<!-- Perigo -->
<button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">

<!-- Desabilitado -->
class="... disabled:cursor-not-allowed disabled:opacity-50"
```

## Shell da aplicação

- `Sidebar.vue`: navegação principal, colapsável (clique no botão
  "Recolher"/logo). Item **Usuários** existe como entrada reservada,
  desabilitada com badge "em breve" — é o próximo item do roadmap
  (gerenciamento de usuários). Não remover; só trocar `disabled` por uma
  rota real quando a tela existir.
- `TopBar.vue`: barra superior fixa com breadcrumb da rota atual e menu de
  conta (avatar → nome/e-mail/papel/sair) no canto superior direito. Filtros
  de período continuam dentro de cada `PageHeader` (via slot `actions`), não
  na topbar — nem toda tela tem filtro de período, e forçar um slot global
  pra isso criaria espaço vazio nas telas que não usam.

## Logo

Fonte única: `src/assets/pricecom.webp` (1024×1024, ícone + wordmark
"PRICECOM" empilhados, sobre fundo branco). Esse arquivo **não é usado
diretamente** em nenhuma tela — dele foram derivados 4 recortes, gerados uma
vez e versionados como PNG:

| Arquivo | Conteúdo | Fundo | Uso |
|---|---|---|---|
| `pricecom-icon.png` | só o ícone (tag + seta) | transparente | fundos claros — favicon, contextos futuros com fundo branco |
| `pricecom-icon-white.png` | mesmo ícone, silhueta sólida branca | transparente | **Sidebar** (`BrandMark.vue`, variant padrão `white`) — ver nota de contraste abaixo |
| `pricecom-icon-square.png` | ícone com padding, canvas quadrado | transparente | base do favicon |
| `pricecom-lockup.png` | ícone + wordmark completo | transparente | `LoginView.vue` — tela com fundo claro e espaço de sobra |

`public/favicon.ico` foi regerado a partir de `pricecom-icon-square.png`
(multi-resolução 16–256px).

### Por que existe uma variante "white"

O ícone original é navy+teal sobre branco — alto contraste só nesse par.
Removendo o fundo branco (matte por diferença, sem halo de fundo — testado
em zoom) o corte fica limpo, mas **o traçado navy da etiqueta e o wordmark
ficam quase invisíveis sobre o navy da sidebar** (`--color-brand-navy`,
`#0b1e3d`): são tons próximos demais. Isso não é um problema de recorte, é
o asset não ter uma variante pensada pra fundo escuro.

`pricecom-icon-white.png` resolve isso pro ícone da sidebar: é o mesmo
recorte, recolorido como silhueta sólida branca a partir do próprio canal
alfa (não é um arquivo novo desenhado — é derivado programaticamente do
mesmo corte). Funciona bem em 32px. **Não existe equivalente pro wordmark**
— por isso `pricecom-lockup.png` (cores originais) só é usado em fundo
claro (`LoginView.vue`); se algum dia precisar do wordmark completo sobre
fundo escuro, alguém precisa desenhar essa variante — não dá pra derivar
com a mesma técnica sem perder a leitura de "PRICECOM" como texto.

Se o ícone recolorido em branco não for aceitável esteticamente
(perde o degradê navy→teal original), a alternativa é envolver o ícone
colorido original num chip/badge de fundo claro dentro da sidebar — não
implementado, porque muda a composição visual da sidebar pra resolver um
problema de asset.
