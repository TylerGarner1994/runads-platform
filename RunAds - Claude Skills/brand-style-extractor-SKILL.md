---
name: brand-style-extractor
description: Extracts comprehensive brand style guides from URLs and screenshots for use in AI image generation. Creates detailed color palettes, typography specs, visual aesthetics, and ready-to-use prompt injection strings. Use when creating ads, marketing materials, or any AI-generated visuals that must match an existing brand identity. Triggers on requests for brand guides, style extraction, brand-consistent image generation, or when other skills (meta-image-ad-generator, persona-driven-ads) need brand specifications.
---

# Brand Style Extractor

## Purpose
Extract 100% accurate brand specifications from websites and screenshots to ensure every AI-generated image maintains perfect brand consistency. Outputs a comprehensive brand guide plus a prompt injection string for direct use in image generation prompts.

## When This Skill Runs
- Called by `meta-image-ad-generator` before prompt creation
- Called by any image generation skill needing brand consistency
- User requests brand guide extraction
- User provides URL + wants brand-consistent visuals

## Extraction Workflow

### Phase 1: Source Analysis

#### From URL (Required)
```
1. Fetch homepage with web_fetch
2. Identify and fetch key pages:
   - About page (brand story indicators)
   - Product/service pages (visual treatment)
   - Contact page (professional styling)
   - Any visible landing pages
3. Extract from HTML/CSS:
   - Inline styles
   - Color values in headers, buttons, backgrounds
   - Font-family declarations
   - Logo image URLs
```

#### From Screenshots (If Provided)
```
1. Analyze each screenshot for:
   - Dominant colors (sample 5-10 key areas)
   - Typography style (even if font name unknown)
   - Layout patterns
   - Visual hierarchy
   - Existing ad creative style
2. Cross-reference with URL findings
3. Screenshots OVERRIDE URL findings when conflicting
   (Screenshots show actual implementation)
```

### Phase 2: Color Extraction

Extract and document ALL colors with specificity:

```
PRIMARY COLOR
- Hex: #[exact value]
- RGB: rgb(x, x, x)
- Usage: [Where it appears - headers, CTAs, accents]
- Emotion: [What it conveys - trust, energy, luxury]

SECONDARY COLOR
- Hex: #[exact value]
- RGB: rgb(x, x, x)
- Usage: [Supporting elements, backgrounds, dividers]

ACCENT COLOR(S)
- Hex: #[exact value]
- Usage: [Highlights, buttons, attention-grabbers]

BACKGROUND COLORS
- Light mode: #[hex]
- Dark mode: #[hex] (if applicable)
- Card/container: #[hex]

TEXT COLORS
- Headings: #[hex]
- Body: #[hex]
- Muted/secondary: #[hex]
- On dark background: #[hex]

CTA BUTTON COLORS
- Background: #[hex]
- Text: #[hex]
- Hover state: #[hex] (if detectable)
```

### Phase 3: Typography Extraction

Document typography with precision:

```
HEADLINE TYPOGRAPHY
- Font Family: [Exact name or closest match]
- Weight: [100-900 or light/regular/bold/black]
- Style: [Normal, italic]
- Case Treatment: [ALL CAPS / Title Case / Sentence case]
- Letter Spacing: [Tight, normal, wide]
- Characteristics: [Modern, classic, geometric, humanist, etc.]

BODY TYPOGRAPHY  
- Font Family: [Exact name or closest match]
- Weight: [Typically 400-500]
- Line Height: [If detectable]
- Characteristics: [Readable, elegant, technical, friendly]

ACCENT/DISPLAY TYPOGRAPHY (if present)
- Font Family: [Name]
- Usage: [Quotes, callouts, special sections]

FONT PAIRING NOTES
- Contrast style: [Serif + Sans, similar families, etc.]
- Hierarchy: [How fonts differentiate importance]
```

### Phase 4: Logo Specifications

```
LOGO TYPE
- Style: [Wordmark / Icon / Combination / Lettermark / Emblem]
- Orientation: [Horizontal / Vertical / Square]

LOGO COLORS
- Primary version: [Colors used]
- Reversed version: [For dark backgrounds]
- Single color: [If applicable]

LOGO PLACEMENT PREFERENCES
- Detected positions: [Top-left, center, etc.]
- Size relationship: [Prominent / Subtle / Badge-style]
- Clear space: [Breathing room observed]

LOGO FILE NOTES
- URL if extractable: [Direct link]
- Format observed: [SVG, PNG, etc.]
```

### Phase 5: Visual Aesthetic Profile

```
OVERALL MOOD
[Select and justify 3-5 from:]
- Professional / Casual
- Luxurious / Accessible  
- Bold / Subtle
- Innovative / Traditional
- Playful / Serious
- Warm / Cool
- Energetic / Calm
- Minimalist / Maximalist
- Technical / Creative
- Premium / Value-focused

PHOTOGRAPHY STYLE (if present)
- Type: [Lifestyle / Studio / Candid / Editorial / UGC]
- Subjects: [People / Products / Abstract / Mixed]
- Lighting: [Bright & airy / Moody / Natural / High contrast]
- Color Treatment: [Vibrant / Muted / Warm / Cool / B&W]
- Composition: [Centered / Rule of thirds / Dynamic / Minimal]

GRAPHIC ELEMENTS
- Shapes: [Rounded / Sharp / Organic / Geometric]
- Patterns: [Any recurring patterns]
- Icons: [Style if present - line, filled, custom]
- Illustrations: [Style if present]
- Textures: [Flat / Gradient / Textured / Glossy]

LAYOUT CHARACTERISTICS
- Density: [Spacious / Balanced / Dense]
- Alignment: [Centered / Left / Asymmetric]
- White Space: [Generous / Moderate / Minimal]
- Grid: [Strict / Flexible / Organic]

BRAND PERSONALITY TRANSLATION
- Energy Level: [1-10 scale]
- Sophistication: [1-10 scale]
- Approachability: [1-10 scale]
- Boldness: [1-10 scale]
```

### Phase 6: Output Generation

#### Complete Brand Guide Format

```markdown
═══════════════════════════════════════════════════════════════════════════════
BRAND STYLE GUIDE: [Business Name]
Source: [URL]
Extracted: [Date]
═══════════════════════════════════════════════════════════════════════════════

## COLOR PALETTE

### Primary Colors
| Role | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary | #XXXXXX | rgb(X,X,X) | [Usage] |
| Secondary | #XXXXXX | rgb(X,X,X) | [Usage] |
| Accent | #XXXXXX | rgb(X,X,X) | [Usage] |

### Supporting Colors
| Role | Hex | Usage |
|------|-----|-------|
| Background | #XXXXXX | [Usage] |
| Text Primary | #XXXXXX | [Usage] |
| Text Secondary | #XXXXXX | [Usage] |
| CTA Button | #XXXXXX | [Usage] |

## TYPOGRAPHY

| Element | Font | Weight | Style |
|---------|------|--------|-------|
| Headlines | [Font] | [Weight] | [ALL CAPS/Title Case] |
| Body | [Font] | [Weight] | [Sentence case] |
| Accent | [Font] | [Weight] | [Style] |

**Typography Characteristics**: [Description of overall type feel]

## LOGO

- **Type**: [Wordmark/Icon/Combination]
- **Primary Colors**: [Colors]
- **Placement**: [Preferred position]
- **Size**: [Prominent/Subtle/Badge]

## VISUAL AESTHETIC

- **Overall Mood**: [3-5 descriptors]
- **Photography Style**: [Description]
- **Lighting Preference**: [Description]
- **Composition Style**: [Description]
- **Shape Language**: [Rounded/Sharp/Organic]
- **Texture**: [Flat/Gradient/Textured]

## BRAND PERSONALITY SCORES

| Attribute | Score (1-10) |
|-----------|--------------|
| Energy | X |
| Sophistication | X |
| Approachability | X |
| Boldness | X |

═══════════════════════════════════════════════════════════════════════════════
```

#### Prompt Injection String (CRITICAL OUTPUT)

Generate a ready-to-use string for Nano Banana 2 and other image generators:

```
PROMPT INJECTION STRING:
───────────────────────────────────────────────────────────────────────────────
"Maintain exact brand consistency: Primary color [#hex] ([color name]) for 
dominant elements and CTAs. Secondary color [#hex] for supporting elements. 
Accent color [#hex] for highlights. Background should be [#hex] ([light/dark]). 
Typography style: [font characteristics] with [weight] weight, [case treatment] 
for headlines. Overall aesthetic is [mood descriptors] with [lighting style] 
lighting. Visual style should feel [personality descriptors]. 
[Logo placement instruction if applicable]."
───────────────────────────────────────────────────────────────────────────────
```

**This string gets appended to EVERY image generation prompt.**

## Verification Step

Before finalizing, present key findings to user:

```
BRAND EXTRACTION COMPLETE - Please Verify:

Colors detected:
- Primary: [#hex] [color name] ✓ or ✗?
- Secondary: [#hex] [color name] ✓ or ✗?
- Accent: [#hex] [color name] ✓ or ✗?

Typography identified:
- Headlines: [Font/style] ✓ or ✗?
- Body: [Font/style] ✓ or ✗?

Brand mood: [3-5 descriptors] ✓ or ✗?

Reply with corrections or 'confirmed' to proceed.
```

## Integration Notes

### When Called by Other Skills
Return two outputs:
1. **Full Brand Guide** - For campaign state file storage
2. **Prompt Injection String** - For immediate use in prompts

### Handling Edge Cases

**Minimal Website (no clear branding)**:
- Note limitations in guide
- Ask user for additional input
- Suggest brand development

**Multiple Brand Variations Detected**:
- Document all variations
- Ask user which to use as primary
- Note sub-brand specifications

**No Screenshots + Limited URL Data**:
- Extract what's available
- Clearly mark uncertain elements with [UNCONFIRMED]
- Request screenshots for accuracy

## Quality Standards

- NEVER guess hex codes - extract exactly or mark [UNCONFIRMED]
- ALWAYS provide prompt injection string
- Cross-reference multiple pages for consistency
- Screenshots are truth when URL conflicts
- Verify with user before finalizing
