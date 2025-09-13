import { db } from '../firebase.js'; // Ajusta la ruta
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { initialFormData } from '../config.js';

import React, { useState, useEffect } from 'react';

// =================================================================================
// COMPONENTE #2: Formulario para añadir palabras
// =================================================================================

function WordForm() {
    const [formData, setFormData] = useState(initialFormData);
    const [categories, setCategories] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => { const fetchCategories = async () => { const snapshot = await getDocs(collection(db, "categories")); setCategories(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name_es }))); }; fetchCategories(); }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target; const [field, index, subfield] = name.split('.');
        if (field === 'separablePrefixes') { const newPrefixes = [...formData.attributes.separablePrefixes]; newPrefixes[index][subfield] = value; setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: newPrefixes }}));
        } else if (name in initialFormData.attributes) { setFormData(p => ({...p, attributes: {...p.attributes, [name]: type === 'checkbox' ? checked : value }}));
        } else { setFormData(p => ({...p, [name]: value })); }
    };
    
    const addPrefix = () => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: [...p.attributes.separablePrefixes, { prefix: '', meaning: '' }]}}));
    const removePrefix = (index) => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: p.attributes.separablePrefixes.filter((_, i) => i !== index)}}));

    const handleSubmit = async (e) => {
        if (!user) return
        e.preventDefault(); setIsSubmitting(true); setFeedback({ type: '', message: '' });
        const duplicateQuery = query(collection(db, `users/${user.uid}/words`), where("german", "==", formData.german.trim()));
        if (!(await getDocs(duplicateQuery)).empty) { setFeedback({ type: 'error', message: 'Esta palabra ya existe.' }); setIsSubmitting(false); return; }

        try {
            const categoryName = formData.category.trim(); let categoryId = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.id;
            if (categoryName && !categoryId) { const newCatRef = await addDoc(collection(db, "categories"), { name_es: categoryName, name_de: categoryName }); setCategories(p => [...p, { id: newCatRef.id, name: categoryName }]); categoryId = newCatRef.id; }
            
            const newWord = { 
                german: formData.german.trim(), 
                spanish: formData.spanish.trim(), 
                type: formData.type, 
                difficulty: parseInt(formData.difficulty), 
                ...(categoryId && { categoryId }), 
                attributes: {},
                createdAt: serverTimestamp()
            };

            if (formData.type === 'noun') newWord.attributes.gender = formData.attributes.gender;
            if (formData.type === 'preposition') newWord.attributes.case = formData.attributes.case;
            if (formData.type === 'verb') {
                newWord.attributes.isRegular = formData.attributes.isRegular;
                if (!formData.attributes.isRegular) { newWord.attributes.pastTense = formData.attributes.pastTense; newWord.attributes.participle = formData.attributes.participle; }
                const prefixes = formData.attributes.separablePrefixes.filter(p => p.prefix.trim() && p.meaning.trim());
                if (prefixes.length > 0) newWord.attributes.separablePrefixes = prefixes;
            }

            await addDoc(collection(db, `users/${user.uid}/words`), newWord);
            setFeedback({ type: 'success', message: '¡Palabra guardada!' }); setFormData(initialFormData); setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
        } catch (err) { console.error(err); setFeedback({ type: 'error', message: 'No se pudo guardar.' }); } finally { setIsSubmitting(false); }
    };

    return (
        <div className="w-full max-w-lg mx-auto"><h1 className="mb-8 text-3xl font-bold text-gray-300">Añadir Palabra</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><input name="german" value={formData.german} onChange={handleChange} placeholder="Alemán" required className="p-3 bg-gray-700 rounded-md" /><input name="spanish" value={formData.spanish} onChange={handleChange} placeholder="Español" required className="p-3 bg-gray-700 rounded-md" /></div>
                <div className="grid grid-cols-2 gap-6">
                    <div><label className="block mb-2 text-sm text-gray-400">Tipo</label><select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 bg-gray-700 rounded-md"><option value="noun">Sustantivo</option><option value="verb">Verbo</option><option value="adjective">Adjetivo</option><option value="preposition">Preposición</option></select></div>
                    <div><label className="block mb-2 text-sm text-gray-400">Nivel</label><select name="difficulty" value={formData.difficulty} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="1">1 (Fácil)</option><option value="2">2 (Medio)</option><option value="3">3 (Difícil)</option><option value="4">4</option><option value="5">5</option></select></div>
                </div>
                <div><label htmlFor="category" className="block mb-2 text-sm text-gray-400">Categoría</label><input name="category" value={formData.category} onChange={handleChange} list="categories-list" id="category" placeholder="Elige o crea una" className="w-full p-3 bg-gray-700 rounded-md" /><datalist id="categories-list">{categories.map(cat => <option key={cat.id} value={cat.name} />)}</datalist></div>

                {formData.type === 'noun' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4"><h3 className="font-semibold text-blue-400">Sustantivo</h3><select name="gender" value={formData.attributes.gender} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Género...</option><option value="m">der</option><option value="f">die</option><option value="n">das</option></select></div>}
                {formData.type === 'preposition' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4"><h3 className="font-semibold text-green-400">Preposición</h3><select name="case" value={formData.attributes.case} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md"><option value="">Caso...</option><option value="Akkusativ">Akkusativ</option><option value="Dativ">Dativ</option><option value="Genitiv">Genitiv</option><option value="Wechselpräposition">Wechselpräposition</option></select></div>}
                {formData.type === 'verb' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4">
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
                
                <div className="pt-2 h-12"><button type="submit" disabled={isSubmitting} className="w-full p-4 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">{isSubmitting ? 'Guardando...' : 'Guardar'}</button>{feedback.message && <p className={`mt-2 text-sm text-center ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{feedback.message}</p>}</div>
            </form>
        </div>
    );
}

export default WordForm;