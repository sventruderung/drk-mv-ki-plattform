"""White-Label-Konfiguration: Markenname, Farbe und Sichtbarkeits-Gruppen.

Alles aus Umgebungsvariablen (.env) — eine Codebasis, pro Installation eine
Konfiguration. Sichtbarkeits-Gruppen werden hier EINMAL definiert; Realm-Rollen,
UI-Checkboxen und Filter leiten sich davon ab.
"""

import os

BRAND_NAME = os.environ.get("BRAND_NAME", "kv-brain")
BRAND_COLOR = os.environ.get("BRAND_COLOR", "#235FA6")  # bis Logo-Farbe feststeht
BRAND_LOGO = os.environ.get("BRAND_LOGO", "logo.svg")   # Datei in static/admin/

# Funktionale Rollen — organisationsunabhängig, immer vorhanden
FUNCTIONAL_ROLES = [
    {"id": "kv-admin", "label": "Administrator"},
    {"id": "content-editor", "label": "Social-Media-Redaktion"},
    {"id": "content-approver", "label": "Social-Media-Freigabe"},
]

# Sichtbarkeits-Gruppen (ACL) — pro Installation konfigurierbar.
# Format in .env:  ACL_GROUPS=id:Label,id:Label,...
_DEFAULT_ACL_GROUPS = (
    "alle:Alle Mitarbeitenden,gf:GF,verwaltung:Verwaltung,"
    "datenschutz:Datenschutz,esf-brb:ESF BRB,panel:Panel,"
    "rehapro:Rehapro,my-turn:my turn"
)


def _parse_groups(raw: str) -> list[dict]:
    groups = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        gid, _, label = part.partition(":")
        gid = gid.strip()
        if gid:
            groups.append({"id": gid, "label": (label.strip() or gid)})
    return groups


ACL_GROUPS = _parse_groups(os.environ.get("ACL_GROUPS", _DEFAULT_ACL_GROUPS))
DEFAULT_GROUP = ACL_GROUPS[0]["id"] if ACL_GROUPS else "alle"

# Erlaubte Rollen für die Nutzerverwaltung = funktionale Rollen + ACL-Gruppen
ALLOWED_ROLES = [r["id"] for r in FUNCTIONAL_ROLES] + [g["id"] for g in ACL_GROUPS]
