// RunAds - Design System Module v3.0
// Professional-grade template scaffolding, CSS variable system, and component library.
// Modeled after Unicorn Marketers / Effortless Ads quality level.
// Used by pipeline.js to provide Claude with structured HTML skeletons.

// ============================================================
// CSS VARIABLE SYSTEM (Brand-aware, Unicorn-quality)
// ============================================================
export function generateBrandCSS(brandData = {}) {
  const colors = brandData.colors || {};
  const typography = brandData.typography || {};
  const spacing = brandData.spacing || {};

  return `:root {
    /* Brand Colors */
    --primary: ${colors.primary || '#121212'};
    --secondary: ${colors.secondary || '#1a1a2e'};
    --accent: ${colors.accent || '#4CD4E9'};
    --accent-light: ${colors.accent_light || 'rgba(76, 212, 233, 0.12)'};
    --accent-gradient: linear-gradient(135deg, ${colors.accent || '#4CD4E9'}, ${colors.accent_end || '#3BBFD3'});

    /* Backgrounds */
    --bg: ${colors.background || '#ffffff'};
    --bg-alt: ${colors.background_alt || '#f7f7f7'};
    --bg-dark: ${colors.background_dark || '#121212'};
    --bg-cream: ${colors.background_cream || '#f8f6f3'};

    /* Text */
    --text: ${colors.text || '#1a1a1a'};
    --text-secondary: ${colors.text_secondary || '#555555'};
    --text-light: ${colors.text_light || '#888888'};
    --text-on-dark: ${colors.text_on_dark || '#ffffff'};
    --text-on-dark-muted: rgba(255,255,255,0.7);

    /* Borders & Dividers */
    --border: ${colors.border || '#e5e7eb'};
    --border-light: ${colors.border_light || '#f0f0f0'};

    /* Status Colors */
    --success: ${colors.success || '#22c55e'};
    --warning: ${colors.warning || '#f59e0b'};
    --error: ${colors.error || '#ef4444'};
    --star: #FFB800;

    /* Typography */
    --heading-font: ${typography.heading_font || "'Inter', sans-serif"};
    --body-font: ${typography.body_font || "'Inter', sans-serif"};
    --base-size: ${typography.base_size || '17px'};
    --line-height: ${typography.line_height || '1.7'};

    /* Spacing */
    --radius: ${spacing.border_radius || '12px'};
    --radius-sm: 8px;
    --radius-lg: 16px;
    --radius-pill: 50px;
    --spacing: ${spacing.unit || '16px'};
    --max-width: ${spacing.max_width || '1200px'};
    --content-width: 800px;
    --section-padding: ${spacing.section_padding || '100px 60px'};
    --section-padding-mobile: 60px 20px;

    /* Shadows */
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 20px rgba(0,0,0,0.08);
    --shadow-lg: 0 20px 60px rgba(0,0,0,0.1);
    --shadow-xl: 0 25px 80px rgba(0,0,0,0.15);
    --shadow-glow: 0 4px 20px rgba(76, 212, 233, 0.3);
  }`;
}

// ============================================================
// BASE STYLES (Professional, Unicorn-quality)
// ============================================================
const BASE_STYLES = `
/* === RESET & BASE === */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--body-font);
  font-size: var(--base-size);
  line-height: var(--line-height);
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
img { max-width: 100%; height: auto; display: block; }
a { color: var(--accent); text-decoration: none; transition: color 0.3s ease; }
a:hover { color: var(--primary); }

/* === TYPOGRAPHY === */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--heading-font);
  line-height: 1.15;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
h1 { font-size: clamp(32px, 4.5vw, 52px); font-weight: 800; letter-spacing: -1px; line-height: 1.1; }
h2 { font-size: clamp(24px, 3.5vw, 40px); font-weight: 700; line-height: 1.2; }
h3 { font-size: clamp(20px, 2.5vw, 28px); font-weight: 700; }
h4 { font-size: 18px; font-weight: 600; }
h5 { font-size: 16px; font-weight: 600; }
h6 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

/* === LAYOUT === */
.container { max-width: var(--max-width); margin: 0 auto; padding: 0 24px; }
.container-narrow { max-width: var(--content-width); margin: 0 auto; padding: 0 24px; }

/* Section Styles */
.section { padding: var(--section-padding); }
.section-alt { background: var(--bg-alt); }
.section-dark { background: var(--bg-dark); color: var(--text-on-dark); }
.section-dark h1, .section-dark h2, .section-dark h3, .section-dark h4 { color: var(--text-on-dark); }
.section-dark p, .section-dark li { color: var(--text-on-dark-muted); }
.section-cream { background: var(--bg-cream); }

/* Grid System */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.grid-2-asymmetric { display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; align-items: center; }

/* === BUTTONS === */
.cta-btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 18px 36px; background: var(--accent); color: var(--bg-dark);
  border: none; border-radius: var(--radius-pill); font-size: 15px; font-weight: 700;
  cursor: pointer; text-decoration: none; text-align: center;
  text-transform: uppercase; letter-spacing: 1px;
  transition: all 0.3s ease; box-shadow: var(--shadow-glow);
}
.cta-btn:hover { transform: translateY(-2px); opacity: 0.9; text-decoration: none; color: var(--bg-dark); }
.cta-btn:active { transform: translateY(0); }

.cta-btn-dark {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 18px 36px; background: var(--primary); color: var(--text-on-dark);
  border: none; border-radius: var(--radius-pill); font-size: 15px; font-weight: 700;
  cursor: pointer; text-decoration: none; text-align: center;
  text-transform: uppercase; letter-spacing: 1px;
  transition: all 0.3s ease;
}
.cta-btn-dark:hover { background: #333; transform: translateY(-2px); text-decoration: none; color: var(--text-on-dark); }

.cta-btn-outline {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 16px 32px; background: transparent; color: var(--accent);
  border: 2px solid var(--accent); border-radius: var(--radius-pill); font-size: 15px; font-weight: 600;
  cursor: pointer; text-decoration: none; transition: all 0.3s ease;
}
.cta-btn-outline:hover { background: var(--accent); color: #fff; }

/* === BADGE / PILL === */
.badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-radius: var(--radius-pill);
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;
}
.badge-primary { background: var(--accent); color: var(--bg-dark); }
.badge-subtle { background: var(--bg-cream); color: var(--text-light); }
.badge-accent-light { background: var(--accent-light); border: 1px solid rgba(76,212,233,0.3); color: var(--accent); }
.badge-dark { background: var(--primary); color: var(--text-on-dark); }
.badge::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

/* === SECTION LABEL (category/tag above heading) === */
.section-label {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 2px; color: var(--accent); margin-bottom: 16px;
}

/* === STAT CARDS === */
.stat-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; padding: 24px 0; }
.stat-item {
  text-align: center; padding: 24px;
  background: var(--bg-alt); border-radius: var(--radius);
}
.stat-number { font-size: 2.5rem; font-weight: 800; color: var(--accent); line-height: 1; letter-spacing: -1px; }
.stat-label { font-size: 0.8rem; color: var(--text-light); margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }

/* === TESTIMONIALS === */
.testimonial-card {
  background: var(--bg); border-radius: var(--radius);
  padding: 32px; position: relative;
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.testimonial-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
.testimonial-stars { color: var(--star); margin-bottom: 12px; font-size: 18px; letter-spacing: 2px; }
.testimonial-quote { font-size: 1rem; margin-bottom: 20px; line-height: 1.7; color: var(--text-secondary); font-style: italic; }
.testimonial-author-row { display: flex; align-items: center; gap: 12px; }
.testimonial-avatar {
  width: 48px; height: 48px; border-radius: 50%; background: var(--bg-cream);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 18px; color: var(--text-light); flex-shrink: 0;
}
.testimonial-author { font-weight: 700; font-size: 0.95rem; color: var(--text); }
.testimonial-role { color: var(--text-light); font-size: 0.8rem; }
.testimonial-verified {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--success); font-weight: 600; margin-top: 2px;
}
.testimonial-verified::before { content: '✓'; font-weight: 700; }

/* === BENEFITS === */
.benefit-item { display: flex; align-items: start; gap: 16px; margin-bottom: 20px; }
.benefit-icon {
  width: 48px; height: 48px; background: var(--primary); color: var(--text-on-dark);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.benefit-text h4 { margin-bottom: 6px; font-size: 1rem; }
.benefit-text p { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; }

/* Benefit Cards (grid variant) */
.benefit-card {
  background: var(--bg); padding: 40px 32px; border-radius: var(--radius);
  text-align: center; transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.benefit-card:hover { transform: translateY(-8px); box-shadow: var(--shadow-lg); }
.benefit-card .benefit-icon { margin: 0 auto 20px; }
.benefit-card h4 { margin-bottom: 12px; }
.benefit-card p { color: var(--text-secondary); font-size: 0.95rem; }

/* === FAQ === */
.faq-item { border-bottom: 1px solid var(--border); background: var(--bg); border-radius: var(--radius-sm); margin-bottom: 8px; overflow: hidden; }
.faq-question {
  width: 100%; padding: 24px 32px; cursor: pointer; display: flex; justify-content: space-between;
  align-items: center; font-weight: 600; font-size: 1.05rem; background: none; border: none;
  font-family: var(--heading-font); color: var(--text); text-align: left; transition: background 0.2s;
}
.faq-question:hover { background: var(--bg-alt); }
.faq-question::after { content: '+'; font-size: 1.5rem; color: var(--accent); transition: transform 0.3s ease; flex-shrink: 0; margin-left: 16px; }
.faq-item.open .faq-question::after { transform: rotate(45deg); }
.faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.4s ease; }
.faq-item.open .faq-answer { max-height: 600px; }
.faq-answer-inner { padding: 0 32px 24px; color: var(--text-secondary); line-height: 1.7; }

/* === FORM === */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 14px 18px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 1rem; font-family: var(--body-font); transition: border-color 0.3s, box-shadow 0.3s;
}
.form-group input:focus, .form-group select:focus {
  outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light);
}

/* === EDITORIAL COMPONENTS === */

/* Drop Cap */
.drop-cap::first-letter {
  float: left; font-size: 72px; line-height: 0.8; font-weight: 700;
  margin-right: 12px; margin-top: 8px; color: var(--primary);
}

/* Pullquote / Blockquote */
.pullquote {
  position: relative; background: var(--bg-alt); padding: 32px 32px 32px 36px;
  margin: 40px 0; border-radius: 0 var(--radius) var(--radius) 0;
  border-left: 4px solid var(--accent);
}
.pullquote p { font-size: 1.15rem; font-style: italic; color: var(--text-secondary); line-height: 1.7; margin: 0; }
.pullquote cite, .pullquote .pullquote-author {
  display: block; margin-top: 12px; font-size: 0.875rem;
  font-weight: 600; font-style: normal; color: var(--text-light);
}

/* Styled Blockquote with large quote mark */
.quote-block {
  position: relative; background: var(--bg-alt); padding: 40px;
  margin: 40px 0; border-radius: var(--radius);
}
.quote-block::before {
  content: '"'; position: absolute; top: 16px; left: 24px;
  font-size: 80px; line-height: 1; color: var(--accent); opacity: 0.3;
  font-family: Georgia, serif;
}
.quote-block .quote-text { font-size: 1.2rem; font-style: italic; color: var(--text-secondary); line-height: 1.6; padding-left: 20px; }
.quote-block .quote-author { font-size: 0.875rem; font-weight: 600; color: var(--text-light); margin-top: 16px; padding-left: 20px; }

/* Highlight Box */
.highlight-box {
  background: linear-gradient(135deg, var(--accent-light) 0%, rgba(240,253,255,1) 100%);
  border-left: 4px solid var(--accent); padding: 24px 28px;
  margin: 32px 0; border-radius: 0 var(--radius) var(--radius) 0;
}
.highlight-box p { font-size: 1rem; line-height: 1.7; color: var(--text-secondary); margin: 0; }
.highlight-box strong { color: var(--text); }

/* === PRODUCT CARD === */
.product-card {
  display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;
  background: var(--bg-dark); padding: 60px; border-radius: var(--radius-lg);
  color: var(--text-on-dark); margin: 40px 0;
}
.product-card h2, .product-card h3 { color: var(--text-on-dark); }
.product-card p { color: var(--text-on-dark-muted); }
.product-image-wrap { border-radius: var(--radius); overflow: hidden; }
.product-image-wrap img { width: 100%; height: auto; object-fit: cover; }
.product-badge {
  position: absolute; top: 16px; left: 16px; background: var(--primary);
  color: var(--text-on-dark); padding: 6px 14px; border-radius: var(--radius-sm);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
}
.product-price { display: flex; align-items: baseline; gap: 12px; margin: 16px 0; }
.price-current { font-size: 2rem; font-weight: 800; color: var(--text-on-dark); }
.price-original { font-size: 1.1rem; color: var(--text-light); text-decoration: line-through; }
.price-save {
  background: rgba(34,197,94,0.15); color: var(--success);
  padding: 4px 10px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600;
}
.product-features { list-style: none; margin: 20px 0; }
.product-features li {
  display: flex; align-items: center; gap: 10px; padding: 8px 0;
  font-size: 0.95rem; color: var(--text-on-dark-muted);
}
.product-features li::before { content: '✓'; color: var(--accent); font-weight: 700; font-size: 1.1rem; }
.product-guarantee {
  display: flex; align-items: center; gap: 8px; margin-top: 16px;
  font-size: 0.85rem; color: var(--text-on-dark-muted);
}

/* === COMPARISON TABLE === */
.comparison-table {
  width: 100%; border-collapse: separate; border-spacing: 0;
  border-radius: var(--radius); overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.comparison-table thead { background: var(--primary); color: var(--text-on-dark); }
.comparison-table th { padding: 16px 20px; text-align: left; font-weight: 600; font-size: 0.95rem; }
.comparison-table td { padding: 14px 20px; border-bottom: 1px solid var(--border-light); font-size: 0.95rem; }
.comparison-table tr:nth-child(even) { background: var(--bg-alt); }
.comparison-table .check { color: var(--success); font-weight: 700; font-size: 1.1rem; }
.comparison-table .cross { color: var(--error); font-weight: 700; font-size: 1.1rem; }

/* === TRUST BAR / SOCIAL PROOF === */
.trust-bar {
  display: flex; justify-content: center; gap: 40px; padding: 20px 24px;
  background: var(--bg-alt); border-bottom: 1px solid var(--border);
}
.trust-item { display: flex; align-items: center; gap: 10px; }
.trust-icon {
  width: 36px; height: 36px; background: var(--bg); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-sm); font-size: 16px;
}
.trust-number { font-size: 0.95rem; font-weight: 700; color: var(--text); }
.trust-label { font-size: 0.8rem; color: var(--text-light); }

/* === STICKY NAV === */
.sticky-nav {
  position: sticky; top: 0; z-index: 100; background: var(--bg);
  border-bottom: 1px solid var(--border); padding: 16px 0;
  backdrop-filter: blur(10px); background: rgba(255,255,255,0.95);
}
.sticky-nav .container { display: flex; justify-content: space-between; align-items: center; }
.nav-logo { font-weight: 800; font-size: 1.25rem; color: var(--text); letter-spacing: -0.5px; }
.nav-cta { padding: 10px 24px; font-size: 0.85rem; }

/* Dark Nav variant */
.sticky-nav-dark {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  background: var(--bg-dark); padding: 16px 0;
}
.sticky-nav-dark .container { display: flex; justify-content: space-between; align-items: center; }
.sticky-nav-dark .nav-logo { color: var(--text-on-dark); }

/* === READING PROGRESS BAR === */
.reading-progress { position: fixed; top: 0; left: 0; width: 0%; height: 3px; background: var(--accent); z-index: 200; transition: width 0.1s; }

/* === ARTICLE BODY === */
.article-body p { margin-bottom: 1.4rem; font-size: 1.05rem; line-height: 1.8; color: var(--text-secondary); }
.article-body h2 { margin: 48px 0 20px; color: var(--text); }
.article-body h3 { margin: 32px 0 16px; color: var(--text); }
.article-body ul, .article-body ol { margin: 20px 0; padding-left: 24px; }
.article-body li { margin-bottom: 10px; color: var(--text-secondary); line-height: 1.7; }
.article-body strong { color: var(--text); }

/* Article Meta */
.article-meta {
  display: flex; align-items: center; gap: 16px; color: var(--text-light);
  font-size: 0.875rem; padding-top: 16px; border-top: 1px solid var(--border);
  margin: 20px 0;
}
.article-meta .author-name { font-weight: 600; color: var(--text); }

/* === CONTENT IMAGE === */
.content-image {
  margin: 40px 0; border-radius: var(--radius); overflow: hidden;
  box-shadow: var(--shadow-md);
}
.content-image img { width: 100%; height: auto; display: block; }
.image-caption {
  background: var(--bg-alt); padding: 12px 16px;
  font-size: 0.85rem; color: var(--text-light); text-align: center;
}

/* === SCROLL ANIMATIONS === */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-on-scroll {
  opacity: 0; transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.animate-on-scroll.visible { opacity: 1; transform: translateY(0); }

/* === RESPONSIVE === */
@media (max-width: 1024px) {
  .grid-2, .grid-2-asymmetric { grid-template-columns: 1fr; gap: 32px; }
  .product-card { grid-template-columns: 1fr; padding: 40px; }
}
@media (max-width: 768px) {
  .grid-2 { grid-template-columns: 1fr; gap: 24px; }
  .grid-3 { grid-template-columns: 1fr; gap: 20px; }
  .grid-4 { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .section { padding: var(--section-padding-mobile); }
  .stat-number { font-size: 2rem; }
  .cta-btn, .cta-btn-dark { width: 100%; justify-content: center; }
  .trust-bar { flex-direction: column; gap: 16px; align-items: center; }
  .article-meta { flex-wrap: wrap; }
  .product-card { padding: 32px 20px; }
  .pullquote, .quote-block { margin: 24px 0; }
  .faq-question { padding: 20px; }
  .faq-answer-inner { padding: 0 20px 20px; }
}
@media (max-width: 480px) {
  .grid-4 { grid-template-columns: 1fr; }
  h1 { font-size: clamp(28px, 6vw, 36px); }
}
`;

// ============================================================
// COMPONENT LIBRARY (Unicorn-quality)
// ============================================================
export const COMPONENTS = {
  'hero-section': ({ headline, subheadline, cta_text, cta_secondary, badge_text, image_bg }) => `
    <section class="section" style="min-height: 80vh; display: flex; align-items: center; ${image_bg ? `background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${image_bg}') center/cover;` : ''}">
      <div class="container">
        ${badge_text ? `<span class="badge badge-primary">${badge_text}</span>` : ''}
        <h1 style="margin-top: 20px; max-width: 720px; ${image_bg ? 'color: #fff;' : ''}">${headline || '{{HEADLINE}}'}</h1>
        <p style="font-size: 1.2rem; margin-top: 16px; max-width: 600px; line-height: 1.6; ${image_bg ? 'color: rgba(255,255,255,0.85);' : 'color: var(--text-secondary);'}">${subheadline || '{{SUBHEADLINE}}'}</p>
        <div style="margin-top: 32px; display: flex; gap: 16px; flex-wrap: wrap;">
          <a href="#cta" class="cta-btn">${cta_text || '{{CTA_TEXT}}'} →</a>
          ${cta_secondary ? `<a href="#learn-more" class="cta-btn-outline">${cta_secondary}</a>` : ''}
        </div>
      </div>
    </section>`,

  'hero-split': ({ headline, subheadline, cta_text, badge_text, trust_items }) => `
    <section class="section" style="min-height: 90vh; display: flex; align-items: center;">
      <div class="container grid-2">
        <div>
          ${badge_text ? `<span class="badge badge-accent-light">${badge_text}</span>` : ''}
          <h1 style="margin-top: 20px;">${headline || '{{HEADLINE}}'}</h1>
          <p style="font-size: 1.125rem; margin-top: 16px; color: var(--text-secondary); line-height: 1.6;">${subheadline || '{{SUBHEADLINE}}'}</p>
          <a href="#cta" class="cta-btn-dark" style="margin-top: 28px;">${cta_text || '{{CTA_TEXT}}'} →</a>
          ${trust_items ? `
          <div style="display: flex; gap: 24px; margin-top: 32px;">
            ${trust_items.map(t => `<div><div style="font-size: 1.5rem; font-weight: 800; color: var(--text);">${t.number}</div><div style="font-size: 0.8rem; color: var(--text-light);">${t.label}</div></div>`).join('')}
          </div>` : ''}
        </div>
        <div style="border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg);">
          <div style="background: var(--bg-alt); min-height: 480px; display: flex; align-items: center; justify-content: center;">
            <span style="color: var(--text-light);">{{HERO_IMAGE}}</span>
          </div>
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

  'testimonial-grid': ({ testimonials, headline, section_label }) => {
    const items = testimonials || [
      { quote: '{{TESTIMONIAL_1}}', author: '{{AUTHOR_1}}', role: '', stars: 5 },
      { quote: '{{TESTIMONIAL_2}}', author: '{{AUTHOR_2}}', role: '', stars: 5 },
      { quote: '{{TESTIMONIAL_3}}', author: '{{AUTHOR_3}}', role: '', stars: 5 }
    ];
    return `
    <section class="section section-alt">
      <div class="container">
        ${section_label ? `<div class="section-label" style="text-align: center;">${section_label}</div>` : ''}
        ${headline ? `<h2 style="text-align: center; margin-bottom: 48px;">${headline}</h2>` : ''}
        <div class="grid-3">
          ${items.map(t => `
          <div class="testimonial-card">
            <div class="testimonial-stars">${'★'.repeat(t.stars || 5)}</div>
            <p class="testimonial-quote">"${t.quote}"</p>
            <div class="testimonial-author-row">
              <div class="testimonial-avatar">${(t.author || 'A')[0].toUpperCase()}</div>
              <div>
                <div class="testimonial-author">${t.author}</div>
                ${t.role ? `<div class="testimonial-role">${t.role}</div>` : ''}
                <div class="testimonial-verified">Verified Purchase</div>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  'benefits-list': ({ benefits, headline, subheadline, section_label }) => {
    const items = benefits || [
      { title: '{{BENEFIT_1_TITLE}}', desc: '{{BENEFIT_1_DESC}}' },
      { title: '{{BENEFIT_2_TITLE}}', desc: '{{BENEFIT_2_DESC}}' },
      { title: '{{BENEFIT_3_TITLE}}', desc: '{{BENEFIT_3_DESC}}' }
    ];
    return `
    <section class="section">
      <div class="container" style="max-width: 720px;">
        ${section_label ? `<div class="section-label">${section_label}</div>` : ''}
        ${headline ? `<h2 style="margin-bottom: 12px;">${headline}</h2>` : ''}
        ${subheadline ? `<p style="color: var(--text-secondary); margin-bottom: 32px; font-size: 1.05rem;">${subheadline}</p>` : ''}
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

  'benefits-grid': ({ benefits, headline, section_label }) => {
    const items = benefits || [
      { title: '{{BENEFIT_1_TITLE}}', desc: '{{BENEFIT_1_DESC}}', icon: '✓' },
      { title: '{{BENEFIT_2_TITLE}}', desc: '{{BENEFIT_2_DESC}}', icon: '✓' },
      { title: '{{BENEFIT_3_TITLE}}', desc: '{{BENEFIT_3_DESC}}', icon: '✓' }
    ];
    return `
    <section class="section">
      <div class="container">
        ${section_label ? `<div class="section-label" style="text-align: center;">${section_label}</div>` : ''}
        ${headline ? `<h2 style="text-align: center; margin-bottom: 48px;">${headline}</h2>` : ''}
        <div class="grid-3">
          ${items.map(b => `
          <div class="benefit-card animate-on-scroll">
            <div class="benefit-icon">${b.icon || '✓'}</div>
            <h4>${b.title}</h4>
            <p>${b.desc}</p>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  'faq-accordion': ({ items, headline, section_label }) => {
    const faqs = items || [
      { question: '{{FAQ_1_Q}}', answer: '{{FAQ_1_A}}' },
      { question: '{{FAQ_2_Q}}', answer: '{{FAQ_2_A}}' },
      { question: '{{FAQ_3_Q}}', answer: '{{FAQ_3_A}}' }
    ];
    return `
    <section class="section">
      <div class="container" style="max-width: 720px;">
        ${section_label ? `<div class="section-label" style="text-align: center;">${section_label}</div>` : ''}
        ${headline ? `<h2 style="text-align: center; margin-bottom: 40px;">${headline}</h2>` : ''}
        <div>
          ${faqs.map(f => `
          <div class="faq-item" onclick="this.classList.toggle('open')">
            <button class="faq-question">${f.question}</button>
            <div class="faq-answer"><div class="faq-answer-inner">${f.answer}</div></div>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  'cta-block': ({ headline, subheadline, cta_text, dark }) => `
    <section class="section ${dark ? 'section-dark' : 'section-alt'}">
      <div class="container" style="text-align: center; max-width: 640px;">
        <h2 style="${dark ? 'color: var(--text-on-dark);' : ''}">${headline || '{{CTA_HEADLINE}}'}</h2>
        <p style="margin-top: 12px; font-size: 1.05rem; ${dark ? 'color: var(--text-on-dark-muted);' : 'color: var(--text-secondary);'}">${subheadline || '{{CTA_SUBHEADLINE}}'}</p>
        <a href="#cta" class="${dark ? 'cta-btn' : 'cta-btn-dark'}" style="margin-top: 28px;">${cta_text || '{{CTA_TEXT}}'} →</a>
      </div>
    </section>`,

  'comparison-table': ({ headers, rows, headline, section_label }) => `
    <section class="section">
      <div class="container" style="max-width: 800px;">
        ${section_label ? `<div class="section-label" style="text-align: center;">${section_label}</div>` : ''}
        ${headline ? `<h2 style="text-align: center; margin-bottom: 40px;">${headline}</h2>` : ''}
        <table class="comparison-table">
          <thead>
            <tr>${(headers || ['Feature', 'Others', 'Us']).map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${(rows || [['{{ROW_1}}', '✗', '✓'], ['{{ROW_2}}', '✗', '✓'], ['{{ROW_3}}', '✗', '✓']]).map(row => `
            <tr>
              ${row.map((cell, i) => `<td${i > 0 ? ` class="${cell === '✓' || cell === '✔' ? 'check' : cell === '✗' || cell === '✘' ? 'cross' : ''}"` : ''}>${cell}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`,

  'trust-bar': ({ items }) => {
    const trustItems = items || [
      { icon: '⭐', number: '50,000+', label: 'Happy Customers' },
      { icon: '🏆', number: '4.9/5', label: 'Average Rating' },
      { icon: '🔬', number: '15+', label: 'Clinical Studies' }
    ];
    return `
    <div class="trust-bar">
      ${trustItems.map(t => `
      <div class="trust-item">
        <div class="trust-icon">${t.icon}</div>
        <div>
          <div class="trust-number">${t.number}</div>
          <div class="trust-label">${t.label}</div>
        </div>
      </div>`).join('')}
    </div>`;
  },

  'product-showcase': ({ label, headline, description, price_current, price_original, save_amount, features, cta_text, guarantee_text }) => `
    <section class="section-dark section" style="margin: 60px 0;">
      <div class="container">
        <div class="product-card" style="margin: 0;">
          <div class="product-image-wrap" style="min-height: 400px; background: var(--bg-alt); display: flex; align-items: center; justify-content: center;">
            <span style="color: var(--text-light);">{{PRODUCT_IMAGE}}</span>
          </div>
          <div>
            ${label ? `<div class="section-label">${label}</div>` : ''}
            <h2 style="color: var(--text-on-dark);">${headline || '{{PRODUCT_NAME}}'}</h2>
            <div class="product-price">
              <span class="price-current">${price_current || '{{PRICE}}'}</span>
              ${price_original ? `<span class="price-original">${price_original}</span>` : ''}
              ${save_amount ? `<span class="price-save">Save ${save_amount}</span>` : ''}
            </div>
            <p style="color: var(--text-on-dark-muted); line-height: 1.7; margin: 16px 0;">${description || '{{PRODUCT_DESCRIPTION}}'}</p>
            <ul class="product-features">
              ${(features || ['{{FEATURE_1}}', '{{FEATURE_2}}', '{{FEATURE_3}}']).map(f => `<li>${f}</li>`).join('')}
            </ul>
            <a href="#cta" class="cta-btn" style="width: 100%; justify-content: center; margin-top: 24px;">${cta_text || '{{CTA_TEXT}}'} →</a>
            ${guarantee_text ? `<div class="product-guarantee">🛡️ ${guarantee_text}</div>` : ''}
          </div>
        </div>
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
        <div style="background: var(--bg); padding: 48px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);">
          ${headline ? `<h2 style="text-align: center; margin-bottom: 8px; font-size: 1.5rem;">${headline}</h2>` : ''}
          ${subheadline ? `<p style="text-align: center; color: var(--text-secondary); margin-bottom: 28px;">${subheadline}</p>` : ''}
          <form>
            ${formFields.map(f => `
            <div class="form-group">
              <label>${f.label}</label>
              <input type="${f.type}" name="${f.name}" placeholder="${f.placeholder}" required>
            </div>`).join('')}
            <button type="submit" class="cta-btn-dark" style="width: 100%; justify-content: center; margin-top: 8px;">${cta_text || '{{FORM_CTA}}'} →</button>
          </form>
          ${privacy_text ? `<p style="text-align: center; font-size: 0.75rem; color: var(--text-light); margin-top: 16px;">${privacy_text}</p>` : ''}
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
    <div style="max-width: 320px; margin: 0 auto; background: #1a1a2e; border-radius: 36px; padding: 12px; box-shadow: var(--shadow-xl);">
      <div style="background: #f5f5f5; border-radius: 28px; padding: 20px 16px; min-height: 500px;">
        <div style="text-align: center; font-size: 0.75rem; color: #999; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;">Messages</div>
        ${msgs.map(m => `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.7rem; color: #999; text-align: center; margin-bottom: 8px;">${m.day}</div>
          <div style="background: #e5e5ea; border-radius: 18px; padding: 10px 14px; max-width: 85%; font-size: 0.875rem; line-height: 1.4;">${m.text}</div>
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
        <button class="quiz-option" style="padding: 16px 20px; border: 2px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); font-size: 1rem; cursor: pointer; text-align: left; transition: all 0.2s; font-family: var(--body-font);"
          onmouseover="this.style.borderColor='var(--accent)'"
          onmouseout="if(!this.classList.contains('selected'))this.style.borderColor='var(--border)'"
          onclick="this.parentElement.querySelectorAll('.quiz-option').forEach(o=>{o.classList.remove('selected');o.style.borderColor='var(--border)';o.style.background='var(--bg)';o.style.color='var(--text)'});this.classList.add('selected');this.style.background='var(--accent)';this.style.color='var(--bg-dark)';this.style.borderColor='var(--accent)'"
        >${o}</button>`).join('')}
      </div>
    </div>`,

  'section-content': ({ headline, body, image_position, section_label }) => `
    <section class="section">
      <div class="container ${image_position ? 'grid-2' : 'container-narrow'}" style="max-width: ${image_position ? 'var(--max-width)' : 'var(--content-width)'};">
        <div>
          ${section_label ? `<div class="section-label">${section_label}</div>` : ''}
          <h2>${headline || '{{SECTION_HEADLINE}}'}</h2>
          <div class="article-body" style="margin-top: 20px;">${body || '{{SECTION_BODY}}'}</div>
        </div>
        ${image_position ? `
        <div style="border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md);">
          <div style="background: var(--bg-alt); min-height: 360px; display: flex; align-items: center; justify-content: center;">
            <span style="color: var(--text-light);">{{IMAGE}}</span>
          </div>
        </div>` : ''}
      </div>
    </section>`
};

// ============================================================
// PAGE TYPE TEMPLATES
// ============================================================
const PAGE_TEMPLATES = {

  // ─── ADVERTORIAL (Unicorn-quality editorial style) ──────────
  advertorial: (brand) => ({
    metadata: { type: 'advertorial', sections: 14 },
    slots: ['badge_text', 'headline', 'subheadline', 'author_name', 'author_role', 'date', 'read_time', 'hero_body', 'stats', 'problem_headline', 'problem_body', 'solution_headline', 'solution_body', 'science_headline', 'science_body', 'results', 'testimonials', 'cta_headline', 'cta_text', 'faqs', 'disclosure'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="title" content="{{META_TITLE}}">
  <meta name="description" content="{{META_DESCRIPTION}}">
  <meta property="og:title" content="{{META_TITLE}}">
  <meta property="og:description" content="{{META_DESCRIPTION}}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
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
  <section class="section" style="padding-top: 48px; padding-bottom: 32px;">
    <div class="container-narrow">
      <div class="section-label">{{BADGE_TEXT}}</div>
      <h1 style="margin-top: 8px;">{{HEADLINE}}</h1>
      <p style="font-size: 1.2rem; margin-top: 16px; color: var(--text-secondary); line-height: 1.5;">{{SUBHEADLINE}}</p>
      <div class="article-meta">
        <span class="author-name">{{AUTHOR_NAME}}</span>
        <span>{{AUTHOR_ROLE}}</span>
        <span>·</span>
        <span>{{DATE}}</span>
        <span>·</span>
        <span>{{READ_TIME}} min read</span>
      </div>
    </div>
  </section>

  <!-- Hero Image -->
  <section style="padding: 0 24px;">
    <div class="container-narrow">
      <div class="content-image" style="border-radius: var(--radius-lg);">
        <div style="background: var(--bg-alt); height: 420px; display: flex; align-items: center; justify-content: center;">
          <span style="color: var(--text-light);">{{HERO_IMAGE}}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Intro Body (with drop cap) -->
  <section style="padding: 40px 24px 48px;">
    <div class="container-narrow article-body">
      <div class="drop-cap">{{HERO_BODY}}</div>
    </div>
  </section>

  <!-- Stats Bar -->
  {{STATS_SECTION}}

  <!-- Problem Section -->
  <section class="section">
    <div class="container-narrow">
      <div class="section-label">The Problem</div>
      <h2>{{PROBLEM_HEADLINE}}</h2>
      <div class="article-body" style="margin-top: 20px;">
        {{PROBLEM_BODY}}
      </div>
    </div>
  </section>

  <!-- Mid CTA -->
  {{MID_CTA_SECTION}}

  <!-- Solution Section (dark) -->
  <section class="section section-dark">
    <div class="container-narrow">
      <div class="section-label" style="color: var(--accent);">The Solution</div>
      <h2 style="color: var(--text-on-dark);">{{SOLUTION_HEADLINE}}</h2>
      <div class="article-body" style="margin-top: 20px;">
        {{SOLUTION_BODY}}
      </div>
    </div>
  </section>

  <!-- Science / Detail Section -->
  <section class="section">
    <div class="container-narrow">
      <div class="section-label">The Science</div>
      <h2>{{SCIENCE_HEADLINE}}</h2>
      <div class="article-body" style="margin-top: 20px;">
        {{SCIENCE_BODY}}
      </div>
    </div>
  </section>

  <!-- Results -->
  {{RESULTS_SECTION}}

  <!-- Product Showcase -->
  {{PRODUCT_SECTION}}

  <!-- Testimonials -->
  {{TESTIMONIALS_SECTION}}

  <!-- Final CTA -->
  {{FINAL_CTA_SECTION}}

  <!-- FAQ -->
  {{FAQ_SECTION}}

  <!-- Footer / Disclosure -->
  <footer class="section" style="padding: 32px 24px; border-top: 1px solid var(--border);">
    <div class="container-narrow" style="text-align: center; color: var(--text-light); font-size: 0.8rem; line-height: 1.6;">
      {{DISCLOSURE}}
    </div>
  </footer>

  <script>
    // Reading progress
    window.addEventListener('scroll', function() {
      var h = document.documentElement;
      var pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      document.getElementById('readingProgress').style.width = pct + '%';
    });
    // FAQ accordion
    document.querySelectorAll('.faq-item').forEach(function(item) {
      item.querySelector('.faq-question')?.addEventListener('click', function() { item.classList.toggle('open'); });
    });
    // Scroll animations
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(function(el) { observer.observe(el); });
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .list-number { font-size: 3.5rem; font-weight: 900; color: var(--accent); line-height: 1; min-width: 64px; letter-spacing: -2px; }
    .list-item-card { display: flex; gap: 28px; padding: 36px 0; border-bottom: 1px solid var(--border); }
    .list-item-content h3 { margin-bottom: 12px; }
    .list-item-content p { color: var(--text-secondary); line-height: 1.7; }
    .meta-bar { display: flex; gap: 16px; align-items: center; font-size: 0.875rem; color: var(--text-light); padding: 16px 0; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  </style>
</head>
<body>
  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
      <a href="#cta" class="cta-btn nav-cta">{{NAV_CTA}}</a>
    </div>
  </nav>

  <section class="section" style="padding-bottom: 24px;">
    <div class="container-narrow">
      <span class="badge badge-accent-light">{{BADGE_TEXT}}</span>
      <h1 style="margin-top: 16px;">{{HEADLINE}}</h1>
      <p style="font-size: 1.15rem; margin-top: 12px; color: var(--text-secondary);">{{SUBHEADLINE}}</p>
      <div class="meta-bar">
        <span>{{DATE}}</span>
        <span>·</span>
        <span>{{READ_TIME}} min read</span>
        <span>·</span>
        <span>{{READER_COUNT}} readers</span>
      </div>
    </div>
  </section>

  <section style="padding: 0 24px 40px;">
    <div class="container-narrow">
      <div class="content-image">
        <div style="background: var(--bg-alt); border-radius: var(--radius-lg); height: 360px; display: flex; align-items: center; justify-content: center;">
          <span style="color: var(--text-light);">{{HERO_IMAGE}}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top: 0;">
    <div class="container-narrow">
      {{LIST_ITEMS}}
    </div>
  </section>

  {{STATS_SECTION}}
  {{COMPARISON_SECTION}}
  {{TESTIMONIALS_SECTION}}
  {{FINAL_CTA_SECTION}}

  <footer class="section" style="padding: 24px; border-top: 1px solid var(--border);">
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .quiz-container { max-width: 640px; margin: 0 auto; }
    .quiz-welcome, .quiz-step, .quiz-results, .quiz-form { display: none; }
    .quiz-welcome.active, .quiz-step.active, .quiz-results.active, .quiz-form.active { display: block; }
    .quiz-option { transition: all 0.2s; }
    .quiz-option.selected { background: var(--accent) !important; color: var(--bg-dark) !important; border-color: var(--accent) !important; }
    .quiz-benefit { display: flex; align-items: center; gap: 10px; padding: 10px 0; font-size: 1rem; }
    .quiz-benefit::before { content: '✓'; color: var(--accent); font-weight: 700; font-size: 1.1rem; }
    .quiz-hero { padding: 100px 24px 60px; background: linear-gradient(180deg, var(--bg-dark) 0%, #1a1a1a 100%); position: relative; }
    .quiz-hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at 50% 0%, rgba(76,212,233,0.12) 0%, transparent 60%); pointer-events: none; }
    .quiz-hero h1 { color: var(--text-on-dark); }
    .quiz-hero p { color: var(--text-on-dark-muted); }
    .quiz-meta { display: flex; gap: 20px; margin-top: 20px; }
    .quiz-meta-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-on-dark-muted); }
  </style>
</head>
<body>
  <!-- Dark Header -->
  <nav class="sticky-nav-dark">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
    </div>
  </nav>

  <!-- Dark Hero -->
  <section class="quiz-hero" style="padding-top: 80px;">
    <div class="quiz-container" style="position: relative; z-index: 1;">
      <div class="quiz-welcome active" id="quizWelcome">
        <div style="text-align: center;">
          <span class="badge badge-accent-light">{{QUIZ_TIME}}-MINUTE QUIZ</span>
          <h1 style="margin-top: 20px;">{{HEADLINE}}</h1>
          <p style="margin-top: 12px; font-size: 1.15rem;">{{SUBHEADLINE}}</p>
          <div style="margin: 28px auto; max-width: 340px; text-align: left;">
            {{BENEFITS_LIST}}
          </div>
          <button class="cta-btn" onclick="startQuiz()" style="font-size: 1rem; padding: 18px 48px;">{{QUIZ_CTA}} →</button>
          <div class="quiz-meta" style="justify-content: center; margin-top: 16px;">
            <div class="quiz-meta-item">⏱ Takes ${brand.quiz_time || '60'} seconds</div>
            <div class="quiz-meta-item">✓ 100% Free</div>
            <div class="quiz-meta-item">📊 Instant Results</div>
          </div>
        </div>
      </div>

      {{QUIZ_QUESTIONS}}

      <div class="quiz-form" id="quizForm">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: var(--text-on-dark);">{{FORM_HEADLINE}}</h2>
          <p style="color: var(--text-on-dark-muted);">Enter your details to see your personalized results.</p>
        </div>
        <form onsubmit="showResults(event)" style="background: var(--bg); padding: 32px; border-radius: var(--radius-lg);">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" name="name" placeholder="Your first name" required>
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" name="email" placeholder="you@example.com" required>
          </div>
          <button type="submit" class="cta-btn-dark" style="width: 100%; justify-content: center;">See My Results →</button>
        </form>
      </div>

      <div class="quiz-results" id="quizResults">
        <h2 style="text-align: center; color: var(--text-on-dark);">{{RESULTS_HEADLINE}}</h2>
        {{RESULTS_CONTENT}}
      </div>
    </div>
  </section>

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .vip-badge { background: linear-gradient(135deg, var(--accent), #ff8a5c); color: #fff; padding: 8px 20px; border-radius: var(--radius-pill); font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; display: inline-block; }
    .premium-card { background: var(--bg); border: 2px solid var(--accent); border-radius: var(--radius-lg); padding: 48px; box-shadow: var(--shadow-lg); }
    .scarcity-bar { background: var(--error); color: #fff; text-align: center; padding: 12px; font-weight: 700; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="scarcity-bar">{{SCARCITY_TEXT}}</div>

  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
    </div>
  </nav>

  <section class="section" style="min-height: 80vh; display: flex; align-items: center;">
    <div class="container grid-2">
      <div>
        <div class="vip-badge">VIP ACCESS</div>
        <h1 style="margin-top: 20px;">{{HEADLINE}}</h1>
        <p style="margin-top: 12px; color: var(--text-secondary); font-size: 1.125rem;">{{SUBHEADLINE}}</p>
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
          <button type="submit" class="cta-btn-dark" style="width: 100%; justify-content: center;">{{FORM_CTA}} →</button>
        </form>
        <p style="text-align: center; font-size: 0.75rem; color: var(--text-light); margin-top: 12px;">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  </section>

  {{BENEFITS_SECTION}}
  {{TESTIMONIALS_SECTION}}

  <section class="section section-alt">
    <div class="container" style="text-align: center; max-width: 640px;">
      <h2>Our Guarantee</h2>
      <p style="margin-top: 12px; color: var(--text-secondary); line-height: 1.7;">{{GUARANTEE}}</p>
    </div>
  </section>

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .calc-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-md); }
    .calc-input-group { margin-bottom: 24px; }
    .calc-input-group label { display: block; font-weight: 600; margin-bottom: 8px; }
    .calc-slider { width: 100%; appearance: none; height: 8px; border-radius: 4px; background: var(--border); outline: none; }
    .calc-slider::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; border-radius: 50%; background: var(--accent); cursor: pointer; }
    .calc-result { font-size: 3rem; font-weight: 900; color: var(--accent); text-align: center; letter-spacing: -1px; }
    .calc-result-label { font-size: 1rem; color: var(--text-light); text-align: center; }
    .calc-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .calc-before { padding: 20px; border-radius: var(--radius); text-align: center; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }
    .calc-after { padding: 20px; border-radius: var(--radius); text-align: center; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); }
  </style>
</head>
<body>
  <nav class="sticky-nav">
    <div class="container">
      <div class="nav-logo">{{COMPANY_NAME}}</div>
      <a href="#cta" class="cta-btn nav-cta">{{NAV_CTA}}</a>
    </div>
  </nav>

  <section class="section">
    <div class="container" style="text-align: center; max-width: 700px;">
      <h1>{{HEADLINE}}</h1>
      <p style="margin-top: 12px; color: var(--text-secondary); font-size: 1.15rem;">{{SUBHEADLINE}}</p>
    </div>
  </section>

  <section class="section" style="padding-top: 0;">
    <div class="container grid-2" style="max-width: 900px;">
      <div class="calc-card">
        <h3 style="margin-bottom: 24px;">Enter Your Details</h3>
        {{CALC_INPUTS}}
      </div>
      <div class="calc-card" style="border-color: var(--accent);">
        <h3 style="margin-bottom: 24px; text-align: center;">Your Results</h3>
        {{CALC_OUTPUTS}}
        <a href="#cta" class="cta-btn-dark" style="width: 100%; justify-content: center; margin-top: 24px;">{{CTA_TEXT}} →</a>
      </div>
    </div>
  </section>

  {{STATS_SECTION}}
  {{TESTIMONIALS_SECTION}}
  {{FINAL_CTA_SECTION}}
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

  // ─── SALES LETTER ──────────────────────────────
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
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
    .highlight { background: #fff3cd; padding: 2px 4px; }
    .underline-emphasis { text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: 4px; }
    .ps-section { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); }
    .ps-section p { font-style: italic; }
    .signature-block { margin-top: 40px; }
    .signature-name { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.125rem; }
    .signature-title { color: var(--text-light); font-size: 0.9rem; }
    .guarantee-box { background: rgba(34,197,94,0.06); border: 2px solid var(--success); border-radius: var(--radius); padding: 28px; margin: 32px 0; }
  </style>
</head>
<body>
  <div class="letter-container">
    <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 32px;">{{DATE}}</p>
    <h1 style="font-size: 2rem; margin-bottom: 8px;">{{HEADLINE}}</h1>
    <p style="font-size: 1.25rem; color: var(--text-secondary); margin-bottom: 40px;">{{SUBHEADLINE}}</p>
    <div class="letter-body">{{OPENING_COPY}}</div>
    <div class="letter-body">{{PROBLEM_SECTION}}</div>
    <div class="letter-cta"><a href="#cta" class="cta-btn-dark">{{CTA_TEXT}} →</a></div>
    <div class="letter-body">{{AGITATION_SECTION}}</div>
    <div class="letter-body">{{SOLUTION_SECTION}}</div>
    <div class="letter-cta"><a href="#cta" class="cta-btn-dark">{{CTA_TEXT}} →</a></div>
    <div class="letter-body">{{BENEFITS_SECTION}}</div>
    <div class="letter-body">{{PROOF_SECTION}}</div>
    <div class="letter-body">{{OFFER_SECTION}}</div>
    <div class="guarantee-box">{{GUARANTEE}}</div>
    <div class="letter-cta" id="cta"><a href="#cta" class="cta-btn" style="font-size: 1.125rem; padding: 20px 56px;">{{CTA_TEXT}} →</a></div>
    <div class="signature-block">{{SIGNATURE}}</div>
    <div class="ps-section">{{PS_SECTION}}</div>
    <footer style="margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--text-light);">
      {{DISCLOSURE}}
    </footer>
  </div>
</body>
</html>`
  }),

  // ─── SMS TIPS ──────────────────────────────────
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>{{META_TITLE}}</title>
  <style>
    ${generateBrandCSS(brand)}
    ${BASE_STYLES}
    .sms-hero { min-height: 80vh; display: flex; align-items: center; }
    .phone-frame { max-width: 320px; margin: 0 auto; background: #1a1a2e; border-radius: 36px; padding: 12px; box-shadow: var(--shadow-xl); }
    .phone-screen { background: #f5f5f5; border-radius: 28px; padding: 20px 16px; min-height: 460px; }
    .phone-header { text-align: center; font-size: 0.75rem; color: #999; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
    .sms-bubble { background: #e5e5ea; border-radius: 18px; padding: 10px 14px; max-width: 85%; font-size: 0.875rem; line-height: 1.4; margin-bottom: 16px; }
    .sms-day-label { font-size: 0.7rem; color: #999; text-align: center; margin-bottom: 8px; }
    .day-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; transition: all 0.3s ease; }
    .day-card:hover { border-color: var(--accent); box-shadow: var(--shadow-sm); transform: translateY(-4px); }
    .day-number { font-size: 0.75rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .day-title { font-weight: 700; margin-bottom: 4px; }
    .day-preview { color: var(--text-secondary); font-size: 0.9rem; }
    .urgency-banner { background: var(--accent); color: var(--bg-dark); text-align: center; padding: 12px; font-weight: 700; font-size: 0.9rem; }
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

  <section class="sms-hero section">
    <div class="container grid-2">
      <div>
        <span class="badge badge-primary">FREE {{SERIES_DURATION}} SMS SERIES</span>
        <h1 style="margin-top: 20px;">{{HEADLINE}}</h1>
        <p style="margin-top: 12px; color: var(--text-secondary); font-size: 1.125rem;">{{SUBHEADLINE}}</p>
        <div style="margin-top: 20px;">{{BENEFITS_LIST}}</div>
        <a href="#signup" class="cta-btn-dark" style="margin-top: 24px;">Get Instant Access →</a>
        <div style="margin-top: 12px; font-size: 0.875rem; color: var(--text-light);">
          {{SUBSCRIBER_COUNT}} people already subscribed
        </div>
      </div>
      <div>
        <div class="phone-frame">
          <div class="phone-screen">
            <div class="phone-header">{{SERIES_NAME}}</div>
            {{SMS_PREVIEWS}}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <h2 style="text-align: center; margin-bottom: 40px;">What You'll Get Each Day</h2>
      <div class="grid-3">{{DAY_CARDS}}</div>
    </div>
  </section>

  {{STATS_SECTION}}
  {{TESTIMONIALS_SECTION}}

  <section class="section section-dark" id="signup">
    <div class="container" style="max-width: 480px;">
      <div style="background: var(--bg); padding: 48px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);">
        <h2 style="text-align: center; color: var(--text); margin-bottom: 8px;">Get Your Free SMS Series</h2>
        <p style="text-align: center; color: var(--text-secondary); margin-bottom: 24px;">Enter your details to start receiving tips.</p>
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
          <button type="submit" class="cta-btn-dark" style="width: 100%; justify-content: center;">{{FORM_CTA}} →</button>
        </form>
        <p style="text-align: center; font-size: 0.7rem; color: var(--text-light); margin-top: 12px;">
          By subscribing, you agree to receive SMS messages. Message & data rates may apply. Reply STOP to cancel.
        </p>
      </div>
    </div>
  </section>

  {{FINAL_CTA_SECTION}}
</body>
</html>`
  })
};

// ============================================================
// DESIGN INSTRUCTIONS PER PAGE TYPE
// ============================================================
export function getPageTypeDesignInstructions(pageType) {
  const instructions = {
    advertorial: `
ADVERTORIAL DESIGN INSTRUCTIONS:
- Write in editorial/journalistic style. This is an article, not an ad.
- Use the drop-cap class on the first paragraph of HERO_BODY (wrap in a div with class "drop-cap")
- Include pullquotes using <div class="pullquote"><p>quote text</p><cite>— Source Name</cite></div>
- Include highlight boxes using <div class="highlight-box"><p>key insight text</p></div>
- For body sections, use <p> tags with compelling, story-driven copy
- Stats should feel data-driven and credible with specific numbers
- Solution section is on dark background — do NOT include inline color styles
- Make AUTHOR_NAME a credible-sounding name with AUTHOR_ROLE as their title (e.g., "Health Science Editor")
- Use real-sounding dates (e.g., "January 2026")
- BADGE_TEXT should be a category label like "HEALTH SCIENCE" or "NUTRITION RESEARCH"`,

    listicle: `
LISTICLE DESIGN INSTRUCTIONS:
- List items should use numbered format with compelling sub-copy
- Each item gets a bold headline and 2-3 paragraph explanation
- Use specific, benefit-driven list item titles
- Include a strong intro hook before the list begins`,

    quiz: `
QUIZ DESIGN INSTRUCTIONS:
- Quiz questions should feel personalized and engaging
- Options should be relatable and non-judgmental
- Keep quiz to 5-7 questions maximum
- Results should feel insightful and drive toward the product/service`,

    'sales-letter': `
SALES LETTER DESIGN INSTRUCTIONS:
- Write in first person, conversational tone
- Use the PAS formula: Problem, Agitate, Solve
- Include highlighted text using <span class="highlight">key phrase</span>
- Use underline emphasis: <span class="underline-emphasis">important point</span>
- PS section should create urgency
- Guarantee box should be specific and confident`,
  };
  return instructions[pageType] || '';
}

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
