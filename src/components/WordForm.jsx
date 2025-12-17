// src/components/WordForm.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { collection, getDocs, query, where, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { initialFormData } from '../config.js';

function WordForm({ user }) {
    const [formData, setFormData] = useState(initialFormData);
    const [categories, setCategories] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => { 
        const fetchCategories = async () => { 
            const snapshot = await getDocs(query(collection(db, "categories"), limit(100))); 
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name_es }))); 
        }; 
        fetchCategories(); 
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target; const [field, index, subfield] = name.split('.');
        if (field === 'separablePrefixes') { const newPrefixes = [...formData.attributes.separablePrefixes]; newPrefixes[index][subfield] = value; setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: newPrefixes }}));
        } else if (name in initialFormData.attributes) { setFormData(p => ({...p, attributes: {...p.attributes, [name]: type === 'checkbox' ? checked : value }}));
        } else { setFormData(p => ({...p, [name]: value })); }
    };
    
    const addPrefix = () => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: [...p.attributes.separablePrefixes, { prefix: '', meaning: '' }]}}));
    const removePrefix = (index) => setFormData(p => ({...p, attributes: {...p.attributes, separablePrefixes: p.attributes.separablePrefixes.filter((_, i) => i !== index)}}));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) { setFeedback({ type: 'error', message: 'Error: Usuario no identificado.' }); return; }

        setIsSubmitting(true);
        setFeedback({ type: '', message: '' });

        try {
            // 1. LIMPIEZA DE DATOS (Mayúsculas/Minúsculas)
            let cleanGerman = formData.german.trim();
            // En alemán, SOLO los sustantivos van en mayúscula.
            // Forzamos minúscula para verbos, adjetivos, etc.
            if (formData.type === 'noun') {
                // Aseguramos primera letra mayúscula para sustantivos
                cleanGerman = cleanGerman.charAt(0).toUpperCase() + cleanGerman.slice(1);
            } else {
                // Todo minúscula para el resto
                cleanGerman = cleanGerman.toLowerCase();
            }

            // 2. CHECK DUPLICADOS
            const userWordsCollection = collection(db, `users/${user.uid}/words`);
            const duplicateQuery = query(userWordsCollection, where("german", "==", cleanGerman), limit(1));
            if (!(await getDocs(duplicateQuery)).empty) {
                setFeedback({ type: 'error', message: 'Esta palabra ya existe.' });
                setIsSubmitting(false);
                return;
            }

            // 3. GESTIÓN DE CATEGORÍAS
            // Si el usuario no especifica categoría, usamos 'Otros' por defecto
            const categoryName = formData.category.trim() || 'Otros';
            let categoryId = null;

            if (categoryName) {
                // Buscamos insensible a mayúsculas
                const existingCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                
                if (existingCat) {
                    categoryId = existingCat.id;
                } else {
                    // CREAR NUEVA CATEGORÍA
                    try {
                        const newCatRef = await addDoc(collection(db, "categories"), { 
                                name_es: categoryName, 
                                name_de: categoryName, // Placeholder
                                createdAt: serverTimestamp()
                            });
                        // Actualizamos estado local para que aparezca en la lista la próxima vez
                        setCategories(p => [...p, { id: newCatRef.id, name: categoryName }]);
                            categoryId = newCatRef.id;
                    } catch (catErr) {
                        console.error("Error creando categoría:", catErr);
                        // Si falla, guardamos la palabra sin categoría para no bloquear al usuario
                    }
                }
            }

            // 4. CONSTRUIR OBJETO
            const newWord = {
                german: cleanGerman,
                spanish: formData.spanish.trim(),
                type: formData.type,
                difficulty: parseInt(formData.difficulty),
                categoryId: categoryId || "", // Aseguramos string vacío si es null
                attributes: {},
                createdAt: serverTimestamp()
            };

            if (formData.type === 'noun') newWord.attributes.gender = formData.attributes.gender;
            if (formData.type === 'preposition') newWord.attributes.case = formData.attributes.case;
            if (formData.type === 'verb') {
                newWord.attributes.isRegular = formData.attributes.isRegular;
                if (!formData.attributes.isRegular) {
                    newWord.attributes.pastTense = formData.attributes.pastTense;
                    newWord.attributes.participle = formData.attributes.participle;
                }
                // Filtramos prefijos vacíos y los ponemos en minúsculas también
                const prefixes = formData.attributes.separablePrefixes
                    .filter(p => p.prefix.trim() && p.meaning.trim())
                    .map(p => ({ ...p, prefix: p.prefix.trim().toLowerCase() }));
                
                if (prefixes.length > 0) newWord.attributes.separablePrefixes = prefixes;
            }

            // 5. GUARDAR
            await addDoc(userWordsCollection, newWord);

            setFeedback({ type: 'success', message: `¡"${cleanGerman}" guardada!` });
            setFormData(initialFormData);
            setTimeout(() => setFeedback({ type: '', message: '' }), 3000);

        } catch (err) {
            console.error("Error al añadir palabra:", err);
            setFeedback({ type: 'error', message: 'No se pudo guardar la palabra.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto"><h1 className="mb-8 text-3xl font-bold text-gray-300">Añadir Palabra</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><input name="german" value={formData.german} onChange={handleChange} placeholder="Alemán" required className="p-3 bg-gray-700 rounded-md text-white" /><input name="spanish" value={formData.spanish} onChange={handleChange} placeholder="Español" required className="p-3 bg-gray-700 rounded-md text-white" /></div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block mb-2 text-sm text-gray-400">Tipo</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full p-3 bg-gray-700 rounded-md text-white">
                            <option value="noun">Sustantivo</option>
                            <option value="verb">Verbo</option>
                            <option value="adjective">Adjetivo</option>
                            <option value="preposition">Preposición</option>
                            <option value="other">Otros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block mb-2 text-sm text-gray-400">Nivel</label>
                        <select name="difficulty" value={formData.difficulty} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md text-white">
                            <option value="1">1 (Fácil)</option>
                            <option value="2">2 (Medio)</option>
                            <option value="3">3 (Difícil)</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                    </div>
                </div>
                                {(formData.type === 'adjective' || formData.type === 'other') && <p className="text-sm text-gray-500 italic text-center">No hay atributos especiales para este tipo.</p>}
                
                {/* INPUT DE CATEGORÍA CON DATALIST */}
                <div>
                    <label htmlFor="category" className="block mb-2 text-sm text-gray-400">Categoría</label>
                    <input 
                        name="category" 
                        value={formData.category} 
                        onChange={handleChange} 
                        list="categories-list" 
                        id="category" 
                        placeholder="Elige o escribe una nueva..." 
                        className="w-full p-3 bg-gray-700 rounded-md text-white" 
                    />
                    <datalist id="categories-list">
                        {categories.map(cat => <option key={cat.id} value={cat.name} />)}
                        {/* Aseguramos que 'Otros' siempre esté disponible en la lista */}
                        {(!categories.some(c => c.name === 'Otros')) && <option key="otros-local" value="Otros" />}
                    </datalist>
                </div>

                {formData.type === 'noun' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4"><h3 className="font-semibold text-blue-400">Sustantivo</h3><select name="gender" value={formData.attributes.gender} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md text-white"><option value="">Género...</option><option value="m">der</option><option value="f">die</option><option value="n">das</option></select></div>}
                {formData.type === 'preposition' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4"><h3 className="font-semibold text-green-400">Preposición</h3><select name="case" value={formData.attributes.case} onChange={handleChange} required className="w-full p-3 bg-gray-700 rounded-md text-white"><option value="">Caso...</option><option value="Akkusativ">Akkusativ</option><option value="Dativ">Dativ</option><option value="Genitiv">Genitiv</option><option value="Wechselpräposition">Wechselpräposition</option></select></div>}
                {formData.type === 'verb' && <div className="p-4 rounded-lg bg-gray-800/50 space-y-4">
                    <h3 className="font-semibold text-pink-400">Verbo</h3><div className="flex items-center gap-4"><input name="isRegular" checked={formData.attributes.isRegular} onChange={handleChange} id="regular" type="checkbox" className="w-4 h-4" /><label htmlFor="regular">Es regular</label></div>
                    {!formData.attributes.isRegular && (<><input name="pastTense" value={formData.attributes.pastTense} onChange={handleChange} placeholder="Pretérito" required className="w-full p-3 bg-gray-700 rounded-md text-white" /><input name="participle" value={formData.attributes.participle} onChange={handleChange} placeholder="Participio" required className="w-full p-3 bg-gray-700 rounded-md text-white" /></>)}
                    <h4 className="pt-2 font-semibold text-pink-300">Prefijos Separables</h4>
                    {formData.attributes.separablePrefixes.map((p, i) => <div key={i} className="flex items-center gap-2">
                        <input name={`separablePrefixes.${i}.prefix`} value={p.prefix} onChange={handleChange} placeholder="Prefijo" className="w-1/4 p-2 bg-gray-600 rounded-md text-white"/>
                        <span className="text-gray-400">+ {formData.german || '...'} =</span>
                        <input name={`separablePrefixes.${i}.meaning`} value={p.meaning} onChange={handleChange} placeholder="Significado" className="flex-1 p-2 bg-gray-600 rounded-md text-white"/>
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