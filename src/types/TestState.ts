import { Warning } from "./Warning";

export interface TestState {
    currentQuestion: number;
    selectedAnswers: (number | null)[];
    timeRemaining: number;
    warnings: Warning[];
}