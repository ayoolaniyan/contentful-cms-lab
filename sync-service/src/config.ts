import "dotenv/config";

function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

export const config = {
    port: Number(process.env.PORT ?? 8080),
    databaseUrl: required("DATABASE_URL"),
    webhookSecret: required("WEBHOOK_SECRET"),
    contentful: {
        spaceId: required("CONTENTFUL_SPACE_ID"),
        environment: process.env.CONTENTFUL_ENVIRONMENT ?? "master",
        deliveryToken: required("CONTENTFUL_DELIVERY_TOKEN"),
        previewToken: process.env.CONTENTFUL_PREVIEW_TOKEN ?? "",
        managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN ?? "",
    },
};
