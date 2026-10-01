"""Season results come back 100 rows a page: every page must be read, and a race
split across a page break must still count as one round."""
from app.routers.standings import _race_results_by_round


class FakePage:
    def __init__(self, rounds, frames, next_page=None):
        self.description = {"round": rounds}
        self.content = frames
        self._next = next_page

    def get_next_result_page(self):
        if self._next is None:
            raise ValueError("No more data after this response.")
        return self._next


class FakeErgast:
    def __init__(self, first_page):
        self.first_page = first_page

    def get_race_results(self, season, limit):
        return self.first_page


def test_reads_every_page_and_joins_split_races():
    page2 = FakePage([5, 6], ["r5 tail", "r6"])
    page1 = FakePage([4, 5], ["r4", "r5 head"], next_page=page2)

    by_round = _race_results_by_round(FakeErgast(page1), 2026)

    assert by_round == {4: ["r4"], 5: ["r5 head", "r5 tail"], 6: ["r6"]}


def test_single_page_season():
    by_round = _race_results_by_round(FakeErgast(FakePage([1, 2], ["r1", "r2"])), 2026)

    assert by_round == {1: ["r1"], 2: ["r2"]}
