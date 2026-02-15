// RunAds - Design System Module
// Template scaffolding, CSS variable system, and component library for all 7 page types.
// Used by pipeline.js to provide Claude with structured HTML skeletons instead of generating from scratch.

// ============================================================
// CSS VARIABLE SYSTEM
// ============================================================
export function generateBrandCSS(brandData = {}) {
  const colors = brandData.colors || {};
  const typography = brandData.typography || {};
  const spacing = brandData.spacing || {};

  return `:root {
    --primary: ${colors.primary || '#1a1a2e'};
    --secondary: ${colors.secondary || '#16213e'};
    --accent: ${colors.accent || '#e94560'};
    --bg: ${colors.background || '#ffffff'};
    --bg-alt: ${colors.background_alt || '#f8f6f3'};
    --text: ${colors.text || '#1a1a2e'};
    --text-light: ${colors.text_light || '#6b7280'};
    --text-on-dark: ${colors.text_on_dark || '#ffffff'};
    --border: ${colors.border || '#e5e7eb'};
    --success: ${colors.success || '#10b981'};
    --warning: ${colors.warning || '#f59e0b'};
    --urgency: ${colors.urgency || '#ef4444'};
    --heading-font: ${typography.heading_font || "'Inter', sans-serif"};
    --body-font: ${typography.body_font || "'Inter', sans-serif"};
    --base-size: ${typography.base_size || '16px'};
    --line-height: ${typography.line_height || '1.6'};
    --radius: ${spacing.border_radius || '8px'};
    --spacing: ${spacing.unit || '16px'};
    --max-width: ${spacing.max_width || '1200px'};
    --section-padding: ${spacing.section_padding || '80px 20px'};
  }`;
}

// ============================================================
// BASE STYLES (shared across all templates)
// ============================================================
const BASE_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--body-font);
  font-size: var(--base-size);
  line-height: var(--line-height);
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; height: auto; display: block; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2, h3, h4, h5, h6 { font-family: var(--heading-font); line-height: 1.2; font-weight: 700; }
h1 { font-size: clamp(2rem, 5vw, 3.5rem); }
h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); }
h3 { font-size: clamp(1.25rem, 3vw, 1.75rem); }
.container { max-width: var(--max-width); margin: 0 auto; padding: 0 20px; }

/* Section Styles */
.section { padding: var(--section-padding); }
.section-alt { background: var(--bg-alt); }
.section-dark { background: var(--primary); color: var(--text-on-dark); }

/* Grid System */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }

/* Button Styles */
.cta-btn {
  display: inline-block; padding: 16px 32px; background: var(--accent); color: #fff;
  border: none; border-radius: var(--radius); font-size: 18px; font-weight: 700;
  cursor: pointer; text-decoration: none; text-align: center; transition: all 0.3s;
}
.cta-btn:hover { opacity: 0.9; transform: translateY(-2px); text-decoration: none; }
.cta-btn-outline {
  display: inline-block; padding: 14px 28px; background: transparent; color: var(--accent);
  border: 2px solid var(--accent); border-radius: var(--radius); font-size: 16px; font-weight: 600;
  cursor: pointer; text-decoration: none; transition: all 0.3s;
}
.cta-btn-outline:hover { background: var(--accent); color: #fff; }

/* Stat Cards */
.stat-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; padding: 24px 0; }
.stat-item { text-align: center; padding: 20px; }
.stat-number { font-size: 2.5rem; font-weight: 800; color: var(--accent); line-height: 1; }
.stat-label { font-size: 0.875rem; color: var(--text-light); margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }

/* Testimonials */
.testimonial-card {
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px; position: relative;
}
.testimonial-quote { font-style: italic; font-size: 1rem; margin-bottom: 16px; line-height: 1.6; }
.testimonial-author { font-weight: 700; font-size: 0.9rem; }
.testimonial-role { color: var(--text-light); font-size: 0.8rem; }
.testimonial-stars { color: #f59e0b; margin-bottom: 8px; }

/* Benefits */
.benefit-item { display: flex; align-items: start; gap: 12px; margin-bottom: 16px; }
.benefit-icon { width: 24px; height: 24px; background: var(--accent); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.benefit-text h4 { margin-bottom: 4px; font-size: 1rem; }
.benefit-text p { color: var(--text-light); font-size: 0.9rem; }

/* FAQ */
.faq-item { border-bottom: 1px solid var(--border); }
.faq-question { padding: 20px 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 1.05rem; }
.faq-question::after { content: '+'; font-size: 1.5rem; color: var(--accent); transition: transform 0.3s; }
.faq-item.open .faq-question::after { transform: rotate(45deg); }
.faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.faq-item.open .faq-answer { max-height: 500px; }
.faq-answer-inner { padding: 0 0 20px; color: var(--text-light); }

/* Form */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--radius);
  font-size: 1rem; font-family: var(--body-font);
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(233,69,96,0.1); }

/* Badges */
.badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
.badge-primary { background: var(--accent); color: #fff; }
.badge-subtle { background: var(--bg-alt); color: var(--text-light); }

/* Sticky Nav */
.sticky-nav { position: sticky; top: 0; z-index: 100; background: var(--bg); border-bottom: 1px solid var(--border); padding: 12px 20px; }
.sticky-nav .container { display: flex; justify-content: space-between; align-items: center; }
.nav-logo { font-weight: 800; font-size: 1.25rem; color: var(--text); }
.nav-cta { padding: 8px 20px; font-size: 0.875rem; }

/* Progress Bar (reading) */
.reading-progress { position: fixed; top: 0; left: 0; width: 0%; height: 3px; background: var(--accent); z-index: 200; transition: width 0.1s; }

/* Responsive */
@media (max-width: 768px) {
  .grid-2 { grid-template-columns: 1fr; gap: 24px; }
  .grid-3 { grid-template-columns: 1fr; gap: 16px; }
  .grid-4 { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .section { padding: 48px 16px; }
  .stat-number { font-size: 2rem; }
  .cta-btn { width: 100%; }
}
@media (max-width: 480px) {
  .grid-4 { grid-template-columns: 1fr; }
}
`;

// ============================================================
// COMPONENT LIBRARY
// ============================================================
export const COMPONENTS = {
  'hero-section': ({ headline, subheadline, cta_text, cta_secondary, badge_text, image_bg }) => `
    <section class="section" style="min-height: 80vh; display: flex; align-items: center; ${image_bg ? `background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${image_bg}') center/cover;` : ''}">
      <div class="container">
        ${badge_text ? `<span class="badge badge-primary">${badge_text}</span>` : ''}
        <h1 style="margin-top: 16px; ${image_bg ? 'color: #fff;' : ''}">${headline || '{{HEADLINE}}'}</h1>
        <p style="font-size: 1.25rem; margin-top: 16px; max-width: 640px; ${image_bg ? 'color: rgba(255,255,255,0.9);' : 'color: var(--text-light);'}">${subheadline || '{{SUBHEADLINE}}'}</p>
        <div style="margin-top: 32px; display: flex; gap: 16px; flex-wrap: wrap;">
          <a href="#cta" class="cta-btn">${cta_text || '{{CTA_TEXT}}'}</a>
          ${cta_secondary ? `<a href="#learn-more" class="cta-btn-outline">${cta_secondary}</a>` : ''}
        </div>
      </div>
    </section>`,

  'hero-split': ({ headline, subheadline, cta_text, badge_text }) => `
    <section class="section" style="min-height: 80vh; display: flex; align-items: center;">
      <div class="container grid-2">
        <div>
          ${badge_text ? `<span class="badge badge-primary">${badge_text}</span>` : ''}
          <h1 style="margin-top: 16px;">${headline || '{{HEADLINE}}'}</h1>
          <p style="font-size: 1.125rem; margin-top: 16px; color: var(--text-light);">${subheadline || '{{SUBHEADLINE}}'}</p>
          <a href="#cta" class="cta-btn" style="margin-top: 24px;">${cta_text || '{{CTA_TEXT}}'}</a>
        </div>
        <div style="background: var(--bg-alt); border-radius: var(--radius); min-height: 400px; display: flex; align-items: center; justify-content: center;">
          <span style="color: var(--text-light);">{{HERO_IMAGE}}</span>
        </div>
      </div>
    </section>`,

  'stat-bar': ({ stats }) => {
    const items = stats || [
      { number: '{{STAT_1_NUMBER}}', label: '{{STAT_1_LABEL}}' },
      { number: '{{STAT_2_NUMBER}}', label: '{{STAT_2_LABEL}}' },
      { number: '{{STAT_3_NUMBER}}', label: '{{STAT_3_LABEL}}' }
    ];
    return `
    <section class="section-alt section">
      <div class="container">
        <div class="stat-bar">
          ${items.map(s => `
          <div class="stat-item">
            <div class="stat-number">${s.number}</div>
            <div class="stat-label">${s.label}</div>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  'testimonial-grid': ({ testimonials, headline }) => {
    const items = testimonials || [
      { quote: '{{TESTIMONIAL_1}}', author: '{{AUTHOR_1}}', role: '', stars: 5 },
      { quote: '{{TESTIMONIAL_2}}', author: '{{AUTHOR_2}}', role: '', stars: 5 },
      { quote: '{{TESTIMONIAL_3}}', author: '{{AUTHOR_3}}', role: '', stars: 5 }
    ];
    return `
    <section class="section">
      <div class="container">
        ${headline ? `<h2 style="text-align: center; margin-bottom: 40px;">${headline}</h2>` : ''}
        <div class="grid-3">
          ${items.map(t => `
          <div class="testimonial-card">
            <div class="testimonial-stars">${'★'.repeat(t.stars || 5)}</div>
            <p class="testimonial-quote">"${t.quote}"</p>
            <div class="testimonial-author">${t.author}</div>
            ${t.role ? `<div class="testimonial-role">${t.role}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  'benefits-list': ({ benefits, headline, subheadline }) => {
    const items = benefits || [
      { title: '{{BENEFIT_1_TITLE}}', desc: '{{BENEFIT_1_DESC}}' },
      { title: '{{BENEFIT_2_TITLE}}', desc: '{{BENEFIT_2_DESC}}' },
      { title: '{{BENEFIT_3_TITLE}}', desc: '{{BENEFIT_3_DESC}}' }
    ];
    return `
    <section class="section">
      <div class="container" style="max-width: 720px;">
        ${headline ? `<h2 style="margin-bottom: 12px;">${headline}</h2>` : ''}
        ${subheadline ? `<p style="color: var(--text-light); margin-bottom: 32px;">${subheadline}</p>` : ''}
        <div>
          ${items.map(b => `
          <div class="benefit-item">
            <div class="benefit-icon">✓</div>
            <div class="benefit-text">
              <h4>${b.title}</h4>
              <p>${b.desc}</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  'faq-accordion': ({ items, headline }) => {
    const faqs = items || [
      { question: '{{FAQ_1_Q}}', answer: '{{FAQ_1_A}}' },
      { question: '{{FAQ_2_Q}}', answer: '{{FAQ_2_A}}' },
      { question: '{{FAQ_3_Q}}', answer: '{{FAQ_3_A}}' }
    ];
    return `
    <section class="section">
      <div class="container" style="max-width: 720px;">
        ${headline ? `<h2 style="text-align: center; margin-bottom: 40px;">${headline}</h2>` : ''}
        <div>
          ${faqs.map(f => `
          <div class="faq-item" onclick="this.classList.toggle('open')">
            <div class="faq-question">${f.question}</div>
            <div class="faq-answer"><div class="faq-answer-inner">${f.answer}</div></div>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  'cta-block': ({ headline, subheadline, cta_text, dark }) => `
    <section class="section ${dark ? 'section-dark' : 'section-alt'}">
      <div class="container" style="text-align: center; max-width: 640px;">
        <h2>${headline || '{{CTA_HEADLINE}}'}</h2>
        <p style="margin-top: 12px; ${dark ? 'color: rgba(255,255,255,0.8);' : 'color: var(--text-light);'}">${subheadline || '{{CTA_SUBHEADLINE}}'}</p>
        <a href="#cta" class="cta-btn" style="margin-top: 24px;">${cta_text || '{{CTA_TEXT}}'}</a>
      </div>
    </section>`,

  'comparison-table': ({ headers, rows, headline }) => `
    <section class="section">
      <div class="container" style="max-width: 800px;">
        ${headline ? `<h2 style="text-align: center; margin-bottom: 32px;">${headline}</h2>` : ''}
        <table style="width: 100%; border-collapse: collapse; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;">
          <thead style="background: var(--primary); color: var(--text-on-dark);">
            <tr>${(headers || ['Feature', 'Them', 'Us']).map(h => `<th style="padding: 14px 16px; text-align: left; font-weight: 600;">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${(rows || [['{{ROW_1}}', '✗', '✓'], ['{{ROW_2}}', '✗', '✓'], ['{{ROW_3}}', '✗', '✓']]).map((row, i) => `
            <tr style="background: ${i % 2 ? 'var(--bg-alt)' : 'var(--bg)'}; border-bottom: 1px solid var(--border);">
              ${row.map(cell => `<td style="padding: 12px 16px;">${cell}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`,

  'form-block': ({ headline, subheadline, fields, cta_text, privacy_text }) => {
    const formFields = fields || [
      { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Enter your name' },
      { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' }
    ];
    return `
    <section class="section section-alt" id="cta">
      <div class="container" style="max-width: 480px;">
        <div style="background: var(--bg); padding: 40px; border-radius: var(--radius); box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          ${headline ? `<h2 style="text-align: center; margin-bottom: 8px;">${headline}</h2>` : ''}
          ${subheadline ? `<p style="text-align: center; color: var(--text-light); margin-bottom: 24px;">${subheadline}</p>` : ''}
          <form>
            ${formFields.map(f => `
            <div class="form-group">
              <label>${f.label}</label>
              <input type="${f.type}" name="${f.name}" placeholder="${f.placeholder}" required>
            </div>`).join('')}
            <button type="submit" class="cta-btn" style="width: 100%; margin-top: 8px;">${cta_text || '{{FORM_CTA}}'}</button>
          </form>
          ${privacy_text ? `<p style="text-align: center; font-size: 0.75rem; color: var(--text-light); margin-top: 12px;">${privacy_text}</p>` : ''}
        </div>
      </div>
    </section>`;
  },

  'phone-mockup': ({ messages }) => {
    const msgs = messages || [
      { day: 'Day 1', text: '{{SMS_DAY_1}}' },
      { day: 'Day 3', text: '{{SMS_DAY_3}}' },
      { day: 'Day 7', text: '{{SMS_DAY_7}}' }
    ];
    return `
    <div style="max-width: 320px; margin: 0 auto; background: #1a1a2e; border-radius: 36px; padding: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);">
      <div style="background: #f5f5f5; border-radius: 28px; padding: 20px 16px; min-height: 500px;">
        <div style="text-align: center; font-size: 0.75rem; color: #999; margin-bottom: 16px;">Messages</div>
        ${msgs.map(m => `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.7rem; color: #999; text-align: center; margin-bottom: 8px;">${m.day}</div>
          <div style="background: #e5e5ea; border-radius: 18px; padding: 10px 14px; max-width: 85%; font-size: 0.9rem; line-height: 1.4;">${m.text}</div>
        </div>`).join('')}
      </div>
    </div>`;
  },

  'quiz-question': ({ question, options, step, total }) => `
    <div class="quiz-step" data-step="${step}">
      <div style="margin-bottom: 24px;">
        <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 8px;">Question ${step} of ${total}</div>
        <div style="background: var(--border); border-radius: 4px; height: 6px; overflow: hidden;">
          <div style="background: var(--accent); width: ${(step / total) * 100}%; height: 100%; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
      </div>
      <h3 style="margin-bottom: 20px;">${question || '{{QUESTION}}'}</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${(options || ['{{OPTION_A}}', '{{OPTION_B}}', '{{OPTION_C}}']).map(o => `
        <button class="quiz-option" style="padding: 16px 20px; border: 2px solid var(--border); border-radius: var(--radius); background: var(--bg); font-size: 1rem; cursor: pointer; text-align: left; transition: all 0.2s;"
          onmouseover="this.style.borderColor='var(--accent)'"
          onmouseout="this.style.borderColor='var(--border)'"
          onclick="this.style.background='var(--accent)';this.style.color='#fff';this.style.borderColor='var(--accent)'"
        >${o}</button>`).join('')}
      </div>
    </div>`,

  'section-content': ({ headline, body, image_position }) => `
    <section class="section">
      <div class="container ${image_position ? 'grid-2' : ''}" ${image_position === 'right' ? 'style="direction: ltr;"' : ''}>
        <div>
          <h2>${headline || '{{SECTION_HEADLINE}}'}</h2>
          <div style="margin-top: 16px; color: var(--text-light); line-height: 1.8;">${body || '{{SECTION_BODY}}'}</div>
        </div>
        ${image_position ? `
        <div style="background: var(--bg-alt); border-radius: var(--radius); min-height: 300px; display: flex; align-items: center; justify-content: center;">
          <span style="color: var(--text-light);">{{IMAGE}}</span>
        </div>` : ''}
      </div>
    </section>`
};

// ============================================================
// PAGE TYPE TEMPLATES
// ============================================================
const PAGE_TEMPLATES = {

  // ─── ADVERTORIAL ──────────────────────────────────────
  advertorial: (brand) => ({
    metadata: { type: 'advertorial', sections: 12 },
    slots: ['badge_text', 'headline', 'subheadline', 'author_name', 'date', 'read_time', 'hero_body', 'stats', 'problem_headline', 'problem_body', 'solution_headline', 'solution_body', 'science_headline', 'science_body', 'results', 'testimonials', 'cta_headline', 'cta_text', 'faqs', 'disclosure'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <meta property="og:title" content="{{META_TITLE}}">
  <meta property="og:description" content="{{META_DESCRIPTION}}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .reading-progress { position: fixed; top: 0; left: 0; width: 0%; height: 3px; background: var(--accent); z-index: 200; }
    .article-meta { display: flex; align-items: center; gap: 16px; color: var(--text-light); font-size: 0.875rem; margin: 16px 0; }
    .article-body p { margin-bottom: 1.25rem; }
    .pullquote { border-left: 4px solid var(--accent); padding: 20px 24px; margin: 32px 0; background: var(--bg-alt); font-size: 1.125rem; font-style: italic; }
    .highlight-box { background: var(--bg-alt); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="reading-progress" id="readingProgress"></div>

  <!-- Sticky Nav -->
  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
      <a href="#cta" class="cta-btn nav-cta">{{NAV_CTA}}</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="section" style="padding-top: 48px;">
    <div class="container" style="max-width: 760px;">
      <span class="badge badge-primary">{{BADGE_TEXT}}</span>
      <h1 style="margin-top: 16px;">{{HEADLINE}}</h1>
      <p style="font-size: 1.25rem; margin-top: 16px; color: var(--text-light);">{{SUBHEADLINE}}</p>
      <div class="article-meta">
        <span>By {{AUTHOR_NAME}}</span>
        <span>·</span>
        <span>{{DATE}}</span>
        <span>·</span>
        <span>{{READ_TIME}} min read</span>
      </div>
    </div>
  </section>

  <!-- Hero Image Area -->
  <section style="padding: 0 20px;">
    <div class="container" style="max-width: 760px;">
      <div style="background: var(--bg-alt); border-radius: var(--radius); height: 400px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px;">
        <span style="color: var(--text-light);">{{HERO_IMAGE}}</span>
      </div>
    </div>
  </section>

  <!-- Intro Body -->
  <section style="padding: 0 20px 48px;">
    <div class="container article-body" style="max-width: 760px;">
      {{HERO_BODY}}
    </div>
  </section>

  <!-- Stats Bar -->
  {{STATS_SECTION}}

  <!-- Problem Section -->
  <section class="section">
    <div class="container" style="max-width: 760px;">
      <h2>{{PROBLEM_HEADLINE}}</h2>
      <div class="article-body" style="margin-top: 20px;">
        {{PROBLEM_BODY}}
      </div>
    </div>
  </section>

  <!-- Mid CTA -->
  {{MID_CTA_SECTION}}

  <!-- Solution Section -->
  <section class="section section-dark">
    <div class="container" style="max-width: 760px;">
      <h2>{{SOLUTION_HEADLINE}}</h2>
      <div class="article-body" style="margin-top: 20px;">
        {{SOLUTION_BODY}}
      </div>
    </div>
  </section>

  <!-- Science / Detail Section -->
  <section class="section">
    <div class="container" style="max-width: 760px;">
      <h2>{{SCIENCE_HEADLINE}}</h2>
      <div class="article-body" style="margin-top: 20px;">
        {{SCIENCE_BODY}}
      </div>
    </div>
  </section>

  <!-- Results -->
  {{RESULTS_SECTION}}

  <!-- Testimonials -->
  {{TESTIMONIALS_SECTION}}

  <!-- Final CTA -->
  {{FINAL_CTA_SECTION}}

  <!-- FAQ -->
  {{FAQ_SECTION}}

  <!-- Footer -->
  <footer class="section" style="padding: 24px 20px; border-top: 1px solid var(--border);">
    <div class="container" style="max-width: 760px; text-align: center; color: var(--text-light); font-size: 0.8rem;">
      {{DISCLOSURE}}
    </div>
  </footer>

  <script>
    window.addEventListener('scroll', function() {
      var h = document.documentElement;
      var pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      document.getElementById('readingProgress').style.width = pct + '%';
    });
    document.querySelectorAll('.faq-item').forEach(function(item) {
      item.addEventListener('click', function() { this.classList.toggle('open'); });
    });
  </script>
</body>
</html>`
  }),

  // ─── LISTICLE ──────────────────────────────────────
  listicle: (brand) => ({
    metadata: { type: 'listicle', sections: 10 },
    slots: ['badge_text', 'headline', 'subheadline', 'read_time', 'date', 'reader_count', 'list_items', 'stats', 'testimonials', 'cta_headline', 'cta_text', 'comparison'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .list-number { font-size: 3rem; font-weight: 900; color: var(--accent); line-height: 1; min-width: 60px; }
    .list-item-card { display: flex; gap: 24px; padding: 32px 0; border-bottom: 1px solid var(--border); }
    .list-item-content h3 { margin-bottom: 12px; }
    .list-item-content p { color: var(--text-light); }
    .meta-bar { display: flex; gap: 16px; align-items: center; font-size: 0.875rem; color: var(--text-light); padding: 12px 0; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  </style>
</head>
<body>
  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
      <a href="#cta" class="cta-btn nav-cta">{{NAV_CTA}}</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="section" style="padding-bottom: 24px;">
    <div class="container" style="max-width: 760px;">
      <span class="badge badge-subtle">{{BADGE_TEXT}}</span>
      <h1 style="margin-top: 16px;">{{HEADLINE}}</h1>
      <p style="font-size: 1.125rem; margin-top: 12px; color: var(--text-light);">{{SUBHEADLINE}}</p>
      <div class="meta-bar">
        <span>{{DATE}}</span>
        <span>·</span>
        <span>{{READ_TIME}} min read</span>
        <span>·</span>
        <span>{{READER_COUNT}} readers</span>
      </div>
    </div>
  </section>

  <!-- Hero Image -->
  <section style="padding: 0 20px 40px;">
    <div class="container" style="max-width: 760px;">
      <div style="background: var(--bg-alt); border-radius: var(--radius); height: 360px; display: flex; align-items: center; justify-content: center;">
        <span style="color: var(--text-light);">{{HERO_IMAGE}}</span>
      </div>
    </div>
  </section>

  <!-- List Items -->
  <section class="section" style="padding-top: 0;">
    <div class="container" style="max-width: 760px;">
      {{LIST_ITEMS}}
    </div>
  </section>

  <!-- Stats Bar -->
  {{STATS_SECTION}}

  <!-- Comparison Table -->
  {{COMPARISON_SECTION}}

  <!-- Testimonials -->
  {{TESTIMONIALS_SECTION}}

  <!-- Final CTA -->
  {{FINAL_CTA_SECTION}}

  <footer class="section" style="padding: 24px 20px; border-top: 1px solid var(--border);">
    <div class="container" style="text-align: center; color: var(--text-light); font-size: 0.8rem;">
      {{DISCLOSURE}}
    </div>
  </footer>
</body>
</html>`
  }),

  // ─── QUIZ ──────────────────────────────────────
  quiz: (brand) => ({
    metadata: { type: 'quiz', sections: 8 },
    slots: ['headline', 'subheadline', 'quiz_cta', 'quiz_count', 'quiz_time', 'benefits', 'questions', 'results_headline', 'form_headline', 'testimonials'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .quiz-container { max-width: 640px; margin: 0 auto; }
    .quiz-welcome, .quiz-step, .quiz-results, .quiz-form { display: none; }
    .quiz-welcome.active, .quiz-step.active, .quiz-results.active, .quiz-form.active { display: block; }
    .quiz-option { transition: all 0.2s; }
    .quiz-option.selected { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
    .quiz-benefit { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
    .quiz-benefit::before { content: '✓'; color: var(--accent); font-weight: 700; }
  </style>
</head>
<body>
  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
    </div>
  </nav>

  <section class="section" style="min-height: 80vh;">
    <div class="quiz-container">
      <!-- Welcome Screen -->
      <div class="quiz-welcome active" id="quizWelcome">
        <div style="text-align: center;">
          <span class="badge badge-primary">{{QUIZ_TIME}}-MINUTE QUIZ</span>
          <h1 style="margin-top: 20px;">{{HEADLINE}}</h1>
          <p style="margin-top: 12px; color: var(--text-light); font-size: 1.125rem;">{{SUBHEADLINE}}</p>
          <div style="margin: 24px 0;">
            {{BENEFITS_LIST}}
          </div>
          <button class="cta-btn" onclick="startQuiz()" style="font-size: 1.125rem; padding: 18px 48px;">{{QUIZ_CTA}} →</button>
          <div style="margin-top: 16px; font-size: 0.875rem; color: var(--text-light);">
            Takes less than {{QUIZ_TIME}} minutes · {{QUIZ_COUNT}} quizzes completed
          </div>
        </div>
      </div>

      <!-- Quiz Questions (injected by Claude) -->
      {{QUIZ_QUESTIONS}}

      <!-- Lead Capture -->
      <div class="quiz-form" id="quizForm">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2>{{FORM_HEADLINE}}</h2>
          <p style="color: var(--text-light);">Enter your details to see your personalized results.</p>
        </div>
        <form onsubmit="showResults(event)">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" name="name" placeholder="Your first name" required>
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" name="email" placeholder="you@example.com" required>
          </div>
          <button type="submit" class="cta-btn" style="width: 100%;">See My Results →</button>
        </form>
      </div>

      <!-- Results -->
      <div class="quiz-results" id="quizResults">
        <h2 style="text-align: center;">{{RESULTS_HEADLINE}}</h2>
        {{RESULTS_CONTENT}}
      </div>
    </div>
  </section>

  <!-- Testimonials Below -->
  {{TESTIMONIALS_SECTION}}

  <script>
    var currentStep = 0;
    var totalSteps = document.querySelectorAll('.quiz-step').length;
    function startQuiz() {
      document.getElementById('quizWelcome').classList.remove('active');
      document.querySelectorAll('.quiz-step')[0]?.classList.add('active');
      currentStep = 1;
    }
    function nextQuestion(el) {
      el.parentElement.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      setTimeout(function() {
        var steps = document.querySelectorAll('.quiz-step');
        steps[currentStep - 1]?.classList.remove('active');
        currentStep++;
        if (currentStep <= totalSteps) {
          steps[currentStep - 1]?.classList.add('active');
        } else {
          document.getElementById('quizForm').classList.add('active');
        }
      }, 400);
    }
    function showResults(e) {
      e.preventDefault();
      document.getElementById('quizForm').classList.remove('active');
      document.getElementById('quizResults').classList.add('active');
    }
  </script>
</body>
</html>`
  }),

  // ─── VIP SIGNUP ──────────────────────────────────────
  'vip-signup': (brand) => ({
    metadata: { type: 'vip-signup', sections: 7 },
    slots: ['headline', 'subheadline', 'member_count', 'benefits', 'scarcity_text', 'form_cta', 'testimonials', 'guarantee'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .vip-badge { background: linear-gradient(135deg, var(--accent), #ff8a5c); color: #fff; padding: 8px 20px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; display: inline-block; }
    .premium-card { background: var(--bg); border: 2px solid var(--accent); border-radius: 16px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    .scarcity-bar { background: var(--urgency); color: #fff; text-align: center; padding: 10px; font-weight: 700; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="scarcity-bar">{{SCARCITY_TEXT}}</div>

  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="section" style="min-height: 80vh; display: flex; align-items: center;">
    <div class="container grid-2">
      <div>
        <div class="vip-badge">VIP ACCESS</div>
        <h1 style="margin-top: 20px;">{{HEADLINE}}</h1>
        <p style="margin-top: 12px; color: var(--text-light); font-size: 1.125rem;">{{SUBHEADLINE}}</p>
        <div style="margin-top: 20px; font-size: 0.9rem; color: var(--text-light);">
          Join {{MEMBER_COUNT}} members who already have access
        </div>
      </div>
      <div class="premium-card">
        <h3 style="text-align: center; margin-bottom: 24px;">Get Exclusive Access</h3>
        <form>
          <div class="form-group">
            <input type="text" name="name" placeholder="Your first name" required>
          </div>
          <div class="form-group">
            <input type="email" name="email" placeholder="Your email address" required>
          </div>
          <button type="submit" class="cta-btn" style="width: 100%;">{{FORM_CTA}}</button>
        </form>
        <p style="text-align: center; font-size: 0.75rem; color: var(--text-light); margin-top: 12px;">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  </section>

  <!-- Benefits -->
  {{BENEFITS_SECTION}}

  <!-- Testimonials -->
  {{TESTIMONIALS_SECTION}}

  <!-- Guarantee -->
  <section class="section section-alt">
    <div class="container" style="text-align: center; max-width: 640px;">
      <h2>Our Guarantee</h2>
      <p style="margin-top: 12px; color: var(--text-light);">{{GUARANTEE}}</p>
    </div>
  </section>

  <!-- Final CTA -->
  {{FINAL_CTA_SECTION}}
</body>
</html>`
  }),

  // ─── CALCULATOR ──────────────────────────────────────
  calculator: (brand) => ({
    metadata: { type: 'calculator', sections: 8 },
    slots: ['headline', 'subheadline', 'calc_inputs', 'calc_outputs', 'stats', 'testimonials', 'cta_headline', 'cta_text', 'faqs'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .calc-card { background: var(--bg); border: 1px solid var(--border); border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .calc-input-group { margin-bottom: 24px; }
    .calc-input-group label { display: block; font-weight: 600; margin-bottom: 8px; }
    .calc-slider { width: 100%; appearance: none; height: 8px; border-radius: 4px; background: var(--border); outline: none; }
    .calc-slider::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; border-radius: 50%; background: var(--accent); cursor: pointer; }
    .calc-result { font-size: 3rem; font-weight: 900; color: var(--accent); text-align: center; }
    .calc-result-label { font-size: 1rem; color: var(--text-light); text-align: center; }
    .calc-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .calc-comparison-item { padding: 20px; border-radius: var(--radius); text-align: center; }
    .calc-before { background: #fef2f2; border: 1px solid #fecaca; }
    .calc-after { background: #f0fdf4; border: 1px solid #bbf7d0; }
  </style>
</head>
<body>
  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
      <a href="#cta" class="cta-btn nav-cta">{{NAV_CTA}}</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="section">
    <div class="container" style="text-align: center; max-width: 700px;">
      <h1>{{HEADLINE}}</h1>
      <p style="margin-top: 12px; color: var(--text-light); font-size: 1.125rem;">{{SUBHEADLINE}}</p>
    </div>
  </section>

  <!-- Calculator -->
  <section class="section" style="padding-top: 0;">
    <div class="container grid-2" style="max-width: 900px;">
      <div class="calc-card">
        <h3 style="margin-bottom: 24px;">Enter Your Details</h3>
        {{CALC_INPUTS}}
      </div>
      <div class="calc-card" style="border-color: var(--accent);">
        <h3 style="margin-bottom: 24px; text-align: center;">Your Results</h3>
        {{CALC_OUTPUTS}}
        <a href="#cta" class="cta-btn" style="width: 100%; margin-top: 24px;">{{CTA_TEXT}}</a>
      </div>
    </div>
  </section>

  <!-- Stats -->
  {{STATS_SECTION}}

  <!-- Testimonials -->
  {{TESTIMONIALS_SECTION}}

  <!-- CTA -->
  {{FINAL_CTA_SECTION}}

  <!-- FAQ -->
  {{FAQ_SECTION}}

  <script>
    document.querySelectorAll('.calc-slider').forEach(function(slider) {
      var output = document.getElementById(slider.dataset.output);
      slider.oninput = function() { if (output) output.textContent = this.value; updateCalculator(); };
    });
    function updateCalculator() { /* Claude will implement calculation logic */ }
  </script>
</body>
</html>`
  }),

  // ─── SALES LETTER (NEW) ──────────────────────────────
  'sales-letter': (brand) => ({
    metadata: { type: 'sales-letter', sections: 10 },
    slots: ['headline', 'subheadline', 'opening_copy', 'problem_section', 'agitation_section', 'solution_section', 'benefits_section', 'proof_section', 'offer_section', 'guarantee', 'cta_text', 'ps_section', 'signature'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    body { font-family: 'Merriweather', Georgia, serif; background: #fffdf8; }
    h1, h2, h3 { font-family: 'Inter', sans-serif; }
    .letter-container { max-width: 680px; margin: 0 auto; padding: 60px 24px; }
    .letter-body p { margin-bottom: 1.5rem; font-size: 1.05rem; line-height: 1.85; }
    .letter-body h2 { margin: 48px 0 20px; font-size: 1.5rem; }
    .letter-cta { text-align: center; padding: 40px 0; border-top: 2px solid var(--border); border-bottom: 2px solid var(--border); margin: 40px 0; }
    .letter-cta .cta-btn { font-size: 1.125rem; padding: 18px 48px; }
    .highlight { background: #fff3cd; padding: 2px 4px; }
    .underline-emphasis { text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: 4px; }
    .ps-section { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); }
    .ps-section p { font-style: italic; }
    .signature-block { margin-top: 40px; }
    .signature-name { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.125rem; }
    .signature-title { color: var(--text-light); font-size: 0.9rem; }
    .guarantee-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: var(--radius); padding: 24px; margin: 32px 0; }
  </style>
</head>
<body>
  <div class="letter-container">
    <!-- Date Line -->
    <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 32px;">{{DATE}}</p>

    <!-- Headline -->
    <h1 style="font-size: 2rem; margin-bottom: 8px;">{{HEADLINE}}</h1>
    <p style="font-size: 1.25rem; color: var(--text-light); margin-bottom: 40px;">{{SUBHEADLINE}}</p>

    <!-- Opening -->
    <div class="letter-body">
      {{OPENING_COPY}}
    </div>

    <!-- Problem -->
    <div class="letter-body">
      {{PROBLEM_SECTION}}
    </div>

    <!-- First CTA -->
    <div class="letter-cta">
      <a href="#cta" class="cta-btn">{{CTA_TEXT}}</a>
    </div>

    <!-- Agitation -->
    <div class="letter-body">
      {{AGITATION_SECTION}}
    </div>

    <!-- Solution -->
    <div class="letter-body">
      {{SOLUTION_SECTION}}
    </div>

    <!-- Second CTA -->
    <div class="letter-cta">
      <a href="#cta" class="cta-btn">{{CTA_TEXT}}</a>
    </div>

    <!-- Benefits -->
    <div class="letter-body">
      {{BENEFITS_SECTION}}
    </div>

    <!-- Proof -->
    <div class="letter-body">
      {{PROOF_SECTION}}
    </div>

    <!-- Offer -->
    <div class="letter-body">
      {{OFFER_SECTION}}
    </div>

    <!-- Guarantee -->
    <div class="guarantee-box">
      {{GUARANTEE}}
    </div>

    <!-- Final CTA -->
    <div class="letter-cta" id="cta">
      <a href="#cta" class="cta-btn" style="font-size: 1.25rem; padding: 20px 56px;">{{CTA_TEXT}}</a>
    </div>

    <!-- Signature -->
    <div class="signature-block">
      {{SIGNATURE}}
    </div>

    <!-- P.S. -->
    <div class="ps-section">
      {{PS_SECTION}}
    </div>

    <!-- Footer -->
    <footer style="margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--text-light);">
      {{DISCLOSURE}}
    </footer>
  </div>
</body>
</html>`
  }),

  // ─── SMS TIPS (NEW) ──────────────────────────────────
  'sms-tips': (brand) => ({
    metadata: { type: 'sms-tips', sections: 8 },
    slots: ['headline', 'subheadline', 'series_name', 'series_duration', 'sms_previews', 'benefits', 'subscriber_count', 'testimonials', 'form_cta'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .sms-hero { min-height: 80vh; display: flex; align-items: center; }
    .phone-frame { max-width: 320px; margin: 0 auto; background: #1a1a2e; border-radius: 36px; padding: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    .phone-screen { background: #f5f5f5; border-radius: 28px; padding: 20px 16px; min-height: 460px; }
    .phone-header { text-align: center; font-size: 0.75rem; color: #999; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
    .sms-bubble { background: #e5e5ea; border-radius: 18px; padding: 10px 14px; max-width: 85%; font-size: 0.875rem; line-height: 1.4; margin-bottom: 16px; }
    .sms-day-label { font-size: 0.7rem; color: #999; text-align: center; margin-bottom: 8px; }
    .day-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: all 0.3s; }
    .day-card:hover { border-color: var(--accent); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .day-number { font-size: 0.75rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .day-title { font-weight: 700; margin-bottom: 4px; }
    .day-preview { color: var(--text-light); font-size: 0.9rem; }
    .urgency-banner { background: var(--accent); color: #fff; text-align: center; padding: 12px; font-weight: 700; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="urgency-banner">{{URGENCY_TEXT}}</div>

  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
      <a href="#signup" class="cta-btn nav-cta">Get Access</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="sms-hero section">
    <div class="container grid-2">
      <div>
        <span class="badge badge-primary">FREE {{SERIES_DURATION}} SMS SERIES</span>
        <h1 style="margin-top: 20px;">{{HEADLINE}}</h1>
        <p style="margin-top: 12px; color: var(--text-light); font-size: 1.125rem;">{{SUBHEADLINE}}</p>
        <div style="margin-top: 20px;">
          {{BENEFITS_LIST}}
        </div>
        <a href="#signup" class="cta-btn" style="margin-top: 24px;">Get Instant Access →</a>
        <div style="margin-top: 12px; font-size: 0.875rem; color: var(--text-light);">
          {{SUBSCRIBER_COUNT}} people already subscribed
        </div>
      </div>
      <div>
        <!-- Phone Mockup -->
        <div class="phone-frame">
          <div class="phone-screen">
            <div class="phone-header">{{SERIES_NAME}}</div>
            {{SMS_PREVIEWS}}
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Day-by-Day Preview -->
  <section class="section section-alt">
    <div class="container">
      <h2 style="text-align: center; margin-bottom: 40px;">What You'll Get Each Day</h2>
      <div class="grid-3">
        {{DAY_CARDS}}
      </div>
    </div>
  </section>

  <!-- Stats Bar -->
  {{STATS_SECTION}}

  <!-- Testimonials -->
  {{TESTIMONIALS_SECTION}}

  <!-- Signup Form -->
  <section class="section section-dark" id="signup">
    <div class="container" style="max-width: 480px;">
      <div style="background: var(--bg); padding: 40px; border-radius: 16px;">
        <h2 style="text-align: center; color: var(--text); margin-bottom: 8px;">Get Your Free SMS Series</h2>
        <p style="text-align: center; color: var(--text-light); margin-bottom: 24px;">Enter your details to start receiving tips.</p>
        <form>
          <div class="form-group">
            <input type="text" name="name" placeholder="Your first name" required>
          </div>
          <div class="form-group">
            <input type="tel" name="phone" placeholder="Your phone number" required>
          </div>
          <div class="form-group">
            <input type="email" name="email" placeholder="Your email address" required>
          </div>
          <button type="submit" class="cta-btn" style="width: 100%;">{{FORM_CTA}}</button>
        </form>
        <p style="text-align: center; font-size: 0.7rem; color: var(--text-light); margin-top: 12px;">
          By subscribing, you agree to receive SMS messages. Message & data rates may apply. Reply STOP to cancel.
        </p>
      </div>
    </div>
  </section>

  <!-- Final CTA -->
  {{FINAL_CTA_SECTION}}
</body>
</html>`
  })
};

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get the HTML template skeleton for a page type.
 * Returns { html, metadata, slots } where html contains {{SLOT}} placeholders.
 */
export function getPageTemplate(pageType, brandData = {}) {
  const templateFn = PAGE_TEMPLATES[pageType] || PAGE_TEMPLATES.advertorial;
  return templateFn(brandData);
}

/**
 * Get the list of supported page types with metadata.
 */
export function getPageTypes() {
  return {
    advertorial: { icon: '📰', label: 'Advertorial', desc: 'Editorial-style long form content' },
    listicle: { icon: '📝', label: 'Listicle', desc: 'Numbered list format' },
    quiz: { icon: '❓', label: 'Quiz Funnel', desc: 'Interactive quiz with lead capture' },
    'vip-signup': { icon: '👑', label: 'VIP Signup', desc: 'Exclusive invitation page' },
    calculator: { icon: '🧮', label: 'Calculator', desc: 'Interactive ROI/savings calculator' },
    'sales-letter': { icon: '💌', label: 'Sales Letter', desc: 'Long-form direct response letter' },
    'sms-tips': { icon: '📱', label: 'SMS Tips', desc: 'SMS lead magnet with day-by-day previews' }
  };
}

/**
 * Get a specific component by name with data.
 */
export function getComponent(name, data = {}) {
  const componentFn = COMPONENTS[name];
  if (!componentFn) return `<!-- Unknown component: ${name} -->`;
  return componentFn(data);
}

/**
 * Populate a template HTML string by replacing {{SLOT}} placeholders with content.
 * contentMap is an object: { HEADLINE: 'My Headline', SUBHEADLINE: 'My sub', ... }
 */
export function populateTemplate(templateHtml, contentMap = {}) {
  let html = templateHtml;
  for (const [key, value] of Object.entries(contentMap)) {
    const placeholder = `{{${key.toUpperCase()}}}`;
    html = html.replace(new RegExp(escapeRegex(placeholder), 'g'), value || '');
  }
  return html;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get base styles string (for use outside templates if needed).
 */
export function getBaseStyles() {
  return BASE_STYLES;
}
