"""Direct-mode coverage for the strict nine-cell Valorant resolver."""

import json

import pytest


CONTRACT = "contracts/esports_match_resolver.py"
RESOLUTION_ID = "meg-synthetic-series-001"
MATCH_ID = "synthetic-meg-valorant-series-001"
VALORANT_URL = "https://valorantesports.com/events/synthetic-meg-series-001"
VLR_URL = "https://www.vlr.gg/meg/synthetic-series-001"
GEN = 10**18


def register(contract, settlement_target="0x0000000000000000000000000000000000000000"):
    from genlayer import Address

    contract.register_round(
        RESOLUTION_ID,
        MATCH_ID,
        "Northstar Wolves",
        "Arcforge",
        "MEG Synthetic Valorant Series",
        "2026-10-03",
        "BEST_OF_3",
        "Synthetic map 01",
        json.dumps([VALORANT_URL, VLR_URL], separators=(",", ":")),
        Address(settlement_target),
        "round-1",
        "2026-10-03T17:00:00Z",
        "2026-10-04T18:00:00Z",
    )


def mock_sources(vm):
    vm.mock_web(r".*valorantesports\.com.*", {"status": 200, "body": "MEG synthetic official event record"})
    vm.mock_web(r".*vlr\.gg.*", {"status": 200, "body": "MEG synthetic match report"})


def final_facts(**overrides):
    value = {
        "identity_confirmed": True,
        "source_conflict": False,
        "match_status": "FINAL",
        "map_1_played": True,
        "series_winner_option": 0,
        "map_1_winner_option": 1,
        "top_team_option": 0,
        "series_score_option": 1,
        "map_1_total_rounds": 23,
        "top_player_option": 0,
        "reverse_sweep_option": 1,
        "any_map_overtime": True,
        "top_fragger_kills": 48,
        "map_results": [
            {"map": "Synthetic map 01", "winner": "B", "rounds_a": 10, "rounds_b": 13, "overtime": False, "played": True},
            {"map": "Synthetic map 02", "winner": "A", "rounds_a": 13, "rounds_b": 11, "overtime": False, "played": True},
            {"map": "Synthetic map 03", "winner": "A", "rounds_a": 14, "rounds_b": 12, "overtime": True, "played": True},
        ],
        "player_kills": [
            {"player": "Kestrel", "team": "A", "kills": 48},
            {"player": "Morrow", "team": "B", "kills": 42},
        ],
        "supported_cell_ids": list(range(9)),
        "evidence_summary": "Both approved reports agree on the final synthetic series record.",
    }
    value.update(overrides)
    return value


def mock_facts(vm, **overrides):
    vm.mock_llm(r".*Extract final, objective Valorant series facts.*", json.dumps(final_facts(**overrides)))


def bitmap(*option_ids):
    value = 0
    for option_id in option_ids:
        value |= 1 << option_id
    return value


def test_resolves_all_nine_cells_with_strict_results(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract, direct_alice)
    mock_sources(direct_vm)
    mock_facts(direct_vm)

    direct_vm.warp("2026-10-03T17:00:01Z")
    contract.resolve_round(RESOLUTION_ID)

    result = contract.get_round_resolution(RESOLUTION_ID)
    cells = json.loads(result["cell_results_json"])
    assert result["status"] == "SETTLED"
    assert result["reason_code"] == "FINAL_FACTS_AGREED"
    assert result["match_status"] == "FINAL"
    assert len(cells) == 9
    assert all(set(cell) == {"cell_id", "cell_index", "outcome_option_index", "status", "evidence_summary", "source_references", "reason_code"} for cell in cells)
    assert [cell["status"] for cell in cells] == ["RESOLVED"] * 9
    assert [cell["outcome_option_index"] for cell in cells] == [0, 1, 0, 1, 1, 0, 1, 1, 2]
    assert result["window_0_bitmap"] == bitmap(1, 11, 20)
    assert result["window_1_bitmap"] == bitmap(5, 14, 23)
    assert result["window_2_bitmap"] == bitmap(7, 16, 27)
    assert result["window_0_valid_bitmap"] == bitmap(1, 2, 3, 10, 11, 12, 19, 20, 21)
    assert result["window_1_valid_bitmap"] == bitmap(4, 5, 6, 13, 14, 15, 22, 23, 24)
    assert result["window_2_valid_bitmap"] == bitmap(7, 8, 9, 16, 17, 18, 25, 26, 27)
    assert result["dispatch_count"] == 0

    contract.dispatch_resolution(RESOLUTION_ID)
    assert contract.get_round_resolution(RESOLUTION_ID)["dispatch_count"] == 1


def test_missing_cells_settle_as_cell_level_invalid_without_valid_bits(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    mock_sources(direct_vm)
    mock_facts(direct_vm, supported_cell_ids=[1, 3, 5, 7])

    direct_vm.warp("2026-10-03T17:00:01Z")
    contract.resolve_round(RESOLUTION_ID)

    result = contract.get_round_resolution(RESOLUTION_ID)
    cells = json.loads(result["cell_results_json"])
    assert result["status"] == "SETTLED"
    assert [cell["status"] for cell in cells] == ["INVALID", "RESOLVED", "INVALID", "RESOLVED", "INVALID", "RESOLVED", "INVALID", "RESOLVED", "INVALID"]
    assert all(cell["reason_code"] == "INSUFFICIENT_EVIDENCE" for cell in cells if cell["status"] == "INVALID")
    assert result["window_0_valid_bitmap"] == bitmap(10, 11, 12)
    assert result["window_1_valid_bitmap"] == bitmap(4, 5, 6, 22, 23, 24)
    assert result["window_2_valid_bitmap"] == bitmap(16, 17, 18)


def test_map_dependent_cells_are_invalid_when_map_one_was_not_played(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    mock_sources(direct_vm)
    mock_facts(direct_vm, map_1_played=False)

    direct_vm.warp("2026-10-03T17:00:01Z")
    contract.resolve_round(RESOLUTION_ID)

    cells = json.loads(contract.get_round_resolution(RESOLUTION_ID)["cell_results_json"])
    assert [cells[index]["reason_code"] for index in [1, 4, 7]] == ["MAP_NOT_PLAYED"] * 3
    assert [cells[index]["status"] for index in [1, 4, 7]] == ["INVALID"] * 3
    assert all(cells[index]["status"] == "RESOLVED" for index in [0, 2, 3, 5, 6, 8])


@pytest.mark.parametrize(
    ("match_status", "reason_code"),
    [("LIVE", "MATCH_NOT_FINAL"), ("SCHEDULED", "MATCH_NOT_FINAL"), ("POSTPONED", "MATCH_POSTPONED")],
)
def test_unfinished_series_remains_retryable(direct_vm, direct_deploy, match_status, reason_code):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    mock_sources(direct_vm)
    mock_facts(direct_vm, match_status=match_status)

    direct_vm.warp("2026-10-03T17:00:01Z")
    contract.resolve_round(RESOLUTION_ID)

    result = contract.get_round_resolution(RESOLUTION_ID)
    assert result["status"] == "PENDING"
    assert result["reason_code"] == reason_code
    assert result["attempt_count"] == 1
    assert result["window_0_bitmap"] == 0


def test_cancelled_series_settles_as_full_cell_invalid(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    mock_sources(direct_vm)
    mock_facts(direct_vm, match_status="CANCELLED")

    direct_vm.warp("2026-10-03T17:00:01Z")
    contract.resolve_round(RESOLUTION_ID)

    result = contract.get_round_resolution(RESOLUTION_ID)
    cells = json.loads(result["cell_results_json"])
    assert result["status"] == "SETTLED"
    assert result["reason_code"] == "MATCH_CANCELLED"
    assert all(cell["reason_code"] == "MATCH_CANCELLED" for cell in cells)
    assert result["window_0_valid_bitmap"] == 0
    assert result["window_1_valid_bitmap"] == 0
    assert result["window_2_valid_bitmap"] == 0


def test_conflicting_sources_remain_pending(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    mock_sources(direct_vm)
    mock_facts(direct_vm, source_conflict=True)

    direct_vm.warp("2026-10-03T17:00:01Z")
    contract.resolve_round(RESOLUTION_ID)

    result = contract.get_round_resolution(RESOLUTION_ID)
    assert result["status"] == "PENDING"
    assert result["reason_code"] == "CONFLICTING_SOURCES"
    assert json.loads(result["cell_results_json"])[0]["reason_code"] == "CONFLICTING_SOURCES"


def test_resolution_is_rejected_before_registered_window(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    with pytest.raises(Exception, match="evidence window has not opened"):
        contract.resolve_round(RESOLUTION_ID)


def test_registration_requires_distinct_approved_publishers(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    from genlayer import Address

    with pytest.raises(Exception, match="distinct publishers"):
        contract.register_round(
            RESOLUTION_ID,
            MATCH_ID,
            "Northstar Wolves",
            "Arcforge",
            "MEG Synthetic Valorant Series",
            "2026-10-03",
            "BEST_OF_3",
            "Synthetic map 01",
            json.dumps([VALORANT_URL, "https://valorantesports.com/events/other"], separators=(",", ":")),
            Address("0x0000000000000000000000000000000000000000"),
            "round-1",
            "2026-10-03T17:00:00Z",
            "2026-10-04T18:00:00Z",
        )


def test_registration_rejects_non_approved_sources(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    from genlayer import Address

    with pytest.raises(Exception, match="approved list"):
        contract.register_round(
            RESOLUTION_ID,
            MATCH_ID,
            "Northstar Wolves",
            "Arcforge",
            "MEG Synthetic Valorant Series",
            "2026-10-03",
            "BEST_OF_3",
            "Synthetic map 01",
            json.dumps([VALORANT_URL, "https://example.com/unapproved"], separators=(",", ":")),
            Address("0x0000000000000000000000000000000000000000"),
            "round-1",
            "2026-10-03T17:00:00Z",
            "2026-10-04T18:00:00Z",
        )


def test_settled_resolution_cannot_be_resolved_twice(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-03T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    mock_sources(direct_vm)
    mock_facts(direct_vm)

    direct_vm.warp("2026-10-03T17:00:01Z")
    contract.resolve_round(RESOLUTION_ID)
    with pytest.raises(Exception, match="already settled"):
        contract.resolve_round(RESOLUTION_ID)
