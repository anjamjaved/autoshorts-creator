import React from "react";
import type { WhisperModel } from "../../types";

export type ModelTrafficLevel = "optimal" | "moderate" | "heavy";

export function getWhisperTrafficLevel(
  modelId: string,
  vramTotalMb: number = 0,
  hasGpu: boolean = true
): { level: ModelTrafficLevel; label: string; note: string } {
  const id = modelId.toLowerCase();
  const vramGb = hasGpu && vramTotalMb > 0 ? vramTotalMb / 1024 : 0;

  // Escenario 1: Modo CPU (sin GPU dedicada o VRAM no detectada)
  if (vramGb === 0) {
    if (id.includes("tiny") || id.includes("base")) {
      return { level: "optimal", label: "Óptimo", note: "Ligero y fluido en procesador CPU (~0.7 GB RAM)" };
    }
    if (id.includes("small")) {
      return { level: "moderate", label: "Moderado", note: "Velocidad media en CPU (~1.2 GB RAM)" };
    }
    return { level: "heavy", label: "Pesado", note: "Lento en CPU, se recomienda tarjeta gráfica GPU con CUDA" };
  }

  // Escenario 2: GPU con VRAM detectada
  // tiny (~0.5GB) y base (~0.7GB) siempre son óptimos en GPU
  if (id.includes("tiny") || id.includes("base")) {
    return { level: "optimal", label: "Óptimo", note: "Ultrarrápido y mínimo consumo de memoria" };
  }

  // small (~1.2GB)
  if (id.includes("small")) {
    if (vramGb >= 3) {
      return { level: "optimal", label: "Óptimo", note: `Rápido y ligero en tu GPU (${vramGb.toFixed(1)} GB VRAM)` };
    }
    return { level: "moderate", label: "Moderado", note: "Uso medio de memoria" };
  }

  // medium (~2.5GB)
  if (id.includes("medium")) {
    if (vramGb >= 6) {
      return { level: "optimal", label: "Óptimo", note: `Gran precisión en tu GPU (${vramGb.toFixed(1)} GB VRAM)` };
    }
    if (vramGb >= 4) {
      return { level: "moderate", label: "Moderado", note: `Uso moderado (~2.5 GB en GPU de ${vramGb.toFixed(1)} GB)` };
    }
    return { level: "heavy", label: "Pesado", note: `Requiere ~2.5 GB VRAM (GPU limitada a ${vramGb.toFixed(1)} GB)` };
  }

  // large-v3-turbo (~3.2GB Faster)
  if (id.includes("turbo")) {
    if (vramGb >= 6) {
      return { level: "optimal", label: "Óptimo", note: `Velocidad y precisión ideales en tu GPU (${vramGb.toFixed(1)} GB VRAM)` };
    }
    if (vramGb >= 4) {
      return { level: "moderate", label: "Moderado", note: `Ajustado en GPU de ${vramGb.toFixed(1)} GB (~3.2 GB VRAM)` };
    }
    return { level: "heavy", label: "Pesado", note: `Excede la VRAM recomendada (~3.2 GB vs ${vramGb.toFixed(1)} GB)` };
  }

  // large-v3 (~4.5GB)
  if (id.includes("large")) {
    if (vramGb >= 10) {
      return { level: "optimal", label: "Óptimo", note: `Máxima precisión sin impacto en tu GPU (${vramGb.toFixed(1)} GB VRAM)` };
    }
    if (vramGb >= 6) {
      return { level: "moderate", label: "Moderado", note: `Alta precisión (~4.5 GB en tu GPU de ${vramGb.toFixed(1)} GB)` };
    }
    return { level: "heavy", label: "Pesado", note: `Requiere ~4.5 GB VRAM (GPU limitada a ${vramGb.toFixed(1)} GB)` };
  }

  return { level: "optimal", label: "Óptimo", note: "Modelo compatible" };
}

export function getOllamaTrafficLevel(
  modelName: string,
  vramTotalMb: number = 0,
  hasGpu: boolean = true
): { level: ModelTrafficLevel; label: string; note: string } {
  const name = modelName.toLowerCase();
  const vramGb = hasGpu && vramTotalMb > 0 ? vramTotalMb / 1024 : 0;

  // Extract parameter size (e.g., 3b, 7b, 8b, 12b, 14b, 32b, 70b)
  const match = name.match(/(\d+)(?:\.\d+)?b/);
  const paramSize = match ? parseFloat(match[1]) : null;

  if (paramSize !== null) {
    const estVram = Math.round(paramSize * 0.65 + 1.2);
    if (vramGb === 0) {
      if (paramSize <= 4) {
        return { level: "optimal", label: "Óptimo", note: "Modelo ligero para procesador CPU" };
      }
      if (paramSize <= 8) {
        return { level: "moderate", label: "Moderado", note: "Velocidad media en CPU" };
      }
      return { level: "heavy", label: "Pesado", note: "Modelo grande, alto consumo de RAM en CPU" };
    }

    if (paramSize <= 4) {
      return { level: "optimal", label: "Óptimo", note: `Muy fluido en tu GPU (~${estVram} GB VRAM)` };
    }
    if (paramSize <= 8) {
      if (vramGb >= 6) {
        return { level: "optimal", label: "Óptimo", note: `Excelente rendimiento en tu GPU (${vramGb.toFixed(1)} GB)` };
      }
      return { level: "moderate", label: "Moderado", note: `Consumo ajustado (~${estVram} GB en GPU de ${vramGb.toFixed(1)} GB)` };
    }
    if (paramSize <= 14) {
      if (vramGb >= 11) {
        return { level: "optimal", label: "Óptimo", note: `Alta capacidad en tu GPU (${vramGb.toFixed(1)} GB)` };
      }
      if (vramGb >= 8) {
        return { level: "moderate", label: "Moderado", note: `Uso medio-alto (~${estVram} GB en GPU de ${vramGb.toFixed(1)} GB)` };
      }
      return { level: "heavy", label: "Pesado", note: `Al límite de VRAM (~${estVram} GB vs ${vramGb.toFixed(1)} GB)` };
    }
    return {
      level: "heavy",
      label: "Pesado",
      note: `Excede la memoria VRAM disponible (${vramGb.toFixed(1)} GB)`,
    };
  }

  if (name.includes("embed") || name.includes("mini") || name.includes("tiny")) {
    return { level: "optimal", label: "Óptimo", note: "Ultraligero" };
  }

  return { level: "moderate", label: "Moderado", note: "Uso estándar" };
}

export function sortWhisperModels(
  models: WhisperModel[],
  vramTotalMb: number = 0,
  hasGpu: boolean = true
): { downloaded: WhisperModel[]; available: WhisperModel[] } {
  const getTrafficWeight = (level: ModelTrafficLevel): number => {
    switch (level) {
      case "optimal":
        return 3;
      case "moderate":
        return 2;
      case "heavy":
        return 1;
      default:
        return 0;
    }
  };

  const modelQualityRank: Record<string, number> = {
    "large-v3-turbo": 6,
    "large-v3": 5,
    "medium": 4,
    "small": 3,
    "base": 2,
    "tiny": 1,
  };

  const compareModels = (a: WhisperModel, b: WhisperModel): number => {
    const trafA = getWhisperTrafficLevel(a.id, vramTotalMb, hasGpu);
    const trafB = getWhisperTrafficLevel(b.id, vramTotalMb, hasGpu);

    const weightA = getTrafficWeight(trafA.level);
    const weightB = getTrafficWeight(trafB.level);

    // 1. Priorizar nivel de tráfico óptimo sobre moderado y pesado
    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // 2. Si tienen el mismo nivel de tráfico, ordenar de mayor a menor calidad (turbo/large primero si son óptimos)
    const rankA = modelQualityRank[a.id] || 0;
    const rankB = modelQualityRank[b.id] || 0;
    return rankB - rankA;
  };

  const downloaded = models.filter((m) => m.downloaded).sort(compareModels);
  const available = models.filter((m) => !m.downloaded).sort(compareModels);

  return { downloaded, available };
}

interface ModelBadgeProps {
  level: ModelTrafficLevel;
  label: string;
  note?: string;
}

export const ModelBadge: React.FC<ModelBadgeProps> = ({ level, label, note }) => {
  const styles: Record<ModelTrafficLevel, { bg: string; border: string; color: string; dot: string }> = {
    optimal: {
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.35)",
      color: "#10b981",
      dot: "#10b981",
    },
    moderate: {
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.35)",
      color: "#f59e0b",
      dot: "#f59e0b",
    },
    heavy: {
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.35)",
      color: "#f87171",
      dot: "#f87171",
    },
  };

  const current = styles[level];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 7px",
        borderRadius: "4px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: current.bg,
        border: `1px solid ${current.border}`,
        color: current.color,
      }}
      title={note}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: current.dot,
        }}
      />
      <span>{label}</span>
    </span>
  );
};
