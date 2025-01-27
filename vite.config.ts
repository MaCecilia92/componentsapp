import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import ModuleFederationPlugin from "@originjs/vite-plugin-federation"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    ModuleFederationPlugin({
      name: "componentsApp",
      filename: "remoteEntry.js",
      exposes: {
        // "./Title": "./src/components/Title",
        // "./Wave": "./src/components/Wave",
        "./home": "./src/App.tsx"
        // Exponer otros componentes individualmente
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
})
