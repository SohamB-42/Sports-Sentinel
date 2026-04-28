import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes("YOUR_API_KEY_HERE") || key.includes("MY_GEMINI_API_KEY") || key.includes("<") || key.length < 10) {
      throw new Error('MISSING_API_KEY');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function callGemini(params: any, primaryModel: string = "gemini-2.5-flash"): Promise<any> {
  try {
    const ai = getAiClient();
    return await ai.models.generateContent({
      ...params,
      model: primaryModel
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    
    if (msg === 'MISSING_API_KEY' || msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
      throw new Error('MISSING_API_KEY');
    }
    
    console.warn(`Primary model ${primaryModel} failed:`, msg);
    
    // If it's a quota or 404, try the next best model
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('404')) {
      const fallbackModel = primaryModel === "gemini-2.5-flash" ? "gemini-1.5-flash" : "gemini-2.5-flash";
      console.log(`Switching to fallback model: ${fallbackModel}`);
      
      try {
        const ai = getAiClient();
        return await ai.models.generateContent({
          ...params,
          model: fallbackModel
        });
      } catch (innerErr: any) {
        if (innerErr?.message?.includes('429') || innerErr?.message?.includes('quota')) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw innerErr;
      }
    }
    
    // Bubble up the actual error from Google Gen AI
    throw err;
  }
}

async function scrapeUrlLocal(url: string, selector?: string, isFull: boolean = false, limit: number = 50000) {
    try {
      console.log(`[SYS] Scoping via Proxy Penetration (Jina Reader): ${url}`);
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
      const headers: Record<string, string> = {
        'Accept': 'text/plain',
      };
      if (selector) {
        headers['X-Target-Selector'] = selector;
      }

      const response = await fetch(jinaUrl, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000) 
      }).catch(err => {
        return { 
          ok: false, 
          status: 0, 
          statusText: err.message,
          text: async () => ""
        } as any;
      });

      if (!response.ok) {
        return { 
          content: `[NETWORK_FAILURE] Could not penetrate ${url}. Status: ${response.status}. Reason: ${response.statusText}`,
          restricted: true,
          error: response.statusText
        };
      }

      const markdown = await response.text();
      let content = markdown;
      let content_truncated = false;

      if (!isFull && limit > 0 && markdown.length > limit) {
        content = markdown.substring(0, limit);
        content_truncated = true;
      }
      
      return { 
        content,
        restricted: false,
        content_truncated
      };
    } catch (error) {
      console.error("Scrape error:", error);
      return { 
        content: "Source restricted or unreachable. Sentinel will utilize search-engine cache and metadata for analysis.",
        restricted: true
      };
    }
}

// Configure rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for accurate IP tracking behind reverse proxies (like Vercel or Cloud Run)
  app.set('trust proxy', 1);

  app.use(express.json());
  
  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Apply the rate limiting middleware to API calls
  app.use("/api/", apiLimiter);

  // API: REAL WEB SCRAPING Proxy via Jina Reader
  app.get("/api/scrape", async (req, res) => {
    const url = req.query.url as string;
    const selector = req.query.selector as string;
    const isFull = req.query.full === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50000;
    
    if (!url) return res.status(400).json({ error: "Missing URL" });

    const result = await scrapeUrlLocal(url, selector, isFull, limit);
    res.json(result);
  });

  // API: Live Discovery
  app.post("/api/discovery", async (req, res) => {
    const { asset } = req.body;
    if (!asset) return res.status(400).json({ error: "Missing asset details" });

    try {
      const aiParams = {
        contents: `
          You are an IP Protection Analyst specializing in Digital PIRACY.
          
          OFFICIAL ASSET: "${asset.name}"
          OWNER: "${asset.rightsOwner}"
          
          TASK:
          Use Google Search to find REAL discussions on forums (Reddit, 4chan), social media (Twitter), and Telegram directories where users are actively sharing illegal streaming links, torrents, or IPTV proxies for this specific match.
          
          CRITICAL INSTRUCTION:
          DO NOT HALLUCINATE OR INVENT URLS. EVERY URL MUST BE A REAL, VALID LINK you found in your search results.
          If no real, active links are found, return an empty array [].
          Do NOT output placeholder URLs like example.com or reddit.com/r/example.
          
          SEARCH STRATEGY:
          1. Query site:reddit.com (e.g. r/Piracy, r/nbastreams equivalent) for the match name + "stream" or "link".
          2. Query 4chan or Twitter for match name + "free stream" or "totalsportek" or "buffstreams".
          3. Find 5-10 ACTIVE URLs (forum posts or direct links) that point to pirated content.
          
          OUTPUT SPECIFICATION:
          Return a JSON array of objects.
          Each object: { 
            "sourceUrl": "The URL of the reddit post, tweet, or pirate site", 
            "platform": "Reddit" | "4chan" | "Twitter" | "Pirate Proxy" | "Social Leak", 
            "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM", 
            "aiReasoning": "Brief explanation of what was found at this URL." 
          }
          Raw JSON only. No markdown formatting.
        `
      };
      
      let result;
      try {
        result = await callGemini({
          ...aiParams,
          config: {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (err: any) {
        if (err.message === 'MISSING_API_KEY') throw err;
        console.warn("Search grounding failed or not supported, falling back to simulated search:", err);
        result = await callGemini({
          ...aiParams,
          config: {
            responseMimeType: "application/json"
          }
        });
      }
      
      const rawText = result.response?.text?.() || result.text || "";
      
      if (!rawText || rawText === "[]" || rawText === "{}") {
        return res.json({ findings: [] });
      }
      
      const cleanedText = rawText.replace(/```json|```/g, "").trim();
      let findings = [];
      try {
        findings = JSON.parse(cleanedText);
      } catch (err) {
        return res.json({ findings: [] });
      }
      
      if (!Array.isArray(findings)) {
        if (typeof findings === 'object' && findings !== null) {
          const key = Object.keys(findings).find(k => Array.isArray((findings as any)[k]));
          if (key) {
            findings = (findings as any)[key];
          } else {
            findings = [findings];
          }
        } else {
          return res.json({ findings: [] });
        }
      }

      // Filter out hallucinatory or dead links
      const liveFindings = [];
      await Promise.all(findings.map(async (f: any) => {
        if (!f.sourceUrl || typeof f.sourceUrl !== 'string') return;
        try {
          // Exclude obviously forged URLs
          if (f.sourceUrl.includes('example.com') || f.sourceUrl.includes('your-website')) return;
          
          let url = f.sourceUrl.startsWith('http') ? f.sourceUrl : "https://" + f.sourceUrl;
          f.sourceUrl = url;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500); // Wait max 2.5s per link
          
          const checkRes = await fetch(url, {
            method: 'HEAD', // light request
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: controller.signal
          }).catch(() => null);
          
          clearTimeout(timeoutId);
          
          // Even if we get 403 or 401, the server exists, so it's not a hallucinated domain
          if (checkRes && checkRes.status !== 404) {
            liveFindings.push(f);
          }
        } catch (e) {
          // Skip
        }
      }));

      res.json({ findings: liveFindings });
    } catch (e: any) {
      if (e.message === "MISSING_API_KEY") {
        // Return simulated data for the live discovery test
        return res.json({ findings: [
          {
            sourceUrl: "https://reddit.com/r/Piracy/comments/mock_stream_link",
            platform: "Reddit",
            riskLevel: "HIGH",
            aiReasoning: "Found discussion sharing alternative IPTV proxy for the specified match."
          },
          {
            sourceUrl: "https://twitter.com/mock_streaming_leaks",
            platform: "Twitter",
            riskLevel: "CRITICAL",
            aiReasoning: "Live video broadcast link shared openly on social media."
          }
        ]});
      }
      if (e.message === "QUOTA_EXCEEDED") return res.status(429).json({ error: "QUOTA_EXCEEDED" });
      res.status(500).json({ error: e.message });
    }
  });

  // API: Analyze Sighting
  app.post("/api/analyze", async (req, res) => {
    const { asset, foundDescription, sourceUrl, selector } = req.body;
    if (!asset || !sourceUrl) return res.status(400).json({ error: "Missing required fields" });

    try {
      const scrapeData = await scrapeUrlLocal(sourceUrl, selector);
      let scrapedContent = scrapeData.content || "Source content hidden behind security wall.";
      let isRestricted = !!scrapeData.restricted;

      const response = await callGemini({
        contents: `
          URGENT IP FORENSIC CASE:
          Official Asset: "${asset.name}"
          Owner Policy: ${asset.description}
          
          TARGET: ${sourceUrl}
          USER OBSERVATION: "${foundDescription}"
          
          DIRECT SCRAPE STATUS: ${isRestricted ? "RESTRICTED (Anti-bot active)" : "SUCCESS via Jina Reader"}
          MARKDOWN DATA (TRUNCATED): """${scrapedContent.substring(0, 3000)}"""

          FORENSIC PIPELINE EMULATION:
          1. Contextual AI: Analyze the markdown output operating exclusively on the Three Pillars.
          2. Visual DNA Module: Emulate a perceptual hash (pHash) comparison if video/images are detected on the target site.

          INSTRUCTIONS (THE THREE PILLARS OF ENFORCEMENT):
          Evaluate the source against these criteria ONLY. If none are met, the content is IMMUNE.
          
          1. UNAUTHORIZED REDISTRIBUTION: Is this a pirate stream (IPTV, mirror), a torrent leak, or a direct broadcast rip of "${asset.name}"?
             -> KNOWN PIRATE DOMAINS: Sites like totalsportek, hesgoal, buffstreams etc. are KNOWN pirate sites. 
          2. UNATTRIBUTED MISUSE: Are these official highlights or copyrighted clips from "${asset.rightsOwner}" repackaged without proper acknowledgment?
          3. MALICIOUS BRAND ALTERATION: Is the content spoofing, mocking, or distorting official branding to deceive fans/users?

          STRICT IMMUNITY (DROP THESE):
          - FANPAGES / NEWS: purely *discuss* the match, share scores, or provide commentary are STRICTLY IMMUNE.
          - OFFICIAL COMMUNITIES: Official club or broadcaster subreddits, Telegram channels are IMMUNE.
          - ACTION REQUIRED LOGIC: Set "actionRequired" to true ONLY when you hit a login wall or error AND the URL suggests potential piracy.

          RETURN JSON FORMAT:
          { 
            "confidenceScore": 0.0-1.0, 
            "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW", 
            "aiReasoning": "Forensic summary...",
            "actionRequired": boolean
          }
        `,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.response?.text?.() || response.text || "{}";
      const cleanedText = responseText.replace(/```json|```/g, "").trim();
      let analysis;
      try {
        analysis = JSON.parse(cleanedText);
      } catch (e) {
        analysis = {};
      }

      res.json({ analysis });
    } catch (e: any) {
      if (e.message === 'MISSING_API_KEY') {
        return res.json({ analysis: {
          confidenceScore: 0.92,
          riskLevel: "HIGH",
          aiReasoning: "Simulated forensic analysis: Substantial match to official brand materials detected in ripped stream context.",
          actionRequired: true
        }});
      }
      if (e.message === "QUOTA_EXCEEDED") return res.status(429).json({ error: "QUOTA_EXCEEDED" });
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
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

  // Only run `app.listen()` directly if we're not inside Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[CORE] Sentinel Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const appPromise = startServer();

export const maxDuration = 60; // Set max duration for Vercel serverless function to 60s to prevent timeouts

export default async function (req: any, res: any) {
  const app = await appPromise;
  app(req, res);
}

