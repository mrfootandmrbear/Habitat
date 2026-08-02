import { defineConfig } from "vitest/config";

/**
 * GitHub Pages project sites live at /<repo>/ (e.g. /Habitat/).
 * Local `npm run dev` / `vite preview` keep base `/`.
 * CI deploy sets BASE_PATH from the repository name.
 */
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
