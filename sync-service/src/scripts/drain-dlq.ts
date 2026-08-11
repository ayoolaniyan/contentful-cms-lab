import { listFailures, clearFailure } from "../store.js";
import { processEvent } from "../processor.js";
import { pool } from "../db.js";

const log = {
    info: (o: any, m: string) => console.log(m, o),
    warn: (o: any, m: string) => console.warn(m, o),
    error: (o: any, m: string) => console.error(m, o),
};

const failures = await listFailures();
console.log(`${failures.length} failures queued`);

let recovered = 0, stillFailing = 0;

for (const f of failures) {
    const before = (await listFailures(1000)).length;
    await processEvent(
        { entryId: f.entry_id, contentType: f.content_type, topic: f.topic ?? "ContentManagement.Entry.publish" },
        log,
    );
    const after = (await listFailures(1000)).length;

    if (after > before) {
        // processEvent re-recorded a failure -> still broken, leave the new row
        stillFailing++;
        await clearFailure(f.id);       // drop the old duplicate
        console.log(`  still failing: ${f.entry_id}`);
    } else {
        recovered++;
        await clearFailure(f.id);
        console.log(`  recovered: ${f.entry_id}`);
    }
}

console.log(`recovered ${recovered}, still failing ${stillFailing}`);
await pool.end();
