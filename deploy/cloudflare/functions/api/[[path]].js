import { proxyApi } from '../../proxy.mjs';

export function onRequest(context) {
  return proxyApi(context.request, context.env);
}
