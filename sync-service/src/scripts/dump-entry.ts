import { cda } from "../contentful.js";

const res = await cda.getEntries({
  content_type: "article",
  limit: 1,
  include: 2,
});
console.log(JSON.stringify(res.items[0], null, 2));
