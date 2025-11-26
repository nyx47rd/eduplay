import React, { useState, useEffect } from 'react';
import { QuizItem, MatchingPair, TrueFalseItem, FlashcardItem, SequenceItem, ClozeItem, ScrambleItem } from '../types';
import { Plus, X, Edit, Trash2, Check, CornerDownLeft, Eye } from 'lucide-react';

const useCtrlEnter = (action: () => void) => {
    return (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            action();
        }
    };
};

/* --- QUIZ EDITOR --- */
export const QuizEditor = ({ items, setItems }: { items: QuizItem[], setItems: (i: QuizItem[]) => void }) => {
    const [tempQ, setTempQ] = useState({ q: '', options: ['', ''], correct: 0 });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const addOption = () => {
        if (tempQ.options.length < 8) setTempQ({ ...tempQ, options: [...tempQ.options, ''] });
    };
    
    const removeOption = (idx: number) => { 
        if (tempQ.options.length > 2) setTempQ({ ...tempQ, options: tempQ.options.filter((_, i) => i !== idx), correct: 0 });
    };

    const handleSave = () => {
        if (!tempQ.q.trim() || tempQ.options.some(o => !o.trim())) return alert("Lütfen soru ve tüm seçenekleri doldurun.");
        const newItem = { question: tempQ.q, options: tempQ.options, correctAnswer: tempQ.options[tempQ.correct] };
        
        if (editingIndex !== null) {
            const updated = [...items];
            updated[editingIndex] = newItem;
            setItems(updated);
            setEditingIndex(null);
        } else {
            // Replaces the item if limit is 1, essentially
            if (items.length >= 1) {
                 if(!window.confirm("Bu modda sadece 1 soru olabilir. Mevcut soruyu değiştirmek istiyor musunuz?")) return;
                 setItems([newItem]);
            } else {
                 setItems([newItem]);
            }
        }
        setTempQ({ q: '', options: ['', ''], correct: 0 });
    };

    const onKeyDown = useCtrlEnter(handleSave);

    useEffect(() => {
        if (items.length > 0 && editingIndex === null) {
            const item = items[0];
            const correctIdx = item.options.indexOf(item.correctAnswer);
            setTempQ({ q: item.question, options: [...item.options], correct: correctIdx !== -1 ? correctIdx : 0 });
            setEditingIndex(0);
        }
    }, [items]);

    return (
      <div className="space-y-4" onKeyDown={onKeyDown}>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
            <label className="block text-slate-400 text-sm mb-2">Soru Metni</label>
            <textarea
                rows={2}
                placeholder="Soru metni..." 
                value={tempQ.q} 
                onChange={e => setTempQ({...tempQ, q: e.target.value})} 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white mb-4 focus:border-indigo-500 outline-none resize-none break-words" 
            />
            <label className="block text-slate-400 text-sm mb-2">Seçenekler (Doğru cevabı işaretleyin)</label>
            <div className="space-y-3">
                {tempQ.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <input 
                            type="radio" 
                            name="correct" 
                            checked={tempQ.correct === idx} 
                            onChange={() => setTempQ({...tempQ, correct: idx})} 
                            className="accent-indigo-500 h-5 w-5 cursor-pointer"
                        />
                        <input 
                            placeholder={`Seçenek ${idx + 1}`} 
                            value={opt} 
                            onChange={e => {const newOpts = [...tempQ.options]; newOpts[idx] = e.target.value; setTempQ({...tempQ, options: newOpts});}} 
                            className={`flex-grow bg-slate-900 border rounded-lg p-2.5 text-white text-sm transition-colors outline-none ${tempQ.correct === idx ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-600 focus:border-slate-400'}`}
                        />
                        {tempQ.options.length > 2 && <button onClick={() => removeOption(idx)} className="p-2 text-slate-500 hover:text-red-400"><X size={18} /></button>}
                    </div>
                ))}
            </div>
            
            <div className="flex justify-between items-center mt-4">
                {tempQ.options.length < 8 && (
                    <button onClick={addOption} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded flex items-center transition-colors">
                        <Plus size={14} className="mr-1"/> Seçenek Ekle
                    </button>
                )}
                <button 
                    onClick={handleSave}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-500 transition-colors flex items-center"
                >
                    <Check size={18} className="mr-2"/> {editingIndex !== null || items.length > 0 ? 'Soruyu Güncelle' : 'Soruyu Ekle'}
                </button>
            </div>
            <p className="text-right text-xs text-slate-500 mt-2">Kısayol: CTRL + Enter</p>
          </div>
      </div>
    );
};

/* --- MATCHING EDITOR --- */
export const MatchingEditor = ({ pairs, setPairs }: { pairs: MatchingPair[], setPairs: (p: MatchingPair[]) => void }) => {
    const [temp, setTemp] = useState({ a: '', b: '' });
    const [editing, setEditing] = useState<number | null>(null);

    const save = () => {
         if (!temp.a || !temp.b) return;
         const newPair = { id: editing !== null ? pairs[editing].id : Math.random().toString(), itemA: temp.a, itemB: temp.b };
         if (editing !== null) {
            const updated = [...pairs];
            updated[editing] = newPair;
            setPairs(updated);
            setEditing(null);
         } else {
            if (pairs.length >= 5) return alert("En fazla 5 çift eklenebilir.");
            setPairs([...pairs, newPair]);
         }
         setTemp({ a: '', b: '' });
    };

    const onKeyDown = useCtrlEnter(save);

    return ( 
      <div className="space-y-4"> 
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4" onKeyDown={onKeyDown}> 
                <input placeholder="Öge A" value={temp.a} onChange={e => setTemp({...temp, a: e.target.value})} className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" /> 
                <input placeholder="Öge B" value={temp.b} onChange={e => setTemp({...temp, b: e.target.value})} className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" /> 
                <button onClick={save} className="md:col-span-2 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors flex items-center justify-center">
                    {editing !== null ? 'Güncelle' : <><Plus size={18} className="mr-2"/> Çift Ekle</>}
                </button>
          </div> 
          <div className="space-y-2">
              {pairs.map((p, idx) => (
                  <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center group hover:border-slate-500 transition-colors">
                      <span className="text-slate-300 text-sm truncate break-words w-full mr-2">{p.itemA} ↔ {p.itemB}</span>
                      <div className="flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-white" onClick={() => { setTemp({a: p.itemA, b: p.itemB}); setEditing(idx); }}><Edit size={16}/></button>
                          <button className="p-2 text-slate-400 hover:text-red-400" onClick={() => setPairs(pairs.filter((_, i) => i !== idx))}><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
          </div> 
      </div> 
    );
};

/* --- SEQUENCE EDITOR --- */
export const SequenceEditor = ({ items, setItems, question, setQuestion }: { items: string[], setItems: (i: string[]) => void, question: string, setQuestion: (q: string) => void }) => {
    const [temp, setTemp] = useState('');
    
    const add = () => {
        if(!temp) return;
        setItems([...items, temp]);
        setTemp('');
    };

    const onKeyDown = useCtrlEnter(add);

    return (
        <div className="space-y-4">
            <input placeholder="Soru / Talimat (örn: Küçükten büyüğe sırala)" value={question} onChange={e => setQuestion(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
            <div className="flex gap-2">
                <input 
                    placeholder="Sıralanacak öge..." 
                    value={temp} 
                    onChange={e => setTemp(e.target.value)} 
                    className="flex-grow bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" 
                    onKeyDown={onKeyDown}
                />
                <button onClick={add} className="bg-indigo-600 text-white px-6 rounded-lg font-bold hover:bg-indigo-500 transition-colors">Ekle</button>
            </div>
            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                        <span className="text-white break-words"><span className="text-slate-500 font-bold mr-3">{idx+1}.</span>{item}</span>
                        <Trash2 size={16} className="text-red-400 cursor-pointer flex-shrink-0" onClick={() => setItems(items.filter((_, i) => i !== idx))} />
                    </div>
                ))}
            </div>
        </div>
    );
};

/* --- SCRAMBLE EDITOR --- */
export const ScrambleEditor = ({ items, setItems }: { items: ScrambleItem[], setItems: (i: ScrambleItem[]) => void }) => {
    const [temp, setTemp] = useState({ w: '', h: '' });

    const add = () => {
        if(!temp.w) return;
        if(items.length >= 5) return alert("En fazla 5 kelime.");
        setItems([...items, { word: temp.w, hint: temp.h }]);
        setTemp({w:'', h:''});
    };

    const onKeyDown = useCtrlEnter(add);

    return (
        <div className="space-y-4">
             <div className="flex gap-2" onKeyDown={onKeyDown}>
                 <input placeholder="Kelime" value={temp.w} onChange={e => setTemp({...temp, w: e.target.value})} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                 <input placeholder="İpucu (Opsiyonel)" value={temp.h} onChange={e => setTemp({...temp, h: e.target.value})} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                 <button onClick={add} className="bg-indigo-600 text-white px-6 rounded-lg font-bold hover:bg-indigo-500 transition-colors">Ekle</button>
             </div>
             <div>
                 {items.map((item, idx) => (
                     <div key={idx} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700 mb-2">
                         <span className="text-white break-words">{item.word} <span className="text-slate-500 text-xs ml-2">({item.hint || 'İpucu yok'})</span></span>
                         <Trash2 size={16} className="text-red-400 cursor-pointer flex-shrink-0" onClick={() => setItems(items.filter((_, i) => i !== idx))} />
                     </div>
                 ))}
             </div>
        </div>
    );
};

/* --- CLOZE EDITOR --- */
export const ClozeEditor = ({ text, setText }: { text: string, setText: (t: string) => void }) => {
    // This component now manages the text input more gracefully
    const regex = /\[(.*?)\]/g;
    const parts = text.split(regex);
    const matchCount = (text.match(regex) || []).length;

    return (
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
             <div>
                <div className="flex justify-between items-center mb-2">
                    <p className="text-slate-400 text-sm">Metni aşağıya yazın. Boşluk olmasını istediğiniz kelimeleri <span className="text-white font-mono bg-slate-700 px-1 rounded">[köşeli parantez]</span> içine alın.</p>
                </div>
                <textarea 
                    rows={6} 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white font-mono leading-relaxed focus:border-indigo-500 outline-none resize-none" 
                    placeholder="Örnek: Türkiye'nin başkenti [Ankara]'dır."
                />
             </div>
             
             {text && (
                 <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center"><Eye size={12} className="mr-1"/> Önizleme</h4>
                    <p className="text-slate-300 leading-relaxed break-words">
                        {parts.map((part, i) => {
                            // Even indices are normal text, odd indices are captures from regex (the answers)
                            if (i % 2 === 0) return <span key={i}>{part}</span>;
                            return <span key={i} className="mx-1 border-b-2 border-indigo-500 text-indigo-400 px-1 font-bold">{part}</span>;
                        })}
                    </p>
                    {matchCount === 0 && <p className="text-yellow-500 text-xs mt-2">Henüz hiç boşluk tanımlanmadı.</p>}
                 </div>
             )}
             
             <div className="flex justify-end">
                 <button className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm cursor-default flex items-center border border-slate-700">
                    <Check size={14} className="mr-2 text-emerald-500"/>
                    {matchCount} Boşluk Tespit Edildi
                 </button>
             </div>
        </div>
    );
};