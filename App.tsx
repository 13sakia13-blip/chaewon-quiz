import React, { useEffect, useState } from 'react';
import type { Question } from './types';
import { fetchQuestions, insertOneQuestion, deleteQuestions } from './services/supabaseService';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  // 업로드/단건 입력
  const [category, setCategory] = useState('');
  const [keyCategory, setKeyCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');

  // 목록/필터
  const [filterCategory, setFilterCategory] = useState('');
  const [filterKeyCategory, setFilterKeyCategory] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  // 풀이
  const [solveCategory, setSolveCategory] = useState('');
  const [solveKeyCategory, setSolveKeyCategory] = useState('');
  const [current, setCurrent] = useState<Question | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[] | null>(null);
  const [judge, setJudge] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showExplain, setShowExplain] = useState(false);

  // 목록 로드
  async function loadList() {
    const list = await fetchQuestions({
      category: filterCategory || undefined,
      key_category: filterKeyCategory || undefined,
    });
    setQuestions(list);
    setCheckedIds({});
  }

  useEffect(() => { loadList(); }, [filterCategory, filterKeyCategory]);

  // 단건 추가
  async function handleInsertOne() {
    if (!prompt.trim() || !answer.trim()) {
      setUploadMsg('문제/정답은 필수입니다.');
      return;
    }
    let parsed: string[] | null = null;
    const raw = optionsText.trim();
    if (raw) {
      if (raw.startsWith('[')) {
        try { parsed = JSON.parse(raw); }
        catch { setUploadMsg('선택지 JSON 파싱 실패'); return; }
      } else {
        parsed = raw.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }
    await insertOneQuestion({
      category: category || '기타',
      key_category: keyCategory || null,
      prompt,
      options: parsed && parsed.length ? parsed : null,
      answer,
      explanation: explanation || null,
    });
    setUploadMsg('추가 완료');
    setPrompt(''); setOptionsText(''); setAnswer(''); setExplanation('');
    loadList();
  }

  // 선택 삭제
  async function handleDeleteSelected() {
    const ids = Object.keys(checkedIds).filter(id => checkedIds[id]);
    if (!ids.length) return;
    if (!confirm(`${ids.length}건 삭제할까요?`)) return;
    await deleteQuestions(ids);
    loadList();
  }

  // 풀이용 다음 문제
  async function nextQuestion() {
    const list = await fetchQuestions({
      category: solveCategory || undefined,
      key_category: solveKeyCategory || undefined,
    });
    if (!list.length) {
      setCurrent(null);
      return;
    }
    const picked = list[Math.floor(Math.random() * list.length)];
    setCurrent(picked);
    setShowExplain(false);
    setJudge('');
    setUserAnswer('');
    if (picked.options && picked.options.length) {
      setShuffledOptions(shuffle(picked.options));
    } else {
      setShuffledOptions(null);
    }
  }

  // 채점
  function checkAnswer() {
    if (!current) return;
    const user = userAnswer;
    if (!user) { alert('정답을 선택/입력하세요.'); return; }
    const ok = user === current.answer;
    setJudge(ok ? '정답!' : `오답 (정답: ${current.answer})`);
    setShowExplain(true);
  }

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">문제풀이 웹앱</h1>
        <span className="text-xs text-slate-500">v2 · 키테고리 + 랜덤 보기</span>
      </header>

      {/* 업로드 */}
      <section className="rounded-2xl bg-white shadow p-5 space-y-3">
        <h2 className="font-semibold">문제 업로드(단건)</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2" placeholder="카테고리" value={category} onChange={e=>setCategory(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="키테고리(보조)" value={keyCategory} onChange={e=>setKeyCategory(e.target.value)} />
          <textarea className="md:col-span-2 border rounded-lg px-3 py-2" rows={3} placeholder="문제" value={prompt} onChange={e=>setPrompt(e.target.value)} />
          <textarea className="border rounded-lg px-3 py-2" rows={3} placeholder={'선택지(JSON 배열 또는 줄바꿈)'} value={optionsText} onChange={e=>setOptionsText(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="정답" value={answer} onChange={e=>setAnswer(e.target.value)} />
          <textarea className="border rounded-lg px-3 py-2" rows={3} placeholder="해설(선택)" value={explanation} onChange={e=>setExplanation(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl border bg-black text-white" onClick={handleInsertOne}>추가</button>
          <span className="text-xs text-slate-500">{uploadMsg}</span>
        </div>
      </section>

      {/* 목록 + 필터 + 삭제 */}
      <section className="rounded-2xl bg-white shadow p-5 space-y-3">
        <h2 className="font-semibold">문제 목록</h2>
        <div className="flex flex-wrap gap-2">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="카테고리 필터" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="키테고리 필터" value={filterKeyCategory} onChange={e=>setFilterKeyCategory(e.target.value)} />
          <button className="px-3 py-2 rounded-xl border" onClick={loadList}>새로고침</button>
          <button className="px-3 py-2 rounded-xl border" onClick={handleDeleteSelected}>선택 삭제</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-2"></th>
                <th className="py-2 pr-2">카테고리</th>
                <th className="py-2 pr-2">키테고리</th>
                <th className="py-2 pr-2">문제</th>
                <th className="py-2 pr-2">선택지</th>
                <th className="py-2 pr-2">정답</th>
                <th className="py-2 pr-2">해설</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id} className="border-b">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={!!checkedIds[q.id]}
                      onChange={e => setCheckedIds(prev => ({ ...prev, [q.id]: e.target.checked }))}
                    />
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">{q.category}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">{q.key_category ?? ''}</td>
                  <td className="py-2 pr-2">{q.prompt}</td>
                  <td className="py-2 pr-2">{Array.isArray(q.options) ? q.options.join(' / ') : ''}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">{q.answer}</td>
                  <td className="py-2 pr-2">{q.explanation ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 풀이 */}
      <section className="rounded-2xl bg-white shadow p-5 space-y-3">
        <h2 className="font-semibold">문제 풀이</h2>
        <div className="flex flex-wrap gap-2">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="(주) 카테고리" value={solveCategory} onChange={e=>setSolveCategory(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="(보조) 키테고리" value={solveKeyCategory} onChange={e=>setSolveKeyCategory(e.target.value)} />
          <button className="px-3 py-2 rounded-xl border bg-black text-white" onClick={nextQuestion}>다음 문제</button>
        </div>

        {!current ? (
          <div className="text-sm text-slate-500">문제를 불러오세요.</div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">카테고리: {current.category} {current.key_category ? `· ${current.key_category}` : ''}</div>
            <div className="font-semibold">{current.prompt}</div>

            {shuffledOptions ? (
              <div className="space-y-2">
                {shuffledOptions.map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ans"
                      value={opt}
                      onChange={(e) => setUserAnswer(e.target.value)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="정답 입력"
                value={userAnswer}
                onChange={(e)=>setUserAnswer(e.target.value)}
              />
            )}

            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={checkAnswer}>정답 확인</button>
            </div>
            {judge && <div className={judge.startsWith('정답') ? 'text-emerald-600' : 'text-red-600'}>{judge}</div>}
            {showExplain && <div className="mt-2 p-3 bg-amber-50 rounded text-sm">{current.explanation ?? '(해설 없음)'}</div>}
          </div>
        )}
      </section>
    </div>
  );
}
