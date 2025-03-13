import * as duckdb from 'duckdb';

/**
 * Execute a SQL query against the DuckDB database
 * @param db DuckDB database connection
 * @param query SQL query to execute
 * @param jsonOutput Whether to output results as JSON
 */
export async function executeQuery(
  db: duckdb.Database,
  query: string,
  jsonOutput: boolean = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) {
        console.error(`Error executing query: ${err.message}`);
        reject(err);
        return;
      }

      if (!rows || rows.length === 0) {
        if (jsonOutput) {
          console.log('[]');
        } else {
          console.log('Query returned no results');
        }
        resolve();
        return;
      }

      if (jsonOutput) {
        // Output as JSON
        console.log(JSON.stringify(rows, null, 2));
        resolve();
        return;
      }

      // Get column names from the first row
      const columns = Object.keys(rows[0]);

      // Calculate column widths
      const columnWidths = columns.map((col) => {
        const headerWidth = col.length;
        const maxDataWidth = rows.reduce((max, row) => {
          const cellValue = row[col] !== null ? String(row[col]) : 'NULL';
          return Math.max(max, cellValue.length);
        }, 0);
        return Math.max(headerWidth, maxDataWidth, 5); // Minimum width of 5
      });

      // Print header
      const header = columns
        .map((col, i) => col.padEnd(columnWidths[i]))
        .join(' | ');
      const separator = columnWidths
        .map((width) => '-'.repeat(width))
        .join('-+-');

      console.log(header);
      console.log(separator);

      // Print rows
      for (const row of rows) {
        const formattedRow = columns
          .map((col, i) => {
            const value = row[col] !== null ? String(row[col]) : 'NULL';
            return value.padEnd(columnWidths[i]);
          })
          .join(' | ');

        console.log(formattedRow);
      }

      console.log(`\n${rows.length} rows returned\n`);
      resolve();
    });
  });
}
