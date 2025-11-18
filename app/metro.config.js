const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

// Monorepo support
config.watchFolders = [workspaceRoot];

// Node modules resolution
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Resolve @sam-pyeong-oh/shared
config.resolver.extraNodeModules = {
  "@sam-pyeong-oh/shared": path.resolve(workspaceRoot, "shared"),
};

module.exports = config;
