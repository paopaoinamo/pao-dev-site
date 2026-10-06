// Live Roblox stats + thumbnails for the games shown on the site.
// Runs on Vercel as a serverless function at /api/games.
const UNIVERSES = {
  "10767862529": "87517601066107",  // Pets Vs. Brainrots RNG
  "10767028769": "111538811783413"  // Weapon RNG!
};

module.exports = async (req, res) => {
  const ids = Object.keys(UNIVERSES).join(",");
  try {
    const [games, thumbs, icons] = await Promise.all([
      fetch("https://games.roblox.com/v1/games?universeIds=" + ids).then(r => r.json()),
      fetch("https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=" + ids + "&countPerUniverse=1&size=768x432&format=Png&isCircular=false").then(r => r.json()),
      fetch("https://thumbnails.roblox.com/v1/games/icons?universeIds=" + ids + "&size=256x256&format=Png&isCircular=false").then(r => r.json())
    ]);

    const out = {};
    for (const g of games.data || []) {
      out[g.rootPlaceId] = {
        name: g.name,
        playing: g.playing || 0,
        visits: g.visits || 0,
        favorites: g.favoritedCount || 0,
        maxPlayers: g.maxPlayers,
        updated: g.updated
      };
    }
    for (const t of thumbs.data || []) {
      const place = UNIVERSES[String(t.universeId)];
      const img = t.thumbnails && t.thumbnails[0];
      if (out[place] && img && img.state === "Completed") out[place].thumbnail = img.imageUrl;
    }
    for (const i of icons.data || []) {
      const place = UNIVERSES[String(i.targetId)];
      if (out[place] && i.state === "Completed") out[place].icon = i.imageUrl;
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: "Could not reach Roblox. Try again in a minute." });
  }
};
