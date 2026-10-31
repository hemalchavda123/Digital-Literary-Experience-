import assert from "node:assert"
import {
  parseQuizQuestionsFromText,
  SAMPLE_QUIZ_TEMPLATES,
} from "./quizTextParser"

console.log("Starting Quiz Text Parser Tests...\n")

// Test 1: Multiple Choice Questions
{
  const text = `
1. What is the capital of France?
A) Berlin
B) Madrid
C) Paris
D) Rome
Answer: C
Marks: 2

2. Which planet is closest to the Sun?
*A) Mercury
B) Venus
C) Earth
D) Mars
Marks: 1
`
  const result = parseQuizQuestionsFromText(text)
  assert.strictEqual(result.questions.length, 2, "Should parse 2 MCQ questions")

  const q1 = result.questions[0]
  assert.strictEqual(q1.type, "MULTIPLE_CHOICE")
  assert.strictEqual(q1.questionText, "What is the capital of France?")
  assert.deepStrictEqual(q1.options, ["Berlin", "Madrid", "Paris", "Rome"])
  assert.strictEqual(q1.correctAnswer, "C")
  assert.strictEqual(q1.marks, 2)
  assert.strictEqual(q1.isPublished, true)

  const q2 = result.questions[1]
  assert.strictEqual(q2.type, "MULTIPLE_CHOICE")
  assert.strictEqual(q2.questionText, "Which planet is closest to the Sun?")
  assert.strictEqual(q2.correctAnswer, "A")
  assert.strictEqual(q2.marks, 1)

  console.log("✓ Test 1 Passed: Standard MCQ parsing with Answer line and asterisk")
}

// Test 2: One Word Questions
{
  const text = `
1. What is the powerhouse of the cell?
Type: One Word
Answer: Mitochondria
Marks: 2

2. Fill in the blank: The symbol for gold on the periodic table is ____.
Answer: Au
`
  const result = parseQuizQuestionsFromText(text)
  assert.strictEqual(result.questions.length, 2, "Should parse 2 One Word questions")

  const q1 = result.questions[0]
  assert.strictEqual(q1.type, "ONE_WORD")
  assert.strictEqual(q1.questionText, "What is the powerhouse of the cell?")
  assert.strictEqual(q1.correctAnswer, "Mitochondria")
  assert.strictEqual(q1.marks, 2)

  const q2 = result.questions[1]
  assert.strictEqual(q2.type, "ONE_WORD")
  assert.strictEqual(q2.correctAnswer, "Au")
  assert.strictEqual(q2.marks, 1)

  console.log("✓ Test 2 Passed: One Word and Fill in the blank parsing")
}

// Test 3: Short Answer Questions
{
  const text = `
1. Describe the key differences between mitosis and meiosis.
Type: Short Answer
Marks: 5
Answer: Mitosis produces two identical cells, whereas meiosis produces four diverse gametes.

2. [Short Answer] Explain the water cycle in your own words. (3 marks)
`
  const result = parseQuizQuestionsFromText(text)
  assert.strictEqual(result.questions.length, 2, "Should parse 2 Short Answer questions")

  const q1 = result.questions[0]
  assert.strictEqual(q1.type, "SHORT_ANSWER")
  assert.strictEqual(q1.marks, 5)
  assert.ok(q1.correctAnswer.includes("Mitosis produces"))

  const q2 = result.questions[1]
  assert.strictEqual(q2.type, "SHORT_ANSWER")
  assert.strictEqual(q2.marks, 3)
  assert.strictEqual(q2.questionText, "Explain the water cycle in your own words.")

  console.log("✓ Test 3 Passed: Short Answer with explicit type and bracketed marks")
}

// Test 4: Mixed Question Types in Single Text
{
  const mixedText = `
1. What is the primary language of the web?
A) Python
B) JavaScript
C) C++
Answer: B
Marks: 1

2. Name the largest ocean on Earth.
Type: One Word
Ans: Pacific Ocean
Marks: 1

3. Discuss the impact of the printing press on European society.
Type: Descriptive
Marks: 4
`
  const result = parseQuizQuestionsFromText(mixedText)
  assert.strictEqual(result.questions.length, 3, "Should parse 3 mixed questions")
  assert.strictEqual(result.summary.total, 3)
  assert.strictEqual(result.summary.multipleChoice, 1)
  assert.strictEqual(result.summary.oneWord, 1)
  assert.strictEqual(result.summary.shortAnswer, 1)

  assert.strictEqual(result.questions[0].type, "MULTIPLE_CHOICE")
  assert.strictEqual(result.questions[1].type, "ONE_WORD")
  assert.strictEqual(result.questions[2].type, "SHORT_ANSWER")

  console.log("✓ Test 4 Passed: Mixed question types parsed accurately with summary stats")
}

// Test 5: Answer matching by option text
{
  const text = `
1. What is the boiling point of water?
A. 90 C
B. 100 C
C. 110 C
Answer: 100 C
`
  const result = parseQuizQuestionsFromText(text)
  assert.strictEqual(result.questions.length, 1)
  assert.strictEqual(result.questions[0].correctAnswer, "B", "Should match '100 C' to option B")

  console.log("✓ Test 5 Passed: Answer matching by option text value")
}

// Test 6: Check draft status and warnings
{
  const text = `
1. Incomplete multiple choice question
A) Only one option
Status: Draft
`
  const result = parseQuizQuestionsFromText(text)
  assert.strictEqual(result.questions.length, 1)
  assert.strictEqual(result.questions[0].isPublished, false, "Should be draft")
  assert.ok(result.warnings.length > 0, "Should contain warning for < 2 options")

  console.log("✓ Test 6 Passed: Draft status and warning flags")
}

// Test 7: Verify all pre-defined SAMPLE_QUIZ_TEMPLATES parse without throwing
{
  for (const [key, tpl] of Object.entries(SAMPLE_QUIZ_TEMPLATES)) {
    const res = parseQuizQuestionsFromText(tpl)
    assert.ok(res.questions.length > 0, `Template ${key} should parse questions`)
  }
  console.log("✓ Test 7 Passed: All sample templates parse valid questions")
}

console.log("\nAll Quiz Text Parser Tests Passed Successfully! 🎉")
