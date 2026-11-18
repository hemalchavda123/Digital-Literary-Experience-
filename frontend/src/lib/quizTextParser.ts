import type { QuestionType } from "../types/quiz"
 
export interface ParsedQuestion {
  type: QuestionType
  questionText: string
  options: string[]
  marks: number
  correctAnswer: string
  isPublished: boolean
  warning?: string
}

export interface ParseQuizResult {
  questions: ParsedQuestion[]
  summary: {
    total: number
    multipleChoice: number
    multipleCorrect: number
    oneWord: number
    shortAnswer: number
  }
  warnings: string[]
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const getAlphabetLabel = (index: number) => ALPHABET[index] || ""

/**
 * Normalizes user answer for Multiple Choice questions into a standard letter "A", "B", "C", etc.
 */
function normalizeMcqAnswer(rawAnswer: string, options: string[]): string {
  const trimmed = rawAnswer.trim()
  if (!trimmed) return ""

  // Case 1: Direct letter like "A", "b", "(C)", "[D]", "A)", "b."
  const letterMatch = trimmed.match(/^[\(\[\s]*([A-Za-z])[\)\]\.\s]*$/)
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase()
    const index = ALPHABET.indexOf(letter)
    if (index >= 0 && index < options.length) {
      return letter
    }
  }

  // Case 2: Number index like "1", "2", "(3)"
  const numMatch = trimmed.match(/^[\(\[\s]*(\d+)[\)\]\.\s]*$/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10) - 1
    if (num >= 0 && num < options.length) {
      return getAlphabetLabel(num)
    }
  }

  // Case 3: Phrase like "Option A" or "Choice B"
  const phraseMatch = trimmed.match(/^(?:option|choice)\s+([A-Za-z])$/i)
  if (phraseMatch) {
    const letter = phraseMatch[1].toUpperCase()
    const index = ALPHABET.indexOf(letter)
    if (index >= 0 && index < options.length) {
      return letter
    }
  }

  // Case 4: Answer text matches one of the option texts exactly (case-insensitive)
  const matchedIndex = options.findIndex(
    (opt) => opt.toLowerCase().trim() === trimmed.toLowerCase()
  )
  if (matchedIndex !== -1) {
    return getAlphabetLabel(matchedIndex)
  }

  // Fallback: If single letter anywhere at beginning e.g. "A - Paris"
  const prefixMatch = trimmed.match(/^([A-Za-z])[\s\-:]/)
  if (prefixMatch) {
    const letter = prefixMatch[1].toUpperCase()
    const index = ALPHABET.indexOf(letter)
    if (index >= 0 && index < options.length) {
      return letter
    }
  }

  return ""
}

interface DraftQuestion {
  rawQuestionNumber?: string
  explicitType?: QuestionType
  questionLines: string[]
  options: { label: string; text: string; isCorrect: boolean }[]
  marks?: number
  correctAnswer?: string
  isPublished: boolean
}

function createDraft(): DraftQuestion {
  return {
    questionLines: [],
    options: [],
    marks: undefined,
    correctAnswer: undefined,
    explicitType: undefined,
    isPublished: true,
  }
}

/**
 * Parses raw text containing multiple questions into structured quiz questions.
 * Supports:
 * - MULTIPLE_CHOICE (with A/B/C/D options, single marked answer or Answer: line)
 * - MULTIPLE_CORRECT (with A/B/C/D options, multiple marked correct answers)
 * - ONE_WORD (single word or fill in the blank questions)
 * - SHORT_ANSWER (open-ended or descriptive questions)
 */
export function parseQuizQuestionsFromText(inputText: string): ParseQuizResult {
  if (!inputText || !inputText.trim()) {
    return {
      questions: [],
      summary: { total: 0, multipleChoice: 0, multipleCorrect: 0, oneWord: 0, shortAnswer: 0 },
      warnings: [],
    }
  }

  const lines = inputText.replace(/\r\n/g, "\n").split("\n")
  const drafts: DraftQuestion[] = []
  let currentDraft: DraftQuestion | null = null
  let sawBlankLine = false

  const startNewDraft = (): DraftQuestion => {
    if (currentDraft) {
      drafts.push(currentDraft)
    }
    sawBlankLine = false
    return createDraft()
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    // Handle empty line
    if (!line) {
      if (
        currentDraft &&
        (currentDraft.questionLines.length > 0 || currentDraft.options.length > 0)
      ) {
        sawBlankLine = true
      }
      continue
    }

    // Check horizontal rule / separator: "---", "===", "***"
    if (/^[-=_*]{3,}$/.test(line)) {
      if (currentDraft) {
        currentDraft = startNewDraft()
      }
      continue
    }

    // Check Question Number Header: e.g. "1. ", "1) ", "Q1: ", "Question 1: ", "1 - "
    const qHeaderMatch = line.match(
      /^(?:Q(?:uestion)?\s*\d+[\.\:\)\-]?|\d+[\.\)\-])\s*(.*)$/i
    )
    // Check bracketed type prefix at start: e.g. "[MCQ] ...", "[One Word] ...", "[Short Answer] ..."
    const bracketTypeMatch = line.match(
      /^\[(mcq|multiple\s*choice|multiple\s*correct|multi\s*select|checkbox|one\s*word|single\s*word|fill\s*in\s*the\s*blank|short\s*answer|descriptive|essay)\]\s*(.*)$/i
    )

    if (qHeaderMatch || bracketTypeMatch) {
      currentDraft = startNewDraft()
      let text = qHeaderMatch ? qHeaderMatch[1].trim() : line

      // Extract bracket type if present
      const bMatch = text.match(
        /^\[(mcq|multiple\s*choice|multiple\s*correct|multi\s*select|checkbox|one\s*word|single\s*word|fill\s*in\s*the\s*blank|short\s*answer|descriptive|essay)\]\s*(.*)$/i
      )
      if (bMatch && currentDraft) {
        const typeStr = bMatch[1].toLowerCase()
        if (typeStr.includes("multi") && (typeStr.includes("correct") || typeStr.includes("select"))) {
          currentDraft.explicitType = "MULTIPLE_CORRECT"
        } else if (typeStr.includes("checkbox")) {
          currentDraft.explicitType = "MULTIPLE_CORRECT"
        } else if (typeStr.includes("choice") || typeStr.includes("mcq")) {
          currentDraft.explicitType = "MULTIPLE_CHOICE"
        } else if (
          typeStr.includes("one") ||
          typeStr.includes("single") ||
          typeStr.includes("fill") ||
          typeStr.includes("blank")
        ) {
          currentDraft.explicitType = "ONE_WORD"
        } else if (
          typeStr.includes("short") ||
          typeStr.includes("descriptive") ||
          typeStr.includes("essay")
        ) {
          currentDraft.explicitType = "SHORT_ANSWER"
        }
        text = bMatch[2].trim()
      }

      // Extract marks bracket if present: e.g. "(2 marks)", "[3 pts]", "(1 mark)"
      const marksMatch = text.match(
        /[\(\[]\s*(\d+(?:\.\d+)?)\s*(?:marks?|points?|pts?)\s*[\)\]]$/i
      )
      if (marksMatch && currentDraft) {
        currentDraft.marks = Math.max(1, Math.round(parseFloat(marksMatch[1])))
        text = text.replace(marksMatch[0], "").trim()
      }

      if (text && currentDraft) {
        currentDraft.questionLines.push(text)
      }
      continue
    }

    // If blank line was encountered after completing previous question's options/answer or full question
    if (
      sawBlankLine &&
      currentDraft &&
      (currentDraft.options.length > 0 || currentDraft.correctAnswer !== undefined)
    ) {
      currentDraft = startNewDraft()
    }

    if (!currentDraft) {
      currentDraft = startNewDraft()
    }

    // Check Type metadata: "Type: Multiple Choice", "Type: One Word", "Type: Short Answer"
    const typeMetaMatch = line.match(/^(?:type|question\s*type)\s*[:=\-]\s*(.+)$/i)
    if (typeMetaMatch) {
      const typeStr = typeMetaMatch[1].toLowerCase()
      if (typeStr.includes("multi") && (typeStr.includes("correct") || typeStr.includes("select"))) {
        currentDraft.explicitType = "MULTIPLE_CORRECT"
      } else if (typeStr.includes("checkbox")) {
        currentDraft.explicitType = "MULTIPLE_CORRECT"
      } else if (typeStr.includes("choice") || typeStr.includes("mcq")) {
        currentDraft.explicitType = "MULTIPLE_CHOICE"
      } else if (
        typeStr.includes("one") ||
        typeStr.includes("single") ||
        typeStr.includes("fill") ||
        typeStr.includes("blank")
      ) {
        currentDraft.explicitType = "ONE_WORD"
      } else if (
        typeStr.includes("short") ||
        typeStr.includes("descriptive") ||
        typeStr.includes("essay")
      ) {
        currentDraft.explicitType = "SHORT_ANSWER"
      }
      continue
    }

    // Check Marks metadata: "Marks: 2", "Points: 3", "Score: 1"
    const marksMetaMatch = line.match(
      /^(?:marks?|points?|score|pts?)\s*[:=\-]\s*(\d+(?:\.\d+)?)$/i
    )
    if (marksMetaMatch) {
      currentDraft.marks = Math.max(1, Math.round(parseFloat(marksMetaMatch[1])))
      continue
    }

    // Check Status metadata: "Status: Draft" or "Published: false"
    const statusMetaMatch = line.match(/^(?:status|published)\s*[:=\-]\s*(.+)$/i)
    if (statusMetaMatch) {
      const val = statusMetaMatch[1].toLowerCase()
      if (val.includes("draft") || val.includes("false") || val.includes("no")) {
        currentDraft.isPublished = false
      }
      continue
    }

    // Check Answer metadata: "Answer: ...", "Ans: ...", "Correct: ..."
    const ansMetaMatch = line.match(
      /^(?:correct\s*answers?|answers?|ans|correct)\s*[:=\-]\s*(.*)$/i
    )
    if (ansMetaMatch) {
      currentDraft.correctAnswer = ansMetaMatch[1].trim()
      continue
    }

    // Check Option Line: "A) ...", "A. ...", "*A) ...", "[x] A. ...", "(A) ...", "[A] ..."
    const optionMatch = line.match(
      /^(?:\*|\([xX]\)|\[[xX]\])?\s*(?:\(?([A-Za-z]|\d+)\)?[.:\)-]|\(([A-Za-z]|\d+)\)|\[([A-Za-z]|\d+)\])\s+(.*)$/
    )
    if (optionMatch) {
      let optText = optionMatch[4].trim()
      let isCorrect =
        line.startsWith("*") ||
        line.toLowerCase().startsWith("[x]") ||
        line.toLowerCase().startsWith("(x)")

      // Check asterisk at end: "A) Option text *"
      if (/\s*\*\s*$/.test(optText)) {
        isCorrect = true
        optText = optText.replace(/\s*\*\s*$/, "").trim()
      }
      // Check "(correct)" at end: "A) Option text (correct)"
      if (/\s*[\(\[]\s*correct(?: answer)?\s*[\)\]]$/i.test(optText)) {
        isCorrect = true
        optText = optText.replace(/\s*[\(\[]\s*correct(?: answer)?\s*[\)\]]$/i, "").trim()
      }

      const letterLabel = getAlphabetLabel(currentDraft.options.length)
      currentDraft.options.push({
        label: letterLabel,
        text: optText,
        isCorrect,
      })
      continue
    }

    // Otherwise, line is part of question text or option continuation
    if (currentDraft.options.length === 0 && currentDraft.correctAnswer === undefined) {
      // Multiline question text
      let text = line
      const marksMatch = text.match(
        /[\(\[]\s*(\d+(?:\.\d+)?)\s*(?:marks?|points?|pts?)\s*[\)\]]$/i
      )
      if (marksMatch) {
        currentDraft.marks = Math.max(1, Math.round(parseFloat(marksMatch[1])))
        text = text.replace(marksMatch[0], "").trim()
      }
      if (text) {
        currentDraft.questionLines.push(text)
      }
    } else if (currentDraft.options.length > 0 && currentDraft.correctAnswer === undefined) {
      // Continuation of previous option
      const lastOpt = currentDraft.options[currentDraft.options.length - 1]
      lastOpt.text += " " + line
    }
  }

  if (currentDraft) {
    drafts.push(currentDraft)
  }

  // Finalize all drafts into ParsedQuestion items
  const questions: ParsedQuestion[] = []
  const warnings: string[] = []
  let mcqCount = 0
  let multipleCorrectCount = 0
  let oneWordCount = 0
  let shortAnswerCount = 0

  for (let idx = 0; idx < drafts.length; idx++) {
    const draft = drafts[idx]
    const questionText = draft.questionLines.join(" ").trim()
    if (!questionText && draft.options.length === 0) continue

    let type: QuestionType = draft.explicitType || "SHORT_ANSWER"
    const options = draft.options.map((o) => o.text.trim())
    const rawAns = (draft.correctAnswer || "").trim()
    let correctAnswer = ""
    let warning: string | undefined

    // Type Inference if not explicitly defined
    if (!draft.explicitType) {
      if (options.length >= 1) {
        const markedCorrectCount = draft.options.filter((o) => o.isCorrect).length
        if (markedCorrectCount > 1) {
          type = "MULTIPLE_CORRECT"
        } else {
          type = "MULTIPLE_CHOICE"
        }
      } else if (
        /fill\s*in\s*the\s*blank/i.test(questionText) ||
        /_{3,}/.test(questionText) ||
        (rawAns && rawAns.split(/\s+/).length <= 2)
      ) {
        type = "ONE_WORD"
      } else {
        type = "SHORT_ANSWER"
      }
    }

    // Handle MULTIPLE_CHOICE logic
    if (type === "MULTIPLE_CHOICE") {
      mcqCount++
      // Check marked option
      const markedOpt = draft.options.find((o) => o.isCorrect)
      if (markedOpt) {
        correctAnswer = markedOpt.label
      } else if (rawAns) {
        correctAnswer = normalizeMcqAnswer(rawAns, options)
      }

      if (!correctAnswer && options.length > 0) {
        warning = `Question ${questions.length + 1}: No correct answer specified.`
        warnings.push(warning)
      }

      if (options.length < 2) {
        warning = `Question ${questions.length + 1}: Multiple choice questions should have at least 2 options.`
        warnings.push(warning)
      }
    } else if (type === "MULTIPLE_CORRECT") {
      multipleCorrectCount++
      // Collect all marked correct options
      const markedOpts = draft.options.filter((o) => o.isCorrect)
      if (markedOpts.length > 0) {
        correctAnswer = markedOpts.map((o) => o.label).sort().join(",")
      } else if (rawAns) {
        // Parse comma-separated answer like "A,C" or "A, C"
        correctAnswer = rawAns.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).sort().join(",")
      }

      if (!correctAnswer && options.length > 0) {
        warning = `Question ${questions.length + 1}: No correct answers specified for multi-select question.`
        warnings.push(warning)
      }

      if (options.length < 2) {
        warning = `Question ${questions.length + 1}: Multi-select questions should have at least 2 options.`
        warnings.push(warning)
      }
    } else if (type === "ONE_WORD") {
      oneWordCount++
      correctAnswer = rawAns
    } else {
      shortAnswerCount++
      correctAnswer = rawAns
    }

    questions.push({
      type,
      questionText: questionText || "Untitled Question",
      options:
        type === "MULTIPLE_CHOICE" || type === "MULTIPLE_CORRECT"
          ? options.length >= 2
            ? options
            : options.length === 1
            ? [...options, "Option 2"]
            : ["Option 1", "Option 2"]
          : [],
      marks: draft.marks && draft.marks > 0 ? draft.marks : 1,
      correctAnswer,
      isPublished: draft.isPublished !== false,
      warning,
    })
  }

  return {
    questions,
    summary: {
      total: questions.length,
      multipleChoice: mcqCount,
      multipleCorrect: multipleCorrectCount,
      oneWord: oneWordCount,
      shortAnswer: shortAnswerCount,
    },
    warnings,
  }
}

/**
 * Pre-defined sample templates to assist users with text formatting.
 */
export const SAMPLE_QUIZ_TEMPLATES = {
  mixed: `1. What is the capital of France?
A) Berlin
B) Madrid
C) Paris
D) Rome
Answer: C
Marks: 2

2. What is the powerhouse of the cell?
Type: One Word
Answer: Mitochondria
Marks: 1

3. Describe the process of photosynthesis in your own words.
Type: Short Answer
Marks: 3

4. Which of these are primary colors?
*A) Red
B) Green
*C) Blue
D) Yellow
Marks: 2

5. Fill in the blank: The atomic number of Carbon is ____.
Answer: 6
Marks: 1`,

  mcq: `1. Which planet is closest to the Sun?
A) Venus
B) Mercury
C) Mars
D) Jupiter
Answer: B
Marks: 1

2. What does HTTP stand for?
A) HyperText Transfer Protocol
B) High Transfer Text Protocol
C) Hyperlink Text Transfer Protocol
D) HyperText Test Protocol
Answer: A
Marks: 2

3. Which language runs in a web browser?
*A) JavaScript
B) C#
C) Java
D) Python
Marks: 1`,

  oneWord: `1. What is the largest mammal on Earth?
Type: One Word
Answer: Blue Whale
Marks: 1

2. Name the chemical symbol for Gold.
Type: One Word
Answer: Au
Marks: 1

3. Fill in the blank: The capital of Japan is ____.
Answer: Tokyo
Marks: 1`,

  shortAnswer: `1. Explain the theory of supply and demand.
Type: Short Answer
Marks: 5
Answer: Price is determined by the balance between production at each price and the desires of those with purchasing power.

2. Summarize the central conflict of the story.
Type: Short Answer
Marks: 3

3. What are the key differences between renewable and non-renewable energy?
Type: Short Answer
Marks: 4`,

  multiCorrect: `1. Select all prime numbers from the list below:
A) 2
B) 4
C) 7
D) 9
Answers: A, C
Marks: 2

2. Which of the following are operating systems?
*A) Linux
B) HTML
*C) macOS
*D) Windows
Marks: 3`,
}
