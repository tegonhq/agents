import fs from 'fs';
import path from 'path';

import { Command } from 'commander';
import pino, { Logger } from 'pino';

import { AgentMessage, AgentMessageType } from './message';
import { About } from './types';
import { parseJsonInput } from 'utils';
import { BaseSkills } from './base-skills';
import { spinner, text } from '@clack/prompts';

// Abstract class for BaseAgent
export abstract class BaseAgent {
  protected program: Command;
  logger: Logger;

  // Add class variables for the options
  context: string;
  history: string;
  excludeSkills: string;
  configuration: string;
  autoMode: boolean;
  print: boolean;

  constructor() {
    this.program = new Command();
    this.registerCommands();

    const transport = this.program.opts().pretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined;

    this.logger = pino(
      {
        level: this.program.opts().logLevel || 'info',
        transport,
      },
      process.stderr,
    );
  }

  /**
   * Register CLI commands
   */
  private registerCommands(): void {
    this.program
      .name('agent')
      .description('CLI for Sigma Agent')
      .version(this.version(), '-v, --version', 'Display the version number')
      .option('--log-level <level>', 'Set logging level', 'info')
      .option('--pretty', 'Enable pretty printing of logs', false);

    this.program
      .command('skills')
      .description('Lists agent capabilities and available skills')
      .action(() => {
        console.log(this.skills());
      });

    this.program
      .command('about')
      .description('Provides information about what the agent does')
      .action(() => {
        console.log(this.about());
      });

    this.program
      .command('terms')
      .description('Shows domain-specific terminology the agent understands')
      .action(() => {
        console.log(this.terms());
      });

    this.program
      .command('ask')
      .description(
        'Executes the agent with a user message and streams responses',
      )
      .argument('<message>', 'Message to send to the agent')
      .option(
        '--context <context>',
        'General context data as JSON string or path to JSON file',
      )
      .option(
        '--history <history>',
        'Previous execution steps history as JSON string or path to JSON file',
      )
      .option(
        '--exclude-skills <skills>',
        'Comma-separated list of skills to exclude',
      )
      .option(
        '--configuration <config>',
        'Configuration as JSON string or path to JSON file',
      )
      .option('--print', 'Print the response and exit without interactive mode')
      .option('--auto-mode', 'Enable automatic mode', true)
      .action(async (message, options) => {
        try {
          // Update the class variables with the options values
          this.autoMode = options.autoMode || false;

          // Process context: parse JSON string or load from file
          this.context = parseJsonInput(
            this.logger,
            options.context || 'context.json',
          );

          // Process history: parse JSON string or load from file
          this.history = parseJsonInput(
            this.logger,
            options.history || 'history.json',
            '[]',
          );

          // Process excludeSkills: split comma-separated string into array
          this.excludeSkills = options.excludeSkills
            ? options.excludeSkills.split(',').map((s: string) => s.trim())
            : [];

          // Process configuration: parse JSON string or load from file
          this.configuration = parseJsonInput(
            this.logger,
            options.configuration || 'config.json',
          );

          this.print = options.print ?? true;
          this.ask(message);
        } catch (e) {
          // Handle errors by outputting as JSON
          const errorResponse = JSON.stringify({ error: (e as Error).message });
          console.log(
            JSON.stringify({
              message: errorResponse,
              type: AgentMessageType.ERROR,
            }),
          );
        }
      });
  }

  /**
   * These are the commands to be extended by the agents
   */

  /**
   * Show version information
   */
  version(): string {
    // Define a version constant that will be replaced during build
    // This approach doesn't rely on accessing package.json at runtime
    const VERSION = '0.1.0'; // This will be updated by build tools

    try {
      // First try to get version from environment if available
      if (process.env.AGENT_SDK_VERSION) {
        return process.env.AGENT_SDK_VERSION;
      }

      // If running in development with package.json available
      try {
        const packageJsonPath = path.resolve(__dirname, '../../package.json');
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8'),
        );
        return packageJson.version;
      } catch {
        // Fallback to the version constant
        return VERSION;
      }
    } catch (error) {
      return VERSION;
    }
  }

  /**
   * Get tools information
   */
  skills() {
    const skillsHandler = this.getSkillsHandler();
    console.log(skillsHandler.skills());
  }

  /**
   * Abstract method to get jargon information
   */
  terms(): string {
    return '';
  }

  /**
   * Abstract method to get agent description and configuration information
   * @returns A string containing the agent description and any required configuration inputs
   * that will be passed as configuration parameters when initializing the agent
   */
  about(): About {
    return { description: '', configuration: {} };
  }

  /**
   * Abstract method to run the agent
   * @param message Message to send to the agent
   * @param context Context to send to the agent
   * @param auth Authentication dictionary
   * @param autoMode Enable automatic mode
   */
  async ask(message: string) {
    let userMessage: string = message;

    // Start the loop
    while (true) {
      const response = this.askAgent(userMessage);

      for await (const responseMessage of response) {
        if (responseMessage.type.includes('THOUGHT')) {
          process.stdout.write(responseMessage.message);
        }
      }

      // If this is the end of the message and auto mode is disabled, ask for user input

      console.log('\n');
      const spin = spinner();
      spin.start('Processing...');

      const answer = await text({
        message: 'Ask...',
        placeholder: 'Type your question or press Enter to continue',
      });

      // If user provided input, use it as the next message
      if (answer && (answer as string).trim() !== '') {
        userMessage = answer as string;
        break;
      } else {
        // If user just pressed Enter, exit the loop
        return;
      }
    }
  }

  /**
   * Abstract method to get the skills handler
   * @returns A record of skill handlers that can be executed by the agent
   */
  abstract getSkillsHandler(): BaseSkills;

  /**
   * Abstract method to run the agent
   * @param message Message to send to the agent
   * @param context Context to send to the agent
   * @param auth Authentication dictionary
   * @param autoMode Enable automatic mode
   */
  abstract askAgent(
    message: string,
  ): AsyncGenerator<AgentMessage, void, unknown>;

  /**
   * Parse and execute CLI commands
   */
  async parseAndRun(argv: string[] = process.argv): Promise<void> {
    await this.program.parseAsync(argv);
  }
}
