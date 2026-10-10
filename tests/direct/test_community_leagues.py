"""Registry state and permissions; game reads are isolated at the interface."""
import sys
from pathlib import Path
from types import SimpleNamespace
import pytest

@pytest.fixture
def registry(direct_vm, direct_deploy, monkeypatch):
    from gltest.direct.sdk_loader import setup_sdk_paths
    direct_vm.warp("2026-10-10T16:00:00Z")
    setup_sdk_paths(Path("contracts/community_leagues.py"))
    from genlayer import Address
    contract = direct_deploy("contracts/community_leagues.py", Address("0x1111111111111111111111111111111111111111"))
    rounds = {"round-1": {"status": "OPEN", "lock_at": "2026-10-10T17:00:00Z"}}
    monkeypatch.setattr(sys.modules["_contract_community_leagues"], "Game", lambda _: SimpleNamespace(view=lambda: SimpleNamespace(get_round=lambda id: rounds.get(id, {}))))
    return contract, rounds

def test_host_invitation_join_and_lock(registry, direct_vm, direct_bob, direct_charlie):
    from genlayer import Address
    contract, _ = registry
    contract.create_league("test-season", "Friday squad", '["round-1"]')
    host = contract.get_league("test-season")["host"]
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Ask the host"):
            contract.join_league("test-season")
        with direct_vm.expect_revert("Only the host"):
            contract.invite_member("test-season", Address(direct_charlie))
    contract.invite_member("test-season", Address(direct_bob))
    with direct_vm.prank(direct_bob):
        contract.join_league("test-season")
        with direct_vm.expect_revert("Already joined"):
            contract.join_league("test-season")
    result = contract.get_league("test-season")
    assert result["members"] == [host, str(Address(direct_bob)).lower()]
    assert result["round_ids"] == ["round-1"]
    direct_vm.warp("2026-10-10T17:00:00Z")
    with direct_vm.expect_revert("membership is locked"):
        contract.invite_member("test-season", Address(direct_charlie))

def test_locked_unknown_duplicate_rounds_rejected(registry, direct_vm):
    contract, rounds = registry
    with direct_vm.expect_revert("Duplicate round"):
        contract.create_league("test-season", "Friday squad", '["round-1","round-1"]')
    with direct_vm.expect_revert("open and unlocked"):
        contract.create_league("test-season", "Friday squad", '["missing"]')
    rounds["round-1"]["status"] = "SETTLED"
    with direct_vm.expect_revert("open and unlocked"):
        contract.create_league("test-season", "Friday squad", '["round-1"]')
