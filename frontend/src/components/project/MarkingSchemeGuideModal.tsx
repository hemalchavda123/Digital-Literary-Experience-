"use client"

import { useState } from "react"
import {
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  Scale,
  Sparkles,
  BookOpen,
  Check,
  ShieldAlert,
} from "lucide-react"

interface Props {
  onClose: () => void
}

export function MarkingSchemeGuideModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"multi" | "penalty" | "reveal">("multi")

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shadow-xs">
              <Scale size={22} className="text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Quiz Marking Schemes Guide</h2>
              <p className="text-xs text-gray-500">
                Understand how partial credit, penalties, and answer evaluations work
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/70 px-5 pt-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab("multi")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "multi"
                ? "border-amber-600 text-amber-900 bg-white rounded-t-lg border-t border-l border-r border-b-white -mb-px shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Scale size={14} />
            Multiple Correct Rules
          </button>
          <button
            onClick={() => setActiveTab("penalty")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "penalty"
                ? "border-rose-600 text-rose-900 bg-white rounded-t-lg border-t border-l border-r border-b-white -mb-px shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MinusCircle size={14} />
            Negative Marking (Penalty)
          </button>
          <button
            onClick={() => setActiveTab("reveal")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "reveal"
                ? "border-blue-600 text-blue-900 bg-white rounded-t-lg border-t border-l border-r border-b-white -mb-px shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Sparkles size={14} />
            Answer Reveal & Model Answers
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-gray-800 text-xs space-y-5">
          {activeTab === "multi" && (
            <div className="space-y-4">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5">
                <span className="font-bold text-purple-900 text-xs block mb-1">
                  How Multiple Correct Questions Work:
                </span>
                <p className="text-purple-950 leading-relaxed">
                  Questions marked as <strong>Multiple Correct</strong> allow one or more options to be correct. Instructors can select one of three grading rules for each question:
                </p>
              </div>

              {/* Rule 1: Proportional with Penalty */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px]">
                    1. Proportional with Penalty (Recommended)
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Each correct option carries a proportionate share of the total marks (<span className="font-semibold text-gray-800">Marks &divide; Total Correct</span>).
                  Selecting a correct option adds that value. Selecting an incorrect option deducts that same value. The question score is floored at <strong>0</strong> (cannot be negative).
                </p>
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <span className="font-semibold text-gray-700 block mb-1 text-[11px]">
                    Example: Question worth 4 marks with correct answers [A, C] (2 marks per option):
                  </span>
                  <ul className="space-y-1 text-gray-600 text-[11px]">
                    <li className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-700">[A, C]</span>
                      <span>&rarr; +2 + 2 = <strong>4 marks (100% full credit)</strong></span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-700">[A] only</span>
                      <span>&rarr; +2 = <strong>2 marks (50% partial credit)</strong></span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-amber-700">[A, B]</span>
                      <span>&rarr; +2 (for A) - 2 (for B) = <strong>0 marks</strong></span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-700">[A, B, C]</span>
                      <span>&rarr; +2 + 2 - 2 = <strong>2 marks (50%)</strong></span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-rose-700">[B, D]</span>
                      <span>&rarr; 0 marks (floored at 0, no negative carryover)</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Rule 2: Positive Partial Only */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[11px]">
                  2. Positive Partial Only
                </span>
                <p className="text-gray-600 leading-relaxed">
                  Students receive proportional marks for every correct option they select, with <strong>no deductions</strong> for selecting wrong options.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-[11px] text-gray-600">
                  Selecting <strong>[A, B]</strong> on a 4-mark question with answers [A, C] awards <strong>+2 marks</strong> for A (no penalty for B).
                </div>
              </div>

              {/* Rule 3: All or Nothing */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold rounded text-[11px]">
                  3. All or Nothing
                </span>
                <p className="text-gray-600 leading-relaxed">
                  Full marks are awarded <strong>only if the response matches the exact answer key</strong>. If any correct option is omitted or any incorrect option is selected, 0 marks are awarded (or the configured question penalty is deducted).
                </p>
              </div>
            </div>
          )}

          {activeTab === "penalty" && (
            <div className="space-y-4">
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <ShieldAlert size={14} className="text-rose-600" />
                  <span>Negative Marking (Incorrect Answer Penalty)</span>
                </div>
                <p className="text-rose-950 leading-relaxed">
                  Negative marks discourage random guessing. Instructors can configure a deduction penalty per question (e.g. 0.25, 0.5, or 1.0 mark).
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <h4 className="font-bold text-gray-900 text-xs">How Penalties are Calculated:</h4>
                <ul className="space-y-2 text-gray-600 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Correct Answer:</strong> Awards the full configured question marks (e.g., +2.0 marks).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MinusCircle size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Incorrect Answer:</strong> If penalty is set to 0.5, the score receives <strong>-0.5 marks</strong>. If penalty is 0, incorrect answers award 0 marks.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Quiz Floor:</strong> A student&apos;s total quiz score is floored at <strong>0</strong>. Overall score will never be negative.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                <strong>Tip for Students:</strong> Always check if a question shows a <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">-0.25 penalty</span> badge before attempting educated guesses.
              </div>
            </div>
          )}

          {activeTab === "reveal" && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-1">
                <span className="font-bold text-blue-900 text-xs block">
                  Answer Reveal Policy &amp; Model Answers
                </span>
                <p className="text-blue-950 leading-relaxed">
                  Control when students can see the answer key and explanatory solutions for questions.
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <h4 className="font-bold text-gray-900 text-xs">Answer Reveal Policies:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/60">
                    <span className="font-bold text-emerald-800 block mb-0.5">Immediate</span>
                    <span className="text-gray-600">Students see detailed correct answers and model answers immediately after submitting.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/60">
                    <span className="font-bold text-indigo-800 block mb-0.5">After Quiz Closed</span>
                    <span className="text-gray-600">Keeps answers hidden while the quiz is open to prevent sharing. Once closed, full answers and model solutions unlock.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/60">
                    <span className="font-bold text-amber-800 block mb-0.5">Marks Only</span>
                    <span className="text-gray-600">Students see only their total score (e.g. 18 / 20). Question-level answers remain hidden.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/60">
                    <span className="font-bold text-gray-800 block mb-0.5">Never</span>
                    <span className="text-gray-600">Scores and answers remain strictly confidential to the instructor.</span>
                  </div>
                </div>
              </div>

              <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                  <Sparkles size={14} className="text-blue-600" />
                  <span>Model Answers for Long &amp; Descriptive Questions</span>
                </div>
                <p className="text-blue-950 text-[11px] leading-relaxed">
                  For short-answer and long-form questions, instructors can author a <strong>Model Answer &amp; Explanation</strong>. When answers are released, students can study the model solution to understand rubric expectations and key concepts.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex justify-end items-center flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg font-semibold text-xs shadow-sm transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}

