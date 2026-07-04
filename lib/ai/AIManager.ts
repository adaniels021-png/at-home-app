/**
 * ==========================================================
 * AIManager
 * ----------------------------------------------------------
 * Central entry point for every AI feature used in ABA at Home.
 *
 * The rest of the app should call AIManager instead of directly
 * importing individual generators.
 *
 * Future Engines:
 * - Lesson Engine
 * - Activity Engine
 * - Behavior Engine
 * - Parent Support Engine
 * - Worksheet Engine
 * - Video Engine
 * - Assessment Engine
 * - Recommendation Engine
 * ==========================================================
 */

import * as ActivityEngine from './activityGenerator';
import * as BehaviorEngine from './behaviorGenerator';
import * as LessonEngine from './lessonGenerator';

export class AIManager {
  /**
   * Generate a personalized ABA lesson.
   */
  static async generateLesson(
    params: Parameters<typeof LessonEngine.generatePremiumLesson>[0]
  ) {
    return LessonEngine.generatePremiumLesson(params);
  }

  /**
   * Generate Daily Adventures.
   */
  static async generateActivities(
    params: Parameters<typeof ActivityEngine.generateDailyABAActivities>[0]
  ) {
    return ActivityEngine.generateDailyABAActivities(params);
  }

  /**
   * Generate a behavior support plan.
   */
  static async generateBehaviorSupport(
    params: Parameters<typeof BehaviorEngine.generateBehaviorSupportPlan>[0]
  ) {
    return BehaviorEngine.generateBehaviorSupportPlan(params);
  }

  /**
   * Future AI Engines
   */

  static async generateWorksheet(..._args: any[]) {
    throw new Error('Worksheet AI engine not implemented yet.');
  }

  static async generateVideo(..._args: any[]) {
    throw new Error('Video AI engine not implemented yet.');
  }

  static async generateAssessment(..._args: any[]) {
    throw new Error('Assessment AI engine not implemented yet.');
  }

  static async generateRecommendation(..._args: any[]) {
    throw new Error('Recommendation AI engine not implemented yet.');
  }
}

export default AIManager;