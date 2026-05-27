import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-initialization utility for Gemini API
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// AI Assistant Chat API
app.post("/api/chat", async (req: express.Request, res: express.Response) => {
  try {
    const { message, history, items, sharedItem } = req.body;

    if (!message) {
       res.status(400).json({ error: "Message is required" });
       return;
    }

    const ai = getGeminiClient();

    // Context formatting
    const formattedItems = (items || [])
      .map(
        (item: any) =>
          `- ID: ${item.id}\n  ชื่อ: ${item.name}\n  หมวดหมู่: ${item.category}\n  ระดับความหายาก: ${item.rarity}\n  คงเหลือ: ${item.quantity} ชิ้น\n  ราคา: ฿${item.price.toLocaleString()}\n  คำอธิบาย: ${item.description || "ไม่มี"}\n  ยอดนิยม: ${item.isPopular ? "ใช่" : "ไม่ใช่"}`
      )
      .join("\n\n");

    let systemInstruction = `คุณคือ "Kuwashii AI Shop Assistant" ผู้ช่วยผู้เชี่ยวชาญ คอยให้คำแนะนำเกี่ยวกับไอเทมเกม ระดับความพรีเมียม และอุปกรณ์เสริมในคลังสินค้า Kuwashii El เท่านั้น
คุณมีหน้ารายละเอียดคลังสินค้าทั้งหมดของทางร้านเพื่อให้ข้อมูลราคา, ปริมาณ หรือความแร่จริงแก่ลูกค้าได้อย่างถูกต้องแม่นยำ 

กฎและวิธีตอบคำตอบของคุณ:
1. ตอบคำถามอย่างสุภาพและเป็นมิตร มีบุคลิกกระตือรือร้นและคล่องแคล่ว มีสำเนียงแบบเกมเมอร์ที่น่าเคารพ
2. ใช้ข้อมูลคลังสินค้าด้านล่างนี้ คอยอ้างอิงราคา จำนวน ชนิด หรือรายละเอียดสินค้าจริงอยู่เสมอ ห้ามเดาหรือหลอนข้อมูลขึ้นมาเอง!
3. หากลูกค้าถามหาสินค้าขายดี ยอดนิยม หรือ สินค้าหายากสูง (Legendary, Mythic) ให้สแกนดูจากคลังและเสนอตัวเด็ดๆ ทันที
4. ตอบกลับเป็นภาษาไทยที่อ่านง่าย มีเว้นวรรคสวยงามเป็นระเบียบ ใช้ Markdown จัดรูปแบบหัวข้อและตัวหนา (เช่น **ชื่อไอเทม**) ให้โดดเด่นน่าอ่านช้อปปิ้งออนไลน์
5. หากข้อมูลสต็อกเป็น 0 ชิ้น ให้แนะว่าชิ้นนั้นหมดคลังในขณะนี้ แต่สามารถจดคิวสอบถามหรือแนะนำไอเทมทางเลือกอื่นในระดับความใกล้เคียงกันได้

--- ข้อมูลสินค้าทั้งหมดในคลังร้าน Kuwashii El ปัจจุบัน: ---
${formattedItems || "ขณะนี้ไม่มีข้อมูลสินค้าในระบบคลัง"}
`;

    if (sharedItem) {
      systemInstruction += `\n\n--- พิเศษ: ลูกค้าได้กด "แชร์สินค้าเฉพาะตัว" นี้เข้ามาเพื่อให้คุณดูโดยตรง: ---
ชื่อสินค้า: ${sharedItem.name}
หมวดหมู่: ${sharedItem.category}
ระดับระดับความหายาก: ${sharedItem.rarity}
ราคาในคลัง: ฿${sharedItem.price.toLocaleString()}
จำนวนคงเหลือ: ${sharedItem.quantity} ชิ้น
คำอธิบายสินค้า: ${sharedItem.description || "ไม่มี"}
${sharedItem.isPopular ? "⭐ สินค้านี้จัดเป็นสินค้ายอดนิยมประจำร้าน!" : ""}

กรุณาให้ความสนใจและให้การวิเคราะห์ จุดเด่น ความคุ้มค่า หรือคำตอบพิเศษกับสินค้าชิ้นนี้เป็นสำคัญที่สุดและโยงเข้าความต้องการของลูกค้าอย่างดีที่สุด!`;
    }

    // Set up chat instance with history
    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.parts?.[0]?.text || "" }]
    }));

    // Start with chat history and send the newest message
    const activeChat = ai.chats.create({
      model: "gemini-3.5-flash",
      history: formattedHistory,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.85,
      }
    });

    const response = await activeChat.sendMessage({ message: message });
    const answer = response.text || "ขออภัยด้วยครับ มีปัญหาระบบอัจฉริยะขัดข้อง กรุณาลองถามใหม่อีกครั้ง";

    res.json({ answer });
  } catch (err: any) {
    console.error("Gemini API error in express:", err);
    res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบอัจฉริยะ" });
  }
});

// health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
