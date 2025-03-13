import * as duckdb from 'duckdb';
import { MarkdownFile } from './loadMarkdownFiles.js';

/**
 * Create a DuckDB connection and load markdown data
 * @param markdownFiles Array of parsed markdown files
 * @returns DuckDB connection
 */
export async function createDuckDBConnection(
  markdownFiles: MarkdownFile[],
): Promise<duckdb.Database> {
  return new Promise((resolve, reject) => {
    // Create an in-memory database
    const db = new duckdb.default.Database(':memory:');

    db.all('SELECT 1', (err) => {
      if (err) {
        reject(new Error(`Failed to initialize DuckDB: ${err.message}`));
        return;
      }

      // Collect all frontmatter keys to create a dynamic frontmatter table
      const allKeys = new Set<string>();
      for (const file of markdownFiles) {
        Object.keys(file.frontmatter).forEach((key) => allKeys.add(key));
      }

      // Create a table for frontmatter
      let frontmatterTableSQL = `
        CREATE TABLE frontmatter (
          filePath VARCHAR,
          fileName VARCHAR
      `;

      for (const key of allKeys) {
        // Use VARCHAR for all frontmatter fields for simplicity
        frontmatterTableSQL += `,\n    ${key.replace(
          /[^a-zA-Z0-9_]/g,
          '_',
        )} VARCHAR`;
      }

      frontmatterTableSQL += ')';

      db.run(frontmatterTableSQL, (err) => {
        if (err) {
          reject(
            new Error(`Failed to create frontmatter table: ${err.message}`),
          );
          return;
        }

        // Prepare the insert statement for frontmatter
        let insertFrontmatterSQL = `
          INSERT INTO frontmatter (filePath, fileName${Array.from(allKeys)
            .map((k) => `, ${k.replace(/[^a-zA-Z0-9_]/g, '_')}`)
            .join('')})
          VALUES (?, ?${', ?'.repeat(allKeys.size)})
        `;

        const insertFrontmatterStmt = db.prepare(insertFrontmatterSQL);

        // Insert frontmatter data
        for (const file of markdownFiles) {
          const values: (string | null)[] = [file.filePath, file.fileName];

          for (const key of allKeys) {
            const value = file.frontmatter[key];
            values.push(value !== undefined ? String(value) : null);
          }

          // @ts-ignore - DuckDB's type definitions don't properly handle null values
          insertFrontmatterStmt.run(...values);
        }

        insertFrontmatterStmt.finalize();
        resolve(db);
      });
    });
  });
}
