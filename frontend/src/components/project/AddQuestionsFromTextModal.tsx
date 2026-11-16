"use client"

import { useState, useMemo } from "react"
import {
  parseQuizQuestionsFromText,
  ParsedQuestion,
  SAMPLE_QUIZ_TEMPLATES,
  getAlphabetLabel,
} from "@/lib/quizTextParser"
import {
  FileText,
  X,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Props {
  onClose: () => void
  onAddQuestions: (questions: ParsedQuestion[]) => void
}

export function AddQuestionsFromTextModal({ onClose, onAddQuestions }: Props) {
  const [rawText, setRawText] = useState("")
  const [showCheatsheet, setShowCheatsheet] = useState(false)

  // Real-time parsed output as the user types or pastes text
  const parseResult = useMemo(() => {
    return parseQuizQuestionsFromText(rawText)
  }, [rawText])

  const { questions, summary, warnings } = parseResult

  const handleApplyTemplate = (type: "mixed" | "mcq" | "oneWord" | "shortAnswer" | "multiCorrect") => {
    setRawText(SAMPLE_QUIZ_TEMPLATES[type])
  }

  const handleConfirmAdd = () => {
    if (questions.length === 0) return
    onAddQuestions(questions)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-gray-200 bg-gray-50/70 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#a17038]/10 text-[#a17038] mt-0.5">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">Add Questions from Direct Text</h2>
                <span className="text-xs bg-[#a17038]/15 text-[#a17038] font-semibold px-2 py-0.5 rounded-full">
                  Bulk Add
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Paste or type questions of multiple types (Multiple Choice, One Word, Short Answer). They will be automatically parsed and added directly to your quiz.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Template loaders & Format help */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-gray-100/70 border-b border-gray-200 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-600 flex items-center gap-1">
              <Sparkles size={13} className="text-[#a17038]" /> Quick Samples:
            </span>
            <button
              type="button"
              onClick={() => handleApplyTemplate("mixed")}
              className="px-2.5 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded text-gray-700 font-medium transition-colors shadow-2xs"
            >
              Mixed Types
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("mcq")}
              className="px-2.5 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded text-gray-700 font-medium transition-colors shadow-2xs"
            >
              Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("multiCorrect")}
              className="px-2.5 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded text-purple-700 font-medium transition-colors shadow-2xs"
            >
              Multiple Correct
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("oneWord")}
              className="px-2.5 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded text-gray-700 font-medium transition-colors shadow-2xs"
            >
              One Word
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("shortAnswer")}
              className="px-2.5 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded text-gray-700 font-medium transition-colors shadow-2xs"
            >
              Short Answer
            </button>
            {rawText && (
              <button
                type="button"
                onClick={() => setRawText("")}
                className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded font-medium transition-colors flex items-center gap-1 ml-1"
                title="Clear input"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCheatsheet(!showCheatsheet)}
            className="flex items-center gap-1 text-[#a17038] hover:text-[#8a5f2e] font-semibold underline underline-offset-2"
          >
            <HelpCircle size={13} />
            {showCheatsheet ? "Hide Format Guide" : "Format & Marking Cheatsheet"}
            {showCheatsheet ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Collapsible Format Cheatsheet */}
        {showCheatsheet && (
          <div className="bg-amber-50/70 border-b border-amber-200 p-4 text-xs text-gray-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded border border-amber-200 shadow-2xs">
              <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Single Choice (MCQ)
              </h4>
              <p className="text-gray-600 mb-2 text-[11px]">Mark single answer with asterisk (*) or Answer line:</p>
              <pre className="bg-gray-50 p-2 rounded text-[10px] font-mono text-gray-800 overflow-x-auto border border-gray-200">
{`1. Capital of France?
A) Berlin
B) Madrid
*C) Paris
D) Rome
Marks: 2`}
              </pre>
            </div>

            <div className="bg-white p-3 rounded border border-amber-200 shadow-2xs">
              <h4 className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Multiple Correct
              </h4>
              <p className="text-gray-600 mb-2 text-[11px]">Mark several asterisks or list Answers comma-separated:</p>
              <pre className="bg-gray-50 p-2 rounded text-[10px] font-mono text-gray-800 overflow-x-auto border border-gray-200">
{`2. Select prime numbers:
*A) 2
B) 4
*C) 7
D) 9
Marks: 3`}
              </pre>
            </div>

            <div className="bg-white p-3 rounded border border-amber-200 shadow-2xs">
              <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                One Word
              </h4>
              <p className="text-gray-600 mb-2 text-[11px]">Specify <code>Type: One Word</code> with single answer:</p>
              <pre className="bg-gray-50 p-2 rounded text-[10px] font-mono text-gray-800 overflow-x-auto border border-gray-200">
{`3. Powerhouse of cell?
Type: One Word
Answer: Mitochondria
Marks: 1`}
              </pre>
            </div>

            <div className="bg-white p-3 rounded border border-amber-200 shadow-2xs">
              <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Short Answer
              </h4>
              <p className="text-gray-600 mb-2 text-[11px]">Open-ended. Optionally add reference model answer:</p>
              <pre className="bg-gray-50 p-2 rounded text-[10px] font-mono text-gray-800 overflow-x-auto border border-gray-200">
{`4. Explain photosynthesis.
Type: Short Answer
Marks: 5
Answer: Plants convert light...`}
              </pre>
            </div>
          </div>
        )}

        {/* Content Body: Split View between Text Input & Live Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          
          {/* Left Column: Direct Text Area */}
          <div className="flex flex-col h-full overflow-hidden p-4 bg-white">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="rawQuizTextInput" className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Direct Text Input
              </label>
              <span className="text-[11px] text-gray-500">
                {rawText.length > 0 ? `${rawText.split("\n").length} lines, ${rawText.length} chars` : "Paste questions here"}
              </span>
            </div>

            <textarea
              id="rawQuizTextInput"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Paste or type questions here...

Example:
1. What is the capital of Italy?
A) Milan
B) Rome
C) Naples
Answer: B
Marks: 1

2. Name the planet known as the Red Planet.
Type: One Word
Answer: Mars

3. Describe Newton's first law of motion.
Type: Short Answer
Marks: 3`}
              className="flex-1 w-full p-3.5 border border-gray-300 rounded-lg font-mono text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a17038] focus:border-transparent resize-none leading-relaxed"
              spellCheck={false}
            />

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>Supports numbers (1.), options (A., B., C.), asterisks (*), and Answer lines.</span>
            </div>
          </div>

          {/* Right Column: Parsed Questions Live Preview */}
          <div className="flex flex-col h-full overflow-hidden p-4 bg-gray-50/50">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Parsed Questions Preview
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  questions.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                }`}>
                  {questions.length} detected
                </span>
              </div>

              {questions.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  {summary.multipleChoice > 0 && (
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                      {summary.multipleChoice} MCQ
                    </span>
                  )}
                  {summary.oneWord > 0 && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                      {summary.oneWord} One Word
                    </span>
                  )}
                  {summary.shortAnswer > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                      {summary.shortAnswer} Short Ans
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Warnings banner */}
            {warnings.length > 0 && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <div className="flex-1">
                  <span className="font-semibold">{warnings.length} warning(s):</span>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    {warnings.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {warnings.length > 3 && <li>...and {warnings.length - 3} more</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Questions preview cards */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {questions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg bg-white/70">
                  <FileText size={36} className="text-gray-300 mb-2" />
                  <p className="font-medium text-sm text-gray-700">No questions detected yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Paste raw text into the left pane or click one of the quick samples above.
                  </p>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white rounded-lg border border-gray-200 shadow-2xs hover:border-gray-300 transition-colors"
                  >
                    {/* Card Top Meta */}
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            q.type === "MULTIPLE_CHOICE"
                              ? "bg-purple-100 text-purple-700"
                              : q.type === "ONE_WORD"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {q.type === "MULTIPLE_CHOICE"
                            ? "Multiple Choice"
                            : q.type === "ONE_WORD"
                            ? "One Word"
                            : "Short Answer"}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {q.marks} {q.marks === 1 ? "mark" : "marks"}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="text-sm font-medium text-gray-900 mb-2.5">
                      {q.questionText}
                    </p>

                    {/* Multiple Choice Options */}
                    {q.type === "MULTIPLE_CHOICE" && (
                      <div className="space-y-1.5 ml-2 mb-2">
                        {q.options.map((opt, optIdx) => {
                          const letter = getAlphabetLabel(optIdx)
                          const isCorrect = q.correctAnswer === letter
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-1.5 rounded text-xs transition-colors ${
                                isCorrect
                                  ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && (
                                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 size={12} /> Correct
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* One Word / Short Answer Answer text */}
                    {q.type !== "MULTIPLE_CHOICE" && q.correctAnswer && (
                      <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-xs">
                        <span className="font-semibold text-gray-700">Answer: </span>
                        <span className="text-gray-900 font-medium">{q.correctAnswer}</span>
                      </div>
                    )}

                    {/* Warning if any */}
                    {q.warning && (
                      <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {q.warning}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-white flex-shrink-0">
          <div className="text-xs text-gray-600">
            {questions.length > 0 ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={14} /> Ready to add {questions.length} {questions.length === 1 ? "question" : "questions"} to the quiz
              </span>
            ) : (
              <span>Enter or paste text above to extract questions.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-gray-700 hover:text-black text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={questions.length === 0}
              className="px-5 py-2 font-medium text-white rounded shadow-sm transition-all text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
              style={{ backgroundColor: "#a17038" }}
            >
              <FileText size={15} />
              Add {questions.length > 0 ? `${questions.length} Questions` : "Questions"} to Quiz
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

