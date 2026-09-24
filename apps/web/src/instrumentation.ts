import type { Instrumentation } from "next";

// Server-side errors (rendering, route handlers) reported to the API's log
// store like browser ones, tagged source "server".
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const [{ errorFields }, { flushLogs, log }] = await Promise.all([import("@desh-monitor/logger"), import("./lib/log")]);
  log.error("server request error", {
    ...errorFields(error),
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  });
  await flushLogs();
};
