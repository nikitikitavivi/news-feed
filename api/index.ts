let app: any = null;

async function getApp() {
  if (!app) {
    const server = await import('../server/src/index.js');
    app = server.default;
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const expressApp = await getApp();
  return expressApp(req, res);
}
