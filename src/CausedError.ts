export class CausedError extends Error {

    constructor(message?: string, public cause?: any) {
        super(message);
    }
}