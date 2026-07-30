/**
 * Field Notebook chrome (U-006) — observer UI over answerNotebook.
 * Starts closed so curiosity can precede explanation (U-004).
 */

import {
  formatNotebookAnswer,
  NOTEBOOK_QUESTIONS,
} from "../notebook/FieldNotebook";
import type { NotebookAnswer, NotebookQuestionId } from "../notebook/types";

export type NotebookChromeState = {
  open: boolean;
  question: NotebookQuestionId;
  answer: NotebookAnswer | null;
};

/** DOM affordance: question buttons + answer body. */
export function mountNotebookChrome(parent: HTMLElement): {
  setState: (state: NotebookChromeState) => void;
  root: HTMLElement;
  onQuestion: (handler: (id: NotebookQuestionId) => void) => void;
} {
  const root = document.createElement("div");
  root.id = "field-notebook";
  root.setAttribute("aria-label", "Field Notebook");
  root.hidden = true;

  const title = document.createElement("div");
  title.className = "field-notebook-title";
  title.textContent = "Field Notebook";

  const questions = document.createElement("div");
  questions.className = "field-notebook-questions";
  questions.setAttribute("role", "group");
  questions.setAttribute("aria-label", "Notebook questions");

  let questionHandler: ((id: NotebookQuestionId) => void) | null = null;
  const buttons = new Map<NotebookQuestionId, HTMLButtonElement>();

  for (const q of NOTEBOOK_QUESTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = q.label;
    btn.dataset.question = q.id;
    btn.addEventListener("click", () => {
      questionHandler?.(q.id);
    });
    questions.appendChild(btn);
    buttons.set(q.id, btn);
  }

  const body = document.createElement("div");
  body.className = "field-notebook-body";
  body.setAttribute("aria-live", "polite");

  root.append(title, questions, body);
  parent.appendChild(root);

  return {
    root,
    onQuestion(handler) {
      questionHandler = handler;
    },
    setState(state) {
      root.hidden = !state.open;
      if (!state.open) return;
      for (const [id, btn] of buttons) {
        btn.classList.toggle("active", id === state.question);
      }
      if (!state.answer) {
        body.textContent = "Ask a question after you have noticed something.";
        return;
      }
      body.textContent = formatNotebookAnswer(state.answer);
    },
  };
}

/** Tier-P proxy: notebook open with a non-empty formatted answer. */
export function notebookChromePresent(state: NotebookChromeState): boolean {
  if (!state.open || !state.answer) return false;
  return formatNotebookAnswer(state.answer).trim().length > 0;
}
