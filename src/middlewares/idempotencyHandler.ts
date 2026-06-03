import { createHash } from "crypto";
import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { ErrorCode } from "../types";

const TTL_RESULT = 60 * 60;
const TTL_PROCESSING = 30;
const HEARTBEAT_INTERVAL = Math.floor(TTL_PROCESSING / 2) * 1000; // 15s
const POLL_INTERVAL = 100;
const POLL_TIMEOUT = 10_000;

const HEADER_KEY = "idempotency-key";

// state == PROCESSING일 때만 TTL 갱신 (DONE 결과 TTL을 덮어쓰는 race 방지)
const HEARTBEAT_LUA = `
local raw = redis.call("GET", KEYS[1])
if not raw then return 0 end
local data = cjson.decode(raw)
if data.state == "PROCESSING" then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  return 1
end
return 0
`;

type CacheEntry =
  | { state: "PROCESSING"; bodyHash: string }
  | {
      state: "DONE";
      statusCode: number;
      body: string | null;
      contentType: string | null;
      bodyHash: string;
    };

function hashBody(body: unknown): string {
  const str = body != null ? JSON.stringify(body) : "";
  return createHash("sha256").update(str).digest("hex");
}

function replayDone(entry: Extract<CacheEntry, { state: "DONE" }>, res: Response) {
  res.setHeader("Idempotent-Replayed", "true");
  if (entry.contentType) res.setHeader("Content-Type", entry.contentType);
  if (entry.body === null) return res.status(entry.statusCode).end();
  return res.status(entry.statusCode).send(entry.body);
}

export async function idempotencyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (["GET", "HEAD"].includes(req.method)) return next();

  const key = req.headers[HEADER_KEY];
  if (!key || typeof key !== "string") return next();

  const redisKey = `idempotency:${req.method}:${req.path}:${key}`;
  const bodyHash = hashBody(req.body);

  try {
    const existing = await redis.get(redisKey);
    if (existing) {
      const entry: CacheEntry = JSON.parse(existing);

      if (entry.bodyHash !== bodyHash) {
        return res.status(409).json({
          error: ErrorCode.IDEMPOTENCY_MISMATCH,
          message:
            "Request body does not match the original request for this idempotency key.",
        });
      }

      if (entry.state === "DONE") return replayDone(entry, res);

      // PROCESSING + bodyHash 일치 → 대기
      return waitForResult(redisKey, res, bodyHash);
    }

    const payload: CacheEntry = { state: "PROCESSING", bodyHash };
    const acquired = await redis.set(
      redisKey,
      JSON.stringify(payload),
      "EX",
      TTL_PROCESSING,
      "NX",
    );

    if (!acquired) {
      // GET과 SET NX 사이에 다른 요청이 선점 — bodyHash 검증 포함해 대기
      return waitForResult(redisKey, res, bodyHash);
    }
  } catch (err) {
    return next(err);
  }

  // Lua script로 PROCESSING 상태일 때만 원자적으로 TTL 갱신
  const heartbeat = setInterval(() => {
    redis
      .eval(HEARTBEAT_LUA, 1, redisKey, String(TTL_PROCESSING))
      .catch(() => {});
  }, HEARTBEAT_INTERVAL);

  const originalSend = res.send.bind(res);
  let responded = false;

  // res.json은 내부적으로 res.send 호출 → 단일 인터셉트로 커버
  res.send = function (body?: any) {
    if (!responded) {
      responded = true;
      clearInterval(heartbeat);

      const contentType = (res.getHeader("Content-Type") as string) ?? null;
      const isJson = contentType?.includes("application/json") ?? false;

      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (isJson || body == null) {
          // JSON 또는 빈 body(204 등): 캐싱
          const bodyStr =
        body == null
          ? null
          : typeof body === "string"
            ? body
            : Buffer.isBuffer(body)
              ? body.toString("utf8")
              : JSON.stringify(body);
          const entry: CacheEntry = {
            state: "DONE",
            statusCode: res.statusCode,
            body: bodyStr,
            contentType,
            bodyHash,
          };
          redis
            .set(redisKey, JSON.stringify(entry), "EX", TTL_RESULT)
            .catch((err) => {
              console.error("idempotency: cache write failed", err);
              // 저장 실패 시 즉시 lock 해제 → 대기 요청이 빠르게 409 수신
              redis.del(redisKey).catch(() => {});
            });
        } else {
          // non-JSON 성공(바이너리/스트림 등): lock만 해제, 캐싱 skip
          redis
            .del(redisKey)
            .catch((err) =>
              console.error("idempotency: lock release failed", err),
            );
        }
      } else {
        redis
          .del(redisKey)
          .catch((err) =>
            console.error("idempotency: lock release failed", err),
          );
      }
    }

    return originalSend(body);
  };

  // res.end() 직접 호출(204 등 res.send 우회) 처리
  res.on("finish", () => {
    clearInterval(heartbeat);

    if (!responded) {
      responded = true;

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entry: CacheEntry = {
          state: "DONE",
          statusCode: res.statusCode,
          body: null,
          contentType: null,
          bodyHash,
        };
        redis
          .set(redisKey, JSON.stringify(entry), "EX", TTL_RESULT)
          .catch((err) => {
            console.error("idempotency: cache write failed (finish)", err);
            redis.del(redisKey).catch(() => {});
          });
      } else {
        redis.del(redisKey).catch(() => {});
      }
    }
  });

  next();
}

async function waitForResult(
  redisKey: string,
  res: Response,
  bodyHash: string,
) {
  const deadline = Date.now() + POLL_TIMEOUT;
  let keyDeleted = false;

  try {
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL);

      const raw = await redis.get(redisKey);
      if (!raw) {
        keyDeleted = true;
        break;
      }

      const entry: CacheEntry = JSON.parse(raw);

      if (entry.bodyHash !== bodyHash) {
        return res.status(409).json({
          error: ErrorCode.IDEMPOTENCY_MISMATCH,
          message:
            "Request body does not match the original request for this idempotency key.",
        });
      }

      if (entry.state === "DONE") return replayDone(entry, res);
    }
  } catch (err) {
    console.error("idempotency: polling failed", err);
    return res.status(503).json({
      error: ErrorCode.IDEMPOTENCY_ERROR,
      message: "Failed to retrieve processing result.",
    });
  }

  if (keyDeleted) {
    return res.status(409).json({
      error: ErrorCode.IDEMPOTENCY_CONFLICT,
      message: "The original request failed. You may retry with the same key.",
    });
  }

  return res.status(503).json({
    error: ErrorCode.IDEMPOTENCY_TIMEOUT,
    message: "The original request is still being processed.",
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
