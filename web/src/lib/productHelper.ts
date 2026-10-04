export interface ParsedProductMeta {
  weightGrams: number;
  stock: number;
  type: string;
  dimensions: string;
  cleanDescription: string;
}

/**
 * Analisa a descrição do produto para extrair metadados como peso unitário (usado na balança do Edilson),
 * estoque em tempo real e dimensões, mantendo total retrocompatibilidade com o banco de dados.
 */
export function parseProductMeta(rawDescription?: string | null): ParsedProductMeta {
  if (!rawDescription) {
    return {
      weightGrams: 15.0,
      stock: 50,
      type: "Peça Geral",
      dimensions: "Padrão",
      cleanDescription: "Sem descrição",
    };
  }

  // Tenta extrair se estiver no formato: [PESO: 12.5g | ESTOQUE: 45 | TIPO: Parafuso | DIM: 10x20mm] Descrição
  let weight = 15.0;
  let stock = 50;
  let type = "Peça";
  let dims = "Padrão";
  let cleanDesc = rawDescription;

  const metaMatch = rawDescription.match(/^\[PESO:\s*([\d.,]+)g\s*\|\s*ESTOQUE:\s*(\d+)\s*\|\s*TIPO:\s*([^|]+)\s*\|\s*DIM:\s*([^\]]+)\]\s*(.*)$/i);
  if (metaMatch) {
    weight = parseFloat(metaMatch[1].replace(",", ".")) || 15.0;
    stock = parseInt(metaMatch[2], 10) || 50;
    type = metaMatch[3].trim();
    dims = metaMatch[4].trim();
    cleanDesc = metaMatch[5].trim();
  } else {
    // Busca avulsa por peso ou gramas
    const weightMatch = rawDescription.match(/(?:peso|weight):\s*([\d.,]+)\s*g?/i);
    if (weightMatch) {
      weight = parseFloat(weightMatch[1].replace(",", ".")) || 15.0;
    }
    const stockMatch = rawDescription.match(/(?:estoque|stock|qtd):\s*(\d+)/i);
    if (stockMatch) {
      stock = parseInt(stockMatch[1], 10) || 50;
    }
  }

  return {
    weightGrams: weight,
    stock: stock,
    type: type,
    dimensions: dims,
    cleanDescription: cleanDesc || rawDescription,
  };
}

export function formatProductMeta(data: {
  description?: string;
  weightGrams?: number;
  stock?: number;
  type?: string;
  dimensions?: string;
}): string {
  const weight = data.weightGrams ?? 15.0;
  const stock = data.stock ?? 50;
  const type = data.type || "Componente";
  const dims = data.dimensions || "Padrão";
  const desc = data.description || "";

  return `[PESO: ${weight}g | ESTOQUE: ${stock} | TIPO: ${type} | DIM: ${dims}] ${desc}`.trim();
}
