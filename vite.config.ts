import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  root: "apps/demo-swarm-download",
  server: {
    port: 5173,
    fs: { allow: [searchForWorkspaceRoot(process.cwd())] },
  },
  build: { outDir: "../../../dist/demo-swarm-download", emptyOutDir: true },
});
