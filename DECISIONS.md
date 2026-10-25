# Registro de Decisiones de Arquitectura y Documentación

## D-001: Reescritura del README Principal
- **Decisión:** Reestructurar `README.md` como una guía técnica exhaustiva de nivel profesional, documentando la totalidad de módulos implementados en el backend de Python 3 y el frontend de React 19.
- **Motivo:** El README previo omitía módulos críticos (faster-whisper con CTranslate2, presets de subtítulos ASS, detector de pausas dead-air, empaquetado para Windows con PyInstaller y el importador de YouTube con análisis de derechos).
- **Estándar:** Aplicar principios de documentación técnica clara y directa: sin fórmulas vacías, sin guiones largos de tipo em dash y con especificaciones validadas contra el código fuente.

## D-002: Arquitectura del Backend en Python 3
- **Decisión:** Mantener y documentar la migración completa del backend desde Rust/Tauri hacia Python 3.11 sobre PyWebView.
- **Motivo:** Facilita la ejecución nativa de PyTorch con aceleración CUDA, integración directa con Whisper/CTranslate2 y comunicación sin fricción con servidores locales de LLM (Ollama y LM Studio).
