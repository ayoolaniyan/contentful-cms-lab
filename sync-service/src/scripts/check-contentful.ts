import { cda } from "../contentful.js";

const types = await cda.getContentTypes();
console.log(`Space OK. Content types: ${types.total}`);
types.items.forEach((t) => console.log(` - ${t.sys.id} (${t.name})`));

const entries = await cda.getEntries({ limit: 3 });
console.log(`Published entries: ${entries.total}`);
