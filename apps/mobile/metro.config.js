// Metro configurado para MONOREPO pnpm + NativeWind.
// Sem isto, o Metro não enxerga o código fora de apps/mobile (ex.:
// packages/shared) nem as dependências instaladas na raiz do workspace.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Observa o workspace inteiro (para resolver @lemonfin/shared etc.).
config.watchFolders = [workspaceRoot];

// 2. Procura módulos tanto no app quanto na raiz do workspace.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. pnpm usa symlinks; o Metro moderno resolve, mas deixamos explícito.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: "./global.css" });
