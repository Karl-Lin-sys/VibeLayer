import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export async function generateWallpaperVariation(vibe: string, referenceImageBase64?: string): Promise<string> {
  // Use gemini-2.5-flash-image for image generation/editing
  // If referenceImageBase64 is provided, it's a remix
  
  const prompt = referenceImageBase64 
    ? `Create a phone wallpaper variation based on this image. Maintain the core essence but shift it towards this vibe: ${vibe}. High resolution, 9:16 aspect ratio, cinematic.`
    : `A high-resolution, artistic phone wallpaper with a 9:16 aspect ratio. Vibe: ${vibe}. Focus on composition, lighting, and mood. Avoid text and logos.`;

  try {
    const contents: any = {
      parts: [
        { text: prompt }
      ]
    };

    if (referenceImageBase64) {
      // Remove data:image/...;base64, prefix if present
      const base64Data = referenceImageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: "image/png"
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: {
        imageConfig: {
          aspectRatio: "9:16"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data returned from Gemini");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
}

export async function expandVibePrompt(vibe: string): Promise<string> {
  // Expand a simple vibe into a more detailed artistic prompt
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an art director. Expand this short "vibe" description into a detailed visual prompt for an AI image generator. The output is for high-end phone wallpapers. 
      Vibe: "${vibe}"
      Rules:
      - Describe lighting, color palette, style (e.g. minimalist, cyberpunk, oil painting, 3D render), and composition.
      - Keep it under 50 words.
      - Output ONLY the expanded prompt text.`,
    });
    return response.text?.trim() || vibe;
  } catch (error) {
    console.error("Gemini Expansion Error:", error);
    return vibe;
  }
}
