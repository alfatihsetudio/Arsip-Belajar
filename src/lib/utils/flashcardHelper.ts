export interface Flashcard {
  q: string;
  a: string;
}

export interface MindmapNode {
  name: string;
  children?: MindmapNode[];
}

const FC_DELIMITER = '---FLASHCARDS---';
const MM_DELIMITER = '---MINDMAP---';

export function parseNoteContent(fullText: string): { 
  textContent: string; 
  flashcards: Flashcard[];
  mindmap: MindmapNode | null;
} {
  if (!fullText) {
    return { textContent: '', flashcards: [], mindmap: null };
  }

  // Extract mindmap block
  let textAndFc = fullText;
  let mindmap: MindmapNode | null = null;
  const mmParts = fullText.split(MM_DELIMITER);
  if (mmParts.length >= 2) {
    textAndFc = mmParts[0];
    try {
      mindmap = JSON.parse(mmParts[1].trim());
    } catch (e) {
      console.error('Failed to parse mindmap JSON:', e);
    }
  }

  // Extract flashcards block
  let textContent = textAndFc;
  let flashcards: Flashcard[] = [];
  const fcParts = textAndFc.split(FC_DELIMITER);
  textContent = fcParts[0].trim();
  if (fcParts.length >= 2) {
    try {
      flashcards = JSON.parse(fcParts[1].trim());
    } catch (e) {
      console.error('Failed to parse flashcards JSON:', e);
    }
  }

  return { textContent, flashcards, mindmap };
}

export function serializeNoteContent(
  textContent: string, 
  flashcards: Flashcard[], 
  mindmap: MindmapNode | null = null
): string {
  let result = textContent.trim();
  if (flashcards && flashcards.length > 0) {
    result += `\n\n${FC_DELIMITER}\n${JSON.stringify(flashcards, null, 2)}`;
  }
  if (mindmap) {
    result += `\n\n${MM_DELIMITER}\n${JSON.stringify(mindmap, null, 2)}`;
  }
  return result;
}
