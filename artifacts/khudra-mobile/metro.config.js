const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// pnpm monorepo setup: the app lives in artifacts/khudra-mobile but its deps
// are symlinked into the workspace-root .pnpm store. Metro must watch the
// workspace root and know to resolve modules from both node_modules folders,
// otherwise the release bundle can't resolve packages like expo-router.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
