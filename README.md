# Utilidades da Igreja

Site com ferramentas simples para organizar a igreja, publicado no GitHub Pages:

- **Escala das CIAs**: professores das classes infantis em rodízio, com imagem para o WhatsApp.
- **Escala do Trabalho de Senhoras**: Palavra, Louvor e Preparo às quartas-feiras, pelas tabelas oficiais
  (3 a 12 servas), pulando a 5ª quarta do mês.
- **Oração Ininterrupta**: lista de 24 horas (horários de 15 minutos) com várias igrejas. Cada igreja recebe
  seu link de inscrição; os dados ficam no Firebase.

## Rodar no computador

```bash
npm install
npm run dev            # site usando o Firebase de verdade
```

Para mexer na Oração sem tocar no Firebase de verdade, use os emuladores (precisa de Java 11 ou mais novo):

```bash
npm run emuladores     # terminal 1: banco e login simulados
npm run dev:emulador   # terminal 2: site apontando para os emuladores
```

## Testes

| Comando | O que testa | Precisa de |
|---|---|---|
| `npm test` | Lógica pura: datas das escalas, tabelas das Senhoras, 5ª quarta, contagem do rodízio, regra de preenchimento da Oração, PDF e dados salvos no navegador | nada |
| `npm run test:rules` | Regras de segurança do Firestore (`firestore.rules`): quem pode criar, editar, trocar, cancelar e apagar | Java |
| `npm run test:e2e` | O site aberto no Chrome: escalas, imagens, inscrição, trocar/cancelar, coordenador editando e movendo, PDF | Java e Google Chrome |
| `npm run test:all` | Os três acima | Java e Google Chrome |

`test:rules` e `test:e2e` sobem os emuladores do Firebase sozinhos e desligam no final.
`npm run test:watch` roda os testes unitários a cada alteração.

Os testes unitários e os das regras também rodam no GitHub antes de cada publicação: se algum falhar, o site
não é atualizado.

Onde ficam:

- `src/**/*.test.ts`: testes unitários (Vitest)
- `tests/rules/`: regras do Firestore (`@firebase/rules-unit-testing`)
- `tests/e2e/`: ponta a ponta (Playwright)

## Firebase (Oração Ininterrupta)

- Configuração do projeto: `src/firebase-config.ts`
- Regras: `firestore.rules`. **Sempre que mudarem, publique de novo** no console do Firebase
  (Firestore → Regras → colar → Publicar).
