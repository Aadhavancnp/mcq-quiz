export interface TestState {
    currentQuestion: number;
    selectedAnswers: (number | null)[];
    timeRemaining: number;
    warnings: string;
}