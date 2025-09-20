import React, { useEffect, useMemo, useState } from 'react';
import { type Question, type NewQuestion, type ExamAnswer, type ExamResult, View } from './types.ts';
import * as supabaseService from './services/supabaseService.ts';

// ======= Exam UI Components =======
const ExamSetup: React.FC<{ categories: string[]; onStart:(cat:string)=>void; onCancel:()=>void }>
= ({ categories, onStart, onCancel }) => {
  const [cat, setCat] = useState<string>(categories[0] || '');
  return (
    <main className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">시험 보기</h2>
        <label className="text-sm">카테고리 선택</label>
        <select className="w-full mt-2 p-3 bg-slate-800 border border-slate-600 rounded-lg" value={cat} onChange={e=>setCat(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="mt-6 flex justify-end gap-3">
          <button className="px-4 py-2 rounded-lg bg-slate-700" onClick={onCancel}>취소</button>
          <button className="px-4 py-2 rounded-lg bg-indigo-600 disabled:opacity-50" disabled={!cat} onClick={()=>onStart(cat)}>시작</button>
        </div>
      </div>
    </main>
  );
};

const ExamMode: React.FC<{ questions: Question[]; onFinish:(answers:ExamAnswer[])=>void }>
= ({ questions, onFinish }) => {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>(() => questions.map(q => ({ questionId:q.id, selected:null, correct:false })));
  const q = questions[idx];
  const select = (opt:string) => {
    setAnswers(prev => {
      const copy = [...prev];
      copy[idx] = { questionId: q.id, selected: opt, correct: opt === q.answer };
      return copy;
    });
  };
  const prev = () => setIdx(v => Math.max(0, v-1));
  const next = () => {
    if (idx < questions.length-1) setIdx(idx+1);
    else onFinish(answers);
  };
  return (
    <main className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto">
        <div className="text-sm opacity-70 mb-2">문항 {idx+1} / {questions.length}</div>
        <div className="text-xl font-semibold whitespace-pre-wrap mb-4">{q.question}</div>
        <div className="space-y-2">
          {q.options.map(opt => (
            <button key={opt} onClick={()=>select(opt)}
              className={`w-full text-left p-3 rounded-lg border ${answers[idx].selected===opt? 'border-indigo-400 bg-slate-800' : 'border-slate-700 bg-slate-900'}`}>
              {opt}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <button className="px-4 py-2 rounded-lg bg-slate-700" onClick={prev} disabled={idx===0}>이전</button>
          <button className="px-4 py-2 rounded-lg bg-indigo-600" onClick={next}>{idx < questions.length-1 ? '다음' : '제출'}</button>
        </div>
      </div>
    </main>
  );
};

const ExamResults: React.FC<{ result: ExamResult; onClose:()=>void; onShowHistory:()=>void }>
= ({ result, onClose, onShowHistory }) => (
  <main className="min-h-screen p-6 bg-slate-950 text-slate-100">
    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-2">시험 결과</h2>
      <div className="text-slate-300 mb-4">{new Date(result.at).toLocaleString()}</div>
      <div className="text-xl font-semibold mb-2">점수: {result.correct} / {result.total}</div>
      <div className="mb-1">카테고리: {result.category}</div>
      <div className="mb-6">오답 수: {result.wrongIds.length}</div>
      <div className="flex gap-3 justify-end">
        <button className="bg-slate-700 px-4 py-2 rounded-lg" onClick={onClose}>닫기</button>
        <button className="bg-slate-600 px-4 py-2 rounded-lg" onClick={onShowHistory}>시험 기록 보기</button>
      </div>
    </div>
  </main>
);

const ExamHistory: React.FC<{ history: ExamResult[]; allQuestions: Question[]; onClose:()=>void }>
= ({ history, allQuestions, onClose }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const getWrong = (res: ExamResult) => res.wrongIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) as Question[];
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 w-[min(900px,95vw)] max-h-[85vh] overflow-auto rounded-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">시험 기록</h3>
          <button className="px-3 py-1 rounded-lg bg-slate-700" onClick={onClose}>닫기</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400"><th className="py-2">일시</th><th>카테고리</th><th>점수</th><th>오답</th><th></th></tr></thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id} className="border-t border-slate-800">
                <td className="py-2">{new Date(h.at).toLocaleString()}</td>
                <td>{h.category}</td>
                <td>{h.correct} / {h.total}</td>
                <td>{h.wrongIds.length}</td>
                <td><button className="text-indigo-300 underline" onClick={()=>setOpenId(openId===h.id?null:h.id)}>보기</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.map(h => openId===h.id && (
          <div key={h.id} className="mt-4 p-3 rounded-lg border border-slate-700 bg-slate-800/40">
            <div className="font-semibold mb-2">오답 문제</div>
            {getWrong(h).length === 0 ? <div className="text-slate-300">오답이 없습니다.</div> : getWrong(h).map(q => (
              <div key={q.id} className="mb-3">
                <div className="font-medium">{q.question}</div>
                <div className="text-slate-300 text-sm mt-1"><b>정답:</b> {q.answer}</div>
                <div className="text-slate-400 text-sm mt-1"><b>해설:</b> {q.explanation}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ======= Main App =======
const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Dashboard); // 기존 뷰 유지용(필요시)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Exam Mode State ---
  const [examView, setExamView] = useState<View>(View.Dashboard);
  const [examCategory, setExamCategory] = useState<string | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // LocalStorage helpers
  const LS_HISTORY_KEY = 'examHistory';
  const LS_WRONG_KEY = 'wrongNote';
  const loadHistory = (): ExamResult[] => {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY_KEY) || '[]'); } catch { return []; }
  };
  const saveHistory = (list: ExamResult[]) => {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(list));
  };
  const addWrongNote = (ids: number[]) => {
    const prev = new Set<number>(JSON.parse(localStorage.getItem(LS_WRONG_KEY) || '[]'));
    ids.forEach(id => prev.add(id));
    localStorage.setItem(LS_WRONG_KEY, JSON.stringify(Array.from(prev)));
  };

  // Fetch questions
  useEffect(() => {
    (async () => {
      try {
        const data = await supabaseService.getQuestions();
        setQuestions(data || []);
      } catch (e:any) {
        setError(e?.message || '문제를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(questions.map(q => q.category))).filter(Boolean),
    [questions]
  );

  // ===== Exam Flow Handlers =====
  const startExam = (category: string) => {
    setExamCategory(category);
    const pool = questions.filter(q => q.category === category);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(25, shuffled.length));
    setExamQuestions(selected);
    setExamView(View.Exam);
  };

  const finishExam = (answers: ExamAnswer[]) => {
    const total = answers.length;
    const correct = answers.filter(a => a.correct).length;
    const wrongIds = answers.filter(a => !a.correct).map(a => a.questionId);

    // DB 오답 표시 (fire & forget)
    try { wrongIds.forEach(id => supabaseService.updateQuestionStatus(id, true)); } catch { /* ignore */ }

    const result: ExamResult = {
      id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now()),
      at: new Date().toISOString(),
      category: examCategory || '전체',
      total, correct, wrongIds,
    };
    setExamResult(result);
    const hist = loadHistory();
    hist.unshift(result);
    saveHistory(hist);
    addWrongNote(wrongIds);
    setExamView(View.Results);
  };

  // ===== EXAM ROUTES (초기 return) =====
  if (examView === View.ExamSetup) {
    return (
      <ExamSetup
        categories={categories}
        onStart={startExam}
        onCancel={() => setExamView(View.Dashboard)}
      />
    );
  }

  if (examView === View.Exam) {
    return (
      <ExamMode
        questions={examQuestions}
        onFinish={finishExam}
      />
    );
  }

  if (examView === View.Results && examResult) {
    return (
      <ExamResults
        result={examResult}
        onClose={() => setExamView(View.Dashboard)}
        onShowHistory={() => setIsHistoryOpen(true)}
      />
    );
  }

  // ===== Default Dashboard (간단 버전) =====
  return (
    <main className="min-h-screen p-6 bg-slate-950 text-slate-100">
      {isHistoryOpen && (
        <ExamHistory history={loadHistory()} allQuestions={questions} onClose={()=>setIsHistoryOpen(false)} />
      )}
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Supabase Quiz App</h1>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-lg bg-indigo-600" onClick={()=>setExamView(View.ExamSetup)}>시험보기</button>
            <button className="px-3 py-2 rounded-lg bg-slate-700" onClick={()=>setIsHistoryOpen(true)}>시험 결과</button>
          </div>
        </header>

        {isLoading && <div className="text-slate-300">불러오는 중…</div>}
        {error && <div className="text-red-400">{error}</div>}

        {!isLoading && !error && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">카테고리</h2>
            {categories.length === 0 ? (
              <div className="text-slate-300">문제가 없습니다. 문제를 먼저 추가해 주세요.</div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {categories.map(c => (
                  <li key={c} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                    <span>{c}</span>
                    <button className="px-3 py-1 rounded-lg bg-slate-700" onClick={()=>{ setExamView(View.ExamSetup); }}>선택</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default App;
