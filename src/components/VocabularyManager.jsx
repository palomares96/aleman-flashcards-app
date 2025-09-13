import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js'; // Ajusta la ruta
import { getDocs, collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { initialFormData } from '../config.js'; // Importa desde tu nuevo config.js

// =================================================================================
// COMPONENTE #3: Gestor de Vocabulario (¡NUEVO!)
// =================================================================================
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

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [wordsSnapshot, categoriesSnapshot] = await Promise.all([
                getDocs(collection(db, `users/${user.uid}/words`)),
                getDocs(collection(db, "categories"))
            ]);
            const wordsList = wordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllWords(wordsList);
            setFilteredWords(wordsList);
            setCategories(categoriesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name_es })));
            setIsLoading(false);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredWords(allWords);
        } else {
            setFilteredWords(
                allWords.filter(word =>
                    word.german.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    word.spanish.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
    }, [searchTerm, allWords]);
    
    const handleSelectWord = (word) => {
        setSelectedWord(word);
        // Pre-populamos el formulario con los datos de la palabra y valores por defecto
        const wordCategory = categories.find(c => c.id === word.categoryId);
        setFormData({
            ...initialFormData, // Usamos la misma base que el formulario de añadir
            ...word,
            category: wordCategory ? wordCategory.name : '',
            attributes: {
                ...initialFormData.attributes,
                ...word.attributes,
                // Aseguramos que separablePrefixes siempre sea un array
                separablePrefixes: word.attributes?.separablePrefixes || [{ prefix: '', meaning: '' }]
            }
        });
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
            // Lógica para manejar categorías (igual que en WordForm)
            const categoryName = formData.category.trim();
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
            
            const wordRef = doc(db, `users/${user.uid}/words`, selectedWord.id);
            await updateDoc(wordRef, updatedWord);
            
            // Actualizar la lista local para no tener que recargar
            setAllWords(prev => prev.map(w => w.id === selectedWord.id ? { id: selectedWord.id, ...updatedWord } : w));
            
            setFeedback({ type: 'success', message: '¡Palabra actualizada!' });
            setTimeout(() => {
                setFeedback({ type: '', message: '' });
                setSelectedWord(null); // Cierra el formulario
                setFormData(null);
            }, 2000);

        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Error al actualizar.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!selectedWord || !window.confirm(`¿Seguro que quieres borrar "${selectedWord.german}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        setIsSaving(true);
        try {
            await deleteDoc(doc(db, `users/${user.uid}/words`, selectedWord.id));
            setAllWords(prev => prev.filter(w => w.id !== selectedWord.id));
            setSelectedWord(null);
            setFormData(null);
            // Podríamos añadir un feedback de borrado si quisiéramos
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', message: 'Error al borrar.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Cargando vocabulario...</div>;

    return (
        <div className="w-full max-w-4xl mx-auto flex gap-8">
            {/* Columna de la lista de palabras */}
            <div className="w-1/3">
                <h1 className="mb-4 text-3xl font-bold text-gray-300">Gestionar</h1>
                <input type="text" placeholder="Buscar palabra..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 mb-4 bg-gray-700 rounded-md" />
                <div className="overflow-y-auto h-[70vh] pr-2">
                    {filteredWords.map(word => (
                        <button key={word.id} onClick={() => handleSelectWord(word)} className={`w-full text-center p-3 mb-2 rounded-md transition-colors ${selectedWord?.id === word.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                            <span className="font-bold">{word.german}</span>
                            <span className="text-sm text-gray-400 block">{word.spanish}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Columna del formulario de edición */}
            <div className="w-2/3">
                {!selectedWord ? (
                    // CÓDIGO MODIFICADO
                  <div className="flex items-center justify-center h-full text-gray-600">
                      <p className="text-lg font-light">Selecciona una palabra para editarla.</p>
                  </div>
                ) : (
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-2xl font-bold mb-6">Editando: <span className="text-blue-400">{selectedWord.german}</span></h2>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            {/* Reutilizamos la estructura del WordForm, pero con los datos de la palabra seleccionada */}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><input name="german" value={formData.german} onChange={handleChange} placeholder="Alemán" required className="p-3 bg-gray-700 rounded-md" /><input name="spanish" value={formData.spanish} onChange={handleChange} placeholder="Español" required className="p-3 bg-gray-700 rounded-md" /></div>
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block mb-2 text-sm text-gray-400">Tipo</label><select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 bg-gray-700 rounded-md"><option value="noun">Sustantivo</option><option value="verb">Verbo</option><option value="adjective">Adjetivo</option><option value="preposition">Preposición</option></select></div>
                                <div><label className="block mb-2 text-sm text-gray-400">Nivel</label><select name="difficulty" value={formData.difficulty} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></div>
                            </div>
                            <div><label htmlFor="category" className="block mb-2 text-sm text-gray-400">Categoría</label><input name="category" value={formData.category} onChange={handleChange} list="categories-list" id="category" placeholder="Elige o crea una" className="w-full p-3 bg-gray-700 rounded-md" /><datalist id="categories-list">{categories.map(cat => <option key={cat.id} value={cat.name} />)}</datalist></div>
                            {formData.type === 'noun' && <div className="p-4 rounded-lg bg-gray-900/50 space-y-4"><h3 className="font-semibold text-blue-400">Sustantivo</h3><select name="gender" value={formData.attributes.gender} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Género...</option><option value="m">der</option><option value="f">die</option><option value="n">das</option></select></div>}
                            {formData.type === 'preposition' && <div className="p-4 rounded-lg bg-gray-900/50 space-y-4"><h3 className="font-semibold text-green-400">Preposición</h3><select name="case" value={formData.attributes.case} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Caso...</option><option value="Akkusativ">Akkusativ</option><option value="Dativ">Dativ</option><option value="Genitiv">Genitiv</option><option value="Wechselpräposition">Wechselpräposition</option></select></div>}
                            {formData.type === 'verb' && <div className="p-4 rounded-lg bg-gray-900/50 space-y-4">
                                <h3 className="font-semibold text-pink-400">Verbo</h3><div className="flex items-center gap-4"><input name="isRegular" checked={formData.attributes.isRegular} onChange={handleChange} id="regular" type="checkbox" className="w-4 h-4" /><label htmlFor="regular">Es regular</label></div>
                                {!formData.attributes.isRegular && (<><input name="pastTense" value={formData.attributes.pastTense} onChange={handleChange} placeholder="Pretérito" required className="w-full p-3 bg-gray-700 rounded-md" /><input name="participle" value={formData.attributes.participle} onChange={handleChange} placeholder="Participio" required className="w-full p-3 bg-gray-700 rounded-md" /></>)}
                                <h4 className="pt-2 font-semibold text-pink-300">Prefijos Separables</h4>
                                {formData.attributes.separablePrefixes.map((p, i) => <div key={i} className="flex items-center gap-2">
                                    <input name={`separablePrefixes.${i}.prefix`} value={p.prefix} onChange={handleChange} placeholder="Prefijo" className="w-1/4 p-2 bg-gray-600 rounded-md"/>
                                    <span className="text-gray-400">+ {formData.german || '...'} =</span>
                                    <input name={`separablePrefixes.${i}.meaning`} value={p.meaning} onChange={handleChange} placeholder="Significado" className="flex-1 p-2 bg-gray-600 rounded-md"/>
                                    <button type="button" onClick={() => removePrefix(i)} className="p-1 text-red-500 hover:text-red-400">&times;</button>
                                </div>)}
                                <button type="button" onClick={addPrefix} className="text-sm text-blue-400 hover:text-blue-300">+ Añadir prefijo</button>
                            </div>}
                            
                            <div className="pt-2 flex items-center gap-4">
                                <button type="button" onClick={handleDelete} disabled={isSaving} className="px-6 py-3 font-bold text-red-300 bg-red-800/50 rounded-lg hover:bg-red-800/80 disabled:opacity-50">Borrar</button>
                                <button type="submit" disabled={isSaving} className="flex-1 p-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">{isSaving ? 'Guardando...' : 'Guardar Cambios'}</button>
                            </div>
                            {feedback.message && <p className={`mt-2 text-sm text-center ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{feedback.message}</p>}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VocabularyManager;