/**
 * Finds the nearest valid line number for a comment in a GitHub pull request diff.
 * @param patch The patch string from the GitHub pull request file.
 * @param targetLine The initial target line number for the comment.
 * @returns The nearest valid line number for the comment, or null if none found.
 */
export function findLineForComment(patch: string, targetLine: number): number {
  // Parse the patch to identify added lines
  const addedLines = parseAddedLines(patch);

  // If the target line is directly within the added lines, it's valid
  if (addedLines.includes(targetLine)) {
    return targetLine;
  }

  // Find the nearest valid line if the target line is not valid
  let nearestLine: number = targetLine;
  let smallestDiff = Number.MAX_VALUE;

  for (const line of addedLines) {
    const diff = Math.abs(line - targetLine);
    if (diff < smallestDiff) {
      nearestLine = line;
      smallestDiff = diff;
    }
  }

  return nearestLine;
}

/**
 * Parses the added lines from a patch string.
 * @param patch The patch string from the GitHub pull request file.
 * @returns An array of line numbers that were added.
 */
function parseAddedLines(patch: string): number[] {
  const addedLines: number[] = [];
  const lines = patch.split('\n');
  let currentLineNumber = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Extract the starting line number from the hunk header
      const match = line.match(/\+([0-9]+)/);
      if (match) {
        currentLineNumber = parseInt(match[1], 10) - 1; // Adjust because line numbers are 0-based in arrays
      }
    } else if (line.startsWith('+') && currentLineNumber !== null) {
      addedLines.push(currentLineNumber);
    } else if (!line.startsWith('-')) {
      // Increment line number for context and added lines but not for removed lines
      if (currentLineNumber == null) currentLineNumber = 0;
      currentLineNumber++;
    }
  }

  return addedLines;
}