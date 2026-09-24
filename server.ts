import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storageConfig = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || (file.mimetype?.startsWith("video/") ? ".mp4" : ".jpg");
    const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${cleanExt || ".bin"}`);
  },
});

const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 500 * 1024 * 1024, files: 20 },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  app.use("/uploads", express.static(uploadsDir, {
    maxAge: "7d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) res.setHeader("Content-Type", "video/mp4");
      else if (filePath.endsWith(".webm")) res.setHeader("Content-Type", "video/webm");
      else if (filePath.endsWith(".mov")) res.setHeader("Content-Type", "video/quicktime");
      res.setHeader("Accept-Ranges", "bytes");
    },
  }));

  app.post("/api/upload", (req, res) => {
    upload.array("files", 20)(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: err?.message || "Lỗi khi xử lý tệp tin tải lên." });
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) return res.status(400).json({ error: "Không tìm thấy tệp để tải lên." });
        const uploadedFiles = files.map((file) => {
          const isVideo = file.mimetype?.startsWith("video/") || [".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".3gp"].some((ext) => (file.originalname || "").toLowerCase().endsWith(ext));
          return {
            originalName: file.originalname,
            filename: file.filename,
            url: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
            type: isVideo ? "video" : "image",
          };
        });
        return res.json({ success: true, files: uploadedFiles });
      } catch (innerErr: any) {
        return res.status(500).json({ error: innerErr?.message || "Lỗi lưu trữ tệp tin." });
      }
    });
  });

  let aiClient: GoogleGenAI | null = null;
  function getAIClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is missing.");
      aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
  }

  app.post("/api/analyze-meal", async (req, res) => {
    try {
      const { text, imageBase64 } = req.body;
      if (!text && !imageBase64) return res.status(400).json({ error: "Vui lòng nhập mô tả hoặc chọn hình ảnh bữa ăn." });

      const ai = getAIClient();
      const systemInstruction = `Bạn là chuyên gia dinh dưỡng AI. Phân tích mô tả bữa ăn (và/hoặc hình ảnh) và trả về ĐÚNG MỘT JSON, không markdown:
{
  "foodName": "Tên món ngắn gọn",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "calories": số kcal,
  "protein": số gram protein,
  "carbs": số gram carbohydrate,
  "fat": số gram chất béo,
  "breakdown": "Chi tiết ước tính từng phần",
  "notes": "Nhận xét ngắn gọn"
}
Ước tính calories và P/C/F phải nhất quán với khẩu phần người dùng mô tả. Nếu không đủ dữ liệu, đưa ra ước tính hợp lý và không bịa độ chính xác cao.
Phân loại mealType: sáng -> breakfast; trưa -> lunch; tối -> dinner; ăn vặt/trái cây/đồ uống -> snack; không rõ thì chọn phù hợp nhất.`;

      const contents: any[] = [];
      if (imageBase64) {
        const matches = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (matches?.length === 3) contents.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
      }
      contents.push({ text: text ? `Mô tả bữa ăn: "${text}"` : "Hãy nhìn ảnh và ước tính dinh dưỡng." });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: { systemInstruction, responseMimeType: "application/json", temperature: 0.25 },
      });

      const parsedData = JSON.parse((response.text || "{}").replace(/```json/g, "").replace(/```/g, "").trim());
      const safeNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;

      return res.json({
        success: true,
        data: {
          foodName: parsedData.foodName || text || "Món ăn",
          mealType: ["breakfast", "lunch", "dinner", "snack"].includes(parsedData.mealType) ? parsedData.mealType : "lunch",
          calories: safeNumber(parsedData.calories),
          protein: safeNumber(parsedData.protein),
          carbs: safeNumber(parsedData.carbs),
          fat: safeNumber(parsedData.fat),
          breakdown: parsedData.breakdown || "",
          notes: parsedData.notes || "",
        },
      });
    } catch (error: any) {
      console.error("Lỗi AI analyze-meal:", error);
      return res.status(500).json({ error: error?.message || "Không thể phân tích món ăn bằng AI. Vui lòng thử lại." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
