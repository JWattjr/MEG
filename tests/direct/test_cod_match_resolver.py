"""BO5 evidence, cancellation, and independent validator coverage."""
import json
import pytest

CONTRACT = "contracts/cod_match_resolver.py"
URLS = ["https://callofdutyleague.com/en-us/match/test", "https://breakingpoint.gg/matches/test"]

def register(contract, urls=URLS):
    from genlayer import Address
    metadata = {"match_id": "cod-test", "team_a": "Northstar", "team_b": "Arcforge", "player_a": "Kestrel", "player_b": "Morrow", "competition": "Synthetic test", "match_date": "2026-10-10", "format_name": "BEST_OF_5", "source_urls": urls}
    contract.register_round("resolution-1", json.dumps(metadata), Address("0x1111111111111111111111111111111111111111"), "round-1", "2026-10-10T17:00:00Z", "2026-10-11T17:00:00Z")

def final_facts():
    return {"identity_confirmed": True, "format": "BEST_OF_5", "status": "FINAL", "maps": [
        {"winner": 1, "mode": "HARDPOINT", "score_a": 200, "score_b": 250},
        {"winner": 1, "mode": "SEARCH_DESTROY", "score_a": 4, "score_b": 6},
        {"winner": 0, "mode": "OVERLOAD", "score_a": 8, "score_b": 3},
        {"winner": 0, "mode": "HARDPOINT", "score_a": 250, "score_b": 180},
        {"winner": 0, "mode": "SEARCH_DESTROY", "score_a": 6, "score_b": 3},
    ], "complete_player_totals": True, "players": [
        {"name": "Kestrel", "team": 0, "kills": 110}, {"name": "A2", "team": 0, "kills": 80}, {"name": "A3", "team": 0, "kills": 70}, {"name": "A4", "team": 0, "kills": 60},
        {"name": "Morrow", "team": 1, "kills": 100}, {"name": "B2", "team": 1, "kills": 90}, {"name": "B3", "team": 1, "kills": 70}, {"name": "B4", "team": 1, "kills": 60},
    ]}

def mocks(vm, first, second=None):
    vm.clear_mocks()
    for url in URLS:
        vm.mock_web(url, {"status": 200, "body": "Synthetic test publisher facts"})
    vm.mock_llm(r"[\s\S]*Publisher: https://callofdutyleague.com/[\s\S]*", json.dumps(first))
    vm.mock_llm(r"[\s\S]*Publisher: https://breakingpoint.gg/[\s\S]*", json.dumps(second or first))

@pytest.fixture
def registered(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-10T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    direct_vm.warp("2026-10-10T17:00:01Z")
    return contract

def test_all_cells_and_independent_validator(registered, direct_vm):
    mocks(direct_vm, final_facts())
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    assert record["status"] == "SETTLED"
    assert [row["outcome_option_index"] for row in json.loads(record["cell_results_json"])] == [0, 1, 0, 2, 2, 0, 1, 1, 2]
    assert direct_vm.run_validator() is True
    conflicting = final_facts()
    conflicting["players"][0]["kills"] = 60
    mocks(direct_vm, conflicting)
    assert direct_vm.run_validator() is False

def test_conflicting_publishers_do_not_settle(registered, direct_vm):
    other = final_facts()
    other["players"][0]["kills"] = 60
    mocks(direct_vm, final_facts(), other)
    registered.resolve_round("resolution-1")
    assert registered.get_round_resolution("resolution-1")["reason_code"] == "CONFLICTING_SOURCES"

def test_missing_statistics_refund_only_affected_cells(registered, direct_vm):
    facts = final_facts()
    facts["complete_player_totals"] = False
    facts["players"] = []
    mocks(direct_vm, facts)
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    cells = json.loads(record["cell_results_json"])
    assert record["status"] == "SETTLED"
    assert [cell["cell_index"] for cell in cells if cell["status"] == "INVALID"] == [2, 5, 8]

@pytest.mark.parametrize("status", ["CANCELLED", "FORFEIT", "LIVE"])
def test_unplayed_series_waits_for_full_game_refund(registered, direct_vm, status):
    mocks(direct_vm, {"identity_confirmed": True, "format": "BEST_OF_5", "status": status})
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    assert record["status"] == "PENDING"
    assert all(cell["status"] == "PENDING" for cell in json.loads(record["cell_results_json"]))
    with direct_vm.expect_revert("Consensus has not settled"):
        registered.dispatch_resolution("resolution-1")

def test_same_publisher_and_lookalike_domain_rejected(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-10T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    with direct_vm.expect_revert("distinct approved publishers"):
        register(contract, [URLS[0], "https://www.callofdutyleague.com/another"])
    with direct_vm.expect_revert("distinct approved publishers"):
        register(contract, [URLS[0], "https://breakingpoint.gg.attacker.example/match"])

def test_owner_and_evidence_window(registered, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the owner"):
        register(registered)
    direct_vm.warp("2026-10-11T17:00:01Z")
    with direct_vm.expect_revert("outside its evidence window"):
        registered.resolve_round("resolution-1")
