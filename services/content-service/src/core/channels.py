"""Kanal-Templates: Prompt-Vorgaben pro Ausgabekanal (§3.1 Social Media).

Die Texte sind bewusst im Code statt in der DB — Phase 1 von P02.
No-Code-Prompt-Management (§5.2) folgt über den admin-service.
"""

CHANNEL_PROMPTS: dict[str, str] = {
    "facebook": (
        "Erstelle einen Facebook-Beitrag für das DRK. Tonalität: nahbar und "
        "wertschätzend. Länge: 80–150 Wörter. Nutze 1–3 passende Emojis und "
        "2–4 Hashtags am Ende. Sprich Leserinnen und Leser direkt an."
    ),
    "instagram": (
        "Erstelle eine Instagram-Caption für das DRK. Tonalität: lebendig und "
        "emotional. Länge: 50–100 Wörter. Beginne mit einem Aufhänger-Satz, "
        "nutze Emojis und 5–8 zielgruppengerechte Hashtags am Ende."
    ),
    "linkedin": (
        "Erstelle einen LinkedIn-Beitrag für das DRK. Tonalität: professionell, "
        "aber menschlich. Länge: 100–200 Wörter. Fokus auf gesellschaftlichen "
        "Mehrwert und Engagement. Maximal 3 Hashtags, sparsame Emoji-Nutzung."
    ),
    "webseite": (
        "Erstelle eine Kurzmeldung für die DRK-Webseite. Tonalität: sachlich "
        "und informativ. Länge: 150–250 Wörter. Mit prägnanter Überschrift in "
        "der ersten Zeile. Keine Emojis, keine Hashtags."
    ),
    "newsletter": (
        "Erstelle einen Newsletter-Abschnitt für das DRK. Tonalität: persönlich "
        "und einladend. Länge: 100–180 Wörter. Mit kurzer Zwischenüberschrift "
        "und einem abschließenden Handlungsaufruf. Keine Hashtags."
    ),
}

SYSTEM_PROMPT = (
    "Du bist Redakteur des Deutschen Roten Kreuzes (DRK). Schreibe auf Deutsch. "
    "Halte dich strikt an die DRK-Grundsätze (Menschlichkeit, Unparteilichkeit, "
    "Neutralität). Erfinde keine Fakten — nutze ausschließlich die gelieferten "
    "Rohdaten. Gib nur den Beitragstext aus, ohne Erklärungen."
)


def build_prompt(channel: str, topic: str) -> str:
    if channel not in CHANNEL_PROMPTS:
        raise ValueError(
            f"Unbekannter Kanal: {channel}. "
            f"Verfügbar: {', '.join(sorted(CHANNEL_PROMPTS))}"
        )
    return f"{SYSTEM_PROMPT}\n\n{CHANNEL_PROMPTS[channel]}\n\nRohdaten:\n{topic}"
