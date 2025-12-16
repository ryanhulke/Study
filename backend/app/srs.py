from datetime import date, datetime, timedelta
from .models import Card, SchedulingState

def initialize_scheduling_state(card: Card) -> SchedulingState:
    today = date.today()
    return SchedulingState(
        card_id=card.id,
        due=today,
        interval=0,
        ease_factor=2.5,
        repetitions=0,
        lapses=0,
    )

def map_quality_to_sm2_grade(quality: int) -> int:

    mapping = {
        1: 0, # again
        2: 3, # hard
        3: 4, # good
        4: 5,  # easy
    }
    return mapping[quality]

def update_schedule_for_review(
    state: SchedulingState,
    quality: int,
    review_time: datetime,
    min_ease: float = 1.3,
) -> None:
    """
    Update the scheduling state given a review quality (1-4)

    Quality (from the UI):
        1 = again - failed recall
        2 = hard - correct, but very difficult
        3 = good - correct, acceptable difficulty
        4 = easy - correct, very easy
    """
    today = review_time.date()
    days_since_due = (today - state.due).days
    days_overdue = max(0, days_since_due)

    if quality == 1:
        if state.repetitions > 0 or state.interval > 0:
            state.lapses += 1

        state.repetitions = 0
        state.ease_factor = max(min_ease, state.ease_factor - 0.15)
        state.interval = 1
        state.due = today + timedelta(days=state.interval)
        return

    grade = map_quality_to_sm2_grade(quality)

    ef = state.ease_factor
    ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    if ef < min_ease:
        ef = min_ease
    state.ease_factor = ef

    # successful repetition count
    state.repetitions += 1

    previous_interval = max(1, state.interval) # treat 0 as 1 for new cards
    effective_interval = previous_interval + days_overdue

    if state.repetitions == 1:
        new_interval = 1
    elif state.repetitions == 2:
        if quality == 2:  # Hard
            new_interval = 3
        elif quality == 3:  # Good
            new_interval = 6
        else:  # Easy
            new_interval = 8
    else:
        # for 3+ repetitions, grow intervals based on ease and button choice
        if quality == 2:
            button_factor = 1.2
        elif quality == 3:
            button_factor = 1.0
        else:  # quality == 4
            button_factor = 1.3

        new_interval = int(round(effective_interval * state.ease_factor * button_factor))
        if new_interval < 1:
            new_interval = 1

    state.interval = new_interval
    state.due = today + timedelta(days=state.interval)
