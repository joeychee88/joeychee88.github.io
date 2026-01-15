/**
 * Feedback Analyzer - Analyze AI response feedback for continuous improvement
 * Processes feedback data to identify patterns, weak areas, and generate improvement suggestions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FeedbackAnalyzer {
  constructor(feedbackDir) {
    this.feedbackDir = feedbackDir || path.join(__dirname, '../data/feedback');
  }

  /**
   * Read all feedback files
   */
  readAllFeedback(daysBack = 7) {
    const allFeedback = [];
    const today = new Date();

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filePath = path.join(this.feedbackDir, `feedback-${dateStr}.jsonl`);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          try {
            allFeedback.push(JSON.parse(line));
          } catch (e) {
            console.error('Error parsing feedback line:', e);
          }
        });
      }
    }

    return allFeedback;
  }

  /**
   * Generate weekly summary statistics
   */
  generateWeeklySummary(daysBack = 7) {
    const feedback = this.readAllFeedback(daysBack);
    
    const summary = {
      totalFeedback: feedback.length,
      likes: feedback.filter(f => f.feedback === 'like').length,
      dislikes: feedback.filter(f => f.feedback === 'dislike').length,
      likeRate: 0,
      byObjective: {},
      byIndustry: {},
      problemAreas: [],
      topPerformers: [],
      generatedAt: new Date().toISOString()
    };

    summary.likeRate = summary.totalFeedback > 0 
      ? ((summary.likes / summary.totalFeedback) * 100).toFixed(1) 
      : 0;

    // Group by objective
    feedback.forEach(f => {
      const objective = f.context?.objective || 'unknown';
      if (!summary.byObjective[objective]) {
        summary.byObjective[objective] = { likes: 0, dislikes: 0, total: 0 };
      }
      summary.byObjective[objective].total++;
      if (f.feedback === 'like') summary.byObjective[objective].likes++;
      if (f.feedback === 'dislike') summary.byObjective[objective].dislikes++;
    });

    // Group by industry
    feedback.forEach(f => {
      const industry = f.context?.industry || 'unknown';
      if (!summary.byIndustry[industry]) {
        summary.byIndustry[industry] = { likes: 0, dislikes: 0, total: 0 };
      }
      summary.byIndustry[industry].total++;
      if (f.feedback === 'like') summary.byIndustry[industry].likes++;
      if (f.feedback === 'dislike') summary.byIndustry[industry].dislikes++;
    });

    // Identify problem areas (low like rate)
    Object.keys(summary.byObjective).forEach(objective => {
      const obj = summary.byObjective[objective];
      const rate = (obj.likes / obj.total) * 100;
      if (rate < 50 && obj.total >= 3) {
        summary.problemAreas.push({
          type: 'objective',
          name: objective,
          likeRate: rate.toFixed(1),
          total: obj.total
        });
      }
    });

    Object.keys(summary.byIndustry).forEach(industry => {
      const ind = summary.byIndustry[industry];
      const rate = (ind.likes / ind.total) * 100;
      if (rate < 50 && ind.total >= 3) {
        summary.problemAreas.push({
          type: 'industry',
          name: industry,
          likeRate: rate.toFixed(1),
          total: ind.total
        });
      }
    });

    // Identify top performers
    Object.keys(summary.byObjective).forEach(objective => {
      const obj = summary.byObjective[objective];
      const rate = (obj.likes / obj.total) * 100;
      if (rate >= 80 && obj.total >= 3) {
        summary.topPerformers.push({
          type: 'objective',
          name: objective,
          likeRate: rate.toFixed(1),
          total: obj.total
        });
      }
    });

    return summary;
  }

  /**
   * Find disliked messages for improvement
   */
  findDislikedMessages(limit = 10) {
    const feedback = this.readAllFeedback(7);
    const disliked = feedback
      .filter(f => f.feedback === 'dislike')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return disliked.map(f => ({
      message: f.messageContent,
      context: f.context,
      timestamp: f.timestamp,
      conversationId: f.conversationId
    }));
  }

  /**
   * Generate improvement suggestions based on disliked feedback
   */
  generateImprovementSuggestions() {
    const summary = this.generateWeeklySummary();
    const suggestions = [];

    // Check overall like rate
    if (summary.likeRate < 70) {
      suggestions.push({
        priority: 'high',
        area: 'overall',
        issue: `Overall like rate is ${summary.likeRate}% (target: 70%+)`,
        suggestion: 'Review and update main AI prompt to be more helpful and specific'
      });
    }

    // Check problem areas
    summary.problemAreas.forEach(area => {
      suggestions.push({
        priority: 'medium',
        area: area.type,
        issue: `${area.name} has low like rate: ${area.likeRate}%`,
        suggestion: `Review ${area.name}-specific recommendations. Consider adding more context-specific examples to the prompt.`
      });
    });

    // Check for industries with no feedback
    const knownIndustries = ['FMCG', 'Retail', 'Automotive', 'Property', 'Banking', 'Tech', 'Healthcare', 'Education'];
    const missingIndustries = knownIndustries.filter(ind => !summary.byIndustry[ind]);
    
    if (missingIndustries.length > 0) {
      suggestions.push({
        priority: 'low',
        area: 'coverage',
        issue: `No feedback for: ${missingIndustries.join(', ')}`,
        suggestion: 'Consider promoting AI planner for these industries to gather feedback'
      });
    }

    return suggestions;
  }

  /**
   * Export analytics report
   */
  exportReport() {
    const summary = this.generateWeeklySummary();
    const disliked = this.findDislikedMessages(10);
    const suggestions = this.generateImprovementSuggestions();

    const report = {
      summary,
      dislikedMessages: disliked,
      improvementSuggestions: suggestions,
      generatedAt: new Date().toISOString()
    };

    // Save report
    const reportPath = path.join(__dirname, '../data/feedback/weekly-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }
}

export default FeedbackAnalyzer;
