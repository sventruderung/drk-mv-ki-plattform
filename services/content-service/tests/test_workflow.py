import pytest

from src.core.channels import build_prompt
from src.core.workflow import STATES, TRANSITIONS, TransitionError, check_transition


def test_editor_can_submit():
    check_transition("entwurf", "zur_freigabe", ["content-editor"])


def test_approver_can_approve_and_reject():
    check_transition("zur_freigabe", "freigegeben", ["content-approver"])
    check_transition("zur_freigabe", "abgelehnt", ["content-approver"])


def test_editor_cannot_approve():
    with pytest.raises(TransitionError, match="content-approver"):
        check_transition("zur_freigabe", "freigegeben", ["content-editor"])


def test_skip_approval_is_forbidden():
    # Direkt entwurf → freigegeben/publiziert darf nicht möglich sein
    with pytest.raises(TransitionError):
        check_transition("entwurf", "freigegeben", ["content-approver"])
    with pytest.raises(TransitionError):
        check_transition("entwurf", "publiziert", ["content-approver"])


def test_rejected_goes_back_to_draft():
    check_transition("abgelehnt", "entwurf", ["content-editor"])


def test_all_transition_states_are_valid():
    for (src, dst), _role in TRANSITIONS.items():
        assert src in STATES and dst in STATES


def test_build_prompt_known_channel():
    prompt = build_prompt("facebook", "Blutspende am 12.07. in Schwerin")
    assert "Blutspende am 12.07. in Schwerin" in prompt
    assert "Facebook" in prompt


def test_build_prompt_unknown_channel():
    with pytest.raises(ValueError, match="Unbekannter Kanal"):
        build_prompt("tiktok", "Test")
