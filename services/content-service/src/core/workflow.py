"""Freigabe-Workflow für Social-Media-Inhalte (P02).

Verbindlich: KEIN Beitrag verlässt das System ohne menschliche Freigabe.
Editor und Approver sind getrennte Rollen (Vier-Augen auf Inhaltsebene).
"""

STATES = {"entwurf", "zur_freigabe", "freigegeben", "abgelehnt", "publiziert"}

# (von, nach) → benötigte Rolle
TRANSITIONS: dict[tuple[str, str], str] = {
    ("entwurf", "zur_freigabe"): "content-editor",
    ("abgelehnt", "entwurf"): "content-editor",       # Überarbeitung nach Ablehnung
    ("zur_freigabe", "freigegeben"): "content-approver",
    ("zur_freigabe", "abgelehnt"): "content-approver",
    ("freigegeben", "publiziert"): "content-approver",
}


class TransitionError(Exception):
    pass


def check_transition(current: str, target: str, roles: list[str]) -> None:
    """Wirft TransitionError, wenn der Übergang ungültig oder nicht erlaubt ist."""
    required = TRANSITIONS.get((current, target))
    if required is None:
        raise TransitionError(
            f"Übergang '{current}' → '{target}' ist nicht vorgesehen."
        )
    if required not in roles:
        raise TransitionError(
            f"Für '{current}' → '{target}' wird die Rolle '{required}' benötigt."
        )
