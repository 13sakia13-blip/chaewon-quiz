import React, { useEffect, useState } from 'react';
import type { Question } from './types';
import { fetchQuestions, insertOneQuestion } from './services/supabaseService';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [category, setCategory] = useState('');
  const [keyCategory, setKeyCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [answer, setAnswer] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[] | null>(null);

  async function loadQuestions() {
    const data = await fetchQuestions();
    setQuestions(data);
  }

  useEffect(() => { loadQuestions(); }, []);

  async function handleAdd() {
    await insertOneQuestion({
      category: category || '기타',
      key_category: keyCategory || null,
      prompt,
      options: optionsText.split('\n').filter(Boolean),
      answer,
    });
    loadQuestions();
  }

  function pickRandom() {
    if (!questions.length) return;
    const q = questions[Math.floor(Math.random() * questions.length)];
    setCurrent(q);
    if (q.options) setShuffledOptions(shuffle(q.options));
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">문제풀이 앱</h1>
      <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="카테고리" />
      <input value={keyCategory} onChange={e=>setKeyCategory(e.target.value)} placeholder="키테고리" />
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} />
      <textarea value={optionsText} onChange={e=>setOptionsText(e.target.value)} />
      <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="정답" />
      <button onClick={handleAdd}>추가</button>
      <button onClick={pickRandom}>랜덤 문제</button>
      {current && (
        <div>
          <div>{current.prompt}</div>
          {shuffledOptions?.map((o, i)=><div key={i}>{o}</div>)}
        </div>
      )}
    </div>
  );
}
