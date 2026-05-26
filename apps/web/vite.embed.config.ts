import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formsFormCheckPlugin } from "@taylordb/forms-ui/vite-plugin-form-check";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { FORM_ID } from "@/shared/form.constants";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const embedOutDir = path.resolve(rootDir, "public/embed");
const embedBuildId = randomUUID();
const embedScriptName = `${FORM_ID}-${embedBuildId}.js`;

function embedManifestPlugin(): Plugin {
  return {
    name: "embed-manifest",
    closeBundle() {
      mkdirSync(embedOutDir, { recursive: true });

      const manifest = {
        formId: FORM_ID,
        buildId: embedBuildId,
        fileName: embedScriptName,
        script: `/embed/${embedScriptName}`,
      };

      writeFileSync(
        path.join(embedOutDir, "manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );

      console.log(`[embed] build id ${embedBuildId}`);
      console.log(`[embed] script /embed/${embedScriptName}`);
      console.log(`[embed] manifest /embed/manifest.json`);
    },
  };
}

export default defineConfig({
  plugins: [
    viteReact(),
    formsFormCheckPlugin({ entry: "src/form-check.tsx" }),
    embedManifestPlugin(),
  ],
  publicDir: false,
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    outDir: embedOutDir,
    lib: {
      entry: path.resolve(rootDir, "src/embed/form.tsx"),
      fileName: () => embedScriptName,
      formats: ["iife"],
      name: "TaylorDBFormEmbed",
    },
  },
});
