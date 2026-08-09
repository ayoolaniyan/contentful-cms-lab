import { createClient } from "contentful";
import { config } from "./config.js";

export const cda = createClient({
    space: config.contentful.spaceId,
    environment: config.contentful.environment,
    accessToken: config.contentful.deliveryToken,
});

export const cpa = createClient({
    space: config.contentful.spaceId,
    environment: config.contentful.environment,
    accessToken: config.contentful.previewToken,
    host: "preview.contentful.com",
});
