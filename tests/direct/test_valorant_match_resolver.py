"""Synthetic fixtures only: v2 named-player, publisher, validator and dispatch coverage."""
import json
import pytest

CONTRACT = "contracts/valorant_match_resolver.py"
URLS = ["https://valorantesports.com/events/synthetic-v2", "https://www.vlr.gg/synthetic-v2"]


def metadata():
    return {"game_type": "valorant", "rule_version": "valorant-bo3-v2", "match_id": "synthetic-v2",
            "team_a": "Northstar", "team_b": "Arcforge", "player_a": "Kestrel", "player_b": "Morrow",
            "competition": "Synthetic test only", "match_date": "2026-10-10", "format_name": "BEST_OF_3",
            "map_1": "Not yet announced", "source_urls": URLS}


def register(contract, meta=None, start="2026-10-10T17:00:00Z", end="2026-10-11T17:00:00Z"):
    from genlayer import Address
    contract.register_round("resolution-1", json.dumps(meta if meta is not None else metadata()),
                            Address("0x1111111111111111111111111111111111111111"), "round-1", start, end)


def facts():
    return {"identity_confirmed": True, "format": "BEST_OF_3", "status": "FINAL", "maps": [
        {"winner": 1, "score_a": 10, "score_b": 13, "overtime": False},
        {"winner": 0, "score_a": 13, "score_b": 11, "overtime": False},
        {"winner": 0, "score_a": 14, "score_b": 12, "overtime": True},
    ], "complete_player_totals": True, "players": [
        {"name": "Kestrel", "team": 0, "kills": 48}, {"name": "Morrow", "team": 1, "kills": 42},
        *[{"name": f"A{i}", "team": 0, "kills": 20 + i} for i in range(2, 6)],
        *[{"name": f"B{i}", "team": 1, "kills": 20 + i} for i in range(2, 6)],
    ]}


def mocks(vm, first, second=None):
    vm.clear_mocks()
    for url in URLS:
        vm.mock_web(url, {"status": 200, "body": "Synthetic publisher facts, not a live fixture"})
    vm.mock_llm(r"[\s\S]*Named player A: Kestrel; named player B: Morrow[\s\S]*Publisher: https://valorantesports.com/[\s\S]*", json.dumps(first))
    vm.mock_llm(r"[\s\S]*Named player A: Kestrel; named player B: Morrow[\s\S]*Publisher: https://www.vlr.gg/[\s\S]*", json.dumps(second or first))


@pytest.fixture
def registered(direct_vm, direct_deploy):
    direct_vm.warp("2026-10-10T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    register(contract)
    direct_vm.warp("2026-10-10T17:00:01Z")
    return contract


@pytest.mark.parametrize("field,value,error", [
    ("player_a", "", "Missing match metadata"), ("player_b", None, "Missing match metadata"),
    ("format_name", "BEST_OF_5", "BO3 format required"), ("game_type", "call-of-duty", "Valorant v2"),
    ("rule_version", "unknown", "Valorant v2"), ("player_b", "Kestrel", "distinct teams and players"),
    ("source_urls", [URLS[0], "https://www.vlr.gg.attacker.example/match"], "distinct approved publishers"),
    ("source_urls", [URLS[0], URLS[0] + "-other"], "distinct approved publishers"),
    ("source_urls", [URLS[0]], "Two or three"), ("match_date", "2026-02-30", "Invalid match date"),
])
def test_registration_validation(direct_vm, direct_deploy, field, value, error):
    direct_vm.warp("2026-10-10T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    meta = metadata()
    meta[field] = value
    with direct_vm.expect_revert(error):
        register(contract, meta)


@pytest.mark.parametrize("start,end", [
    ("2026-10-10T15:00:00Z", "2026-10-11T17:00:00Z"),
    ("2026-10-11T17:00:00Z", "2026-10-10T17:00:00Z"),
    ("2026-13-10T17:00:00Z", "2026-14-11T17:00:00Z"),
])
def test_window_order(direct_vm, direct_deploy, start, end):
    direct_vm.warp("2026-10-10T16:00:00Z")
    contract = direct_deploy(CONTRACT)
    with direct_vm.expect_revert("Invalid evidence window"):
        register(contract, start=start, end=end)


def test_non_owner_and_duplicate_registration(registered, direct_vm, direct_bob):
    with direct_vm.expect_revert("duplicate registration"):
        register(registered)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the owner"):
        register(registered)


@pytest.mark.parametrize("leader,option", [(0, 0), (1, 1), (2, 2)])
def test_cell_five_named_players_and_other(registered, direct_vm, leader, option):
    value = facts()
    value["players"][leader]["kills"] = 60
    mocks(direct_vm, value)
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    assert record["game_type"] == "valorant"
    assert record["rule_version"] == "valorant-bo3-v2"
    assert (record["player_a"], record["player_b"]) == ("Kestrel", "Morrow")
    cells = json.loads(record["cell_results_json"])
    assert cells[5]["outcome_option_index"] == option
    assert record["window_2_bitmap"] & (1 << (16 + option))


def test_all_cells_and_validator_disagreement(registered, direct_vm):
    mocks(direct_vm, facts())
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    assert [cell["outcome_option_index"] for cell in json.loads(record["cell_results_json"])] == [0, 1, 0, 1, 1, 0, 1, 1, 2]
    assert direct_vm.run_validator() is True
    different = facts()
    different["players"][1]["kills"] = 60
    mocks(direct_vm, different)
    assert direct_vm.run_validator() is False


def test_source_conflict_remains_pending(registered, direct_vm):
    other = facts()
    other["players"][1]["kills"] = 60
    mocks(direct_vm, facts(), other)
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    assert record["status"] == "PENDING"
    assert record["reason_code"] == "CONFLICTING_SOURCES"


def test_incomplete_stat_only_invalidates_its_cell(registered, direct_vm):
    value = facts()
    value["maps"][0]["score_a"] = None
    mocks(direct_vm, value)
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    assert record["status"] == "SETTLED"
    assert [cell["cell_index"] for cell in json.loads(record["cell_results_json"]) if cell["status"] == "INVALID"] == [4]
    assert record["window_1_valid_bitmap"] & (7 << 13) == 0


def test_unpublished_players_are_not_other(registered, direct_vm):
    value = facts()
    value.update(complete_player_totals=False, players=[])
    mocks(direct_vm, value)
    registered.resolve_round("resolution-1")
    assert [cell["cell_index"] for cell in json.loads(registered.get_round_resolution("resolution-1")["cell_results_json"]) if cell["status"] == "INVALID"] == [2, 5, 8]


@pytest.mark.parametrize("status", ["CANCELLED", "POSTPONED", "LIVE", "FORFEIT"])
def test_unplayed_matches_pending(registered, direct_vm, status):
    mocks(direct_vm, {"identity_confirmed": True, "format": "BEST_OF_3", "status": status})
    registered.resolve_round("resolution-1")
    record = registered.get_round_resolution("resolution-1")
    assert record["status"] == "PENDING"
    assert all(cell["status"] == "PENDING" for cell in json.loads(record["cell_results_json"]))
    with direct_vm.expect_revert("Consensus has not settled"):
        registered.dispatch_resolution("resolution-1")


def test_early_late_duplicate_resolution_and_persist_then_dispatch(registered, direct_vm):
    messages = []
    def observe(vm, request):
        if "EmitInternalMessage" in request:
            # Capture the ABI emission rather than pretending the game executed.
            assert registered.get_round_resolution("resolution-1")["status"] == "SETTLED"
            messages.append(request["EmitInternalMessage"])
            return {"ok": None}
        return None
    direct_vm._gl_call_hook = observe
    direct_vm.warp("2026-10-10T16:59:59Z")
    with direct_vm.expect_revert("outside its evidence window"):
        registered.resolve_round("resolution-1")
    direct_vm.warp("2026-10-11T17:00:01Z")
    with direct_vm.expect_revert("outside its evidence window"):
        registered.resolve_round("resolution-1")
    with direct_vm.expect_revert("Consensus has not settled"):
        registered.dispatch_resolution("resolution-1")
    direct_vm.warp("2026-10-10T17:00:01Z")
    mocks(direct_vm, facts())
    registered.resolve_round("resolution-1")
    assert registered.get_round_resolution("resolution-1")["dispatch_count"] == 0
    assert messages == []
    with direct_vm.expect_revert("settled"):
        registered.resolve_round("resolution-1")
    registered.dispatch_resolution("resolution-1")
    assert registered.get_round_resolution("resolution-1")["dispatch_count"] == 1
    assert len(messages) == 1
    assert messages[0]["on"] == "finalized"
    assert str(messages[0]["address"]).lower() == "0x1111111111111111111111111111111111111111"
    assert messages[0]["calldata"][""] == "accept_resolution"
    assert messages[0]["calldata"]["args"][:3] == ["round-1", "resolution-1", "synthetic-v2"]


def test_b_two_zero_does_not_win_b_two_one(registered, direct_vm):
    value = facts()
    value["maps"] = [dict(value["maps"][0]), dict(value["maps"][0])]
    mocks(direct_vm, value)
    registered.resolve_round("resolution-1")
    cells = json.loads(registered.get_round_resolution("resolution-1")["cell_results_json"])
    assert cells[0]["outcome_option_index"] == 1
    assert cells[3]["status"] == "INVALID"
