import unicodedata
from typing import Optional


def validate_human_name(
    v: Optional[str],
    field_label: str = "Name",
    min_length: int = 2,
    max_length: int = 150,
    required: bool = True,
) -> Optional[str]:
    """
    Validate that a name consists of genuine human letters across English,
    Hindi, Marathi, and other multilingual scripts.
    
    Rejects:
    - Numeric digits (ASCII 0-9, Devanagari ०-९, and all Unicode numerals)
    - Disallowed symbols (@, #, $, %, etc.)
    - Punctuation-only strings (---, -.-, ..., etc.)
    - Whitespace characters such as newlines (\n, \r) and tabs (\t)
    - Excessively short (< min_length) or long (> max_length) strings
    """
    if v is None:
        if required:
            raise ValueError(f"{field_label} is required.")
        return None

    if any(c in ('\n', '\r', '\t') for c in v):
        raise ValueError(f"{field_label} cannot contain newlines or tabs.")

    cleaned = v.strip()
    if len(cleaned) < min_length:
        raise ValueError(f"{field_label} must be at least {min_length} characters long.")

    if len(cleaned) > max_length:
        raise ValueError(f"{field_label} cannot exceed {max_length} characters.")

    if any(c.isdigit() or unicodedata.category(c) in ('Nd', 'Nl', 'No') for c in cleaned):
        raise ValueError(f"{field_label} must not contain numeric digits.")

    allowed_chars = {' ', '.', '-', "'"}
    for c in cleaned:
        cat = unicodedata.category(c)
        if cat.startswith('L') or cat.startswith('M') or c in allowed_chars:
            continue
        raise ValueError(f"{field_label} can only contain letters, spaces, hyphens, periods, and apostrophes.")

    if not any(unicodedata.category(c).startswith('L') for c in cleaned):
        raise ValueError(f"{field_label} must contain at least one letter.")

    return cleaned
