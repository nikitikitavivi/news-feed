let app: any = null;
let migrated = false;

async function init() {
  if (app) return app;
  const [server, migrate] = await Promise.all([
    import('../server/src/index'),
    import('../server/src/db/migrate'),
  ]);
  app = server.default;
  if (!migrated) {
    try {
      await migrate.ensureSchema();
      migrated = true;
    } catch (err) {
      console.error('[api] Schema migration failed:', err);
    }
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const expressApp = await init();
  return expressApp(req, res);
}
