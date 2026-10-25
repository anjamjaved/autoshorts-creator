import React, { useEffect, useState } from "react";
import { BadgeCheck, Check, Clapperboard, Cloud, Copy, Database, Loader2 } from "lucide-react";
import { EnvironmentStatus, LlmEngine } from "../../types";
import { invoke, listen } from "../../apiBridge";

interface OnboardingModalProps {
  environment: EnvironmentStatus | null;
  onComplete: () => void;
  setTranscriptionEngine: (engine: "local") => void;
  setLlmEngine: (engine: LlmEngine) => void;
  setLocalLlmModel: (model: string) => void;
  refreshEnv: () => Promise<void>;
}

export function OnboardingModal({
  environment,
  onComplete,
  setTranscriptionEngine,
  setLlmEngine,
  setLocalLlmModel,
  refreshEnv,
}: OnboardingModalProps) {
  const [setupMode, setSetupMode] = useState<"choose" | "local" | "downloading">("local");
  const [selectedModel, setSelectedModel] = useState<string>("llama3.2");

  const [downloadStatus, setDownloadStatus] = useState("Iniciando descarga...");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyWhisperCommand = () => {
    navigator.clipboard.writeText("pip install -U faster-whisper");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isModelDownloaded = (modelKey: string) => {
    return (environment?.installedOllamaModels || []).some((m) => {
      const normM = m.toLowerCase();
      const normKey = modelKey.toLowerCase();
      return normM === normKey || normM.startsWith(normKey) || normKey.startsWith(normM);
    });
  };

  useEffect(() => {
    if (environment?.installedOllamaModels && environment.installedOllamaModels.length > 0) {
      const found = ["qwen2.5:7b", "qwen2.5:3b", "llama3.2"].find((candidate) =>
        isModelDownloaded(candidate)
      );
      if (found) {
        setSelectedModel(found);
      }
    }
  }, [environment?.installedOllamaModels]);

  const startLocalSetup = async () => {
    setError(null);
    setCheckingOllama(true);
    setDownloadProgress(0);

    try {
      try {
        await refreshEnv();
      } catch (e) {
        console.warn("refreshEnv warning:", e);
      }

      let currentEnv: EnvironmentStatus | null = null;
      try {
        currentEnv = await invoke<EnvironmentStatus>("environment_status");
      } catch (e) {
        console.warn("environment_status warning:", e);
      }

      const isOllamaRunning = currentEnv?.hasOllama ?? false;

      if (!isOllamaRunning) {
        setSetupMode("downloading");
        setDownloadStatus("Ollama no detectado. Iniciando...");

        try {
          const unlistenInstall = await listen<string>("ollama-install-status", (event) => {
            setDownloadStatus(event.payload);
          });

          await invoke("install_ollama");
          unlistenInstall();
        } catch (err) {
          setError("No se pudo iniciar Ollama automáticamente: " + String(err) + ". Asegúrate de abrir la app de Ollama en tu PC.");
          setSetupMode("local");
          return;
        }
      }

      // Check if selected model is ALREADY downloaded in Ollama!
      const installed = currentEnv?.installedOllamaModels || [];
      const alreadyDownloaded = installed.some((m) => {
        const normM = m.toLowerCase();
        const normSelected = selectedModel.toLowerCase();
        return normM === normSelected || normM.startsWith(normSelected) || normSelected.startsWith(normM);
      });

      if (!alreadyDownloaded) {
        setSetupMode("downloading");
        setDownloadStatus(`Descargando modelo ${selectedModel} en Ollama...`);

        const unlisten = await listen<{
          status: string;
          completed?: number;
          total?: number;
          percentage?: number;
        }>("ollama-pull-progress", (event) => {
          const payload = event.payload;
          setDownloadStatus(payload.status);
          if (payload.percentage !== undefined && payload.percentage !== null) {
            setDownloadProgress(Math.round(payload.percentage));
          }
        });

        try {
          await invoke("pull_ollama_model", { modelName: selectedModel });
        } finally {
          unlisten();
        }
      }

      setTranscriptionEngine("local");
      setLlmEngine("local");
      setLocalLlmModel(selectedModel);

      localStorage.setItem("autoshorts_transcription_engine", "local");
      localStorage.setItem("autoshorts_llm_engine", "local");
      localStorage.setItem("autoshorts_local_llm_model", selectedModel);
      localStorage.setItem("autoshorts_onboarded", "true");

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSetupMode("local");
    } finally {
      setCheckingOllama(false);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {setupMode === "local" && (
          <div className="local-setup-flow">
            <div className="onboarding-header compact">
              <div className="brand-mark large" style={{ marginBottom: "10px" }}>
                <Clapperboard size={32} />
              </div>
              <h2>Bienvenido a AutoShorts</h2>
              <p>Estudio 100% Local, Privado y Gratuito. Sin costes de APIs.</p>
            </div>

            {error && <div className="error-banner" style={{ marginBottom: "16px" }}>{error}</div>}

            <div className="setup-steps">
              <div className="setup-step">
                <div className="step-num">1</div>
                <div className="step-body">
                  <h4>Motor de Transcripción Faster-Whisper</h4>
                  <p>Aceleración GPU CUDA mediante CTranslate2 para transcripción ultrarrápida:</p>
                  <div className="code-block-container">
                    <code>pip install -U faster-whisper</code>
                    <button type="button" className="copy-btn" onClick={copyWhisperCommand}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                  {environment?.hasLocalWhisperModel ? (
                    <span className="step-check success"><BadgeCheck size={14} /> Faster-Whisper disponible en Python</span>
                  ) : (
                    <span className="step-check warning">⚠️ Paquete 'faster-whisper' listo para ejecutarse vía backend local.</span>
                  )}
                </div>
              </div>

              <div className="setup-step">
                <div className="step-num">2</div>
                <div className="step-body">
                  <h4>Configuración de LLM Local (Ollama)</h4>
                  <p>
                    Ollama procesa y detecta momentos virales directamente en tu hardware.
                    Descárgalo desde <a href="https://ollama.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>ollama.com</a> si aún no lo tienes.
                  </p>
                  <p>Selecciona un modelo para comenzar:</p>

                  <div className="model-cards">
                    <div
                      className={`model-card ${selectedModel === "llama3.2" ? "active" : ""}`}
                      onClick={() => setSelectedModel("llama3.2")}
                    >
                      <div className="model-card-header">
                        <h5>LLaMA 3.2 3B</h5>
                        <span className="model-size">1.9 GB</span>
                      </div>
                      <p>Requiere 8GB+ RAM. Rápido y eficiente para hardware estándar.</p>
                      {isModelDownloaded("llama3.2") && (
                        <div style={{ color: "#4ade80", fontSize: "12px", marginTop: "4px", fontWeight: 600 }}>✓ Ya instalado en Ollama</div>
                      )}
                    </div>

                    <div
                      className={`model-card ${selectedModel === "qwen2.5:3b" ? "active" : ""}`}
                      onClick={() => setSelectedModel("qwen2.5:3b")}
                    >
                      <div className="model-card-header">
                        <h5>Qwen 2.5 3B</h5>
                        <span className="model-size">2.0 GB</span>
                      </div>
                      <p>Excelente comprensión lógica y precisión en fragmentos de video.</p>
                      {isModelDownloaded("qwen2.5:3b") && (
                        <div style={{ color: "#4ade80", fontSize: "12px", marginTop: "4px", fontWeight: 600 }}>✓ Ya instalado en Ollama</div>
                      )}
                    </div>

                    <div
                      className={`model-card ${selectedModel === "qwen2.5:7b" ? "active" : ""}`}
                      onClick={() => setSelectedModel("qwen2.5:7b")}
                    >
                      <div className="model-card-header">
                        <h5>Qwen 2.5 7B</h5>
                        <span className="model-size">4.7 GB</span>
                      </div>
                      <p>Recomendado para máxima precisión en hooks, retención y humor.</p>
                      {isModelDownloaded("qwen2.5:7b") && (
                        <div style={{ color: "#4ade80", fontSize: "12px", marginTop: "4px", fontWeight: 600 }}>✓ Ya instalado en Ollama</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="btn-confirm compact"
                onClick={startLocalSetup}
                disabled={checkingOllama}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {checkingOllama ? <Loader2 className="spin" size={18} /> : null}
                {checkingOllama
                  ? "Verificando entorno local..."
                  : isModelDownloaded(selectedModel)
                    ? `Usar ${selectedModel} y Comenzar`
                    : "Descargar y Comenzar"}
              </button>
            </div>
          </div>
        )}

        {setupMode === "downloading" && (
          <div className="downloading-flow">
            <div className="onboarding-header compact">
              <h2>Descargando Modelo Local</h2>
              <p>Por favor espera mientras se descarga el modelo en Ollama. No cierres la aplicación.</p>
            </div>

            <div className="download-progress-container">
              <div className="download-loader">
                <Loader2 className="spin" size={48} />
              </div>

              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${downloadProgress}%` }}></div>
              </div>

              <div className="download-stats">
                <span className="download-status">{downloadStatus}</span>
                <span className="download-percentage">{downloadProgress}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
