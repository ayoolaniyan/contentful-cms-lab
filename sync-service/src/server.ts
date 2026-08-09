import Fastify from "fastify";
import { config } from "./config.js";
import { pool } from "./db.js";

const app = Fastify({
    logger: { transport: { target: "pino-pretty" } },
});

app.get("/health", async () => {
    const { rows } = await pool.query("select 1 as ok");
    return { status: "up", db: rows[0].ok === 1 };
});

// Block 3 fills this in.
app.post("/webhooks/contentful", async (req, reply) => {
    if (req.headers["x-webhook-secret"] !== config.webhookSecret) {
        return reply.code(401).send({ error: "unauthorized" });
    }
    return reply.code(202).send({ accepted: true });
});

app.listen({ port: config.port, host: "0.0.0.0" })
    .catch((err) => { app.log.error(err); process.exit(1); });
