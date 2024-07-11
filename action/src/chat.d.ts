export declare class Chat {
    private openAi;
    constructor(apiKey: string);
    private generatePrompt;
    codeReview: (patch: string, assisstant: string) => Promise<any>;
}
