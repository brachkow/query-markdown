import * as duckdb from 'duckdb';
import * as readline from 'readline';
import { executeQuery } from './executeQuery.js';

/**
 * Start a REPL for SQL queries
 * @param db DuckDB database connection
 */
export async function startRepl(db: duckdb.Database): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sql> ',
  });

  console.log('Welcome to query-markdown SQL REPL');
  console.log('Enter SQL queries to execute them against the markdown files');
  console.log('Type .exit, .quit, or press Ctrl+C to exit');
  console.log('Type .tables to list available tables');
  console.log('Type .schema <table> to show table schema');
  console.log('Type .help to show this help message');
  console.log();
  console.log('Available tables:');
  console.log(
    '  - frontmatter: Contains all frontmatter data and content from markdown files',
  );
  console.log();

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      rl.prompt();
      return;
    }

    if (
      trimmedLine.toLowerCase() === '.exit' ||
      trimmedLine.toLowerCase() === '.quit'
    ) {
      rl.close();
      return;
    }

    if (trimmedLine.toLowerCase() === '.help') {
      console.log('Available commands:');
      console.log('  .exit, .quit - Exit the REPL');
      console.log('  .tables - List available tables');
      console.log('  .schema <table> - Show table schema');
      console.log('  .help - Show this help message');
      console.log();
      console.log('Available tables:');
      console.log(
        '  - frontmatter: Contains all frontmatter data and content from markdown files',
      );
      console.log();
      rl.prompt();
      return;
    }

    if (trimmedLine.toLowerCase() === '.tables') {
      try {
        await executeQuery(
          db,
          `
          SELECT name FROM sqlite_master 
          WHERE type='table' OR type='view'
          ORDER BY name
        `,
        );
      } catch (error) {
        console.error('Error listing tables:', error);
      }
      rl.prompt();
      return;
    }

    if (trimmedLine.toLowerCase().startsWith('.schema ')) {
      const tableName = trimmedLine.substring(8).trim();
      try {
        await executeQuery(db, `PRAGMA table_info(${tableName})`);
      } catch (error) {
        console.error(`Error getting schema for ${tableName}:`, error);
      }
      rl.prompt();
      return;
    }

    try {
      await executeQuery(db, trimmedLine);
    } catch (error) {
      // Error is already logged in executeQuery
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}
