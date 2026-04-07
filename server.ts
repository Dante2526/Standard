import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Inicializa o Firebase Admin com a chave de serviço
let firebaseAdminApp: admin.app.App | null = null;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin inicializado com sucesso.");
  } else {
    console.warn("AVISO: FIREBASE_SERVICE_ACCOUNT_JSON não encontrada nas variáveis de ambiente.");
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route para verificar o administrador ignorando as regras do Firestore
  app.post("/api/verify-admin", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      if (!firebaseAdminApp) {
        return res.status(500).json({ 
          error: "Servidor não configurado corretamente com a chave do Firebase." 
        });
      }

      const db = admin.firestore();
      const adminsRef = db.collection("administrators");
      const snapshot = await adminsRef.where("email", "==", email.toLowerCase()).get();

      if (!snapshot.empty) {
        res.json({ success: true, isAdmin: true });
      } else {
        res.json({ success: true, isAdmin: false });
      }
    } catch (error: any) {
      console.error("Erro ao verificar admin no servidor:", error);
      res.status(500).json({ error: error.message });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
