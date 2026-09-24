from app.utils import _clean


def test_root_returns_welcome(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["message"] == "Welcome to MyF1Circle API!"


def test_clean_nan():
    assert _clean(float("nan")) is None


def test_clean_inf():
    assert _clean(float("inf")) is None


def test_clean_normal_float():
    assert _clean(3.14) == 3.14


def test_clean_nested_dict():
    assert _clean({"lap": float("nan"), "pos": 1}) == {"lap": None, "pos": 1}


def test_clean_nested_list():
    assert _clean([float("nan"), 2.0]) == [None, 2.0]
