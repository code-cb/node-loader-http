import type { LoadHook, ResolveHook } from '@codecb/node-loader';
import fetch from 'node-fetch';
import { execArgv } from 'node:process';

const useBuiltinNetworkImport = execArgv.includes(
  '--experimental-network-imports',
);
const isHttpUrl = (s: string | undefined): s is string =>
  !!s && /^https?:\/\//.test(s);
const isRelativePath = (s: string) => s && /^\.?\.\//.test(s);

// As of v18.2.0 Node only supports custom source with `json`, `module` or `wasm` format
// See: https://nodejs.org/api/esm.html#loadurl-context-defaultload
const getFormat = (url: string) => {
  if (url.endsWith('.json')) return 'json';
  if (url.endsWith('.mjs')) return 'module';
  if (url.endsWith('.wasm')) return 'wasm';
  return 'module';
};

export const load: LoadHook = async (url, context, nextLoad) => {
  if (useBuiltinNetworkImport || !isHttpUrl(url)) return nextLoad(url, context);
  const response = await fetch(url);
  if (!response.ok)
    throw Error(
      `Request to download JavaScript code from ${url} failed with HTTP status ${response.status} ${response.statusText}`,
    );
  return {
    format: getFormat(url),
    shortCircuit: true,
    // Setting source as ArrayBuffer seems safer than string because string source is not available for `wasm` format
    source: await response.arrayBuffer(),
  };
};

export const resolve: ResolveHook = (
  specifier,
  { parentURL, ...context },
  nextResolve,
) => {
  if (isHttpUrl(specifier)) return { shortCircuit: true, url: specifier };
  // Include parentURL in context when it's not a HTTP URL so that Node can resolve relative paths
  if (!isHttpUrl(parentURL))
    return nextResolve(specifier, { ...context, parentURL });
  if (isRelativePath(specifier))
    return { shortCircuit: true, url: new URL(specifier, parentURL).href };
  // If specifier is a bare module name, make sure to not include parentURL in the context to force Node to resolve it as a Node module
  // If specifier is an absolute path, it doesn't matter if parentURL is included in the context
  return nextResolve(specifier, context);
};
