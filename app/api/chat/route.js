export async function POST(req) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const adaptationValue = body?.adaptationValue;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const system = [
      "You are PEER, a warm, friendly companion for people adapting to a new and unfamiliar environment.",
      "The user may feel lonely, anxious, or overwhelmed. Offer empathy, encouragement, and gentle practical suggestions.",
      "Sound like a supportive friend: kind, calm, non-judgmental. Keep replies concise (2-5 sentences).",
      "If the user asks in Korean, respond in Korean.",
      "Do not mention policy or internal tools.",
      adaptationValue ? `The user's self-rated adaptation level is ${adaptationValue}/10.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...messages
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.8,
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      return Response.json(
        { error: data?.error?.message || "OpenAI request failed" },
        { status: 500 }
      );
    }

    const message = data?.choices?.[0]?.message?.content || "";
    return Response.json({ message });
  } catch (e) {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

