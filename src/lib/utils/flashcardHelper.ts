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
const SM_DELIMITER = '---SUMMARY---';

export function parseNoteContent(fullText: string): { 
  textContent: string; 
  flashcards: Flashcard[];
  mindmap: MindmapNode | null;
  summary: string;
} {
  if (!fullText) {
    return { textContent: '', flashcards: [], mindmap: null, summary: '' };
  }

  // Extract mindmap block
  let textAndFcAndSm = fullText;
  let mindmap: MindmapNode | null = null;
  const mmParts = fullText.split(MM_DELIMITER);
  if (mmParts.length >= 2) {
    textAndFcAndSm = mmParts[0];
    try {
      mindmap = JSON.parse(mmParts[1].trim());
    } catch (e) {
      console.error('Failed to parse mindmap JSON:', e);
    }
  }

  // Extract flashcards block
  let textAndSm = textAndFcAndSm;
  let flashcards: Flashcard[] = [];
  const fcParts = textAndFcAndSm.split(FC_DELIMITER);
  textAndSm = fcParts[0].trim();
  if (fcParts.length >= 2) {
    try {
      flashcards = JSON.parse(fcParts[1].trim());
    } catch (e) {
      console.error('Failed to parse flashcards JSON:', e);
    }
  }

  // Extract summary block
  let textContent = textAndSm;
  let summary = '';
  const smParts = textAndSm.split(SM_DELIMITER);
  textContent = smParts[0].trim();
  if (smParts.length >= 2) {
    summary = smParts[1].trim();
  }

  return { textContent, flashcards, mindmap, summary };
}

export function serializeNoteContent(
  textContent: string, 
  flashcards: Flashcard[], 
  mindmap: MindmapNode | null = null,
  summary: string | null = null
): string {
  let result = textContent.trim();
  if (summary) {
    result += `\n\n${SM_DELIMITER}\n${summary.trim()}`;
  }
  if (flashcards && flashcards.length > 0) {
    result += `\n\n${FC_DELIMITER}\n${JSON.stringify(flashcards, null, 2)}`;
  }
  if (mindmap) {
    result += `\n\n${MM_DELIMITER}\n${JSON.stringify(mindmap, null, 2)}`;
  }
  return result;
}
