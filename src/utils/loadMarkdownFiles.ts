import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { flatten, isPlainObject } from 'lodash-es';

export interface MarkdownFile {
  filePath: string;
  fileName: string;
  content: string;
  frontmatter: Record<string, any>;
}

/**
 * Flatten nested objects in frontmatter
 * @param obj Object to flatten
 * @param prefix Prefix for flattened keys
 * @returns Flattened object
 */
function flattenFrontmatter(
  obj: Record<string, any>,
  prefix = '',
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (isPlainObject(value)) {
      Object.assign(result, flattenFrontmatter(value, newKey));
    } else if (
      Array.isArray(value) &&
      value.every((item) => isPlainObject(item))
    ) {
      // Skip arrays of objects as they can't be easily represented in a flat structure
      continue;
    } else if (Array.isArray(value)) {
      // Convert arrays to JSON strings
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Load and parse markdown files
 * @param files Array of file paths
 * @returns Array of parsed markdown files
 */
export async function loadMarkdownFiles(
  files: string[],
): Promise<MarkdownFile[]> {
  const markdownFiles: MarkdownFile[] = [];

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data, content: markdownContent } = matter(content);

      const frontmatter = flattenFrontmatter(data);
      // Add content to frontmatter so it's available for queries
      frontmatter.content = markdownContent;

      markdownFiles.push({
        filePath,
        fileName: path.basename(filePath),
        content: markdownContent,
        frontmatter,
      });
    } catch (error) {
      console.error(`Error loading file ${filePath}: ${error}`);
    }
  }

  return markdownFiles;
}
