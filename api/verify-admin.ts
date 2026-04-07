import admin from "firebase-admin";

// Inicializa o Firebase Admin apenas uma vez para evitar erros na Vercel
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
      });
      console.log("Firebase Admin inicializado com sucesso na Vercel.");
    }
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin:", error);
  }
}

export default async function handler(req, res) {
  // Configuração de CORS (Permite que o frontend converse com essa API)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responde a requisições de "pré-voo" do navegador
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Aceita apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: "Servidor não configurado com a chave do Firebase (FIREBASE_SERVICE_ACCOUNT_JSON ausente)." });
    }

    const db = admin.firestore();
    const adminsRef = db.collection("administrators");
    const snapshot = await adminsRef.where("email", "==", email.toLowerCase()).get();

    if (!snapshot.empty) {
      res.status(200).json({ success: true, isAdmin: true });
    } else {
      res.status(200).json({ success: true, isAdmin: false });
    }
  } catch (error) {
    console.error("Erro na API da Vercel:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor" });
  }
}
