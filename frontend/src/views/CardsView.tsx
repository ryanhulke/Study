import React, { useEffect, useState } from "react";
import { createDeck, deleteDeck, listDecks, listCards, deleteCard } from "../api";
import type { Deck, Card } from "../types";

export const CardsView: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const ds = await listDecks();
        setDecks(ds);
        if (ds.length > 0) {
          setSelectedDeckId(ds[0].id);
        }
      } catch (e) {
        setError(`Failed to load decks: ${(e as Error).message}`);
      }
    }
    init().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (selectedDeckId == null) {
      setCards([]);
      return;
    }
    async function loadCards() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const cs = await listCards(selectedDeckId ?? undefined);
        setCards(cs);
      } catch (e) {
        setError(`Failed to load cards: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    }
    loadCards().catch(() => undefined);
  }, [selectedDeckId]);

  async function handleDelete(cardId: number) {
    setError(null);
    setMessage(null);
    try {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setMessage(`Deleted card ${cardId}.`);
    } catch (e) {
      setError(`Failed to delete card: ${(e as Error).message}`);
    }
  }
    async function handleCreateDeck() {
    const name = newDeckName.trim();
    if (!name) {
      setError("Please enter a deck name.");
      return;
    }

    setError(null);
    setMessage(null);
    setCreatingDeck(true);
    try {
      const deck = await createDeck(name);
      setDecks((prev) => {
        const updated = [...prev, deck].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        return updated;
      });
      setSelectedDeckId(deck.id);
      setNewDeckName("");
      setMessage(`Created deck "${deck.name}".`);
    } catch (e) {
      setError(`Failed to create deck: ${(e as Error).message}`);
    } finally {
      setCreatingDeck(false);
    }
  }

  async function handleDeleteDeck() {
    if (selectedDeckId == null) {
      setError("Please select a deck to delete.");
      return;
    }

    const deckToDelete = decks.find((d) => d.id === selectedDeckId);
    setError(null);
    setMessage(null);
    setDeletingDeck(true);
    try {
      await deleteDeck(selectedDeckId);
      const filteredDecks = decks.filter((d) => d.id !== selectedDeckId);
      setDecks(filteredDecks);
      setSelectedDeckId(filteredDecks.length ? filteredDecks[0].id : null);
      setCards([]);
      if (deckToDelete) {
        setMessage(`Deleted deck "${deckToDelete.name}".`);
      } else {
        setMessage(`Deleted deck ${selectedDeckId}.`);
      }
    } catch (e) {
      setError(`Failed to delete deck: ${(e as Error).message}`);
    } finally {
      setDeletingDeck(false);
    }
  }
  return (
    <div className="card">
      <h2>Cards</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "0.75rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem" }}>
            Deck{" "}
            <select
              className="select"
              value={selectedDeckId ?? ""}
              onChange={(e) =>
                setSelectedDeckId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">Select deck</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button small danger"
            onClick={handleDeleteDeck}
            disabled={selectedDeckId == null || deletingDeck}
          >
            {deletingDeck ? "Deleting..." : "Delete deck"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "0.5rem"
          }}
        >
          <label style={{ fontSize: "0.85rem" }}>
            New deck
            <input
              type="text"
              className="input"
              placeholder="Deck name"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              style={{ marginTop: "0.25rem", minWidth: "12rem" }}
            />
          </label>
          <button
            className="button small"
            onClick={handleCreateDeck}
            disabled={creatingDeck}
          >
            {creatingDeck ? "Creating..." : "Create deck"}
          </button>
        </div>
      </div>

      {loading && <p>Loading cards...</p>}
      {error && (
        <p style={{ color: "#fca5a5", fontSize: "0.85rem" }}>{error}</p>
      )}
      {message && (
        <p style={{ color: "#34d399", fontSize: "0.85rem" }}>{message}</p>
      )}

      {!loading && !cards.length && selectedDeckId != null && (
        <p style={{ fontSize: "0.9rem" }}>
          This deck currently has no cards.
        </p>
      )}

      {!loading && cards.length > 0 && (
        <div className="list">
          {cards.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #3d3d3dff",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.6rem",
                marginBottom: "0.4rem",
                backgroundColor: "#404040ff"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.25rem"
                }}
              >
                <div style={{ fontSize: "0.8rem" }}>
                  Card {c.id} · Deck {c.deck_id}
                </div>
                <button
                  className="button small danger"
                  onClick={() => handleDelete(c.id)}
                >
                  Delete
                </button>
              </div>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <strong>Front:</strong>{" "}
                <span style={{ whiteSpace: "pre-wrap" }}>{c.front}</span>
              </div>
              <div style={{ fontSize: "0.85rem" }}>
                <strong>Back:</strong>{" "}
                <span style={{ whiteSpace: "pre-wrap" }}>{c.back}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
