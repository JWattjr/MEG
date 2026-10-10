# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""Invitation-only rosters for immutable MEG seasons; holds no player funds."""
import json
import genlayer as gl
from genlayer import *
from genlayer.storage import DynArray, TreeMap


@gl.contract.interface
class Game:
    class View:
        def get_round(self, round_id: str, /) -> dict: ...
    class Write:
        pass


def _now() -> str:
    return str(gl.message.datetime)[:19] + "Z"


class CommunityLeagues(gl.contract.Contract):
    game: Address
    leagues: TreeMap[str, str]
    league_ids: DynArray[str]
    invitations: TreeMap[str, bool]
    members: TreeMap[str, bool]

    def __init__(self, game: Address):
        self.game = game

    @gl.public.write
    def create_league(self, league_id: str, name: str, round_ids_json: str) -> None:
        if len(league_id) < 8 or len(league_id) > 64 or not all(c in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in league_id):
            raise gl.vm.UserError("Invalid league ID")
        if league_id in self.leagues:
            raise gl.vm.UserError("League already exists")
        if not 3 <= len(name.strip()) <= 60 or len(round_ids_json) > 4096:
            raise gl.vm.UserError("Invalid league details")
        try:
            rounds = json.loads(round_ids_json)
        except Exception:
            raise gl.vm.UserError("Invalid round list")
        if not isinstance(rounds, list) or not 1 <= len(rounds) <= 16 or not all(isinstance(r, str) and 1 <= len(r) <= 160 for r in rounds):
            raise gl.vm.UserError("Choose 1 to 16 registered rounds")
        if len(set(rounds)) != len(rounds):
            raise gl.vm.UserError("Duplicate round")
        locks = []
        for round_id in rounds:
            record = Game(self.game).view().get_round(round_id)
            if not record or record["status"] != "OPEN" or record["lock_at"] <= _now():
                raise gl.vm.UserError("Every league round must be open and unlocked")
            locks.append(record["lock_at"])
        host = str(gl.message.sender_address).lower()
        self.leagues[league_id] = json.dumps({"league_id": league_id, "name": name.strip(), "host": host, "round_ids": rounds, "join_before": min(locks), "created_at": _now(), "members": [host], "scoring": "correct-cells-v1", "game_address": str(self.game)})
        self.members[league_id + "|" + host] = True
        self.league_ids.append(league_id)

    @gl.public.write
    def invite_member(self, league_id: str, wallet: Address) -> None:
        league = self._get(league_id)
        if str(gl.message.sender_address).lower() != league["host"]:
            raise gl.vm.UserError("Only the host can invite wallets")
        if _now() >= league["join_before"]:
            raise gl.vm.UserError("League membership is locked")
        self.invitations[league_id + "|" + str(wallet).lower()] = True

    @gl.public.write
    def join_league(self, league_id: str) -> None:
        league = self._get(league_id)
        if _now() >= league["join_before"]:
            raise gl.vm.UserError("League membership is locked")
        member = str(gl.message.sender_address).lower()
        key = league_id + "|" + member
        if self.members.get(key, False):
            raise gl.vm.UserError("Already joined this league")
        if not self.invitations.get(key, False):
            raise gl.vm.UserError("Ask the host to invite your wallet")
        if len(league["members"]) >= 100:
            raise gl.vm.UserError("League is full")
        league["members"].append(member)
        self.leagues[league_id] = json.dumps(league)
        self.members[key] = True

    @gl.public.view
    def get_league(self, league_id: str) -> dict:
        return json.loads(self.leagues[league_id]) if league_id in self.leagues else {}

    @gl.public.view
    def is_invited(self, league_id: str, wallet: Address) -> bool:
        return self.invitations.get(league_id + "|" + str(wallet).lower(), False)

    @gl.public.view
    def get_league_count(self) -> u256:
        return len(self.league_ids)

    @gl.public.view
    def get_league_id(self, index: u256) -> str:
        if index >= len(self.league_ids):
            raise gl.vm.UserError("League index out of bounds")
        return self.league_ids[index]

    def _get(self, league_id: str) -> dict:
        if league_id not in self.leagues:
            raise gl.vm.UserError("League not found")
        return json.loads(self.leagues[league_id])
