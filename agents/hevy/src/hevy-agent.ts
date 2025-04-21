import { ReactBaseAgent } from '@tegonhq/agent-sdk';

import { HevySkills } from './hevy-skills';
import { TERMS } from './terms';

export class HevyAgent extends ReactBaseAgent {
  // eslint-disable-next-line @typescript-eslint/array-type, @typescript-eslint/no-explicit-any
  skills(): Array<any> {
    const hevySkills = new HevySkills({});
    const skills = hevySkills.skills();
    return Object.keys(skills).map((key) => ({ ...skills[key], name: key }));
  }

  version(): string {
    return '0.1.2';
  }

  terms(): string {
    return TERMS;
  }

  about() {
    return {
      description:
        'Hevy is a workout tracking app that allows users to log and track their fitness activities. The API provides access to workouts, exercises, and training data with detailed information on sets, reps, weights, and progress metrics. Workouts include structured data with exercise sequences, set details (including weight, reps, duration, and distance), and timing information. Each exercise is categorized by type (strength, cardio, stretching) and equipment (bodyweight, machine, free weight, cable), allowing for comprehensive fitness tracking and analysis. The system supports creating custom routines, tracking personal records, and analyzing performance trends over time.',
      configuration: {},
    };
  }

  getSkillsHandler() {
    const skillsHandler = new HevySkills(this.configuration as any);
    return skillsHandler;
  }
}
