// Open Trivia Database subset, CC BY-SA 4.0. See snapshot for attribution and changes.
import snapshot from '../../public/trivia-data/history-opentdb.json';
import type { LocalQuestion } from './trivia-local';
export const HISTORY_CATEGORY_ID=-15;
export const HISTORY_QUESTIONS=snapshot.questions as LocalQuestion[];
