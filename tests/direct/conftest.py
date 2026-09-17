"""Cross-platform compatibility helpers for genlayer-test v0.30 RC.

The Direct VM refreshes ``gl.message`` after sender/value changes but does not
refresh the timestamp in ``gl.message.raw`` after ``warp``. Contracts use the
network timestamp, so keep the loaded v0.6 message module synchronized.

The test package also unlinks its temporary stdin file while fd 0 still points
to it. POSIX permits that, Windows does not, so Windows delays only that unlink
until stdin has been restored. No contract behavior is changed.
"""

import os
import json

from gltest.direct.vm import VMContext


_original_refresh = VMContext._refresh_gl_message
_original_mock_llm = VMContext.mock_llm


def _refresh_dynamic_message_fields(self):
    _original_refresh(self)
    try:
        import genlayer.message as message

        message.datetime = self._datetime
        if isinstance(message.raw, dict):
            message.raw["datetime"] = self._datetime
            message.raw["value"] = self._value
    except ImportError:
        pass


VMContext._refresh_gl_message = _refresh_dynamic_message_fields


def _v06_compatible_mock_llm(self, prompt_pattern, response):
    """Keep JSON prompt fixtures as JSON text for the v0.6 decoder.

    The v0.30 direct harness eagerly parses mocked JSON strings into Python
    objects, while v0.6 ``exec_prompt(response_format="json")`` expects the
    nondeterministic payload to remain JSON text until it decodes it.
    """
    if isinstance(response, str):
        try:
            parsed = json.loads(response)
        except (TypeError, ValueError):
            parsed = None
        if isinstance(parsed, (dict, list)):
            response = json.dumps(response)
    _original_mock_llm(self, prompt_pattern, response)


VMContext.mock_llm = _v06_compatible_mock_llm


if os.name == "nt":
    import tempfile

    from gltest.direct import loader

    _original_cleanup = VMContext._cleanup_after_deactivate

    def _windows_safe_inject_message_to_fd0(vm):
        # v0.6 contracts expose the standard library as ``genlayer``;
        # the former ``genlayer.py`` namespace no longer exists.
        from genlayer import calldata
        from genlayer.types import Address

        sender_addr = Address(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
        contract_addr = (
            Address(vm._contract_address)
            if isinstance(vm._contract_address, bytes)
            else vm._contract_address
        )
        origin_addr = Address(vm.origin) if isinstance(vm.origin, bytes) else vm.origin
        message_data = {
            "contract_address": contract_addr,
            "sender_address": sender_addr,
            "origin_address": origin_addr,
            "stack": [],
            "value": vm._value,
            "datetime": vm._datetime,
            "is_init": False,
            "chain_id": vm._chain_id,
            "entry_kind": 0,
            "entry_data": b"",
            "entry_stage_data": None,
        }

        encoded = calldata.encode(message_data)
        fd, path = tempfile.mkstemp()
        try:
            os.write(fd, encoded)
            os.lseek(fd, 0, os.SEEK_SET)
            vm._original_stdin_fd = os.dup(0)
            os.dup2(fd, 0)
            vm._windows_stdin_path = path
        finally:
            os.close(fd)

    def _windows_safe_cleanup(self):
        path = getattr(self, "_windows_stdin_path", None)
        _original_cleanup(self)
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass
            self._windows_stdin_path = None

    loader._inject_message_to_fd0 = _windows_safe_inject_message_to_fd0
    VMContext._cleanup_after_deactivate = _windows_safe_cleanup
