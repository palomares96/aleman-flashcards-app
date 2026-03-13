import React from 'react';

const PrivacyPolicy = ({ onBack }) => {
    return (
        <div className="flex flex-col w-full min-h-screen bg-slate-950 text-slate-300 font-sans p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-full bg-slate-900 border border-white/10 text-white hover:bg-slate-800 transition-colors"
                        aria-label="Volver"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-white">Política de Privacidad</h1>
                </div>

                {/* Content */}
                <div className="space-y-6 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">1. Introducción</h2>
                        <p>
                            En Aleman App, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, utilizamos y protegemos su información personal al utilizar nuestra aplicación web y móvil. Para cualquier duda, puede contactarnos en <a href="mailto:aleman.flashcards.help@gmail.com" className="text-blue-400 hover:underline">aleman.flashcards.help@gmail.com</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">2. Información que recopilamos</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Información de la cuenta:</strong> Al registrarse, recopilamos su dirección de correo electrónico a través de Firebase Authentication.</li>
                            <li><strong>Perfil de usuario:</strong> Nombre de usuario y preferencias de estudio necesarias para personalizar su experiencia.</li>
                            <li><strong>Datos de progreso:</strong> Guardamos sus resultados, estadísticas de aprendizaje y logros desbloqueados para permitir la sincronización entre dispositivos.</li>
                            <li><strong>Autenticación de terceros:</strong> Si elige iniciar sesión con Google, recibimos la información básica permitida por dicho proveedor (nombre y correo electrónico).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">3. Uso de los datos</h2>
                        <p>Utilizamos la información recopilada exclusivamente para:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>Gestionar su cuenta y permitirle el acceso a la aplicación.</li>
                            <li>Sincronizar sus flashcards y progreso de aprendizaje.</li>
                            <li>Proporcionar soporte técnico opcional.</li>
                            <li>Mejorar las funcionalidades de la aplicación basándonos en datos de uso agregados y anónimos.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">4. Almacenamiento y Seguridad</h2>
                        <p>
                            Sus datos se almacenan de forma segura utilizando los servicios de <strong>Google Firebase</strong>. Aplicamos medidas de seguridad técnicas y organizativas para proteger su información contra accesos no autorizados o pérdida de datos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">5. Derechos del usuario</h2>
                        <p>Usted tiene derecho a:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>Acceder a sus datos personales almacenados.</li>
                            <li>Rectificar cualquier información incorrecta.</li>
                            <li>Solicitar la eliminación de su cuenta y todos sus datos asociados contactándonos en <a href="mailto:aleman.flashcards.help@gmail.com" className="text-blue-400 hover:underline">aleman.flashcards.help@gmail.com</a>.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">6. Cambios en esta política</h2>
                        <p>
                            Podemos actualizar nuestra Política de Privacidad ocasionalmente. Le recomendamos revisar esta página periódicamente para estar al tanto de cualquier cambio.
                        </p>
                    </section>

                    <section className="pt-6 border-t border-white/5">
                        <p className="text-xs text-slate-500">
                            Última actualización: 13 de marzo de 2026<br />
                            Aleman App - Palomares96
                        </p>
                    </section>
                </div>
                
                <div className="mt-12 text-center">
                    <button 
                        onClick={onBack}
                        className="px-6 py-2 rounded-xl bg-blue-600/20 text-blue-400 font-semibold border border-blue-600/30 hover:bg-blue-600/30 transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </div>
            
            {/* Background decorative blobs (similar to AppLayout) */}
            <div className="fixed top-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="fixed bottom-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
        </div>
    );
};

export default PrivacyPolicy;
