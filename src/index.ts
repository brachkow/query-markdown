#!/usr/bin/env node

import { Command } from 'commander';
import { findMarkdownFiles } from './utils/findMarkdownFiles.js';
import { loadMarkdownFiles } from './utils/loadMarkdownFiles.js';
import { createDuckDBConnection } from './utils/duckdb.js';
import { startRepl } from './utils/repl.js';
import { executeQuery } from './utils/executeQuery.js';

const program = new Command();

program
  .name('query-markdown')
  .description('CLI tool to query markdown files with SQL')
  .version('1.0.0')
  .argument('<directory>', 'Directory containing markdown files')
  .option('-q, --query <query>', 'SQL query to execute')
  .option('-j, --json', 'Output results as JSON (only for direct query mode)')
  .action(
    async (directory: string, options: { query?: string; json?: boolean }) => {
      try {
        // Find all markdown files in the directory
        const files = await findMarkdownFiles(directory);

        if (files.length === 0) {
          console.error(`No markdown files found in ${directory}`);
          process.exit(1);
        }

        console.log(`Found ${files.length} markdown files in ${directory}`);

        // Load and parse markdown files
        const markdownData = await loadMarkdownFiles(files);

        // Create DuckDB connection and load data
        const db = await createDuckDBConnection(markdownData);

        if (options.query) {
          // Execute the query directly if provided
          await executeQuery(db, options.query, options.json);
          process.exit(0);
        } else {
          // Start REPL mode
          if (options.json) {
            console.error('Error: JSON output is not available in REPL mode');
            console.error('Use --json only with the --query option');
            process.exit(1);
          }
          await startRepl(db);
        }
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    },
  );

program.parse();
