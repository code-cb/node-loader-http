import type { LoadHook, ModuleFormat, ResolveHook } from '@codecb/node-loader';
import fetch from 'node-fetch';

const isHttpUrl = (s: string) =>
  s.startsWith('http://') || s.startsWith('https://');

const getFormat = (url: string): ModuleFormat => {
  if (url.endsWith('.cjs')) return 'commonjs';
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
    source: await response.text(),
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
