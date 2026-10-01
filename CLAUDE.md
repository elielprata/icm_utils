# CLAUDE.md

Guia para trabalhar neste projeto: "Utilidades da Igreja", um site React + Vite + TypeScript publicado no
GitHub Pages (`https://elielprata.github.io/icm_utils/`). Os textos da interface são em português do Brasil.

## Forma de trabalhar

1. **Teste primeiro (TDD).** Antes de implementar ou corrigir qualquer coisa, escreva o teste que descreve o
   comportamento esperado, rode e veja falhar. Depois implemente até passar.
   - Lógica pura → teste unitário em `src/**/*.test.ts`.
   - Regra de segurança do Firestore → `tests/rules/firestore.rules.test.ts`.
   - Fluxo na tela (clicar, compartilhar, baixar) → `tests/e2e/*.spec.ts`.
   - Bug encontrado → primeiro um teste que reproduz o bug.
2. **Os testes ficam no projeto.** Nada de scripts de teste soltos fora do repositório. Se precisar de uma
   conferência visual pontual (print, PDF), pode ser um arquivo temporário, mas apague antes de terminar.
3. **Mudança grande ou visual: mostre um modelo antes.** Para funcionalidade nova ou reorganização de tela,
   apresente uma maquete (página/imagem) e espere a aprovação antes de construir.
4. **Confira o resultado de verdade.** Imagem/PDF gerados: abra o arquivo e olhe. O usuário compartilha tudo pelo
   WhatsApp no celular; teste também em largura de celular (~400 px).
5. **Commits:** mensagem em **inglês, uma linha só**, sem linha de coautoria. Só faça commit/push quando o usuário
   pedir.
6. **Rode tudo antes de entregar:** `npm run build`, `npm test`, `npm run test:rules` e `npm run test:e2e`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Site usando o Firebase de verdade |
| `npm run emuladores` + `npm run dev:emulador` | Site usando os emuladores do Firebase (banco e login simulados) |
| `npm run build` | Checa os tipos e gera o site em `dist/` |
| `npm test` / `npm run test:watch` | Testes unitários (Vitest) |
| `npm run test:rules` | Regras do Firestore no emulador (`@firebase/rules-unit-testing`) |
| `npm run test:e2e` | Ponta a ponta no Chrome instalado (Playwright, `channel: 'chrome'`), com emuladores |
| `npm run test:all` | Os três tipos de teste |

- Emuladores: `firebase-tools` **13** (devDependency) porque funciona com o Java 17 do PATH. Versões novas pedem
  Java 21 (há um Java 25 em `C:\Program Files\Android\Android Studio1\jbr`).
- Não rode `test:rules` logo depois de `test:e2e` no mesmo instante: o emulador anterior ainda pode estar
  liberando a porta 8080 (dá "fetch failed").
- No modo emulador existe `window.emulatorSignIn(email)` para entrar como coordenador nos testes.
- O deploy (`.github/workflows/deploy.yml`) roda `npm test` e `npm run test:rules` antes de publicar; se falharem,
  o site não é atualizado. O GitHub Pages guarda a página por 10 min (`max-age=600`): depois de publicar,
  recarregar com Ctrl+F5.

## Estrutura

- `src/App.tsx`: rotas por hash (`#/cias`, `#/senhoras`, `#/oracao/...`). A Oração (e o Firebase) é carregada sob
  demanda.
- `src/pages/`: `Home`, `CiasPage`, `SenhorasPage`, `oracao/` (`OracaoHome`, `OracaoAdmin`, `OracaoSignup`).
- `src/lib/`: lógica pura e acesso a dados (`schedule`, `senhoras`, `oracao`, `oracaoPdf`, `motivosImage`,
  `storage`, `exportImage`, `firebase`).
- `src/components/`: componentes; `Shareable` gera a imagem de um cartão e compartilha.
- `src/pages/oracao/oracao.css`: estilos só da Oração (carregados com ela).

## Compartilhar (WhatsApp)

- Imagens: `html-to-image` gera o PNG a partir de uma **cópia fora da tela com largura fixa** (classe `export`),
  para sair igual no celular e no computador. A imagem é gerada **antes** do toque, porque o iPhone só deixa
  compartilhar logo após o toque.
- Ordem: compartilhamento nativo (`navigator.share`) → copiar para a área de transferência (só PNG) → baixar.
- Lista longa (Oração, 96 linhas): o **PDF** é mais nítido (texto de verdade, enviado como documento). As fontes
  padrão do PDF não têm emoji: `pdfText` remove.

## Escala das CIAs

- 4 classes (0 a 3 anos, Crianças, Intermediários, Adolescentes), cada uma com sua lista de professoras.
- Rodízio simples pela ordem da lista, continuando de um mês para o outro; dia padrão domingo.
- Uma imagem por classe com os 3 meses (sem título genérico). Dados no `localStorage` (`escala-professores:v1`).

## Escala do Trabalho de Senhoras

- Quartas-feiras; **a 5ª quarta do mês é pulada** (aparece na imagem como "Sem escala") e o rodízio continua.
- Funções: Palavra, Louvor e Preparo, pelas **tabelas oficiais** do livro "Orientações para o Trabalho de
  Senhoras" para **3 a 12 servas** (em `src/lib/senhoras.ts`, conferidas número a número em `senhoras.test.ts`).
  Acima de 12, rodízio próprio com aviso na tela.
- O app guarda **a quarta do 1º rodízio** (`anchor`) e calcula sozinho o rodízio de qualquer data; para atualizar a
  escala basta trocar o mês inicial. O seletor só oferece quartas válidas.
- Mostra o ciclo atual/próximo e, se marcado (padrão), o número do rodízio em cada data da imagem.
- Mudou a quantidade de servas → pergunta a partir de quando vale a nova tabela.
- Dados no `localStorage` (`escala-senhoras:v1`); o formato antigo (`startRound`) é convertido.

## Oração Ininterrupta (Firebase)

- 96 horários de 15 min; a lista vale para o período inteiro (mesmo horário todos os dias).
- Várias igrejas por período, cada uma com cor e **link próprio** de inscrição (códigos aleatórios, não timestamp).
- **Coordenador** = quem cria o período (login Google) + e-mails adicionados em "Coordenadores". Só eles editam,
  movem, corrigem, tiram e encaixam (fora da regra).
- **Regra das vagas:** só repete horário quando todos tiverem alguém (aplicada pelo site). O banco garante que duas
  pessoas não peguem a mesma vaga (id do documento `horário_posição`).
- **Trocar/cancelar sozinho:** chave secreta guardada no celular (`secrets`, ilegível) e provada em `releases`;
  vale antes do início do período ou nas primeiras 24 h após a inscrição. O nome **não** vem preenchido.
- **Motivos de oração:** texto (linha com •/*/- = item; sem marcador = título em negrito; linha em branco separa)
  **ou** imagem enviada pelo coordenador — **uma coisa ou outra**: com imagem, só a imagem aparece. Os motivos são
  compartilhados **à parte** da lista e **só como imagem**; a lista de horários não mostra motivos.
- Imagem dos motivos: reduzida no aparelho (máx. 1080 px de largura, WebP) e guardada no **Firestore**
  (`periods/{id}/media/motivos`, até ~950 KB). Não usar Firebase Storage: exige o plano pago.
- Telas: coordenador em abas (Horários · Links · Compartilhar · Configurar); a aba Compartilhar mostra duas opções
  que abrem **janelas** (lista; motivos). Prévias abrem em janela, nunca empilhadas na página. Inscrição em abas
  (Horários · Motivos · Lista), horários em grade por turno.
- Exemplos e textos de ajuda devem ser genéricos (ex.: "Ministérios"), nunca dados reais de uma igreja.
- **Sempre que `firestore.rules` mudar, lembrar o usuário de publicar** no console do Firebase
  (Firestore → Regras → colar → Publicar). A configuração em `src/firebase-config.ts` não é secreta.
