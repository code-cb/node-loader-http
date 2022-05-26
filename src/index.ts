import type { LoadHook, ResolveHook } from '@codecb/node-loader';
import fetch from 'node-fetch';

const isHttpUrl = (s: string) =>
  s.startsWith('http://') || s.startsWith('https://');

// As of v18.2.0 Node only supports custom source with `json`, `module` or `wasm` format
// See: https://nodejs.org/api/esm.html#loadurl-context-defaultload
const getFormat = (url: string) => {
  if (url.endsWith('.json')) return 'json';
  if (url.endsWith('.mjs')) return 'module';
  if (url.endsWith('.wasm')) return 'wasm';
  return 'module';
};

export const load: LoadHook = async (url, context, defaultLoad) => {
  if (!isHttpUrl(url)) return defaultLoad(url, context, defaultLoad);
  const response = await fetch(url);
  if (!response.ok)
    throw Error(
      `Request to download JavaScript code from ${url} failed with HTTP status ${response.status} ${response.statusText}`,
    );
  return {
    format: getFormat(url),
    // Setting source as ArrayBuffer seems safer than string because string source it's not available for `wasm` format
    source: await response.arrayBuffer(),
  };
};

export const resolve: ResolveHook = (
  specifier,
  { parentURL, ...context },
  defaultResolve,
) => {
  if (isHttpUrl(specifier)) return { url: specifier };
  if (!parentURL || !isHttpUrl(parentURL))
    return defaultResolve(specifier, { ...context, parentURL }, defaultResolve);
  if (specifier.startsWith('./') || specifier.startsWith('../'))
    return {
      url: new URL(specifier, parentURL).href,
    };
  return defaultResolve(specifier, { ...context }, defaultResolve);
};
