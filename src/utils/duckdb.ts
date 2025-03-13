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

      // Create a table for the markdown files
      const createTableSQL = `
        CREATE TABLE files (
          filePath VARCHAR,
          fileName VARCHAR,
          content TEXT
        )
      `;

      db.run(createTableSQL, (err) => {
        if (err) {
          reject(new Error(`Failed to create table: ${err.message}`));
          return;
        }

        // Insert the basic file data
        const insertFileStmt = db.prepare(`
          INSERT INTO files (filePath, fileName, content)
          VALUES (?, ?, ?)
        `);

        for (const file of markdownFiles) {
          insertFileStmt.run(file.filePath, file.fileName, file.content);
        }

        insertFileStmt.finalize();

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

          // Create a view that joins files and frontmatter
          const createViewSQL = `
            CREATE VIEW markdown AS
            SELECT f.*, fm.*
            FROM files f
            JOIN frontmatter fm ON f.filePath = fm.filePath
          `;

          db.run(createViewSQL, (err) => {
            if (err) {
              reject(new Error(`Failed to create view: ${err.message}`));
              return;
            }

            resolve(db);
          });
        });
      });
    });
  });
}
