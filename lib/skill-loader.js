// RunAds - Skill Loader
// Loads marketing skill .md files at runtime and injects them into pipeline prompts
// Skills are stored in /skills/ directory and deployed with Vercel

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILLS_DIR = join(__dirname, '..', 'skills');

// Cache loaded skills in memory (they don't change at runtime)
const skillCache = {};

/**
 * Load a skill file by path relative to /skills/
 * Returns the raw markdown content or empty string if not found
 */
export function loadSkill(relativePath) {
  if (skillCache[relativePath]) return skillCache[relativePath];

  try {
    const fullPath = join(SKILLS_DIR, relativePath);
    const content = readFileSync(fullPath, 'utf8');
    skillCache[relativePath] = content;
    return content;
  } catch (e) {
    console.warn(`Skill file not found: ${relativePath}`);
    return '';
  }
}

/**
 * Load a complete skill with all its reference files
 * Returns { skill: string, references: { name: string } }
 */
export function loadSkillWithRefs(skillDir) {
  const skill = loadSkill(join(skillDir, 'SKILL.md'));
  const references = {};

  // Try to load common reference files
  const refFiles = [
    'competitor-analysis.md',
    'customer-research.md',
    'market-industry-research.md',
    'product-business-research.md',
    'advertorial-structure.md',
    'copywriting-masters.md',
    'fascinations-bullets.md',
    'psychology-triggers.md',
    'research-questions.md',
    'sales-letter-structure.md'
  ];

  for (const ref of refFiles) {
    const content = loadSkill(join(skillDir, 'references', ref));
    if (content) {
      const key = ref.replace('.md', '').replace(/-/g, '_');
      references[key] = content;
    }
  }

  return { skill, references };
}

// ============================================================
// PRE-BUILT SKILL CONTEXTS FOR EACH PIPELINE STEP
// ============================================================

/**
 * Get the full skill context for the RESEARCH step
 * Loads: dr-market-research SKILL + all 4 reference files
 */
export function getResearchSkillContext() {
  const { skill, references } = loadSkillWithRefs('dr-market-research');

  let context = '';
  if (skill) {
    context += '\n\n## DR-MARKET-RESEARCH SKILL FRAMEWORK:\n' + skill;
  }
  if (references.customer_research) {
    context += '\n\n## CUSTOMER RESEARCH METHODOLOGY:\n' + references.customer_research;
  }
  if (references.product_business_research) {
    context += '\n\n## PRODUCT & BUSINESS RESEARCH:\n' + references.product_business_research;
  }
  // competitor-analysis and market-industry are useful but large;
  // include a truncated version to stay within token limits
  if (references.competitor_analysis) {
    context += '\n\n## COMPETITOR ANALYSIS FRAMEWORK (Summary):\n' + references.competitor_analysis.substring(0, 3000);
  }

  return context;
}

/**
 * Get the full skill context for the STRATEGY step
 * Loads: persona-architect + research questions for avatar building
 */
export function getStrategySkillContext() {
  const personaSkill = loadSkill('persona-architect-SKILL.md');
  const researchQuestions = loadSkill('legendary-sales-letter/references/research-questions.md');

  let context = '';
  if (personaSkill) {
    context += '\n\n## PERSONA-ARCHITECT SKILL FRAMEWORK:\n' + personaSkill;
  }
  if (researchQuestions) {
    context += '\n\n## 88 DEEP RESEARCH QUESTIONS FOR AVATAR DEVELOPMENT:\n' + researchQuestions;
  }

  return context;
}

/**
 * Get the full skill context for the COPY step
 * Loads: legendary-sales-letter SKILL + key reference files
 */
export function getCopySkillContext(pageType) {
  const { skill, references } = loadSkillWithRefs('legendary-sales-letter');

  let context = '';
  if (skill) {
    context += '\n\n## LEGENDARY-SALES-LETTER SKILL FRAMEWORK:\n' + skill;
  }
  if (references.copywriting_masters) {
    context += '\n\n## MASTER COPYWRITER FRAMEWORKS:\n' + references.copywriting_masters;
  }
  if (references.fascinations_bullets) {
    context += '\n\n## 25 FASCINATION & BULLET FORMULAS:\n' + references.fascinations_bullets;
  }
  if (references.psychology_triggers) {
    context += '\n\n## PSYCHOLOGY TRIGGERS & PERSUASION:\n' + references.psychology_triggers;
  }

  // Load the appropriate structure based on page type
  if (pageType === 'advertorial' && references.advertorial_structure) {
    context += '\n\n## ADVERTORIAL STRUCTURE (USE THIS):\n' + references.advertorial_structure;
  } else if (references.sales_letter_structure) {
    context += '\n\n## SALES LETTER STRUCTURE (USE THIS):\n' + references.sales_letter_structure;
  }

  return context;
}

/**
 * Get the full skill context for the BRAND step
 * Loads: brand-style-extractor
 */
export function getBrandSkillContext() {
  const brandSkill = loadSkill('brand-style-extractor-SKILL.md');

  let context = '';
  if (brandSkill) {
    context += '\n\n## BRAND-STYLE-EXTRACTOR SKILL FRAMEWORK:\n' + brandSkill;
  }

  return context;
}

/**
 * Get the full skill context for AD GENERATION
 * Loads: meta-image-ad-generator
 */
export function getAdGenSkillContext() {
  const adSkill = loadSkill('meta-image-ad-generator-SKILL.md');

  let context = '';
  if (adSkill) {
    context += '\n\n## META-IMAGE-AD-GENERATOR SKILL FRAMEWORK:\n' + adSkill;
  }

  return context;
}
