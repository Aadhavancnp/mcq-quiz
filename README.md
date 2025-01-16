# MCQ Test Application

## Project Overview

This project aims to develop a web application for conducting Multiple Choice Question (MCQ) tests. The application will allow users to log in, select a test, answer questions, and receive immediate feedback on their performance.

## Problem Statement

Existing MCQ test platforms often lack interactivity, personalized feedback, and efficient question management. This project addresses these limitations by providing a user-friendly interface, instant feedback mechanisms, and a robust system for managing questions and tests.

## Requirements

**Functional Requirements:**

1. **User Authentication:** Users should be able to log in securely.
2. **Test Selection:** Users should be able to choose from a list of available tests.
3. **Question Display:** Questions should be displayed clearly with multiple-choice options.
4. **Answer Submission:** Users should be able to submit their answers.
5. **Immediate Feedback:** Users should receive immediate feedback on their answers.
6. **Test Completion:** Users should be notified upon completing a test and view their score.
7. **Question Management:** (Optional) Administrators should be able to add, edit, and delete questions.

**Non-Functional Requirements:**

1. **User-Friendly Interface:** The application should be intuitive and easy to navigate.
2. **Responsiveness:** The application should be responsive across different devices.
3. **Security:** User data and test content should be protected.
4. **Performance:** The application should load quickly and respond efficiently to user interactions.

## Priority

The features are prioritized as follows:

**High Priority:** User authentication, test selection, question display, answer submission, immediate feedback, test completion.
**Medium Priority:** Question management (optional).
**Low Priority:** Advanced features like analytics, time limits, and adaptive testing.

This prioritization ensures that the core functionality of the MCQ test application is delivered first, followed by optional features and enhancements.

## Expected Deliverables

1. **Functional Web Application:** A fully functional web application meeting the requirements outlined above.
2. **Source Code:** Well-structured and documented source code.
3. **User Documentation:** Clear instructions on how to use the application.
4. **Deployment Guide:** Instructions for deploying the application.





## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
