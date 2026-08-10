export type InternalEntry = {
    entryId: string;
    contentType: string;
    revision: number;
    publishedAt: string | null;
    data: Record<string, unknown>;
};

export class MappingError extends Error {
    constructor(message: string, readonly entryId: string) {
        super(message);
        this.name = "MappingError";
    }
}
