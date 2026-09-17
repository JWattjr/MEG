const STUDIO_RPC_URL = process.env.GENLAYER_GAME_RPC_URL?.trim() || "https://studio-next.genlayer.com/api";
const BLOCKED_METHODS = new Set([
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_signTransaction",
  "personal_sign",
  "eth_signTypedData_v4",
  "wallet_addEthereumChain",
  "wallet_switchEthereumChain",
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedReadMethod(method: string): boolean {
  return !BLOCKED_METHODS.has(method) && (method === "gen_call" || method.startsWith("gen_get") || method.startsWith("eth_") || method === "web3_clientVersion");
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON-RPC body." } }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid JSON-RPC request." } }, { status: 400 });
  }

  const rpcRequest = body as { id?: unknown; jsonrpc?: unknown; method?: unknown; params?: unknown };
  const id = rpcRequest.id ?? null;
  if (rpcRequest.jsonrpc !== "2.0" || typeof rpcRequest.method !== "string" || !isAllowedReadMethod(rpcRequest.method)) {
    return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Only read-only GenLayer RPC methods are available." } }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(STUDIO_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method: rpcRequest.method, params: rpcRequest.params ?? [] }),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await upstream.text();
    return new Response(payload, {
      status: upstream.ok ? 200 : 502,
      headers: { "cache-control": "no-store", "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "Studio Next RPC is temporarily unavailable." } }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
