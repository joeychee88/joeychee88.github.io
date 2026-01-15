/**
 * A/B Testing Framework for AI Responses
 * Test different response styles and track which performs better
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ABTestingFramework {
  constructor() {
    this.experimentsDir = path.join(__dirname, '../data/experiments');
    if (!fs.existsSync(this.experimentsDir)) {
      fs.mkdirSync(this.experimentsDir, { recursive: true });
    }
  }

  /**
   * Create a new A/B test experiment
   */
  createExperiment(name, variantA, variantB) {
    const experiment = {
      id: `exp_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      status: 'active',
      variants: {
        A: {
          name: 'Control',
          prompt: variantA,
          impressions: 0,
          likes: 0,
          dislikes: 0
        },
        B: {
          name: 'Test',
          prompt: variantB,
          impressions: 0,
          likes: 0,
          dislikes: 0
        }
      }
    };

    const filePath = path.join(this.experimentsDir, `${experiment.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(experiment, null, 2));

    return experiment;
  }

  /**
   * Get active experiments
   */
  getActiveExperiments() {
    const files = fs.readdirSync(this.experimentsDir);
    const experiments = [];

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(this.experimentsDir, file), 'utf8');
        const exp = JSON.parse(content);
        if (exp.status === 'active') {
          experiments.push(exp);
        }
      }
    });

    return experiments;
  }

  /**
   * Select variant for user (50/50 split)
   */
  selectVariant(experimentId) {
    return Math.random() < 0.5 ? 'A' : 'B';
  }

  /**
   * Record impression for variant
   */
  recordImpression(experimentId, variant) {
    const filePath = path.join(this.experimentsDir, `${experimentId}.json`);
    if (!fs.existsSync(filePath)) return;

    const experiment = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    experiment.variants[variant].impressions++;
    fs.writeFileSync(filePath, JSON.stringify(experiment, null, 2));
  }

  /**
   * Record feedback for variant
   */
  recordFeedback(experimentId, variant, feedback) {
    const filePath = path.join(this.experimentsDir, `${experimentId}.json`);
    if (!fs.existsSync(filePath)) return;

    const experiment = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (feedback === 'like') {
      experiment.variants[variant].likes++;
    } else {
      experiment.variants[variant].dislikes++;
    }
    fs.writeFileSync(filePath, JSON.stringify(experiment, null, 2));
  }

  /**
   * Calculate winner and statistical significance
   */
  analyzeExperiment(experimentId) {
    const filePath = path.join(this.experimentsDir, `${experimentId}.json`);
    if (!fs.existsSync(filePath)) return null;

    const experiment = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const varA = experiment.variants.A;
    const varB = experiment.variants.B;

    const rateA = varA.impressions > 0 ? (varA.likes / varA.impressions) * 100 : 0;
    const rateB = varB.impressions > 0 ? (varB.likes / varB.impressions) * 100 : 0;

    const lift = ((rateB - rateA) / rateA) * 100;
    const winner = rateB > rateA ? 'B' : 'A';
    
    // Simple significance check (needs more impressions for confidence)
    const minImpressions = 30;
    const isSignificant = varA.impressions >= minImpressions && 
                          varB.impressions >= minImpressions && 
                          Math.abs(lift) > 10;

    return {
      experimentId,
      name: experiment.name,
      variantA: {
        impressions: varA.impressions,
        likes: varA.likes,
        dislikes: varA.dislikes,
        likeRate: rateA.toFixed(1)
      },
      variantB: {
        impressions: varB.impressions,
        likes: varB.likes,
        dislikes: varB.dislikes,
        likeRate: rateB.toFixed(1)
      },
      winner,
      lift: lift.toFixed(1),
      isSignificant,
      recommendation: isSignificant 
        ? `Variant ${winner} performs ${Math.abs(lift).toFixed(0)}% better. Consider rolling out.`
        : 'Need more data to determine winner with confidence.'
    };
  }

  /**
   * End experiment and mark winner
   */
  endExperiment(experimentId, winner) {
    const filePath = path.join(this.experimentsDir, `${experimentId}.json`);
    if (!fs.existsSync(filePath)) return;

    const experiment = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    experiment.status = 'completed';
    experiment.winner = winner;
    experiment.completedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(experiment, null, 2));

    return experiment;
  }
}

export default ABTestingFramework;
