import { Question } from "@/types/Question";

export const questions: Question[] = [
  {
    id: 1,
    question: "What is the correct syntax to output 'Hello World' in Python?",
    options: [
      'echo "Hello World"',
      'print("Hello World")',
      'console.log("Hello World")',
      'System.out.println("Hello World")',
    ],
    answer: 1,
  },
  {
    id: 2,
    question: "Which of these is a mutable data type in Python?",
    options: ["List", "Tuple", "String", "Integer"],
    answer: 0,
  },
  {
    id: 3,
    question: "What does the 'in' operator do in Python?",
    options: [
      "Checks if a value is present in a sequence",
      "Performs addition",
      "Performs subtraction",
      "Defines a class",
    ],
    answer: 0,
  },
  {
    id: 4,
    question: "What is the purpose of a 'for' loop in Python?",
    options: [
      "To iterate over a sequence",
      "To define a function",
      "To handle exceptions",
      "To create a class",
    ],
    answer: 0,
  },
  {
    id: 5,
    question: "Which keyword is used to define a function in Python?",
    options: ["function", "def", "procedure", "method"],
    answer: 1,
  },
];
