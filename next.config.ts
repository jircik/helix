import type { NextConfig } from "next";

// Rotas antigas em português, mantidas para links salvos.
const LEGACY_ROUTES: [string, string][] = [
  ['/entrar', '/login'],
  ['/criar-conta', '/signup'],
  ['/explorar', '/explore'],
  ['/etapas', '/settings/stage'],
  ['/configuracoes', '/settings'],
  ['/configuracoes/etapa', '/settings/stage'],
  ['/configuracoes/aparencia', '/settings/appearance'],
  ['/configuracoes/conta', '/settings/account'],
];

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY_ROUTES.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
