// src/views/ReviewView.tsx
import React, { useEffect, useState } from "react";
import {
  getReviewSummary,
  getNextReviewCard,
  answerReview,
  listDecks,
  fetchPracticeCards
} from "../api";
import type { ReviewCard, Deck, PracticeCard, PracticePool } from "../types";
import { RenderMath } from "../components/RenderMath";
import { PracticeSession } from "../components/PracticeSession";

const ratingLabels: { label: string; value: number; className?: string }[] = [
  { label: "Again", value: 1, className: "danger" },
  { label: "Hard", value: 2 },
  { label: "Good", value: 3, className: "primary" },
  { label: "Easy", value: 4 }
];

export const ReviewView: React.FC = () => {
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [currentCard, setCurrentCard] = useState<ReviewCard | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Practice mode state
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [practiceDeckId, setPracticeDeckId] = useState<number | "">("");
  const [practicePool, setPracticePool] =
    useState<PracticePool>("due_recent");
  const [practiceLimit, setPracticeLimit] = useState<number>(30);
  const [practiceCards, setPracticeCards] = useState<PracticeCard[] | null>(
    null
  );

  async function refreshSummary() {
    try {
      const summary = await getReviewSummary();
      setDueCount(summary.due_count);
    } catch (e) {
      setError(`Failed to load summary: ${(e as Error).message}`);
    }
  }

  async function loadNextCard() {
    setLoadingCard(true);
    setError(null);
    setShowBack(false);
    try {
      const card = await getNextReviewCard();
      setCurrentCard(card);
      await refreshSummary();
    } catch (e) {
      setError(`Failed to load next card: ${(e as Error).message}`);
    } finally {
      setLoadingCard(false);
    }
  }

  async function handleAnswer(rating: number) {
    if (!currentCard) return;
    setError(null);
    try {
      await answerReview(currentCard.card_id, rating, 0);
      await loadNextCard();
    } catch (e) {
      setError(`Failed to submit review: ${(e as Error).message}`);
    }
  }

  async function ensureDecksLoaded() {
    if (decks.length > 0) return;
    try {
      const allDecks = await listDecks();
      setDecks(allDecks);
    } catch (e) {
      console.error(e);
      setError(`Failed to load decks: ${(e as Error).message}`);
    }
  }

  function openPracticeConfig() {
    setShowPracticeConfig(true);
    ensureDecksLoaded().catch(() => undefined);
  }

  async function startPractice() {
    if (!practiceDeckId || typeof practiceDeckId !== "number") return;
    setError(null);
    try {
      const cards = await fetchPracticeCards({
        deckId: practiceDeckId,
        pool: practicePool,
        limit: practiceLimit
      });
      if (cards.length === 0) {
        setError("No cards found for this practice configuration.");
        return;
      }
      setPracticeCards(cards);
      setShowPracticeConfig(false);
    } catch (e) {
      setError(`Failed to load practice cards: ${(e as Error).message}`);
    }
  }

  function exitPractice() {
    setPracticeCards(null);
  }

  useEffect(() => {
    refreshSummary().catch(() => undefined);
  }, []);

  // If we are in practice mode, render only the practice session
  if (practiceCards) {
    const deckName =
      decks.find((d) => d.id === practiceDeckId)?.name ?? "Deck";
    return (
      <PracticeSession
        cards={practiceCards}
        deckName={deckName}
        onDone={exitPractice}
      />
    );
  }

  return (
    <div className="card">
      <h2>Today</h2>
      <p>
        Due cards:{" "}
        <strong>{dueCount !== null ? dueCount : "loading..."}</strong>
      </p>
      <div className="button-row" style={{ marginBottom: "0.75rem" }}>
        <button
          className="button primary"
          onClick={loadNextCard}
          disabled={loadingCard}
        >
          {currentCard ? "Next card" : "Start review"}
        </button>
        <button
          className="button"
          onClick={openPracticeConfig}
          disabled={loadingCard}
        >
          Practice a deck
        </button>
      </div>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: "0.85rem" }}>{error}</p>
      )}

      {loadingCard && <p>Loading card...</p>}

      {!loadingCard && !currentCard && dueCount === 0 && (
        <p>Nothing due right now. You are done for today.</p>
      )}

      {!loadingCard && !currentCard && dueCount !== null && dueCount > 0 && (
        <p>Click “Start review” to begin.</p>
      )}

      {currentCard && (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              padding: "1rem",
              backgroundColor: "#f9fafb"
            }}
          >
            <div style={{ marginBottom: "0.75rem" }}>
              <div className="badge">
                Deck {currentCard.deck_id} · Card {currentCard.card_id}
              </div>
            </div>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Front</h3>
              <RenderMath text={currentCard.front} />
            </div>
            {showBack && (
              <div style={{ marginTop: "0.75rem" }}>
                <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Back</h3>
                <RenderMath text={currentCard.back} />
              </div>
            )}
          </div>

          {!showBack ? (
            <div className="button-row" style={{ marginTop: "0.75rem" }}>
              <button
                className="button primary"
                onClick={() => setShowBack(true)}
              >
                Show answer
              </button>
            </div>
          ) : (
            <div className="button-row" style={{ marginTop: "0.75rem" }}>
              {ratingLabels.map((r) => (
                <button
                  key={r.value}
                  className={
                    "button small" + (r.className ? " " + r.className : "")
                  }
                  onClick={() => handleAnswer(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showPracticeConfig && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Practice session</h3>

            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem" }}>Deck</label>
              <select
                className="input"
                value={practiceDeckId}
                onChange={(e) => {
                  const val = e.target.value;
                  setPracticeDeckId(val ? Number(val) : "");
                }}
              >
                <option value="">Select deck...</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem" }}>Card pool</label>
              <select
                className="input"
                value={practicePool}
                onChange={(e) =>
                  setPracticePool(e.target.value as PracticePool)
                }
              >
                <option value="due_recent">Due + recent</option>
                <option value="all">All cards in deck</option>
                <option value="new_only">Only new cards</option>
              </select>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem" }}>Number of cards</label>
              <input
                type="number"
                className="input"
                min={5}
                max={200}
                value={practiceLimit}
                onChange={(e) => setPracticeLimit(Number(e.target.value))}
              />
            </div>

            <p style={{ fontSize: "0.8rem", color: "#4b5563", marginTop: 8 }}>
              Practice mode does not change your spaced repetition schedule.
            </p>

            <div className="button-row" style={{ marginTop: "0.75rem" }}>
              <button
                className="button small"
                onClick={() => setShowPracticeConfig(false)}
              >
                Cancel
              </button>
              <button
                className="button small primary"
                onClick={startPractice}
                disabled={!practiceDeckId}
              >
                Start practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
