export interface HistoryStep {
  // The agent's reasoning process for this step
  thought?: string;

  // Indicates if this step contains a question for the user
  isQuestion?: boolean;
  // Indicates if this is the final response in the conversation
  isFinal?: boolean;

  // The name of the skill/tool being used in this step
  skill?: string;
  skillId?: string;
  skillInput?: string;

  // This is when the action has run and the output will be put here
  observation?: string;

  // This is what the user will read
  userMessage?: string;

  // If the agent has run completely
  completed?: boolean;

  // Token count
  tokenCount: TokenCount;
}

export interface ExecutionState {
  query: string;
  context?: string;
  previousHistory?: string;
  history: HistoryStep[];
  completed: boolean;
  autoMode: boolean;
}

export interface TokenCount {
  inputTokens: number;
  outputToken: number;
}

export interface State {
  inTag: boolean;
  messageEnded: boolean;
  message: string;
  lastSent: string;
}
export interface About {
  description: string;
  configuration: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'select';
      description: string;
      required: boolean;
      default?: string | number | boolean;
      options?: string[]; // For select type inputs
    }
  >;
}
