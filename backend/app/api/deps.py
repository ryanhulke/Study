from sqlmodel import Session, select

from ..models import Deck


def ensure_default_deck(session: Session) -> Deck:
    stmt = select(Deck).where(Deck.name == "Default")
    deck = session.exec(stmt).first()
    if deck is None:
        deck = Deck(name="Default", description="Default deck")
        session.add(deck)
        session.commit()
        session.refresh(deck)
    return deck
