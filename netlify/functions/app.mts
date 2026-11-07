import type { Config } from "@netlify/functions";
import serverless from "serverless-http";
import { app } from "../../src/app.js";

const handler = serverless(app);

type LambdaResult = {
  statusCode: number;
  headers?: Record<string, string | number | boolean>;
  multiValueHeaders?: Record<string, (string | number | boolean)[]>;
  body?: string;
  isBase64Encoded?: boolean;
};

// Bridges a web Request into the Express app (via a Lambda-style event) and back.
export default async (req: Request) => {
  const url = new URL(req.url);
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const raw = hasBody ? Buffer.from(await req.arrayBuffer()) : null;
  const body = raw && raw.length ? raw.toString("base64") : undefined;

  const result = (await handler(
    {
      httpMethod: req.method,
      path: url.pathname,
      headers,
      queryStringParameters: Object.fromEntries(url.searchParams),
      body,
      isBase64Encoded: Boolean(body),
    },
    {}
  )) as LambdaResult;

  const out = new Headers();
  for (const [k, v] of Object.entries(result.headers ?? {})) out.set(k, String(v));
  for (const [k, vs] of Object.entries(result.multiValueHeaders ?? {})) {
    out.delete(k);
    for (const v of vs) out.append(k, String(v));
  }
  const noBody = result.statusCode === 204 || result.statusCode === 304 || !result.body;
  const resBody = noBody
    ? null
    : result.isBase64Encoded
      ? Buffer.from(result.body!, "base64")
      : result.body!;
  return new Response(resBody, { status: result.statusCode, headers: out });
};

export const config: Config = {
  path: "/*",
};
