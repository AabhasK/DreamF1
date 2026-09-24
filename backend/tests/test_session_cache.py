import app.fastf1_cache as cache


def _reset_cache():
    cache._session_cache.clear()
    cache._session_locks.clear()
    cache._cache_current_round = None


def test_loading_new_round_evicts_previous_round():
    """t3.micro can't hold two rounds' worth of FastF1 telemetry at once —
    loading round B must drop every cached entry for round A."""
    _reset_cache()
    cache._load_session(2026, 11, "R", telemetry=True)
    cache._load_session(2026, 11, "Q", telemetry=False)
    assert len(cache._session_cache) == 2

    cache._load_session(2026, 10, "R", telemetry=True)

    remaining_rounds = {key[1] for key in cache._session_cache}
    assert remaining_rounds == {10}
    assert cache._cache_current_round == (2026, 10)


def test_same_round_different_keys_all_kept_warm():
    """Switching tabs within one round (race telemetry vs quali) should not
    evict each other — only a genuinely different round triggers eviction."""
    _reset_cache()
    cache._load_session(2026, 11, "R", telemetry=True)
    cache._load_session(2026, 11, "R", telemetry=False)
    cache._load_session(2026, 11, "Q", telemetry=False)

    assert len(cache._session_cache) == 3
    assert all(key[1] == 11 for key in cache._session_cache)


def test_repeated_load_reuses_cache_without_reloading():
    _reset_cache()
    first = cache._load_session(2026, 11, "R", telemetry=True)
    second = cache._load_session(2026, 11, "R", telemetry=True)
    assert first is second
