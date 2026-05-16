export default async function handler(req, res) {
  const BIN_ID     = "6a084a41250b1311c35b441a";
  const MASTER_KEY = process.env.JSONBIN_KEY;
 
  // Allow GET to fetch leaderboard
  if (req.method === "GET") {
    try {
      const response = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
        { headers: { "X-Master-Key": MASTER_KEY } }
      );
      const data = await response.json();
      const leaderboard = Array.isArray(data?.record?.leaderboard)
        ? data.record.leaderboard
        : [];
      return res.status(200).json({ leaderboard });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
 
  // POST to save a new score
  if (req.method === "POST") {
    try {
      const { name, score } = req.body;
      if (!name || score === undefined) {
        return res.status(400).json({ error: "Missing name or score" });
      }
 
      // Fetch current leaderboard
      const existing = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
        { headers: { "X-Master-Key": MASTER_KEY } }
      );
      const existingData = await existing.json();
      const current = Array.isArray(existingData?.record?.leaderboard)
        ? existingData.record.leaderboard
        : [];
 
      // Add new score, sort, trim to top 20
      const updated = [...current, { name, score }]
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
 
      // Save back
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY,
        },
        body: JSON.stringify({ leaderboard: updated }),
      });
 
      return res.status(200).json({ leaderboard: updated });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
 
  return res.status(405).json({ error: "Method not allowed" });
}