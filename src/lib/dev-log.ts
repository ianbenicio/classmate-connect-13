/**
 * Logger que só dispara em desenvolvimento. Em produção é no-op para
 * evitar ruído no DevTools dos clientes finais (Vite remove o branch
 * via tree-shaking quando `import.meta.env.DEV` é false).
 *
 * Use para logs de inicialização, top-up de seed, eventos diagnósticos.
 * Para erros use `console.error` direto (queremos vê-los em prod).
 * Para avisos operacionais sérios (dataset truncado, etc.) use
 * `console.warn` direto (queremos vê-los em prod também).
 */
export function devInfo(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(...args);
  }
}
