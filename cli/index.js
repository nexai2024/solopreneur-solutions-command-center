#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('create-solopreneur-solutions-nexus-app')
  .description('Scaffold a new Solopreneur Solutions - Nexus project')
  .version('0.1.0')
  .argument('[project-name]', 'name of the project')
  .option('--db <type>', 'database type (postgresql, sqlite)', 'postgresql')
  .option('--styling <type>', 'styling type (tailwind, css-modules)', 'tailwind')
  .action(async (projectName, options) => {
    let name = projectName;
    let db = options.db;
    let styling = options.styling;

    const prompts = [];
    if (!name) {
      prompts.push({
        type: 'input',
        name: 'name',
        message: 'What is the name of your project?',
        default: 'my-nexus-app',
      });
    }

    if (!projectName) {
        prompts.push({
          type: 'list',
          name: 'db',
          message: 'Which database would you like to use?',
          choices: [
            { name: 'PostgreSQL (Recommended for production)', value: 'postgresql' },
            { name: 'SQLite (Easiest for local development)', value: 'sqlite' },
          ],
          default: 'postgresql',
        });
        prompts.push({
          type: 'list',
          name: 'styling',
          message: 'Which styling solution would you like?',
          choices: [
            { name: 'Tailwind CSS (Recommended)', value: 'tailwind' },
            { name: 'CSS Modules (Traditional)', value: 'css-modules' },
          ],
          default: 'tailwind',
        });
    }

    if (prompts.length > 0) {
      const responses = await inquirer.prompt(prompts);
      name = name || responses.name;
      db = db || responses.db;
      styling = styling || responses.styling;
    }

    const targetDir = path.join(process.cwd(), name);

    if (fs.existsSync(targetDir)) {
      console.error(chalk.red(`Directory ${name} already exists.`));
      process.exit(1);
    }

    const spinner = ora(`Creating project ${chalk.cyan(name)}...`).start();

    try {
      const templateName = db === 'sqlite' ? 'boilerplate-sqlite' : 'boilerplate-pg';
      const templateDir = path.join(__dirname, `../templates/${templateName}`);

      if (!fs.existsSync(templateDir)) {
         throw new Error(`Template directory not found at ${templateDir}`);
      }

      await fs.copy(templateDir, targetDir);

      if (styling === 'css-modules') {
        spinner.text = 'Adjusting styling to CSS Modules...';
        await fs.remove(path.join(targetDir, 'tailwind.config.ts'));
        await fs.remove(path.join(targetDir, 'postcss.config.js')).catch(() => {});
        await fs.writeFile(path.join(targetDir, 'app/globals.css'), '/* CSS Modules Setup */\nbody { margin: 0; font-family: sans-serif; }');

        const pagePath = path.join(targetDir, 'app/page.tsx');
        if (await fs.pathExists(pagePath)) {
            let pageContent = await fs.readFile(pagePath, 'utf-8');
            pageContent = pageContent.replace(/className="[^"]*"/g, '');
            await fs.writeFile(pagePath, pageContent);
        }

        const pkgPath = path.join(targetDir, 'package.json');
        const pkg = await fs.readJson(pkgPath);
        if (pkg.devDependencies) {
            delete pkg.devDependencies.tailwindcss;
            delete pkg.devDependencies.autoprefixer;
            delete pkg.devDependencies.postcss;
        }
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      }

      const pkgPath = path.join(targetDir, 'package.json');
      const pkg = await fs.readJson(pkgPath);
      pkg.name = name;
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });

      spinner.text = 'Initializing git repository...';
      try {
        execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      } catch (e) {}

      spinner.text = 'Installing dependencies...';
      try {
        execSync('npm install', { cwd: targetDir, stdio: 'ignore' });
      } catch (e) {
        spinner.warn(chalk.yellow('Failed to install dependencies automatically.'));
      }

      spinner.succeed(chalk.green(`Project ${chalk.cyan(name)} created successfully!`));

      console.log('\nConfigured with:');
      console.log(`- Database: ${chalk.yellow(db)}`);
      console.log(`- Styling: ${chalk.yellow(styling)}`);

      console.log('\nNext steps:');
      console.log(chalk.cyan(`  cd ${name}`));
      console.log(chalk.cyan('  npm run dev'));
      console.log('\nHappy building!');

    } catch (error) {
      spinner.fail(chalk.red('Failed to create project.'));
      console.error(error);
      process.exit(1);
    }
  });

program.parse();
