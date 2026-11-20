"""Human-readable names, segment descriptions and marketing hypotheses.

The messaging lines are HYPOTHESES to A/B test, not facts: research on personality-targeted
messaging finds real but modest effects.
"""

TRAIT_NAMES = {
    "EXT": "Extraversion",
    "EST": "Neuroticism",
    "AGR": "Agreeableness",
    "CSN": "Conscientiousness",
    "OPN": "Openness",
}

HIGH = {
    "EXT": "sociable and energetic",
    "EST": "prone to worry and mood swings",
    "AGR": "warm and cooperative",
    "CSN": "organised and dependable",
    "OPN": "curious and imaginative",
}
LOW = {
    "EXT": "reserved and quiet",
    "EST": "calm and emotionally steady",
    "AGR": "direct and competitive",
    "CSN": "spontaneous and flexible",
    "OPN": "practical and conventional",
}

MSG_HIGH = {
    "EXT": "Lead with community, events and social proof ('join thousands of others').",
    "EST": "Lead with reassurance: guarantees, easy returns, clear support, calm tone.",
    "AGR": "Emphasise helping others, shared benefit and ethical or sustainable choices.",
    "CSN": "Emphasise reliability, planning tools, checklists and long-term value.",
    "OPN": "Emphasise novelty, creativity and new experiences; show what is new.",
}
MSG_LOW = {
    "EXT": "Keep it low-pressure and self-paced; avoid crowds and forced social features.",
    "EST": "Confident, performance-focused framing; skip fear-based urgency.",
    "AGR": "Lead with results, comparisons and clear advantages; less 'togetherness'.",
    "CSN": "Keep it simple and flexible; use gentle reminders rather than rigid schedules.",
    "OPN": "Lean on familiar, proven, well-reviewed options; avoid jargon about 'innovation'.",
}

THRESH = 0.4  # |z| needed for a trait to count as high/low in a segment


def segment_card(seg, traits):
    z = seg["center_z"]
    high = [t for t, v in zip(traits, z) if v >= THRESH]
    low = [t for t, v in zip(traits, z) if v <= -THRESH]
    parts = [f"High {TRAIT_NAMES[t]}" for t in high] + [f"Low {TRAIT_NAMES[t]}" for t in low]
    name = " · ".join(parts) if parts else "Balanced profile"
    bits = [HIGH[t] for t in high] + [LOW[t] for t in low]
    desc = ("Tends to be " + ", ".join(bits) + ".") if bits else "Close to the population average on every trait."
    messaging = [MSG_HIGH[t] for t in high] + [MSG_LOW[t] for t in low]
    return {
        "id": seg["id"],
        "name": name,
        "description": desc,
        "high": high,
        "low": low,
        "messaging": messaging,
        "share": seg["share"],
        "center_raw": seg["center_raw"],
        "center_z": z,
    }
