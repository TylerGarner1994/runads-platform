#!/usr/bin/env python3
"""
Competitive Ad Research Helper
Assists with gathering and analyzing competitor advertising data
"""

import json
import csv
from datetime import datetime
from typing import Dict, List
from pathlib import Path


def create_competitor_tracking_sheet():
    """
    Creates a CSV template for tracking competitor ads
    """
    headers = [
        'date_found',
        'competitor_name',
        'platform',
        'ad_type',
        'headline',
        'body_copy',
        'cta_text',
        'visual_description',
        'hook_type',
        'pain_point_addressed',
        'benefit_highlighted',
        'proof_element',
        'urgency_element',
        'ad_url',
        'landing_page_url',
        'estimated_run_time',
        'performance_notes'
    ]
    
    output_path = Path('/home/claude/competitor_ad_tracker.csv')
    
    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
    
    return str(output_path)


def create_customer_research_template():
    """
    Creates a JSON template for organizing customer research findings
    """
    template = {
        "research_date": datetime.now().isoformat(),
        "demographics": {
            "age_range": "",
            "gender_distribution": "",
            "location": "",
            "income_level": "",
            "occupation": "",
            "education": ""
        },
        "psychographics": {
            "values": [],
            "interests": [],
            "lifestyle": "",
            "media_consumption": [],
            "personality_traits": []
        },
        "pain_points": {
            "primary_pain": "",
            "secondary_pains": [],
            "emotional_impact": "",
            "urgency_level": "",
            "cost_of_not_solving": ""
        },
        "desires": {
            "primary_desire": "",
            "emotional_outcome": "",
            "status_aspiration": "",
            "transformation_sought": ""
        },
        "objections": {
            "skepticism": [],
            "price_concerns": [],
            "timing_issues": [],
            "trust_barriers": []
        },
        "voice_of_customer": {
            "exact_phrases": [],
            "problem_descriptions": [],
            "success_metrics": [],
            "common_words": []
        },
        "customer_journey": {
            "awareness_triggers": [],
            "consideration_factors": [],
            "decision_criteria": [],
            "buying_barriers": []
        }
    }
    
    output_path = Path('/home/claude/customer_research_template.json')
    
    with open(output_path, 'w') as f:
        json.dump(template, f, indent=2)
    
    return str(output_path)


def create_messaging_matrix():
    """
    Creates a CSV for comparing competitor messaging
    """
    headers = [
        'competitor',
        'headline',
        'main_benefit',
        'pain_point_1',
        'pain_point_2',
        'pain_point_3',
        'usp',
        'proof_type',
        'tone',
        'positioning',
        'target_audience',
        'differentiation_claim'
    ]
    
    output_path = Path('/home/claude/messaging_matrix.csv')
    
    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
    
    return str(output_path)


def create_offer_comparison_sheet():
    """
    Creates a CSV for comparing competitor offers
    """
    headers = [
        'competitor',
        'entry_price',
        'core_price',
        'premium_price',
        'guarantee_type',
        'guarantee_length',
        'bonuses',
        'payment_options',
        'trial_available',
        'urgency_tactic',
        'scarcity_element',
        'risk_reversal',
        'notes'
    ]
    
    output_path = Path('/home/claude/offer_comparison.csv')
    
    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
    
    return str(output_path)


def create_voc_analysis_template():
    """
    Creates a structured template for Voice of Customer analysis
    """
    template = {
        "research_date": datetime.now().isoformat(),
        "source_type": "",  # reviews, social_media, support_tickets, interviews
        "source_url": "",
        "pain_point_quotes": [],
        "desire_quotes": [],
        "objection_quotes": [],
        "success_story_quotes": [],
        "emotional_words": [],
        "feature_requests": [],
        "complaint_themes": [],
        "praise_themes": [],
        "key_phrases": {
            "describing_problem": [],
            "describing_solution": [],
            "describing_results": [],
            "emotional_language": []
        },
        "insights": []
    }
    
    output_path = Path('/home/claude/voc_analysis_template.json')
    
    with open(output_path, 'w') as f:
        json.dump(template, f, indent=2)
    
    return str(output_path)


def create_research_brief_template():
    """
    Creates a comprehensive research brief template
    """
    template = {
        "project_name": "",
        "date_created": datetime.now().isoformat(),
        "business_overview": {
            "company_name": "",
            "industry": "",
            "product_service": "",
            "target_market": "",
            "unique_value_proposition": "",
            "business_goals": []
        },
        "research_objectives": [],
        "key_questions": [],
        "competitor_list": [],
        "research_timeline": {
            "start_date": "",
            "end_date": "",
            "milestones": []
        },
        "deliverables": [],
        "constraints": {
            "budget": "",
            "geographic_focus": [],
            "regulatory_considerations": []
        }
    }
    
    output_path = Path('/home/claude/research_brief_template.json')
    
    with open(output_path, 'w') as f:
        json.dump(template, f, indent=2)
    
    return str(output_path)


def analyze_ad_patterns(ad_data: List[Dict]) -> Dict:
    """
    Analyzes a list of ads to identify common patterns
    
    Args:
        ad_data: List of ad dictionaries with keys like 'hook_type', 'visual_style', etc.
    
    Returns:
        Dictionary with pattern analysis
    """
    patterns = {
        "hook_types": {},
        "visual_styles": {},
        "cta_phrases": {},
        "pain_points": {},
        "benefits": {}
    }
    
    for ad in ad_data:
        # Count hook types
        hook = ad.get('hook_type', 'unknown')
        patterns['hook_types'][hook] = patterns['hook_types'].get(hook, 0) + 1
        
        # Count visual styles
        visual = ad.get('visual_style', 'unknown')
        patterns['visual_styles'][visual] = patterns['visual_styles'].get(visual, 0) + 1
        
        # Count CTA phrases
        cta = ad.get('cta_text', 'unknown')
        patterns['cta_phrases'][cta] = patterns['cta_phrases'].get(cta, 0) + 1
        
        # Track pain points
        pain = ad.get('pain_point_addressed', '')
        if pain:
            patterns['pain_points'][pain] = patterns['pain_points'].get(pain, 0) + 1
        
        # Track benefits
        benefit = ad.get('benefit_highlighted', '')
        if benefit:
            patterns['benefits'][benefit] = patterns['benefits'].get(benefit, 0) + 1
    
    # Sort each category by frequency
    for category in patterns:
        patterns[category] = dict(sorted(
            patterns[category].items(), 
            key=lambda x: x[1], 
            reverse=True
        ))
    
    return patterns


if __name__ == "__main__":
    print("Research Helper Tool")
    print("=" * 50)
    print("\nCreating research templates...\n")
    
    templates = {
        "Competitor Ad Tracker": create_competitor_tracking_sheet(),
        "Customer Research Template": create_customer_research_template(),
        "Messaging Matrix": create_messaging_matrix(),
        "Offer Comparison": create_offer_comparison_sheet(),
        "VOC Analysis Template": create_voc_analysis_template(),
        "Research Brief Template": create_research_brief_template()
    }
    
    for name, path in templates.items():
        print(f"✓ Created: {name}")
        print(f"  Location: {path}\n")
    
    print("\nAll templates created successfully!")
    print("\nThese templates help organize your research findings.")
    print("Fill them in as you gather data from various sources.")
