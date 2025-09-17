import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { type Question, type NewQuestion, View } from './types.ts';
import * as supabaseService from './services/supabaseService.ts';
import { PlusIcon, TrashIcon, BookOpenIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon, SparklesIcon } from './components/icons.tsx';

// Main App Component
const App: React.FC = () => {
    // --- Start of Hooks ---
    const [view, setView] = useState<View>(View.Dashboard);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [quizCategory, setQuizCategory] = useState<string | null>(null);
    
    const categories = useMemo(() => [...new Set(questions.map(q => q.category))].sort(), [questions]);
    const incorrectQuestions = useMemo(() => questions.filter(q => q.is_incorrect), [questions]);

    const handleSupabaseError = (err: any, context: string) => {
        let detailedMessage = err?.message || '알 수 없는 오류입니다.';
        setError(`${context}\n\n[상세 정보] ${detailedMessage}`);
        console.error(err);
    };

    const fetchQuestionsCb = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await supabaseService.getQuestions();
            setQuestions(data);
        } catch (err: any) {
            handleSupabaseError(err, '문제 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestionsCb();
    }, [fetchQuestionsCb]);

    const handleAddQuestion = async (newQuestion: NewQuestion) => {
        try {
            const added = await supabaseService.addQuestion(newQuestion);
            if (added) setQuestions(prev => [added, ...prev]);
            setIsUploadModalOpen(false);
        } catch (err) {
            handleSupabaseError(err, '문제 추가 중 오류가 발생했습니다.');
            setIsUploadModalOpen(false);
        }
    };

    const handleAddQuestions = async (newQuestions: NewQuestion[]) => {
        if (newQuestions.length === 0) return setIsUploadModalOpen(false);
        try {
            await supabaseService.addQuestions(newQuestions);
            await fetchQuestionsCb();
            setIsUploadModalOpen(false);
        } catch (err: any) {
             handleSupabaseError(err, '여러 문제 추가 중 오류가 발생했습니다.');
             setIsUploadModalOpen(false);
        }
    };

    const handleUpdateStatus = async (id: number, is_incorrect: boolean) => {
        const originalQuestions = [...questions];
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_incorrect } : q));
        try {
            await supabaseService.updateQuestionStatus(id, is_incorrect);
        } catch (err) {
            handleSupabaseError(err, '문제 상태 업데이트 중 오류가 발생했습니다.');
            setQuestions(originalQuestions);
        }
    };
    
    const handleDeleteQuestions = async (ids: number[]) => {
        const originalQuestions = [...questions];
        setQuestions(prev => prev.filter(q => !ids.includes(q.id)));
        try {
            await supabaseService.deleteQuestions(ids);
        } catch (err) {
            handleSupabaseError(err, '문제 삭제 중 오류가 발생했습니다.');
            setQuestions(originalQuestions);
        }
    };

    const renderView = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div></div>;
        }

        if (error) {
            return <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/30 p-4 rounded-lg whitespace-pre-wrap">{error}</div>;
        }

        switch (view) {
            case View.Quiz:
            case View.Review:
                const quizQuestions = view === View.Review ? incorrectQuestions : questions.filter(q => q.category === quizCategory);
                if (!quizCategory && view === View.Quiz) {
                    return <CategorySelector categories={categories} onSelectCategory={setQuizCategory} onCancel={() => setView(View.Dashboard)} />;
                }
                if (quizQuestions.length === 0) {
                     return (
                        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                                {view === View.Review ? "풀어볼 오답 문제가 없습니다!" : "이 카테고리에 문제가 없습니다."}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                {view === View.Review ? "훌륭해요! 모든 오답을 정복했습니다." : "다른 카테고리를 선택하거나 새 문제를 추가해보세요."}
                            </p>
                            <button onClick={() => setView(View.Dashboard)} className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                대시보드로 돌아가기
                            </button>
                        </div>
                    );
                }
                return <QuizMode 
                         key={view + (quizCategory || '')} 
                         questions={quizQuestions} 
                         onUpdateStatus={handleUpdateStatus} 
                         isReviewMode={view === View.Review}
                         onFinish={() => setView(View.Dashboard)}
                       />;
            case View.Manage:
                return <ManageQuestions questions={questions} onDelete={handleDeleteQuestions} />;
            default:
                return <Dashboard
                    totalCount={questions.length}
                    incorrectCount={incorrectQuestions.length}
                    onStartQuiz={() => { setQuizCategory(null); setView(View.Quiz); }}
                    onStartReview={() => setView(View.Review)}
                    onManage={() => setView(View.Manage)}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <Header onNavigate={setView} onOpenUpload={() => setIsUploadModalOpen(true)} />
            <main className="container mx-auto p-4 md:p-6">
                {renderView()}
            </main>
            {isUploadModalOpen && <UploadModal onClose={() => setIsUploadModalOpen(false)} onAddQuestion={handleAddQuestion} onAddQuestions={handleAddQuestions} />}
        </div>
    );
};

const Header: React.FC<{onNavigate: (view: View) => void; onOpenUpload: () => void;}> = ({ onNavigate, onOpenUpload }) => {
    return (
        <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
                <div onClick={() => onNavigate(View.Dashboard)} className="flex items-center space-x-2 cursor-pointer">
                    <BookOpenIcon className="w-8 h-8 text-primary-500"/>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">문제풀이 앱</h1>
                </div>
                <div className="flex items-center space-x-2">
                     <button onClick={() => onNavigate(View.Manage)} className="hidden sm:inline-block text-slate-600 dark:text-slate-300 hover:text-primary-500 dark:hover:text-primary-400 font-medium px-3 py-2 rounded-lg transition-colors">문제 관리</button>
                    <button onClick={onOpenUpload} className="flex items-center bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow">
                        <PlusIcon className="w-5 h-5 mr-1" />
                        <span>문제 추가</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

const Dashboard: React.FC<{totalCount: number; incorrectCount: number; onStartQuiz: () => void; onStartReview: () => void; onManage: () => void;}> = ({ totalCount, incorrectCount, onStartQuiz, onStartReview, onManage }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md col-span-1 md:col-span-2 lg:col-span-3">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">안녕하세요!</h2>
                <p className="text-slate-600 dark:text-slate-400">오늘도 목표를 향해 한 걸음 더 나아가세요.</p>
            </div>
            <StatCard title="총 문제 수" value={totalCount} />
            <StatCard title="오답 노트" value={incorrectCount} />
            <ActionCard title="문제 풀기" description="새로운 문제를 풀며 실력을 점검하세요." onClick={onStartQuiz} icon={<SparklesIcon />} color="primary" />
            <ActionCard title="오답 다시 풀기" description="틀렸던 문제를 다시 풀어보며 약점을 보완하세요." onClick={onStartReview} icon={<LightBulbIcon />} color="yellow" disabled={incorrectCount === 0} />
            <ActionCard title="문제 관리하기" description="등록된 문제를 수정하거나 삭제합니다." onClick={onManage} icon={<TrashIcon />} color="red" />
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: number }> = ({ title, value }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md flex flex-col justify-between">
        <h3 className="text-slate-500 dark:text-slate-400 font-medium">{title}</h3>
        <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
    </div>
);

const ActionCard: React.FC<{ title: string, description: string, onClick: () => void, icon: React.ReactNode, color: 'primary' | 'yellow' | 'red', disabled?: boolean }> = ({ title, description, onClick, icon, color, disabled }) => {
    const colorClasses = { primary: 'bg-primary-500 hover:bg-primary-600', yellow: 'bg-yellow-500 hover:bg-yellow-600', red: 'bg-red-500 hover:bg-red-600' };
    return (
        <div className={`p-6 rounded-lg shadow-md flex flex-col justify-between text-white ${colorClasses[color]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} onClick={!disabled ? onClick : undefined}>
            <div>
                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8">{icon}</div>
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>
                <p className="opacity-90">{description}</p>
            </div>
        </div>
    );
};

const CategorySelector: React.FC<{categories: string[]; onSelectCategory: (category: string) => void; onCancel: () => void;}> = ({ categories, onSelectCategory, onCancel }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">카테고리 선택</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">풀고 싶은 문제의 카테고리를 선택해주세요.</p>
        {categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories.map(cat => (
                    <button key={cat} onClick={() => onSelectCategory(cat)} className="w-full text-center bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-semibold p-4 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900 transition-colors">{cat}</button>
                ))}
            </div>
        ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">아직 등록된 문제가 없습니다. 먼저 문제를 추가해주세요.</p>
        )}
        <div className="mt-6 text-right">
            <button onClick={onCancel} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors">취소</button>
        </div>
    </div>
);

const QuizMode: React.FC<{questions: Question[]; onUpdateStatus: (id: number, is_incorrect: boolean) => void; isReviewMode: boolean; onFinish: () => void;}> = ({ questions, onUpdateStatus, isReviewMode, onFinish }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    
    const currentQuestion = questions[currentIdx];
    const isCorrect = selectedOption === currentQuestion.answer;

    const handleOptionClick = (option: string) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);
        if (option !== currentQuestion.answer) {
            onUpdateStatus(currentQuestion.id, true);
        }
    };
    
    const handleNext = () => {
        setIsAnswered(false);
        setSelectedOption(null);
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(currentIdx + 1);
        } else {
            onFinish();
        }
    };

    const handleMastered = () => {
        onUpdateStatus(currentQuestion.id, false);
        handleNext();
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl">
            <div className="flex justify-between items-start mb-4">
                <div><span className="text-sm font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300 py-1 px-3 rounded-full">{currentQuestion.category}</span></div>
                <span className="text-lg font-bold text-slate-600 dark:text-slate-400">{currentIdx + 1} / {questions.length}</span>
            </div>
            <div className="prose prose-lg dark:prose-invert max-w-none mb-6 text-slate-900 dark:text-slate-100"><p className="text-2xl font-semibold leading-relaxed">{currentQuestion.question}</p></div>
            <div className="space-y-4">
                {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    let optionClass = "bg-slate-100 dark:bg-slate-700 hover:bg-primary-100 dark:hover:bg-primary-900/50";
                    if (isAnswered) {
                        if (option === currentQuestion.answer) {
                            optionClass = "bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200";
                        } else if (isSelected && !isCorrect) {
                            optionClass = "bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200";
                        }
                    }
                    return (
                        <button key={idx} onClick={() => handleOptionClick(option)} disabled={isAnswered} className={`w-full text-left p-4 rounded-lg border-2 border-transparent transition-all duration-200 ${optionClass} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{option}</span>
                        </button>
                    );
                })}
            </div>
            {isAnswered && (
                <div className="mt-6 p-4 rounded-lg bg-slate-100 dark:bg-slate-900/50">
                    <div className="flex items-center mb-2">
                        {isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500 mr-2"/> : <XCircleIcon className="w-6 h-6 text-red-500 mr-2"/>}
                        <h3 className={`text-xl font-bold ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{isCorrect ? '정답입니다!' : '오답입니다.'}</h3>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                        <p><strong>정답:</strong> {currentQuestion.answer}</p>
                        <p><strong>해설:</strong> {currentQuestion.explanation}</p>
                    </div>
                </div>
            )}
            <div className="mt-8 flex justify-end space-x-4">
                <button onClick={onFinish} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-3 px-6 rounded-lg transition-colors">그만하기</button>
                {isAnswered && (
                     <>
                        {isReviewMode && (<button onClick={handleMastered} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">이해했어요!</button>)}
                        <button onClick={handleNext} className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">{currentIdx < questions.length - 1 ? '다음 문제' : '완료'}</button>
                    </>
                )}
            </div>
        </div>
    );
};

const ManageQuestions: React.FC<{questions: Question[]; onDelete: (ids: number[]) => void;}> = ({ questions, onDelete }) => {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const handleSelect = (id: number) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => { setSelectedIds(e.target.checked ? questions.map(q => q.id) : []); };
    const handleDelete = () => {
        if (selectedIds.length === 0 || !window.confirm(`${selectedIds.length}개의 문제를 정말 삭제하시겠습니까?`)) return;
        onDelete(selectedIds);
        setSelectedIds([]);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">문제 관리</h2>
                <button onClick={handleDelete} disabled={selectedIds.length === 0} className="flex items-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <TrashIcon className="w-5 h-5 mr-2" />
                    <span>선택 삭제 ({selectedIds.length})</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th scope="col" className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === questions.length} className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" /></th>
                            <th scope="col" className="px-6 py-3">문제</th>
                            <th scope="col" className="px-6 py-3">카테고리</th>
                            <th scope="col" className="px-6 py-3">정답</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questions.map(q => (
                            <tr key={q.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/50">
                                <td className="w-4 p-4"><input type="checkbox" checked={selectedIds.includes(q.id)} onChange={() => handleSelect(q.id)} className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600" /></td>
                                <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{q.question.substring(0, 50)}...</td>
                                <td className="px-6 py-4">{q.category}</td>
                                <td className="px-6 py-4">{q.answer}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {questions.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">등록된 문제가 없습니다.</p>}
            </div>
        </div>
    );
};

const parseQuizFile = (text: string): Omit<NewQuestion, 'category'>[] => {
    return text.split('—').filter(b => b.trim()).map((block, index) => {
        try {
            const problemMatch = block.match(/문제:(.*?)(?=답:)/s);
            const answerMatch = block.match(/답:(.*?)(?=해설:)/s);
            const explanationMatch = block.match(/해설:(.*)/s);
            if (!problemMatch || !answerMatch || !explanationMatch) throw new Error("필수 필드(문제, 답, 해설) 누락");

            const qAndO = problemMatch[1].trim();
            const optionRegex = /(①|②|③|④|⑤)(.*?)(?=\s*(?:①|②|③|④|⑤)|$)/gs;
            const matches = [...qAndO.matchAll(optionRegex)];
            if (matches.length < 2) throw new Error("선택지 2개 이상 필요");

            const options = matches.map(m => (m[1] + m[2]).trim());
            const questionText = qAndO.substring(0, matches[0].index).trim();
            if (!questionText) throw new Error("문제 내용 누락");

            const answer = options.find(opt => opt.startsWith(answerMatch[1].trim()));
            if (!answer) throw new Error(`답 '${answerMatch[1].trim()}' 불일치`);

            return { question: questionText, options, answer, explanation: explanationMatch[1].trim() };
        } catch (e: any) {
            throw new Error(`${index + 1}번째 문제 파싱 오류: ${e.message}`);
        }
    });
};

const UploadModal: React.FC<{onClose: () => void; onAddQuestion: (q: NewQuestion) => void; onAddQuestions: (qs: NewQuestion[]) => void;}> = ({ onClose, onAddQuestion, onAddQuestions }) => {
    const [mode, setMode] = useState<'manual' | 'bulk'>('manual');
    const [formData, setFormData] = useState({ question: '', options: '', answer: '', explanation: '', category: '' });
    const [file, setFile] = useState<File | null>(null);
    const [bulkCategory, setBulkCategory] = useState('');
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const optionsArray = formData.options.split('\n').map(opt => opt.trim()).filter(Boolean);
        if (optionsArray.length < 2) return alert("선택지는 2개 이상이어야 합니다.");
        if (!optionsArray.includes(formData.answer.trim())) return alert("정답은 선택지에 포함되어야 합니다.");
        onAddQuestion({
            question: formData.question.trim(), options: optionsArray, answer: formData.answer.trim(),
            explanation: formData.explanation.trim(), category: formData.category.trim() || "미분류"
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBulkError(null);
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleBulkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return setBulkError("파일을 선택해주세요.");
        if (!bulkCategory.trim()) return setBulkError("카테고리를 입력해주세요.");
        setIsProcessing(true); setBulkError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = parseQuizFile(event.target?.result as string);
                onAddQuestions(parsed.map(q => ({ ...q, category: bulkCategory.trim() })));
            } catch (error: any) {
                setBulkError(error.message);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => { setBulkError("파일 읽기 오류"); setIsProcessing(false); };
        reader.readAsText(file);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">새 문제 추가</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-3xl leading-none">&times;</button>
                </div>
                
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setMode('manual')} className={`${mode === 'manual' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            개별 입력
                        </button>
                        <button onClick={() => setMode('bulk')} className={`${mode === 'bulk' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            파일로 대량 등록
                        </button>
                    </nav>
                </div>

                {mode === 'manual' ? (
                     <form onSubmit={handleManualSubmit} className="space-y-4 mt-6">
                        <div>
                            <label htmlFor="question" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">문제</label>
                            <textarea id="question" name="question" value={formData.question} onChange={handleManualChange} rows={3} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" required></textarea>
                        </div>
                        <div>
                            <label htmlFor="options" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">선택지 (한 줄에 하나씩 입력)</label>
                            <textarea id="options" name="options" value={formData.options} onChange={handleManualChange} rows={4} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" required></textarea>
                        </div>
                        <div>
                            <label htmlFor="answer" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">정답</label>
                            <input type="text" id="answer" name="answer" value={formData.answer} onChange={handleManualChange} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" required />
                        </div>
                        <div>
                            <label htmlFor="explanation" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">해설</label>
                            <textarea id="explanation" name="explanation" value={formData.explanation} onChange={handleManualChange} rows={3} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" required></textarea>
                        </div>
                        <div>
                            <label htmlFor="category" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">카테고리</label>
                            <input type="text" id="category" name="category" value={formData.category} onChange={handleManualChange} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" placeholder="예: 역사" required />
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                             <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors">취소</button>
                             <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">문제 추가</button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleBulkSubmit} className="space-y-4 mt-6">
                        <div>
                            <label htmlFor="category-bulk" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">카테고리</label>
                            <input type="text" id="category-bulk" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" placeholder="파일의 모든 문제에 적용됩니다" required />
                        </div>
                         <div>
                            <label htmlFor="file-upload" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">문제 파일 (.txt)</label>
                             <input type="file" id="file-upload" accept=".txt" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" required />
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                각 문제는 '—'로 구분하고, '문제:', '답:', '해설:' 형식을 지켜주세요.
                            </p>
                        </div>
                        {bulkError && <p className="text-sm text-red-500 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">{bulkError}</p>}
                        <div className="flex justify-end space-x-3 pt-2">
                             <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors">취소</button>
                             <button type="submit" disabled={isProcessing} className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                                {isProcessing ? '처리 중...' : '업로드'}
                             </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default App;