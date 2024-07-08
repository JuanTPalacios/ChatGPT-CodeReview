export declare class Chat {
    private openAi;
    constructor(apiKey: string);
    private generatePrompt;
    codeReview: (change: string, patch: string) => Promise<any>;
}
