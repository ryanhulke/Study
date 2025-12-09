from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...db import get_session
from ...models import Deck, Card, ReviewLog, SchedulingState
from ...schemas import DeckCreate, DeckRead

router = APIRouter(prefix="/api", tags=["decks"])


@router.get("/decks", response_model=List[DeckRead])
def list_decks(
    session: Session = Depends(get_session),
) -> List[DeckRead]:
    decks = session.exec(select(Deck).order_by(Deck.name)).all()
    return [
        DeckRead(id=d.id, name=d.name, description=d.description)
        for d in decks
    ]


@router.post("/decks", response_model=DeckRead)
def create_deck(
    deck_in: DeckCreate,
    session: Session = Depends(get_session),
) -> DeckRead:
    stmt = select(Deck).where(Deck.name == deck_in.name)
    existing = session.exec(stmt).first()
    if existing is not None:
        raise HTTPException(
            status_code=400, detail="Deck with this name already exists"
        )

    deck = Deck(name=deck_in.name, description=deck_in.description)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return DeckRead(id=deck.id, name=deck.name, description=deck.description)

@router.delete("/decks/{deck_id}")
def delete_deck(
    deck_id: int,
    session: Session = Depends(get_session),
) -> dict:
    deck = session.get(Deck, deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    cards = session.exec(select(Card).where(Card.deck_id == deck_id)).all()
    for card in cards:
        sched_stmt = select(SchedulingState).where(
            SchedulingState.card_id == card.id
        )
        sched = session.exec(sched_stmt).first()
        if sched is not None:
            session.delete(sched)

        rev_stmt = select(ReviewLog).where(ReviewLog.card_id == card.id)
        revs = session.exec(rev_stmt).all()
        for r in revs:
            session.delete(r)

        session.delete(card)

    session.delete(deck)
    session.commit()
    return {"status": "deleted"}