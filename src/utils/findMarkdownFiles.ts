import { glob } from 'glob';
import path from 'path';

/**
 * Find all markdown files in a directory
 * @param directory Directory to search for markdown files
 * @returns Array of file paths
 */
export async function findMarkdownFiles(directory: string): Promise<string[]> {
  const absolutePath = path.resolve(directory);
  const pattern = path.join(absolutePath, '**/*.md');

  try {
    const files = await glob(pattern);
    return files;
  } catch (error) {
    console.error(`Error finding markdown files: ${error}`);
    return [];
  }
}
