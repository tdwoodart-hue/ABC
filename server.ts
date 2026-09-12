import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer disk storage configuration
const storageConfig = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || (file.mimetype?.startsWith("video/") ? ".mp4" : ".jpg");
    const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${cleanExt || ".bin"}`);
  },
});

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for high quality 4K video/long clips
    files: 20,
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Serve static uploads with caching and partial content streaming for videos
  app.use("/uploads", express.static(uploadsDir, {
    maxAge: "7d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
      } else if (filePath.endsWith(".webm")) {
        res.setHeader("Content-Type", "video/webm");
      } else if (filePath.endsWith(".mov")) {
        res.setHeader("Content-Type", "video/quicktime");
      }
      res.setHeader("Accept-Ranges", "bytes");
    }
  }));

  // File Upload API for Images and Videos
  app.post("/api/upload", (req, res) => {
    upload.array("files", 20)(req, res, (err: any) => {
      if (err) {
        console.error("Multer error during upload:", err);
        return res.status(400).json({ error: err?.message || "Lỗi khi xử lý tệp tin tải lên." });
      }

      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "Không tìm thấy tệp để tải lên." });
        }

        const uploadedFiles = files.map((file) => {
          const isVideo =
            file.mimetype?.startsWith("video/") ||
            [".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".3gp"].some((ext) =>
              (file.originalname || "").toLowerCase().endsWith(ext)
            );

          return {
            originalName: file.originalname,
            filename: file.filename,
            url: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
            type: isVideo ? "video" : "image",
          };
        });

        return res.json({
          success: true,
          files: uploadedFiles,
        });
      } catch (innerErr: any) {
        console.error("Lỗi xử lý file upload:", innerErr);
        return res.status(500).json({ error: innerErr?.message || "Lỗi lưu trữ tệp tin." });
      }
    });
  });

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
