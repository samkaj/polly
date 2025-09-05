#!/usr/bin/env python3

from time import time
from polly import visit_site
import sys
import json


def main():
    args = sys.argv
    assert len(args) == 2, "expected only one argument"
    path = args[1]
    urls = []
    with open(path, "r") as f:
        urls = [line.strip() for line in f.readlines()]

    results = {}
    for url in urls:
        logs = visit_site(url, "123")
        results[url] = logs

    log_file_name = "polly-" + str(time()).split(".")[0] + ".json"
    with open(log_file_name, "w") as log_file:
        print(results)
        log_file.write(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
