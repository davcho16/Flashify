/**
 * CreateFlashcards component.
 * Handles creation (or editing) of flashcard decks.
 * @param {Object} props - Component props.
 * @param {boolean} props.opened - Whether the modal is open.
 * @param {Function} props.onClose - Function to close the modal.
 * @param {Object} [props.subject] - The subject for the new deck.
 * @param {Function} props.onSubmit - Callback after deck creation.
 * @param {Object} [props.editDeck] - If set, deck is being edited.
 * @returns {JSX.Element} The CreateFlashcards modal.
 */
import { useState, useContext, useEffect } from 'react';
import { Modal, Container, Group, Card, Text, Button, TextInput } from '@mantine/core';
import classes from '../css/CreateFlashcards.module.css';
import { UserContext } from '../../../App';

export default function CreateFlashcards({ opened, onClose, subject, onSubmit, editDeck }) {
  const { username } = useContext(UserContext);
  const [deckTitle, setDeckTitle] = useState('');
  const [flashcardsData, setFlashcardsData] = useState([{ front: '', back: '' }]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = flashcardsData[currentCardIndex];

  useEffect(() => {
    if (editDeck) {
      setDeckTitle(editDeck.title);
      setFlashcardsData(
        editDeck.cards.map(card => ({
          _id: card._id,
          front: card.front,
          back: card.back,
        }))
      );
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } else {
      setDeckTitle('');
      setFlashcardsData([{ front: '', back: '' }]);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
  }, [editDeck]);

  /**
   * Toggles the flip state of the current card.
   */
  const handleFlip = () => setIsFlipped((prev) => !prev);

  /**
   * Moves to the previous card in the deck.
   */
  const handlePrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  /**
   * Moves to the next card in the deck.
   */
  const handleNext = () => {
    if (currentCardIndex < flashcardsData.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  /**
   * Adds a new flashcard to the deck.
   */
  const handleAddFlashcard = () => {
    setFlashcardsData([...flashcardsData, { front: '', back: '' }]);
    setCurrentCardIndex(flashcardsData.length);
    setIsFlipped(false);
  };

  /**
   * Deletes the current flashcard from the deck.
   */
  const handleDeleteCard = async () => {
    const cardToDelete = flashcardsData[currentCardIndex];
  
    if (!cardToDelete._id) return;
  
    const confirm = window.confirm("Are you sure you want to delete this card?");
    if (!confirm) return;
  
    try {
      await fetch(`http://localhost:4000/api/card/${cardToDelete._id}`, {
        method: "DELETE",
      });
  
      const updated = [...flashcardsData];
      updated.splice(currentCardIndex, 1);
  
      setFlashcardsData(updated.length > 0 ? updated : [{ front: "", back: "" }]);
      setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
      setIsFlipped(false);
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      alert("Failed to delete flashcard.");
    }
  };

  /**
   * Updates the front text of the current card.
   * @param {Object} e - Event object.
   */
  const handleChangeFront = (e) => {
    const updated = [...flashcardsData];
    updated[currentCardIndex].front = e.target.value;
    setFlashcardsData(updated);
  };

  /**
   * Updates the back text of the current card.
   * @param {Object} e - Event object.
   */
  const handleChangeBack = (e) => {
    const updated = [...flashcardsData];
    updated[currentCardIndex].back = e.target.value;
    setFlashcardsData(updated);
  };

  /**
   * Collects all valid flashcards (non-empty front and back).
   * @returns {Array} Array of valid flashcards.
   */
  const collectFlashcards = () => {
    return flashcardsData.filter(card => card.front.trim() && card.back.trim());
  };

  /**
   * Handles the submission of the deck and its flashcards.
   */
  const handleSubmit = async () => {
    if (!deckTitle.trim()) {
      alert("Deck title is required!");
      return;
    }

    const collectedFlashcards = collectFlashcards();
    if (collectedFlashcards.length === 0) {
      alert("At least one flashcard is required!");
      return;
    }

    try {
      let deckId;

      if (editDeck) {
        const updateDeckRes = await fetch(`http://localhost:4000/api/deck/${editDeck._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: deckTitle }),
        });

        if (!updateDeckRes.ok) throw new Error("Failed to update deck");
        deckId = editDeck.deck_id;
      } else {
        const deckRes = await fetch("http://localhost:4000/api/deck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            title: deckTitle,
            subject_id: subject.id,
          }),
        });

        if (!deckRes.ok) throw new Error("Failed to create deck");
        const data = await deckRes.json();
        deckId = data.deck.deck_id;
      }

      const cardPromises = collectedFlashcards.map((card) => {
        if (card._id) {
          return fetch(`http://localhost:4000/api/card/${card._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              front: card.front,
              back: card.back,
            }),
          });
        } else {
          return fetch("http://localhost:4000/api/card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              deck_id: deckId,
              front: card.front,
              back: card.back,
            }),
          });
        }
      });

      await Promise.all(cardPromises);

      alert(editDeck ? "Deck updated!" : "Deck and flashcards saved!");

      setDeckTitle('');
      setFlashcardsData([{ front: '', back: '' }]);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      onSubmit();
    } catch (error) {
      console.error("Error saving deck and flashcards:", error);
      alert("Error saving deck and flashcards. Please try again.");
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editDeck ? "Edit Flashcard Deck" : "Create Flashcard Deck"}
      size="xl"
      overlayOpacity={0.55}
      overlayBlur={3}
      centered
      className={classes.modal}
    >
      <Container className={classes.container}>
        {/* Deck Title */}
        <TextInput
          label="Deck Title"
          placeholder="Enter deck title"
          value={deckTitle}
          onChange={(e) => setDeckTitle(e.target.value)}
          className={classes.titleInput}
        />

        <Group position="apart" className={classes.infoGroup}>
          <Text>Flashcard: {currentCardIndex + 1}/{flashcardsData.length}</Text>
        </Group>

        <Group position="center" className={classes.cardGroup}>
          <Card className={classes.card} onClick={handleFlip}>
            <Text className={classes.text}>
              {isFlipped
                ? currentCard.back || 'Back side is empty'
                : currentCard.front || 'Front side is empty'}
            </Text>
          </Card>
        </Group>

        <Group position="center" className={classes.buttonGroup}>
          <Button className={classes.button} onClick={handleFlip}>Flip</Button>
        </Group>

        <Group direction="column" className={classes.inputGroup}>
          <TextInput
            label="Front"
            placeholder="Enter front text"
            value={currentCard.front}
            onChange={handleChangeFront}
          />
          <TextInput
            label="Back"
            placeholder="Enter back text"
            value={currentCard.back}
            onChange={handleChangeBack}
          />
        </Group>

        <Group position="apart" className={classes.navGroup}>
          <Button className={classes.button} onClick={handlePrev} disabled={currentCardIndex === 0}>
            Previous
          </Button>
          <Button
            className={classes.button}
            onClick={handleNext}
            disabled={currentCardIndex === flashcardsData.length - 1}
          >
            Next
          </Button>
          <Button className={classes.button} onClick={handleAddFlashcard}>
            Add Flashcard
          </Button>

          {flashcardsData[currentCardIndex]?._id && (
          <Button
            className={classes.button}
            color="red"
            variant="filled"
            onClick={handleDeleteCard}
          >
            Delete Flashcard
          </Button>
        )}
        </Group>
        <Group position="center" className={classes.saveGroup}>
          <Button className={classes.button} onClick={handleSubmit}>
            Save Deck
          </Button>
        </Group>
      </Container>
    </Modal>
  );
}
