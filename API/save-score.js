export default async function handler(req, res) {
  const BIN_ID = "6a068089c0954111d826436c";
  const MASTER_KEY = process.env.JSONBIN_KEY;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const existing = await fetch(
      `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
      {
        headers: {
          "X-Master-Key": MASTER_KEY,
        },
      }
    );

    const existingData = await existing.json();
    const current = existingData.record || [];

    const incoming = req.body;
    const updated = [...current, incoming]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const saved = await fetch(
      `https://api.jsonbin.io/v3/b/${BIN_ID}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY,
        },
        body: JSON.stringify(updated),
      }
    );

    const result = await saved.json();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}