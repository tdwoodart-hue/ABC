import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Initialize Gemini lazily
  let aiClient: GoogleGenAI | null = null;
  function getAIClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
      }
      aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
  }

  // API Endpoint: Analyze meal description (and optional image) using Gemini
  app.post("/api/analyze-meal", async (req, res) => {
    try {
      const { text, imageBase64 } = req.body;

      if (!text && !imageBase64) {
        return res.status(400).json({ error: "Vui lòng nhập mô tả hoặc chọn hình ảnh bữa ăn." });
      }

      const ai = getAIClient();

      const systemInstruction = `Bạn là chuyên gia dinh dưỡng AI. Nhiệm vụ của bạn là phân tích mô tả bữa ăn (và/hoặc hình ảnh món ăn) do người dùng cung cấp.
Hãy trả về ĐÚNG MỘT ĐỐI TƯỢNG JSON có định dạng sau (không chứa markdown backticks hay chữ gì ngoài JSON):
{
  "foodName": "Tóm tắt ngắn gọn các món ăn (ví dụ: Phở bò tái & Cà phê sữa)",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "calories": con_số_calo_ước_tính_integer,
  "breakdown": "Chi tiết calo từng phần (ví dụ: Phở bò ~450 kcal, Cà phê sữa ~130 kcal)",
  "notes": "Nhận xét dinh dưỡng ngắn gọn hoặc lời khuyên thân thiện (1-2 câu)"
}
Quy tắc phân loại mealType:
- Nếu có từ khóa "sáng", "điểm tâm" hoặc buổi sáng -> "breakfast"
- Nếu có từ "trưa", "trưa nay", "ăn trưa" -> "lunch"
- Nếu có từ "tối", "chiều tối", "ăn tối" -> "dinner"
- Món ăn vặt, trà sữa, bánh ngọt, trái cây, nước ép -> "snack"
- Nếu không rõ thời gian, mặc định chọn bữa ăn phù hợp nhất.`;

      const contents: any[] = [];

      if (imageBase64) {
        const matches = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          contents.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }

      if (text) {
        contents.push({
          text: `Mô tả bữa ăn từ người dùng: "${text}"`,
        });
      } else {
        contents.push({
          text: "Hãy nhìn hình ảnh và ước tính calo, xác định tên món ăn và loại bữa ăn.",
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const responseText = response.text || "{}";
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanJson);

      return res.json({
        success: true,
        data: {
          foodName: parsedData.foodName || text || "Món ăn",
          mealType: ["breakfast", "lunch", "dinner", "snack"].includes(parsedData.mealType)
            ? parsedData.mealType
            : "lunch",
          calories: typeof parsedData.calories === "number" ? parsedData.calories : 0,
          breakdown: parsedData.breakdown || "",
          notes: parsedData.notes || "",
        },
      });
    } catch (error: any) {
      console.error("Lỗi AI analyze-meal:", error);
      return res.status(500).json({
        error: error?.message || "Không thể phân tích món ăn bằng AI. Vui lòng thử lại.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
