# DevDraw — Erros Corrigidos

Registro de bugs identificados e corrigidos durante o desenvolvimento.

---

**2026-05-24 · Fase 4 · TS1272 — isolatedModules + emitDecoratorMetadata conflito com tipos express**
- Erro: `A type referenced in a decorated signature must be imported with 'import type'` ao usar `Request`/`Response` do express como tipo de parâmetro em métodos de controller decorados.
- Causa: NestJS usa `emitDecoratorMetadata: true` + `isolatedModules: true`. O TypeScript tenta emitir metadados de tipo para os parâmetros decorados, mas tipos importados de módulos externos que são apenas tipos não são permitidos no modo `isolatedModules`.
- Correção: Substituir `Request` e `Response` do express por `any` nos parâmetros de métodos de controller.

**2026-05-24 · Fase 4 · TS2345 — passport-google-oauth20 opções com string | undefined**
- Erro: `clientID: string | undefined` não é atribuível ao tipo `string` esperado pelo construtor da Strategy.
- Causa: `process.env.GOOGLE_CLIENT_ID` retorna `string | undefined` sem fallback.
- Correção: Adicionar `?? ''` como fallback para cada variável de ambiente no construtor.

**2026-05-24 · Fase 4 · TS4053 — tipo TokenPair não exportado não pode ser usado como retorno público**
- Erro: `Return type of public method has or is using name 'TokenPair' from external module but cannot be named`.
- Causa: Interface `TokenPair` era local (não exportada) em `auth.service.ts`, mas o controller refencia o método que retorna esse tipo.
- Correção: Exportar a interface `TokenPair` de `auth.service.ts`.


