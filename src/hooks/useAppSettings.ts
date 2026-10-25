import { useState, useEffect, useCallback } from "react";
import { invoke, listen } from "../apiBridge";
import type {
  EnvironmentStatus,
  HardwareTelemetry,
  LlmEngine,
  LlmMemoryStatus,
  TranscriptionEngine,
  WhisperModel,
} from "../types";

export function useAppSettings() {
  const [environment, setEnvironment] = useState<EnvironmentStatus | null>(null);
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  const [transcriptionEngine, setTranscriptionEngine] = useState<TranscriptionEngine>(() => {
    return (localStorage.getItem("autoshorts_transcription_engine") as TranscriptionEngine) || "local";
  });
  const [llmEngine, setLlmEngine] = useState<LlmEngine>(() => {
    return (localStorage.getItem("autoshorts_llm_engine") as LlmEngine) || "local";
  });
  const [localLlmModel, setLocalLlmModel] = useState(() => {
    return localStorage.getItem("autoshorts_local_llm_model") || "qwen2.5:7b";
  });
  const [lmstudioModel, setLmstudioModel] = useState(() => {
    return localStorage.getItem("autoshorts_lmstudio_model") || "";
  });
  const [lmstudioBaseUrl, setLmstudioBaseUrl] = useState(() => {
    return localStorage.getItem("autoshorts_lmstudio_base_url") || "http://127.0.0.1:1234/v1";
  });

  const [whisperModel, setWhisperModel] = useState<string>(() => {
    return localStorage.getItem("autoshorts_whisper_model") || "large-v3-turbo";
  });
  const [whisperModelsList, setWhisperModelsList] = useState<WhisperModel[]>([]);
  const [customMomentsPrompt, setCustomMomentsPrompt] = useState<string>(() => {
    return localStorage.getItem("autoshorts_custom_moments_prompt") || "";
  });
  const [defaultMomentsPrompt, setDefaultMomentsPrompt] = useState<string>("");

  const [enableThinking, setEnableThinking] = useState<boolean>(() => {
    return localStorage.getItem("autoshorts_enable_thinking") === "true";
  });
  const [customOutputDir, setCustomOutputDir] = useState<string>(
    () => localStorage.getItem("autoshorts_output_dir") || ""
  );

  const [pullInputModel, setPullInputModel] = useState("");
  const [downloadingModelName, setDownloadingModelName] = useState<string | null>(null);
  const [modelDownloadStatus, setModelDownloadStatus] = useState("");
  const [modelDownloadProgress, setModelDownloadProgress] = useState(0);

  const [llmMemoryStatus, setLlmMemoryStatus] = useState<LlmMemoryStatus | null>(null);
  const [keepModelLoaded, setKeepModelLoaded] = useState<boolean>(() => {
    return localStorage.getItem("autoshorts_keep_model_loaded") === "true";
  });
  const [isMemoryActionBusy, setIsMemoryActionBusy] = useState(false);

  const syncConfig = useCallback((updates: Record<string, any>) => {
    void invoke("save_app_config", updates);
  }, []);

  const canUseLmStudio = Boolean(environment?.hasLmStudio);
  const canTranscribe = Boolean(environment?.hasLocalWhisperModel);
  const canUseActiveLlm =
    llmEngine === "local"
      ? Boolean(environment?.hasOllama)
      : canUseLmStudio;

  const pullModelDirectly = async (modelName: string) => {
    setDownloadingModelName(modelName);
    setModelDownloadProgress(0);
    setModelDownloadStatus("Connecting to Ollama...");
    try {
      const unlisten = await listen<{
        status: string;
        completed?: number;
        total?: number;
        percentage?: number;
      }>("ollama-pull-progress", (event) => {
        const payload = event.payload;
        setModelDownloadStatus(payload.status);
        if (payload.percentage !== undefined && payload.percentage !== null) {
          setModelDownloadProgress(Math.round(payload.percentage));
        }
      });

      await invoke("pull_ollama_model", { modelName });
      unlisten();
      setModelDownloadStatus("Download complete!");
      setModelDownloadProgress(100);
      setTimeout(() => setDownloadingModelName(null), 500);
    } catch (err) {
      alert("Failed to download model: " + String(err));
      setDownloadingModelName(null);
    }
  };

  const handleResetConfig = () => {
    if (window.confirm("¿Seguro que deseas reiniciar la configuración y volver al asistente inicial?")) {
      localStorage.clear();
      void invoke("save_app_config", { onboarded: false });
      setIsOnboarded(false);
    }
  };

  const refreshEnv = useCallback(async () => {
    try {
      const env = await invoke<EnvironmentStatus>("environment_status");
      setEnvironment(env);
      if (env.whisperModels) {
        setWhisperModelsList(env.whisperModels);
      }
    } catch (err) {
      console.error("Failed to load environment status", err);
    }
  }, []);

  useEffect(() => {
    void refreshEnv();

    invoke<string>("get_default_moments_prompt")
      .then((p) => {
        if (p) setDefaultMomentsPrompt(p);
      })
      .catch(() => {});

    invoke<Record<string, any>>("get_app_config")
      .then((cfg) => {
        if (!cfg) return;
        if (cfg.whisperModel) setWhisperModel(cfg.whisperModel);
        if (cfg.llmEngine) setLlmEngine(cfg.llmEngine);
        if (cfg.localLlmModel) setLocalLlmModel(cfg.localLlmModel);
        if (cfg.lmstudioModel) setLmstudioModel(cfg.lmstudioModel);
        if (cfg.lmstudioBaseUrl) setLmstudioBaseUrl(cfg.lmstudioBaseUrl);
        if (cfg.customMomentsPrompt) setCustomMomentsPrompt(cfg.customMomentsPrompt);
        if (cfg.onboarded !== undefined) {
          setIsOnboarded(Boolean(cfg.onboarded));
        } else {
          setIsOnboarded(false);
        }
      })
      .catch(() => {
        const value = localStorage.getItem("autoshorts_onboarded");
        setIsOnboarded(value === "true");
      });

    const fetchTelemetry = () => {
      invoke<HardwareTelemetry>("get_hardware_telemetry")
        .then((data) => {
          if (data && typeof data === "object") setTelemetry(data);
        })
        .catch(() => {});
    };
    fetchTelemetry();
    const intervalTelemetry = setInterval(fetchTelemetry, 2500);

    return () => {
      clearInterval(intervalTelemetry);
    };
  }, [refreshEnv]);

  const fetchLlmMemoryStatus = useCallback(() => {
    invoke<LlmMemoryStatus>("get_llm_memory_status", {
      provider: llmEngine,
      lmstudioBaseUrl,
    })
      .then((status) => {
        if (status && typeof status === "object") {
          setLlmMemoryStatus(status);
          if (status.keepModelLoaded !== undefined) {
            setKeepModelLoaded(Boolean(status.keepModelLoaded));
          }
        }
      })
      .catch(() => {});
  }, [llmEngine, lmstudioBaseUrl]);

  useEffect(() => {
    fetchLlmMemoryStatus();
    const intervalMem = setInterval(fetchLlmMemoryStatus, 3500);
    return () => clearInterval(intervalMem);
  }, [fetchLlmMemoryStatus]);

  const toggleKeepModelLoaded = useCallback(
    async (enabled: boolean) => {
      setKeepModelLoaded(enabled);
      localStorage.setItem("autoshorts_keep_model_loaded", String(enabled));
      setIsMemoryActionBusy(true);
      try {
        const res = await invoke<LlmMemoryStatus>("set_keep_model_loaded", { enabled });
        if (res) setLlmMemoryStatus(res);
      } catch (err) {
        console.error("Error toggling keep model loaded:", err);
      } finally {
        setIsMemoryActionBusy(false);
      }
    },
    []
  );

  const preloadActiveModel = useCallback(async () => {
    setIsMemoryActionBusy(true);
    try {
      const activeModel =
        llmEngine === "lmstudio"
          ? lmstudioModel.trim() || undefined
          : localLlmModel.trim() || "qwen2.5:7b";
      const res = await invoke<LlmMemoryStatus>("preload_llm_model", {
        provider: llmEngine,
        modelName: activeModel,
        lmstudioBaseUrl,
      });
      if (res) setLlmMemoryStatus(res);
    } catch (err) {
      console.error("Error preloading model:", err);
    } finally {
      setIsMemoryActionBusy(false);
    }
  }, [llmEngine, localLlmModel, lmstudioModel, lmstudioBaseUrl]);

  const unloadActiveModel = useCallback(async () => {
    setIsMemoryActionBusy(true);
    try {
      const res = await invoke<LlmMemoryStatus>("unload_llm_model", {
        provider: llmEngine,
        lmstudioBaseUrl,
      });
      if (res) setLlmMemoryStatus(res);
    } catch (err) {
      console.error("Error unloading model:", err);
    } finally {
      setIsMemoryActionBusy(false);
    }
  }, [llmEngine, lmstudioBaseUrl]);

  useEffect(() => {
    localStorage.setItem("autoshorts_whisper_model", whisperModel);
    syncConfig({ whisperModel });
  }, [whisperModel, syncConfig]);

  useEffect(() => {
    localStorage.setItem("autoshorts_custom_moments_prompt", customMomentsPrompt);
    syncConfig({ customMomentsPrompt });
  }, [customMomentsPrompt, syncConfig]);

  useEffect(() => {
    localStorage.setItem("autoshorts_transcription_engine", transcriptionEngine);
    syncConfig({ transcriptionEngine });
  }, [transcriptionEngine, syncConfig]);

  useEffect(() => {
    localStorage.setItem("autoshorts_llm_engine", llmEngine);
    syncConfig({ llmEngine });
  }, [llmEngine, syncConfig]);

  useEffect(() => {
    localStorage.setItem("autoshorts_local_llm_model", localLlmModel);
    syncConfig({ localLlmModel });
  }, [localLlmModel, syncConfig]);

  useEffect(() => {
    localStorage.setItem("autoshorts_lmstudio_model", lmstudioModel);
    syncConfig({ lmstudioModel });
  }, [lmstudioModel, syncConfig]);

  useEffect(() => {
    localStorage.setItem("autoshorts_lmstudio_base_url", lmstudioBaseUrl);
    syncConfig({ lmstudioBaseUrl });
  }, [lmstudioBaseUrl, syncConfig]);

  useEffect(() => {
    if (environment?.installedLmStudioModels && environment.installedLmStudioModels.length > 0) {
      const installed = environment.installedLmStudioModels;
      if (!lmstudioModel || !installed.includes(lmstudioModel)) {
        setLmstudioModel(installed[0]);
        syncConfig({ lmstudioModel: installed[0] });
      }
    }
  }, [environment?.installedLmStudioModels, lmstudioModel, syncConfig]);

  useEffect(() => {
    if (environment?.installedOllamaModels && environment.installedOllamaModels.length > 0) {
      const installed = environment.installedOllamaModels;
      if (!installed.includes(localLlmModel)) {
        const preferred =
          installed.find((m) => m.includes("qwen3.5") || m.includes("qwen2.5") || m.includes("qwen")) ||
          installed[0];
        setLocalLlmModel(preferred);
        syncConfig({ localLlmModel: preferred });
      }
    }
  }, [environment?.installedOllamaModels, localLlmModel, syncConfig]);

  useEffect(() => {
    localStorage.setItem("autoshorts_output_dir", customOutputDir);
  }, [customOutputDir]);

  useEffect(() => {
    localStorage.setItem("autoshorts_enable_thinking", enableThinking ? "true" : "false");
  }, [enableThinking]);

  return {
    environment,
    setEnvironment,
    telemetry,
    isOnboarded,
    setIsOnboarded,
    handleResetConfig,
    transcriptionEngine,
    setTranscriptionEngine,
    llmEngine,
    setLlmEngine,
    localLlmModel,
    setLocalLlmModel,
    lmstudioModel,
    setLmstudioModel,
    lmstudioBaseUrl,
    setLmstudioBaseUrl,
    whisperModel,
    setWhisperModel,
    whisperModelsList,
    customMomentsPrompt,
    setCustomMomentsPrompt,
    defaultMomentsPrompt,
    enableThinking,
    setEnableThinking,
    customOutputDir,
    setCustomOutputDir,
    pullInputModel,
    setPullInputModel,
    downloadingModelName,
    modelDownloadStatus,
    modelDownloadProgress,
    pullModelDirectly,
    syncConfig,
    canUseLmStudio,
    canTranscribe,
    canUseActiveLlm,
    llmMemoryStatus,
    keepModelLoaded,
    isMemoryActionBusy,
    toggleKeepModelLoaded,
    preloadActiveModel,
    unloadActiveModel,
  };
}
