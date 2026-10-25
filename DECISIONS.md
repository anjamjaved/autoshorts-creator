# Registro de Decisiones de Arquitectura y Documentación

## D-001: Reescritura del README Principal
- **Decisión:** Reestructurar `README.md` como una guía técnica exhaustiva de nivel profesional, documentando la totalidad de módulos implementados en el backend de Python 3 y el frontend de React 19.
- **Motivo:** El README previo omitía módulos críticos (faster-whisper con CTranslate2, presets de subtítulos ASS, detector de pausas dead-air y el importador de YouTube con análisis de derechos).
- **Estándar:** Aplicar principios de documentación técnica clara y directa: sin fórmulas vacías, sin guiones largos de tipo em dash y con especificaciones validadas contra el código fuente.

## D-002: Arquitectura del Backend en Python 3
- **Decisión:** Mantener y documentar la migración completa del backend desde Rust/Tauri hacia Python 3.11 sobre PyWebView.
- **Motivo:** Facilita la ejecución nativa de PyTorch con aceleración CUDA, integración directa con Whisper/CTranslate2 y comunicación sin fricción con servidores locales de LLM (Ollama y LM Studio).

## D-003: Eliminación de PyInstaller Antiguo y Lanzador Batch
- **Decisión:** Eliminar `build_exe.py`, `AutoShorts.spec`, `build_tmp/` y `release/`. Incorporar el lanzador `AutoShorts.bat` con detección automática de entornos virtuales (`venv`, `.venv`, `env`) y pausa diagnóstica.
- **Motivo:** El script antiguo de PyInstaller presentaba fallos y ensuciaba el repositorio. La distribución de un binario final se gestionará en un hito futuro mediante una release portable limpia para GitHub.

## D-004: Filosofía Local-First (Cero Coste de APIs)
- **Decisión:** Orientar la arquitectura y la documentación hacia el uso 100% local en la máquina del usuario: transcripción local con faster-whisper (CUDA FP16 / CPU INT8) e inferencia con Ollama y LM Studio.
- **Motivo:** AutoShorts está diseñado como un software a medida para creadores que aprovechan la potencia de su propio hardware sin pagar suscripciones ni consumo de tokens por minuto.

## D-005: Especialización Exclusiva en Clips y Purga de Funcionalidades Cloud y AutoEdición
- **Decisión:** Retirar completamente el importador de YouTube (yt-dlp), el módulo de AutoEdición de formato largo (autoedit_service.py, AutoEditWorkspace.tsx), OpenAI Whisper estándar, Deepgram y todas las pasarelas cloud (OpenRouter, DeepSeek, OpenAI, Anthropic, Gemini, Groq). El software se especializa exclusivamente en la extracción y edición de clips verticales virales (Shorts, Reels, TikTok) con faster-whisper y LLMs locales (Ollama y LM Studio).
- **Motivo:** Eliminar latencias de red y cuellos de botella de APIs gratuitas o de pago, simplificar la arquitectura, reducir la superficie de mantenimiento y garantizar una experiencia 100% privada, local y sin coste operativo.

## D-006: Estandarización Obligatoria en pnpm como Gestor de Paquetes
- **Decisión:** Establecer pnpm como el único gestor de paquetes de Node.js / frontend permitido en el proyecto (prohibido el uso de npm o yarn).
- **Motivo:** Directriz técnica explícita del usuario y ventajas de rendimiento, consistencia de dependencias y ahorro de almacenamiento mediante enlaces duros centralizados.

## D-007: Entrada Directa sin Modal de Bienvenida y Autodetección No Bloqueante de LLMs
- **Decisión:** Eliminar el modal bloqueante de onboarding (OnboardingModal.tsx). AutoShorts inicia de inmediato en el Dashboard principal de proyectos. La detección de Ollama y LM Studio opera de forma automática, no invasiva y en tiempo real, reflejándose en la barra de estado inferior (StatusBar.tsx) y en el panel de configuración (SettingsPanel.tsx), sin forzar descargas obligatorias de modelos.
- **Motivo:** Evitar fricción de entrada, respetar la autonomía del usuario para elegir libremente su motor local (LM Studio u Ollama) y garantizar el comportamiento fluido y tradicional esperado en aplicaciones nativas de escritorio.

## D-008: Detección Dinámica de VRAM/GPU, Ordenamiento Inteligente de Whisper y Rediseño de Configuración
- **Decisión:** Eliminar todas las referencias estáticas a GPUs específicas (como RTX 2060 12GB). La idoneidad de los modelos (Óptimo, Moderado, Pesado) se calcula de forma 100% dinámica en tiempo real según la GPU y VRAM detectadas (4GB, 6GB, 8GB, 12GB, 16GB o CPU). Los modelos de Whisper se ordenan con optgroups priorizando los ya descargados en disco y, dentro de cada grupo, de mayor idoneidad a mayor peso. El panel de configuración se rediseñó en una arquitectura limpia de 3 tarjetas independientes (Faster-Whisper, Motor de IA, y Prompt del Sistema) con responsive fluido.
- **Motivo:** Adaptar el software universalmente al hardware de cualquier usuario sin colapsos visuales, textos acumulados ni falsas advertencias de VRAM.



