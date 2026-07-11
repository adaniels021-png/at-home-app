/**
 * ==========================================================
 * AIManager
 * ----------------------------------------------------------
 * Central AI gateway for ABA at Home.
 *
 * Every screen in the app should eventually call AIManager
 * instead of individual generators.
 *
 * Current Engines
 * ----------------
 * ✓ Lesson Engine
 * ✓ Activity Engine
 * ✓ Behavior Engine
 *
 * Planned Engines
 * ----------------
 * - Parent Support
 * - Assessment
 * - Recommendations
 * - Worksheets
 * - Videos
 * ==========================================================
 */

import * as ActivityEngine from './activityGenerator';
import * as BehaviorEngine from './behaviorGenerator';
import * as LessonEngine from './lessonGenerator';

export class AIManager {
  /* =======================================================
   * LESSONS
   * ======================================================= */

  static async generateLesson(
    params: Parameters<typeof LessonEngine.generatePremiumLesson>[0]
  ) {
    return LessonEngine.generatePremiumLesson(params);
  }

  static async generatePremiumLesson(
    params: Parameters<typeof LessonEngine.generatePremiumLesson>[0]
  ) {
    return LessonEngine.generatePremiumLesson(params);
  }

  /* =======================================================
   * ACTIVITIES
   * ======================================================= */

  static async generateActivities(
    params: Parameters<typeof ActivityEngine.generateDailyABAActivities>[0]
  ) {
    return ActivityEngine.generateDailyABAActivities(params);
  }

  static async generateDailyActivities(
    params: Parameters<typeof ActivityEngine.generateDailyABAActivities>[0]
  ) {
    return ActivityEngine.generateDailyABAActivities(params);
  }

  /* =======================================================
   * BEHAVIOR SUPPORT
   * ======================================================= */

  static async generateBehaviorSupport(
    params: Parameters<typeof BehaviorEngine.generateBehaviorSupportPlan>[0]
  ) {
    return BehaviorEngine.generateBehaviorSupportPlan(params);
  }

  /* =======================================================
   * FUTURE AI ENGINES
   * ======================================================= */

  static async generateAssessment(..._args: any[]) {
    throw new Error('Assessment AI engine not implemented yet.');
  }

  static async generateRecommendations(..._args: any[]) {
    throw new Error('Recommendation AI engine not implemented yet.');
  }

  static async generateWorksheet(..._args: any[]) {
    throw new Error('Worksheet AI engine not implemented yet.');
  }

  static async generateVideo(..._args: any[]) {
    throw new Error('Video AI engine not implemented yet.');
  }

  static async generateParentSupport(..._args: any[]) {
    throw new Error('Parent Support AI engine not implemented yet.');
  }

  /* =======================================================
   * HEALTH CHECK
   * ======================================================= */

  static async ping() {
    return {
      lessonEngine: true,
      activityEngine: true,
      behaviorEngine: true,
      version: '1.0.0',
    };
  }
}

export default AIManager;