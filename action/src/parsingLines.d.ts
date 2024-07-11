/**
 * Finds the nearest valid line number for a comment in a GitHub pull request diff.
 * @param patch The patch string from the GitHub pull request file.
 * @param targetLine The initial target line number for the comment.
 * @returns The nearest valid line number for the comment, or null if none found.
 */
export declare function findLineForComment(patch: string, targetLine: number): number;
