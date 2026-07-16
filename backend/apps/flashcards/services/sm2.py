"""SuperMemo-2 spaced repetition algorithm."""
from datetime import timedelta
from django.utils import timezone


def sm2(ease_factor: float, interval_days: int, repetitions: int, quality: int):
    """
    quality: 0-5 (0-2 = fail, 3-5 = pass)
    Returns (new_ease_factor, new_interval_days, new_repetitions)
    """
    if quality < 3:
        repetitions = 0
        interval_days = 1
    else:
        if repetitions == 0:
            interval_days = 1
        elif repetitions == 1:
            interval_days = 6
        else:
            interval_days = round(interval_days * ease_factor)
        repetitions += 1

    ease_factor = max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    return ease_factor, interval_days, repetitions


def next_review(interval_days: int):
    return timezone.now() + timedelta(days=interval_days)
