/// <reference types="vitest" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { nodeExternals } from "rollup-plugin-node-externals";

export default defineConfig({
  plugins: [nodeExternals({ deps: false })],
  resolve: {
    alias: {
      "/src": resolve(__dirname, "src"),
      "/commands": resolve(__dirname, "src/commands"),
      "/lib": resolve(__dirname, "src/lib"),
    },
  },
  build: {
    sourcemap: true,
    target: "node20",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/main.ts"),
        post: resolve(__dirname, "src/post.ts"),
        // pre: resolve(__dirname, "src/pre.ts"),
      },
      output: [
        {
          format: "es",
          entryFileNames: "[name].js",
        },
      ],
      preserveSymlinks: true,
    },
  },
});
