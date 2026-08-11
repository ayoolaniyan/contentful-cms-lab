import Fastify from "fastify";
import { config } from "./config.js";
import { pool } from "./db.js";
import { processEvent, type SyncEvent } from "./processor.js";
import { registerDeliveryRoutes } from "./delivery.js";
import { healthDetail } from "./observability.js";

const app = Fastify({ logger: { transport: { target: "pino-pretty" } } });
let shuttingDown = false;

await registerDeliveryRoutes(app);

app.get("/health", async () => {
    const { rows } = await pool.query("select 1 as ok");
    return { status: "up", db: rows[0].ok === 1 };
});

app.get("/health/detail", async () => healthDetail());

app.post("/webhooks/contentful", async (req, reply) => {
    // 1. Authenticate before touching the body.
    if (req.headers["x-webhook-secret"] !== config.webhookSecret) {
        req.log.warn({ ip: req.ip }, "rejected unauthenticated webhook");
        return reply.code(401).send({ error: "unauthorized" });
    }

    // 2. Extract ONLY identity from the payload. The payload is a notification,
    //    not data — we never trust its field values.
    const body = req.body as any;
    const topic = String(req.headers["x-contentful-topic"] ?? "");
    const entryId = body?.sys?.id;
    const contentType = body?.sys?.contentType?.sys?.id ?? null;

    if (!entryId || !topic) {
        return reply.code(400).send({ error: "missing sys.id or topic header" });
    }
    if (body?.sys?.type !== "Entry") {
        req.log.info({ topic, type: body?.sys?.type }, "ignoring non-entry event");
        return reply.code(202).send({ accepted: true, ignored: true });
    }

    const ev: SyncEvent = { entryId, contentType, topic };

    // 3. Ack immediately; process out of band so we never hold the webhook open.
    setImmediate(() => {
        processEvent(ev, req.log).catch((err) =>
            req.log.error({ err: err.message, entryId }, "unhandled processor error"),
        );
    });

    return reply.code(202).send({ accepted: true, entryId });
});

app.addHook("onRequest", async (req, reply) => {
    if (shuttingDown && req.url.startsWith("/webhooks")) {
        return reply.code(503).send({ error: "shutting down" });
    }
});

app.listen({ port: config.port, host: "0.0.0.0" })
    .catch((err) => { app.log.error(err); process.exit(1); });

async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "shutdown initiated");
    await app.close();          // stops accepting, drains in-flight requests
    await pool.end();
    process.exit(0);
}

["SIGTERM", "SIGINT"].forEach((s) => process.on(s, () => shutdown(s)));
