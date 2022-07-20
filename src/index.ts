import type { LoadHook, ResolveHook } from '@codecb/node-loader';
import fetch from 'node-fetch';

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
  if (!isHttpUrl(url)) return nextLoad(url, context);
  const response = await fetch(url);
  if (!response.ok)
    throw Error(
      `Request to download JavaScript code from ${url} failed with HTTP status ${response.status} ${response.statusText}`,
    );
  return {
    format: getFormat(url),
    shortCircuit: true,
    // Setting source as ArrayBuffer seems safer than string because string source it's not available for `wasm` format
    source: await response.arrayBuffer(),
  };
};

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
  if (isHttpUrl(specifier)) return { shortCircuit: true, url: specifier };
  if (isHttpUrl(context.parentURL) && isRelativePath(specifier))
    return {
      shortCircuit: true,
      url: new URL(specifier, context.parentURL).href,
    };
  return nextResolve(specifier, context);
};
