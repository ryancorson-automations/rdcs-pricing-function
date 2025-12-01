import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { PropertyCondition } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * AI Vision Service
 *
 * Analyzes property conditions using Google Street View images and GPT-4 Vision
 * Extracts: grass height, bush count, tree coverage, debris level, bed condition
 * Returns: complexity score (1-5) for pricing adjustments
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYSIS_PROMPT = `You are an expert landscaping professional analyzing a property from a street view image.

Analyze the property and provide a detailed assessment of the following:

1. **Grass Height & Lawn Condition**:
   - Is the grass at normal mowing height (~3 inches)?
   - Is it overgrown (6-12 inches)?
   - Is it very overgrown (>12 inches)?
   - What's the overall lawn health?

2. **Bushes & Shrubs**:
   - Estimate the number of bushes/shrubs visible
   - Are they well-maintained or overgrown?
   - Do they need trimming?

3. **Tree Coverage**:
   - How many trees are visible on or near the property?
   - Light coverage (<3 trees), Moderate (3-6 trees), or Heavy (>6 trees)?
   - Consider impact on leaf cleanup difficulty

4. **Debris & Cleanliness**:
   - Are there visible leaves, sticks, or debris?
   - Minimal, moderate, or heavy debris?
   - Is the yard well-maintained or neglected?

5. **Landscape Beds**:
   - Are mulch beds visible?
   - What's their condition? (Good, needs work, overgrown)
   - Are edges clean or overgrown?

6. **Overall Complexity Score (1-5)**:
   - 1: Pristine, easy maintenance property
   - 2: Well-maintained, standard effort
   - 3: Average condition, moderate effort
   - 4: Needs work, higher effort required
   - 5: Severely overgrown/neglected, maximum effort

Return your analysis in JSON format with this exact structure:
{
  "grassHeight": "normal" | "overgrown" | "very_overgrown",
  "bushCount": <number>,
  "treeCoverage": "light" | "moderate" | "heavy",
  "debrisLevel": "minimal" | "moderate" | "heavy",
  "leafVolume": "minimal" | "moderate" | "heavy",
  "bedCondition": "good" | "needs_work" | "overgrown",
  "conditionScore": <1-5>,
  "reasoning": "<brief explanation of complexity score>"
}

Be realistic and err on the side of caution. If you can't see something clearly, make a conservative estimate based on what's visible.`;

interface VisionAnalysisResult extends PropertyCondition {
  reasoning?: string;
}

/**
 * Analyze property condition from Street View image URL
 */
export async function analyzePropertyCondition(
  streetViewUrl: string
): Promise<PropertyCondition> {
  try {
    logger.info('Starting AI vision analysis', { streetViewUrl });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 with vision capabilities
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: streetViewUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new AppError('No response from AI vision model', 500);
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonContent = content;
    if (content.includes('```json')) {
      const match = content.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        jsonContent = match[1];
      }
    } else if (content.includes('```')) {
      const match = content.match(/```\n([\s\S]*?)\n```/);
      if (match) {
        jsonContent = match[1];
      }
    }

    const analysis: VisionAnalysisResult = JSON.parse(jsonContent.trim());

    logger.info('AI vision analysis completed:', {
      conditionScore: analysis.conditionScore,
      grassHeight: analysis.grassHeight,
      bushCount: analysis.bushCount,
      reasoning: analysis.reasoning,
    });

    // Return only the PropertyCondition fields (exclude reasoning from return)
    const condition: PropertyCondition = {
      conditionScore: analysis.conditionScore,
      grassHeight: analysis.grassHeight,
      bushCount: analysis.bushCount,
      treeCoverage: analysis.treeCoverage,
      debrisLevel: analysis.debrisLevel,
      leafVolume: analysis.leafVolume,
      bedCondition: analysis.bedCondition,
    };

    return condition;
  } catch (error: any) {
    logger.error('AI vision analysis error:', {
      error: error.message,
      streetViewUrl,
    });

    // Return default values if analysis fails
    logger.warn('Using default property condition values');
    return {
      conditionScore: 3, // Default to average complexity
      grassHeight: 'normal',
      bushCount: 5,
      treeCoverage: 'moderate',
      debrisLevel: 'minimal',
      leafVolume: 'minimal',
      bedCondition: 'good',
    };
  }
}

/**
 * Convert condition score to pricing complexity multiplier
 *
 * Score 1: 0.9x (easier than average, small discount)
 * Score 2: 1.0x (standard pricing)
 * Score 3: 1.1x (average complexity)
 * Score 4: 1.25x (needs extra work)
 * Score 5: 1.5x (severely overgrown, maximum effort)
 */
export function conditionScoreToMultiplier(score: number): number {
  const multipliers: { [key: number]: number } = {
    1: 0.9,
    2: 1.0,
    3: 1.1,
    4: 1.25,
    5: 1.5,
  };

  return multipliers[score] || 1.0;
}

/**
 * Analyze multiple Street View angles for more comprehensive analysis
 * (Optional enhancement - analyzes property from 4 directions)
 */
export async function analyzePropertyMultiAngle(
  lat: number,
  lng: number
): Promise<PropertyCondition> {
  const headings = [0, 90, 180, 270]; // North, East, South, West
  const analyses: PropertyCondition[] = [];

  for (const heading of headings) {
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&heading=${heading}&pitch=0&key=${process.env.GOOGLE_STREET_VIEW_API_KEY}`;

    try {
      const analysis = await analyzePropertyCondition(streetViewUrl);
      analyses.push(analysis);
    } catch (error) {
      logger.warn(`Failed to analyze heading ${heading}`, error);
    }
  }

  if (analyses.length === 0) {
    throw new AppError('Failed to analyze property from any angle', 500);
  }

  // Aggregate results (use highest complexity score, average bush count)
  const aggregated: PropertyCondition = {
    conditionScore: Math.max(...analyses.map((a) => a.conditionScore || 3)),
    bushCount: Math.round(
      analyses.reduce((sum, a) => sum + (a.bushCount || 0), 0) / analyses.length
    ),
    grassHeight:
      analyses.find((a) => a.grassHeight === 'very_overgrown')?.grassHeight ||
      analyses.find((a) => a.grassHeight === 'overgrown')?.grassHeight ||
      'normal',
    treeCoverage:
      analyses.find((a) => a.treeCoverage === 'heavy')?.treeCoverage ||
      analyses.find((a) => a.treeCoverage === 'moderate')?.treeCoverage ||
      'light',
    debrisLevel:
      analyses.find((a) => a.debrisLevel === 'heavy')?.debrisLevel ||
      analyses.find((a) => a.debrisLevel === 'moderate')?.debrisLevel ||
      'minimal',
    leafVolume:
      analyses.find((a) => a.leafVolume === 'heavy')?.leafVolume ||
      analyses.find((a) => a.leafVolume === 'moderate')?.leafVolume ||
      'minimal',
    bedCondition:
      analyses.find((a) => a.bedCondition === 'overgrown')?.bedCondition ||
      analyses.find((a) => a.bedCondition === 'needs_work')?.bedCondition ||
      'good',
  };

  logger.info('Multi-angle analysis aggregated:', aggregated);

  return aggregated;
}
