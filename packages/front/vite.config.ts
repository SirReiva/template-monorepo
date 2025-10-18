import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { loaderMonorepoPlugin } from "../../loader/vite.plugin";

// https://vite.dev/config/
export default defineConfig({
	plugins: [loaderMonorepoPlugin, tsconfigPaths(), react()],
	cacheDir: resolve(import.meta.dirname, "../../.cache/front"),
});
