# Marketing Skills for Claude Code

This package contains two powerful marketing automation skills optimized for use in Claude Code projects:

1. **legendary-sales-letter** - End-to-end sales letter and advertorial creation
2. **dr-market-research** - PhD-level market research methodology

## Installation

### Option 1: Upload to Claude Code Project

1. Open your Claude Code project
2. Upload the entire skill directories to your project folder
3. Reference them in your application code

### Option 2: Use as Reference Material

Copy the relevant markdown files into your project's documentation or prompts directory.

## Skills Overview

### 1. Legendary Sales Letter

**Purpose**: Create high-converting sales letters and advertorials using frameworks from the world's greatest copywriters.

**Key Features**:
- Deep market research integration
- Awareness stage calibration (Schwartz framework)
- Unique mechanism development
- 25+ bullet/fascination formulas
- Psychological trigger library
- Master copywriter synthesis (Halbert, Bencivenga, Sugarman, etc.)

**Files Included**:
```
legendary-sales-letter/
├── SKILL.md                          # Main skill documentation
└── references/
    ├── advertorial-structure.md      # Editorial-style copy framework
    ├── copywriting-masters.md        # Synthesis of legendary copywriters
    ├── fascinations-bullets.md       # 25 proven bullet formulas
    ├── psychology-triggers.md        # Persuasion principles
    ├── research-questions.md         # 88 avatar research questions
    └── sales-letter-structure.md     # Classic sales letter architecture
```

**Use Cases**:
- Writing sales letters for landing pages
- Creating advertorials for native advertising
- Developing long-form VSLs (Video Sales Letters)
- Crafting direct mail pieces
- Analyzing and improving existing copy

**How to Use**:
```python
# In your Claude Code app, you can reference the skill content
# to generate sales copy based on product URLs or descriptions

# Example implementation pattern:
def create_sales_letter(product_url):
    # 1. Load the SKILL.md for methodology
    # 2. Conduct research using web tools
    # 3. Apply frameworks from reference files
    # 4. Generate the sales letter
    pass
```

### 2. DR Market Research

**Purpose**: Conduct systematic, PhD-level market research for direct response advertising campaigns.

**Key Features**:
- Customer research framework (demographics, psychographics, VOC)
- Competitive intelligence gathering
- Market sizing and trend analysis
- Channel-specific research (Meta, Google, TikTok)
- Persona development methodology
- Research templates and helper tools

**Files Included**:
```
dr-market-research/
├── SKILL.md                              # Main skill documentation
├── references/
│   ├── competitor-analysis.md            # Competitive intelligence framework
│   ├── customer-research.md              # Customer deep dive methodology
│   ├── market-industry-research.md       # Market sizing and trends
│   └── product-business-research.md      # Product positioning and USP
└── scripts/
    └── research_helper.py                # Template generation tool
```

**Use Cases**:
- Pre-campaign market research
- Customer persona development
- Competitive analysis and gap identification
- Channel selection and budget allocation
- Voice of customer (VOC) analysis
- Objection research

**How to Use**:
```python
# The research_helper.py script can generate templates:
from scripts.research_helper import create_competitor_tracking_sheet

# Create tracking templates
tracker_path = create_competitor_tracking_sheet()

# Use the frameworks from references to guide systematic research
# Then feed findings into ad creation or sales letter skills
```

## Integration Patterns

### Combined Workflow

These skills are designed to work together:

```
1. DR Market Research
   ↓
   - Customer personas
   - Competitive intelligence
   - Market positioning
   ↓
2. Legendary Sales Letter
   ↓
   - Research-driven copy
   - Customer language integration
   - Differentiated messaging
```

### Example Application Structure

```python
# main.py - Your Claude Code application

class MarketingAutomation:
    def __init__(self):
        self.research_skill = self.load_skill('dr-market-research')
        self.copy_skill = self.load_skill('legendary-sales-letter')
    
    def create_campaign(self, product_url):
        # Phase 1: Research
        research_data = self.conduct_research(product_url)
        
        # Phase 2: Copy Creation
        sales_letter = self.create_sales_letter(
            research_data, 
            product_url
        )
        
        return {
            'research': research_data,
            'sales_letter': sales_letter
        }
    
    def conduct_research(self, product_url):
        # Use dr-market-research frameworks
        # to gather intelligence
        pass
    
    def create_sales_letter(self, research, url):
        # Use legendary-sales-letter frameworks
        # to generate copy
        pass
```

## Reference File Usage

### In Prompts

You can include reference files in your Claude prompts:

```
Before writing the sales letter, review the following frameworks:

{content from references/copywriting-masters.md}
{content from references/sales-letter-structure.md}

Now write a sales letter for: {product_url}
```

### In Context Windows

For Claude Code applications, load reference files as needed:

```python
def load_framework(framework_name):
    path = f"legendary-sales-letter/references/{framework_name}.md"
    with open(path, 'r') as f:
        return f.read()

# Load specific framework when needed
bullet_formulas = load_framework('fascinations-bullets')
```

## Best Practices

1. **Always Start with Research**: Use dr-market-research before creating copy
2. **Reference Frameworks**: Don't reinvent the wheel - use proven patterns
3. **Iterate and Test**: Generate multiple variations using different frameworks
4. **Maintain Voice Consistency**: Use VOC research to match customer language
5. **Document Findings**: Use the provided templates to organize research

## Research Helper Tool

The `dr-market-research/scripts/research_helper.py` creates useful templates:

```bash
# Run the helper tool
cd dr-market-research/scripts
python research_helper.py
```

This generates:
- Competitor ad tracker (CSV)
- Customer research template (JSON)
- Messaging matrix (CSV)
- Offer comparison sheet (CSV)
- VOC analysis template (JSON)
- Research brief template (JSON)

## Advanced Usage

### Behavioral Science Integration

The skills include comprehensive behavioral science frameworks:
- 28 Sugarman triggers
- Cialdini's 6 principles
- Behavioral economics (loss aversion, anchoring, framing)
- Cognitive biases for copy

### Copywriting Frameworks

Master copywriter methodologies included:
- Eugene Schwartz (awareness stages, market sophistication)
- Gary Halbert (conversational copy, starving crowd)
- Joe Sugarman (slippery slide, psychological triggers)
- Gary Bencivenga (80/20 research, proof stacking)
- Clayton Makepeace (dimensionalizing benefits)
- John Carlton (sales detective method)
- Evaldo Albuquerque (16-word sales letter)

## Customization

These skills are templates - customize them for your needs:

1. Add industry-specific research sources
2. Modify frameworks for your audience
3. Extend with additional copywriting techniques
4. Integrate with your existing tools and APIs

## Support & Updates

These skills are based on proven direct response methodologies refined over decades. For updates or questions about implementation, refer to the original skill documentation.

## License

These skills are provided for use in your marketing automation projects. The frameworks synthesize public domain copywriting knowledge and research methodologies.

---

**Version**: 1.0  
**Last Updated**: January 2026  
**Maintained By**: Max Finn / Unicorn Marketers
