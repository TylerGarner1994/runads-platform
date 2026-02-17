---
name: meta-image-ad-generator
description: Advanced Meta image ad prompt generator for Nano Banana 2 (Gemini image AI). Creates brand-consistent, psychologically-optimized image prompts through guided selection or custom input. Auto-chains dr-market-research, brand-style-extractor, persona-architect, and conversion-copy-architect. Saves/resumes campaigns via Google Drive. Use for Meta ad image creation, AI image ad generation, Nano Banana prompts, or when user says "create ads for [brand]", "more ads for [brand]", or "continue [brand] campaign".
---

# Meta Image Ad Generator v2

## Overview
Orchestrates complete Meta image ad creation by chaining specialized skills, presenting guided selections, and generating advanced Nano Banana 2 prompts with perfect brand consistency.

## Startup Sequence

```
START
│
├─→ CHECK GOOGLE DRIVE for existing campaign
│   │
│   │   Search: fullText contains '[brand name] campaign state'
│   │   Location: /Claude Campaigns/[Brand]/
│   │
│   ├─→ [FOUND] 
│   │     │
│   │     └─→ Load campaign state
│   │         Display: "Welcome back! Campaign for [Brand] loaded (last updated [date]).
│   │                   
│   │                   What would you like to do?
│   │                   A) Guided selection (personas → awareness → biases → styles)
│   │                   B) Type specific ad concepts
│   │                   C) Quick generate (5 prompts using top persona + recommended settings)"
│   │         
│   │         └─→ Skip to SELECTION PHASE
│   │
│   └─→ [NOT FOUND]
│         │
│         └─→ Run INITIALIZATION PHASE
```

## Initialization Phase (New Campaigns Only)

### Step 1: Market Research
```
Trigger: dr-market-research skill
Output needed:
- Business overview
- Target market
- Pain points
- Desires
- Competitive landscape
- Market sophistication
- Unique mechanism
```

### Step 2: Brand Style Extraction
```
Trigger: brand-style-extractor skill
Inputs: 
- URL (required)
- Screenshots (if provided)

Output needed:
- Complete brand guide
- Prompt injection string (CRITICAL)

Verify with user before proceeding.
```

### Step 3: Persona Development
```
Trigger: persona-architect skill
Output needed:
- 5 detailed personas
- Visual representation specs per persona
- Cognitive bias profiles per persona
- Quick reference matrix
```

### Step 4: Generate & Save Campaign State
```
Create campaign state file with:
- Brand guide
- Research summary  
- All personas
- Empty "Previously Generated" section
- Empty "Ideas Backlog" section

Save to Google Drive:
- Path: /Claude Campaigns/[Brand Name]/campaign-state.md
- Confirm save with user
```

## Selection Phase

After initialization (or when resuming), present:

```
═══════════════════════════════════════════════════════════════════════════════
READY TO CREATE ADS FOR [BRAND]
═══════════════════════════════════════════════════════════════════════════════

Choose your path:

[A] GUIDED SELECTION
    Walk through: Personas → Awareness → Biases → Styles → Generate

[B] CUSTOM AD CONCEPTS  
    Describe specific ad ideas → Get tailored prompts

[C] QUICK GENERATE
    Auto-select best options → 5 prompts instantly

───────────────────────────────────────────────────────────────────────────────
```

---

## PATH A: Guided Selection

### A1: Persona Selection

```
═══════════════════════════════════════════════════════════════════════════════
STEP 1 OF 4: SELECT PERSONAS
═══════════════════════════════════════════════════════════════════════════════

1️⃣ [Persona Name] - [One-line summary]
2️⃣ [Persona Name] - [One-line summary]
3️⃣ [Persona Name] - [One-line summary]
4️⃣ [Persona Name] - [One-line summary]
5️⃣ [Persona Name] - [One-line summary]

───────────────────────────────────────────────────────────────────────────────
Options:
- Select individual: "1" or "2, 4" or "1, 3, 5"
- Select all: "all"
- Skip (general targeting): "skip"

💡 Or type specific ad concepts to switch to custom mode →
═══════════════════════════════════════════════════════════════════════════════
```

### A2: Awareness Level Selection

```
═══════════════════════════════════════════════════════════════════════════════
STEP 2 OF 4: SELECT AWARENESS LEVEL
═══════════════════════════════════════════════════════════════════════════════

1️⃣ UNAWARE
   They don't know they have a problem yet
   Visual Strategy: Pattern interrupt, curiosity, intrigue
   
2️⃣ PROBLEM AWARE  
   They know the problem, not the solution
   Visual Strategy: Pain visualization, agitation, empathy
   
3️⃣ SOLUTION AWARE
   They know solutions exist, not yours specifically
   Visual Strategy: Differentiation, unique mechanism, "why us"
   
4️⃣ PRODUCT AWARE
   They know your product, not yet convinced
   Visual Strategy: Social proof, objection handling, credibility
   
5️⃣ MOST AWARE
   Ready to buy, need final push
   Visual Strategy: Urgency, offer, direct CTA

───────────────────────────────────────────────────────────────────────────────
Select one: 1-5
═══════════════════════════════════════════════════════════════════════════════
```

### A3: Cognitive Bias Selection

```
═══════════════════════════════════════════════════════════════════════════════
STEP 3 OF 4: SELECT COGNITIVE BIASES (Choose 1-5, or a Power Stack)
═══════════════════════════════════════════════════════════════════════════════

LOSS & RISK BIASES
───────────────────────────────────────────────────────────────────────────────
1.  Loss Aversion - Fear of missing gains
2.  Sunk Cost - "You've already invested..."
3.  Zero Risk Bias - Eliminate all perceived risk
4.  Regret Aversion - Fear of future regret
5.  Endowment Effect - "Already yours, just claim it"

SOCIAL & IDENTITY BIASES
───────────────────────────────────────────────────────────────────────────────
6.  Social Proof - "Everyone's doing it"
7.  Bandwagon Effect - Join the winning side
8.  In-Group Bias - "People like you choose X"
9.  Authority Bias - Expert endorsement
10. Halo Effect - Positive association transfer
11. Liking Bias - Attractive/relatable presenter

COGNITIVE SHORTCUT BIASES
───────────────────────────────────────────────────────────────────────────────
12. Anchoring - First number sets reference
13. Framing Effect - Same info, different spin
14. Availability Heuristic - Recent/vivid examples
15. Representativeness - "Looks like success"
16. Default Effect - Pre-selected option wins
17. Mere Exposure - Familiarity breeds preference

DESIRE & MOTIVATION BIASES
───────────────────────────────────────────────────────────────────────────────
18. Scarcity - Limited quantity/time
19. Curiosity Gap - Incomplete information
20. IKEA Effect - Value what you build
21. Reciprocity - Give first, receive later
22. Commitment/Consistency - Small yes → big yes
23. Goal Gradient - Closer to finish = motivated

PERCEPTION BIASES
───────────────────────────────────────────────────────────────────────────────
24. Contrast Effect - Look better by comparison
25. Decoy Effect - Add inferior option
26. Von Restorff (Isolation) - Different = remembered
27. Picture Superiority - Images > words
28. Rhyme-as-Reason - Rhyming = believable
29. Processing Fluency - Easy = trustworthy

TRUST & CREDIBILITY BIASES
───────────────────────────────────────────────────────────────────────────────
30. Ben Franklin Effect - Ask small favor first
31. Pratfall Effect - Flaw admits build trust
32. Peak-End Rule - Last impression matters
33. Confirmation Bias - Affirm existing beliefs
34. Survivorship Bias - Show only winners

───────────────────────────────────────────────────────────────────────────────

⚡ POWER STACKS (Pre-built combinations)
───────────────────────────────────────────────────────────────────────────────
A. THE URGENCY STACK: Scarcity + Loss Aversion + Regret Aversion
B. THE TRUST STACK: Social Proof + Authority + Pratfall Effect
C. THE DESIRE STACK: Curiosity Gap + Goal Gradient + Endowment Effect
D. THE COMPARISON STACK: Anchoring + Contrast Effect + Decoy Effect
E. THE IDENTITY STACK: In-Group + Bandwagon + Commitment/Consistency

───────────────────────────────────────────────────────────────────────────────
Select: Numbers (e.g., "1, 6, 18") or Stack letter (e.g., "A") or "surprise me"
═══════════════════════════════════════════════════════════════════════════════
```

### A4: Ad Style Category Selection

```
═══════════════════════════════════════════════════════════════════════════════
STEP 4 OF 4: SELECT AD STYLES (Choose 1-5)
═══════════════════════════════════════════════════════════════════════════════

CORE VISUAL STYLES
───────────────────────────────────────────────────────────────────────────────
1.  Professional Studio - High-end, controlled, premium
2.  Lifestyle/Environmental - Aspirational, real-world context
3.  UGC-Style/Raw - Authentic, phone-captured aesthetic
4.  Flatlay - Top-down organized arrangements
5.  Minimalist/Negative Space - Apple-style, one focal point
6.  Maximalist/Dense - Busy, energetic, info-rich
7.  Dark Mode Optimized - High contrast for dark UI
8.  Editorial/Magazine - Press coverage aesthetic
9.  3D Render/CGI - Hyper-realistic, perfect angles
10. Hand-Drawn/Illustrated - Non-photographic, approachable

SUBJECT/PRODUCT FOCUS
───────────────────────────────────────────────────────────────────────────────
11. Product-in-Use/Demo - Hands actively using product
12. Founder/Face-Forward - Personal brand, human connection
13. Ingredient Breakdown - Deconstructed, transparency
14. Behind-the-Scenes - Manufacturing, process, workspace
15. Packaging Hero - Premium packaging as star
16. Unboxing/Reveal - First-look anticipation

FORMAT/LAYOUT
───────────────────────────────────────────────────────────────────────────────
17. Text-Only/Typography - Pure text, no photos (trending)
18. Screenshot/Interface - Fake texts, DMs, notifications
19. Meme/Native Content - Looks like friend's post
20. Split Screen/Comparison - Side-by-side, duet style

PSYCHOLOGICAL/STRATEGIC
───────────────────────────────────────────────────────────────────────────────
21. Before/After Transformation - Visual proof
22. Social Proof Stack - Testimonials, ratings, results
23. Problem Visualization - Dramatize the pain
24. Curiosity Gap Visual - Censored, blurred, incomplete
25. Urgency/Scarcity Visual - Timers, low stock, "last chance"

CREATIVE/OUTSIDE THE BOX 🎨
───────────────────────────────────────────────────────────────────────────────
26. LEGO/Brick Style - Built from blocks
27. Claymation/Stop-Motion - Sculpted clay aesthetic
28. Wobble/Jelly Physics - Bouncy, playful movement feel
29. Kids Crayon Drawing - Childlike, innocent, nostalgic
30. Whiteboard Sketch - Hand-drawn explainer style
31. Paper Cutout/Collage - Craft aesthetic
32. Pixel Art/8-Bit - Retro gaming nostalgia
33. Watercolor/Paint - Artistic, soft, elegant
34. Chalkboard Style - Educational, handwritten
35. Pop Art/Warhol - Bold, repetitive, artistic
36. Neon/Cyberpunk - Glowing, futuristic, edgy
37. Vintage Poster/Propaganda - Retro, bold messaging
38. Blueprint/Technical Drawing - Precise, engineering feel
39. Embroidery/Cross-Stitch - Handcrafted, detailed
40. Balloon/Inflatable Style - Puffy, fun, tactile
41. Ice Sculpture - Crystalline, premium, cold
42. Food Art - Made entirely of food items
43. Miniature/Tilt-Shift - Tiny world, whimsical
44. X-Ray/See-Through - Internal view, transparency
45. Holographic/Iridescent - Shimmering, futuristic
46. Origami/Paper Fold - Geometric, crafted
47. Stained Glass - Colorful, artistic, classic
48. Mosaic/Tile - Pieced together, artistic
49. Sand Sculpture - Temporary, impressive, beach
50. Cloud/Smoke Formation - Ethereal, dreamlike

───────────────────────────────────────────────────────────────────────────────
Select: Numbers (e.g., "3, 17, 27") — Choose 1-5 styles
═══════════════════════════════════════════════════════════════════════════════
```

---

## PATH B: Custom Ad Concepts

After persona selection OR from main menu:

```
═══════════════════════════════════════════════════════════════════════════════
CUSTOM AD CONCEPTS
═══════════════════════════════════════════════════════════════════════════════

Describe the specific ad images you want. Be as detailed or brief as you like.

Examples:
• "Stressed founder drowning in spreadsheets, our software as life raft"
• "Before/after showing messy desk vs. organized workspace"
• "Meme format: expectation vs. reality of using our service"
• "Claymation style showing the transformation journey"
• "Screenshot of fake text conversation praising the product"

Your concept(s):
───────────────────────────────────────────────────────────────────────────────
```

After user input:
1. Analyze intent
2. Suggest relevant biases (user can accept or modify)
3. Suggest relevant styles (user can accept or modify)
4. Generate 5 prompts per concept (with brand guide applied)

---

## PATH C: Quick Generate

Auto-selects:
- Top-performing persona (based on profile)
- Awareness level matched to persona
- Recommended bias stack for persona
- Mix of proven style categories

Generates 5 prompts immediately.

---

## Prompt Generation Engine

### Prompt Structure Template

For EACH prompt, generate:

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT [#] OF [TOTAL]
═══════════════════════════════════════════════════════════════════════════════

NANO BANANA 2 PROMPT:
───────────────────────────────────────────────────────────────────────────────
"Create a [aspect ratio: 4:5 vertical for Meta feed] image showing [detailed 
subject description with specific demographics matching persona: age, gender, 
clothing, expression, body language]. 

The subject is [action/situation that visualizes the strategic angle: pain 
state, transformation, using product, etc.] in [specific environment with 
detailed props and background elements].

[COGNITIVE BIAS VISUAL IMPLEMENTATION: Specific instruction for how the 
selected bias manifests visually in this image]

[TEXT OVERLAY INSTRUCTION: If applicable - "Include text overlay reading: 
'[headline from conversion-copy-architect]' in [font style matching brand] 
positioned at [location]"]

Composition: [Camera angle, focal point, rule of thirds placement, depth of 
field]. Lighting: [Specific lighting matching brand aesthetic and mood].

[BRAND INJECTION STRING FROM BRAND-STYLE-EXTRACTOR - Full string embedded]

Style: [Selected style category with specific execution details]. The image 
should feel [brand personality descriptors] while achieving [strategic goal: 
scroll-stop, curiosity, trust, urgency]."
───────────────────────────────────────────────────────────────────────────────

STRATEGIC NOTES:
───────────────────────────────────────────────────────────────────────────────
• Persona: [Which persona this targets]
• Awareness Level: [Level and why this visual works for it]
• Cognitive Biases Applied: [List with how each manifests visually]
• Style Category: [Which style and execution approach]
• Testing Hypothesis: [What this prompt tests]
• Expected Performance: [Why this should work]

TEXT OVERLAY COPY (from conversion-copy-architect):
───────────────────────────────────────────────────────────────────────────────
Headline: [Headline for image]
Subhead: [If applicable]
CTA: [If applicable]

═══════════════════════════════════════════════════════════════════════════════
```

### Generation Rules

1. **5 prompts per selection combination**
2. **Brand injection string in EVERY prompt**
3. **Each prompt tests something different** (vary one element)
4. **All prompts production-ready** (no placeholders except where user input needed)
5. **Trigger conversion-copy-architect** for any text overlay copy

---

## Session End: Auto-Save to Google Drive

After generating prompts:

```
═══════════════════════════════════════════════════════════════════════════════
SESSION COMPLETE
═══════════════════════════════════════════════════════════════════════════════

✅ [X] new prompts generated

Saving to Google Drive...
───────────────────────────────────────────────────────────────────────────────
📁 /Claude Campaigns/[Brand Name]/campaign-state.md

Updated:
• Added [X] prompts to "Previously Generated" section
• Session logged: [Date] - [Selections made]

───────────────────────────────────────────────────────────────────────────────

To continue later, just say:
• "More ads for [Brand]"
• "Continue [Brand] campaign"
• "Resume my campaign"

═══════════════════════════════════════════════════════════════════════════════
```

### Campaign State File Update

Append to existing file:

```markdown
## SESSION LOG

### [Date] - Session [#]
**Selections**:
- Personas: [Selected]
- Awareness: [Level]
- Biases: [Selected]
- Styles: [Selected]

**Prompts Generated**: [Count]
**Notes**: [Any observations]

### Previously Generated Prompts

#### Prompt [#] - [Date]
[Full prompt text]
[Strategic notes]

[Continue for all prompts...]
```

---

## Integration Dependencies

| Skill | Purpose | When Called |
|-------|---------|-------------|
| dr-market-research | Market intelligence | Initialization only |
| brand-style-extractor | Brand consistency | Initialization only |
| persona-architect | Persona development | Initialization only |
| conversion-copy-architect | Text overlay copy | Every prompt with text |

---

## Error Handling

**Google Drive not connected**:
- Generate campaign state file
- Present for download
- Instruct user to upload in future sessions

**Research insufficient**:
- Identify gaps
- Request specific information
- Mark sections as [NEEDS INPUT]

**Brand extraction unclear**:
- Show confidence levels
- Request screenshots
- Allow manual override

---

## Success Criteria

Prompts are successful when:
- ✓ Brand colors and style present in every prompt
- ✓ Persona visual specs accurately represented
- ✓ Cognitive biases have specific visual implementation
- ✓ Style category properly executed
- ✓ Text overlays use conversion-copy-architect output
- ✓ Each prompt is distinctly different and testable
- ✓ Campaign state saves/resumes seamlessly
