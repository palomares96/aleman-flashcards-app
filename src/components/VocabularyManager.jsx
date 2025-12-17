import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { getDocs, collection, addDoc, doc, updateDoc, deleteDoc, query, limit } from "firebase/firestore";
import { initialFormData } from '../config.js'; 

// --- ICONOS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;

// --- UTILIDAD DE COLOR PARA LA LISTA ---
const getWordColorClass = (type, gender) => {
    if (type === 'noun') {
        if (gender === 'm') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
        if (gender === 'f') return 'border-pink-500/30 bg-pink-500/10 text-pink-300';
        if (gender === 'n') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
    }
    if (type === 'verb') return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
    if (type === 'adjective') return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
    if (type === 'other') return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
};

// Badge text para mostrar en la lista (usa género para sustantivos)
const getBadgeText = (type, gender) => {
    if (type === 'noun') return gender ? gender : 'Sust';
    if (type === 'verb') return 'Verb';
    if (type === 'adjective') return 'Adj';
    if (type === 'preposition') return 'Prep';
    return 'Otros';
};

function VocabularyManager({ user }) {
    const [allWords, setAllWords] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredWords, setFilteredWords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWord, setSelectedWord] = useState(null);
    const [formData, setFormData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // --- CARGA DE DATOS ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [wordsSnapshot, categoriesSnapshot] = await Promise.all([
                    getDocs(query(collection(db, `users/${user.uid}/words`), limit(300))),
                    getDocs(query(collection(db, "categories"), limit(100)))
                ]);
                const wordsList = wordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Ordenar alfabéticamente por defecto
                wordsList.sort((a, b) => a.german.localeCompare(b.german));
                
                setAllWords(wordsList);
                setFilteredWords(wordsList);
                const cats = categoriesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name_es }));
                // Asegurar que 'Otros' esté presente en la lista local de categorías
                if (!cats.some(c => c.name === 'Otros')) {
                    cats.unshift({ id: 'otros-local', name: 'Otros' });
                }
                setCategories(cats);
            } catch (e) {
                console.error("Error cargando datos", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // --- FILTRADO ---
    useEffect(() => {
        if (!searchTerm) {
            setFilteredWords(allWords);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredWords(allWords.filter(w => 
                w.german.toLowerCase().includes(lowerTerm) || 
                w.spanish.toLowerCase().includes(lowerTerm)
            ));
        }
    }, [searchTerm, allWords]);
    
    // --- MANEJADORES ---
    const handleSelectWord = (word) => {
        const wordCategory = categories.find(c => c.id === word.categoryId);
        setFormData({
            ...initialFormData,
            ...word,
            category: wordCategory ? wordCategory.name : '',
            attributes: { ...initialFormData.attributes, ...word.attributes, separablePrefixes: word.attributes?.separablePrefixes || [{ prefix: '', meaning: '' }] }
        });
        setFeedback({ type: '', message: '' });
        setSelectedWord(word); // Esto dispara el cambio de vista en móvil
    };

    const handleBackToList = () => {
        setSelectedWord(null);
        setFormData(null);
        setFeedback({ type: '', message: '' });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const [field, index, subfield] = name.split('.');

        if (field === 'separablePrefixes') {
            const newPrefixes = [...formData.attributes.separablePrefixes];
            newPrefixes[index][subfield] = value;
            setFormData(p => ({ ...p, attributes: { ...p.attributes, separablePrefixes: newPrefixes } }));
        } else if (Object.keys(initialFormData.attributes).includes(name)) {
            setFormData(p => ({ ...p, attributes: { ...p.attributes, [name]: type === 'checkbox' ? checked : value } }));
        } else {
            setFormData(p => ({ ...p, [name]: value }));
        }
    };
    
    const addPrefix = () => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: [...p.attributes.separablePrefixes, { prefix: '', meaning: '' }]}}));
    const removePrefix = (index) => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: p.attributes.separablePrefixes.filter((_, i) => i !== index)}}));

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedWord) return;
        setIsSaving(true);
        try {
            const categoryName = (formData.category.trim() || 'Otros');
            let categoryId = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.id;
            if (categoryName && !categoryId) {
                const newCatRef = await addDoc(collection(db, "categories"), { name_es: categoryName, name_de: categoryName });
                setCategories(p => [...p, { id: newCatRef.id, name: categoryName }]);
                categoryId = newCatRef.id;
            }

            const updatedWord = {
                german: formData.german.trim(),
                spanish: formData.spanish.trim(),
                type: formData.type,
                difficulty: parseInt(formData.difficulty),
                ...(categoryId && { categoryId }),
                attributes: {}
            };
            
            if (formData.type === 'noun') updatedWord.attributes.gender = formData.attributes.gender;
            if (formData.type === 'preposition') updatedWord.attributes.case = formData.attributes.case;
            if (formData.type === 'verb') {
                updatedWord.attributes.isRegular = formData.attributes.isRegular;
                if (!formData.attributes.isRegular) {
                    updatedWord.attributes.pastTense = formData.attributes.pastTense;
                    updatedWord.attributes.participle = formData.attributes.participle;
                }
                const prefixes = formData.attributes.separablePrefixes.filter(p => p.prefix.trim() && p.meaning.trim());
                if (prefixes.length > 0) updatedWord.attributes.separablePrefixes = prefixes;
            }
            
            await updateDoc(doc(db, `users/${user.uid}/words`, selectedWord.id), updatedWord);
            setAllWords(prev => prev.map(w => w.id === selectedWord.id ? { id: selectedWord.id, ...updatedWord } : w));
            
            setFeedback({ type: 'success', message: '¡Guardado con éxito!' });
            setTimeout(() => {
                setFeedback({ type: '', message: '' });
                // No cerramos el formulario para permitir seguir editando si se quiere
            }, 2000);

        } catch (err) { console.error(err); setFeedback({ type: 'error', message: 'Error al actualizar.' }); } 
        finally { setIsSaving(false); }
    };
    
    const handleDelete = async () => {
        if (!selectedWord || !window.confirm(`¿Seguro que quieres eliminar "${selectedWord.german}"?`)) return;
        setIsSaving(true);
        try {
            await deleteDoc(doc(db, `users/${user.uid}/words`, selectedWord.id));
            setAllWords(prev => prev.filter(w => w.id !== selectedWord.id));
            handleBackToList(); // Volver a la lista tras borrar
        } catch (err) { console.error(err); setFeedback({ type: 'error', message: 'Error al borrar.' }); } 
        finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="flex h-full items-center justify-center text-white/50 animate-pulse">Cargando biblioteca...</div>;

    // Clases comunes para inputs estilo Glassmorphism
    // NOTA: Hemos añadido 'appearance-none' para los selects y estilo para las options
    const inputClass = "w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 focus:bg-white/10 transition-all placeholder-gray-500";
    const labelClass = "text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block tracking-wider";
    // Clase especial para las opciones del select para que se vean en fondo oscuro
    const optionClass = "bg-slate-900 text-white py-2";

    // --- RENDER ---
    return (
        // Contenedor principal con altura fija relativa al viewport para permitir scroll interno
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] w-full relative">
            
            {/* --- LISTA DE PALABRAS (COLUMNA IZQUIERDA) --- */}
            {/* En móvil: Se oculta si hay una palabra seleccionada. En Desktop: Siempre visible (1/3 ancho) */}
            <div className={`
                ${selectedWord ? 'hidden lg:flex' : 'flex'} 
                w-full lg:w-1/3 flex-col bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all
            `}>
                {/* Buscador fijo arriba */}
                <div className="p-4 border-b border-white/5 bg-slate-900/80">
                    <div className="relative group">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar en tu vocabulario..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 bg-black/20 text-white rounded-xl border border-white/10 focus:border-blue-500/50 focus:bg-black/30 outline-none transition-all placeholder-gray-500 text-sm font-medium" 
                        />
                    </div>
                </div>
                
                {/* Lista scrolleable */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {filteredWords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                            <p>No se encontraron palabras.</p>
                        </div>
                    ) : (
                        filteredWords.map(word => (
                            <button 
                                key={word.id} 
                                onClick={() => handleSelectWord(word)} 
                                className={`
                                    w-full text-left p-4 rounded-2xl transition-all duration-200 border
                                    flex flex-col gap-1 relative overflow-hidden group
                                    ${selectedWord?.id === word.id 
                                        ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.15)]' 
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-center w-full relative z-10">
                                    <span className={`font-bold text-lg tracking-tight ${selectedWord?.id === word.id ? 'text-white' : 'text-gray-200'}`}>
                                        {word.german}
                                    </span>
                                    {/* Badge pequeño del tipo */}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border ${getWordColorClass(word.type, word.attributes?.gender)}`}>
                                        {getBadgeText(word.type, word.attributes?.gender)}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-400 font-medium relative z-10 truncate w-full pr-4">
                                    {word.spanish}
                                </span>
                            </button>
                        ))
                    )}
                </div>
                <div className="p-3 bg-slate-900/60 border-t border-white/5 text-center text-xs text-gray-500">
                    {filteredWords.length} palabras totales
                </div>
            </div>

            {/* --- EDITOR (COLUMNA DERECHA O PANTALLA COMPLETA EN MÓVIL) --- */}
            {/* En móvil: Solo visible si hay palabra seleccionada. En Desktop: Siempre visible (2/3 ancho) */}
            <div className={`
                ${!selectedWord ? 'hidden lg:flex' : 'flex'} 
                w-full lg:w-2/3 flex-col bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl
            `}>
                {!selectedWord ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600">
                        <EditIcon />
                        <p className="mt-4 text-lg font-light text-gray-500">Selecciona una palabra para ver detalles</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Header del Editor */}
                        <div className="flex items-center gap-4 p-4 lg:p-6 border-b border-white/10 bg-slate-900/30">
                            <button onClick={handleBackToList} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-white">
                                <ArrowLeftIcon />
                            </button>
                            <div className="flex-1">
                                <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight leading-none">Editar Palabra</h2>
                            </div>
                            <button type="button" onClick={handleDelete} className="p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors" title="Borrar palabra">
                                <TrashIcon />
                            </button>
                        </div>

                        {/* Formulario Scrolleable */}
                        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                            <form onSubmit={handleUpdate} className="space-y-8 max-w-3xl mx-auto">
                                
                                {/* Campos Principales */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelClass}>Alemán</label>
                                        <input name="german" value={formData.german} onChange={handleChange} className={`${inputClass} text-lg font-bold`} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Español</label>
                                        <input name="spanish" value={formData.spanish} onChange={handleChange} className={`${inputClass} text-lg font-medium`} />
                                    </div>
                                </div>

                                {/* Configuración (Selectores con corrección de fondo oscuro en options) */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Tipo</label>
                                        <div className="relative">
                                            <select name="type" value={formData.type} onChange={handleChange} className={`${inputClass} cursor-pointer`}>
                                                <option value="noun" className={optionClass}>Sustantivo</option>
                                                <option value="verb" className={optionClass}>Verbo</option>
                                                <option value="adjective" className={optionClass}>Adjetivo</option>
                                                <option value="preposition" className={optionClass}>Preposición</option>
                                                <option value="other" className={optionClass}>Otros</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Nivel</label>
                                        <select name="difficulty" value={formData.difficulty} onChange={handleChange} className={`${inputClass} cursor-pointer`}>
                                            {[1,2,3,4,5].map(n => <option key={n} value={n} className={optionClass}>{n}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className={labelClass}>Categoría</label>
                                        <input name="category" value={formData.category} onChange={handleChange} list="categories-list" className={inputClass} placeholder="Sin categoría" />
                                        <datalist id="categories-list">{categories.map(cat => <option key={cat.id} value={cat.name} />)}</datalist>
                                    </div>
                                </div>

                                {/* Paneles Condicionales (Atributos) */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                    {formData.type === 'noun' && (
                                        <div>
                                            <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-4">Detalles del Sustantivo</h3>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['m', 'f', 'n'].map(g => (
                                                    <label key={g} className={`cursor-pointer border rounded-xl py-3 text-center transition-all ${formData.attributes.gender === g ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' : 'bg-slate-800/50 border-transparent text-gray-400 hover:bg-slate-700'}`}>
                                                        <input type="radio" name="gender" value={g} checked={formData.attributes.gender === g} onChange={handleChange} className="hidden"/>
                                                        <span className="font-bold uppercase text-sm block">{g === 'm' ? 'Der' : g === 'f' ? 'Die' : 'Das'}</span>
                                                        <span className="text-[10px] opacity-60 uppercase">{g === 'm' ? 'Masc' : g === 'f' ? 'Fem' : 'Neu'}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {formData.type === 'verb' && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                                <h3 className="text-sm font-bold text-orange-300 uppercase tracking-wider">Conjugación</h3>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <span className="text-xs font-medium text-gray-300">¿Es regular?</span>
                                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${formData.attributes.isRegular ? 'bg-green-500' : 'bg-gray-600'}`}>
                                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${formData.attributes.isRegular ? 'translate-x-6' : ''}`}></div>
                                                    </div>
                                                    <input type="checkbox" name="isRegular" checked={formData.attributes.isRegular} onChange={handleChange} className="hidden" />
                                                </label>
                                            </div>
                                            
                                            {!formData.attributes.isRegular && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                                                    <div><label className={labelClass}>Präteritum</label><input name="pastTense" value={formData.attributes.pastTense} onChange={handleChange} placeholder="Ej: ging" className={inputClass} /></div>
                                                    <div><label className={labelClass}>Partizip II</label><input name="participle" value={formData.attributes.participle} onChange={handleChange} placeholder="Ej: gegangen" className={inputClass} /></div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-xs text-gray-400 block mb-3 uppercase font-bold tracking-wider">Prefijos Separables</label>
                                                {formData.attributes.separablePrefixes.map((p, i) => (
                                                    <div key={i} className="flex gap-3 mb-3">
                                                        <input name={`separablePrefixes.${i}.prefix`} value={p.prefix} onChange={handleChange} placeholder="Prefijo" className={`w-1/3 ${inputClass}`}/>
                                                        <input name={`separablePrefixes.${i}.meaning`} value={p.meaning} onChange={handleChange} placeholder="Significado completo" className={`flex-1 ${inputClass}`}/>
                                                        <button type="button" onClick={() => removePrefix(i)} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">×</button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={addPrefix} className="text-xs text-orange-400 hover:text-orange-300 font-bold uppercase tracking-wide mt-2">+ Añadir prefijo</button>
                                            </div>
                                        </div>
                                    )}

                                    {formData.type === 'preposition' && (
                                        <div>
                                            <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider mb-3">Caso Gramatical</h3>
                                            <select name="case" value={formData.attributes.case} onChange={handleChange} className={inputClass}>
                                                <option value="" className={optionClass}>Selecciona caso...</option>
                                                <option value="Akkusativ" className={optionClass}>Akkusativ (Acusativo)</option>
                                                <option value="Dativ" className={optionClass}>Dativ (Dativo)</option>
                                                <option value="Genitiv" className={optionClass}>Genitiv (Genitivo)</option>
                                                <option value="Wechselpräposition" className={optionClass}>Wechselpräposition (Mixta)</option>
                                            </select>
                                        </div>
                                    )}
                                    
                                    {(formData.type === 'adjective' || formData.type === 'other') && <p className="text-sm text-gray-500 italic text-center">No hay atributos especiales para este tipo.</p>}
                                </div>

                                {/* Botón Guardar Flotante o Fijo */}
                                <div className="pt-4 pb-2">
                                    <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${isSaving ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'}`}>
                                        {isSaving ? <span className="animate-pulse">Guardando...</span> : <><SaveIcon /> Guardar Cambios</>}
                                    </button>
                                    
                                    {/* Feedback Message */}
                                    <div className={`mt-4 overflow-hidden transition-all duration-300 ${feedback.message ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className={`text-center text-sm font-bold p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            {feedback.message}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VocabularyManager;