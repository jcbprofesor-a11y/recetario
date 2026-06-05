import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Pairing {
  name: string;
  molecularBasis: string;
  sharedPercentage: number;
  explanation: string;
}

export interface PairingResult {
  ingrediente_analizado: string;
  pairings: {
    classics: Pairing[];
    bold: Pairing[];
    drinks: Pairing[];
  };
}

export const getMolecularPairings = async (ingredients: string[]): Promise<PairingResult> => {
  const prompt = `Analiza la compatibilidad molecular de estos ingredientes: ${ingredients.join(', ')}. Sugiere maridajes basados en moléculas compartidas (FlavorDB).`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Eres un experto en gastronomía molecular. Tu objetivo es analizar ingredientes y sugerir maridajes basados en moléculas volátiles compartidas (lógica FlavorDB). Si recibes varios ingredientes, analiza su compatibilidad conjunta. Proporciona siempre: Nombre del maridaje, Explicación culinaria, Compuesto químico compartido (ej: Cumarina, Metoxipirazina) y un Porcentaje de afinidad (0-100%). RESPONDE SIEMPRE EN JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ingrediente_analizado: { type: Type.STRING },
          pairings: {
            type: Type.OBJECT,
            properties: {
              classics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    molecularBasis: { type: Type.STRING },
                    sharedPercentage: { type: Type.NUMBER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["name", "molecularBasis", "sharedPercentage", "explanation"]
                }
              },
              bold: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    molecularBasis: { type: Type.STRING },
                    sharedPercentage: { type: Type.NUMBER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["name", "molecularBasis", "sharedPercentage", "explanation"]
                }
              },
              drinks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    molecularBasis: { type: Type.STRING },
                    sharedPercentage: { type: Type.NUMBER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["name", "molecularBasis", "sharedPercentage", "explanation"]
                }
              }
            },
            required: ["classics", "bold", "drinks"]
          }
        },
        required: ["ingrediente_analizado", "pairings"]
      }
    }
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr);
};

export const analyzeRecipeMolecular = async (recipe: any): Promise<any> => {
  const prompt = `Analiza molecularmente esta receta: ${recipe.name}. 
  Ingredientes: ${recipe.subRecipes.map((s: any) => s.ingredients.map((i: any) => i.name).join(', ')).join('. ')}.
  
  Tu objetivo es:
  1. Identificar la estructura molecular dominante.
  2. Sugerir 3 variaciones para "mejorar" el perfil de sabor usando lógica FlavorDB.
  3. Proporcionar un "Ingrediente Secreto" (maridaje audaz) con explicación científica.
  4. Dar notas de emplatado que refuercen la experiencia aromática.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Eres un consultor de I+D de un restaurante con 3 estrellas Michelin. Eres experto en química de los alimentos. RESPONDE SIEMPRE EN JSON con este esquema: { \"analisis_molecular\": string, \"variaciones\": [ { \"original\": string, \"sugerencia\": string, \"porque\": string } ], \"ingrediente_secreto\": { \"nombre\": string, \"explicacion\": string }, \"notas_aromaticas\": string }",
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateRecipeAI = async (params: {
  ingredients: string[];
  vibe: string;
  level: string;
  goal: string;
  constraints: string[];
}): Promise<any> => {
  const prompt = `Crea una receta culinaria profesional única basada en:
  - Ingredientes: ${params.ingredients.join(', ')}
  - Estilo/Vibe: ${params.vibe}
  - Nivel Técnico: ${params.level}
  - Objetivo: ${params.goal}
  - Restricciones: ${params.constraints.join(', ')}
  
  La receta debe ser creativa y coherente.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Eres un Chef Creativo Senior. Genera una receta técnica profesional. RESPONDE SIEMPRE EN JSON con este esquema (usa nomenclatura profesional): { \"name\": string, \"description\": string, \"category\": string, \"yieldQuantity\": number, \"yieldUnit\": string, \"subRecipes\": [ { \"name\": string, \"ingredients\": [ { \"name\": string, \"quantity\": number, \"unit\": string, \"notes\": string } ], \"steps\": [ { \"step\": string } ] } ], \"chefTips\": string }",
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
};
