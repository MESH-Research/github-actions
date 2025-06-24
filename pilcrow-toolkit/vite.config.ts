/// <reference types="vitest" />
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const allCoreModules = builtinModules.flatMap((moduleName) => [
  moduleName,
  `node:${moduleName}`,
]);

const globalsForAllCoreModules = allCoreModules.reduce(
  (acc, moduleName) => {
    const [prefix, namePart] = moduleName.split(":");
    acc[moduleName] = prefix === "node" ? namePart : moduleName;
    return acc;
  },
  {} as Record<string, string>
);

export default defineConfig({
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
      external: [...allCoreModules],
      input: {
        main: resolve(__dirname, "src/main.ts"),
        post: resolve(__dirname, "src/post.ts"),
        // pre: resolve(__dirname, "src/pre.ts"),
      },
      output: [
        {
          format: "es",
          entryFileNames: "[name].js",
          globals: globalsForAllCoreModules,
        },
      ],
      preserveSymlinks: true,
    },
  },
});
