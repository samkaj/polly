#!/usr/bin/env python3

from time import time
from polly import visit_site
import sys


def main():
    log_file_name = "polly-" + str(time()).split(".")[0] + ".log"
    log_file = open(log_file_name, "a")
    try:
        args = sys.argv
        assert len(args) == 2, "expected only one argument"
        path = args[1]
        urls = []
        with open(path, "r") as f:
            urls = [line.strip() for line in f.readlines()]

        results = {}
        for url in urls:
            print(f"visiting {url}")
            logs = visit_site(url, "1337")
            print(logs)
            results[url] = logs
            log_file.write(f"{'-'*len(url)}\n{url}\n{logs}\n")
            print(f"{'-'*len(url)}")
    except:
        log_file.close()
    finally:
        log_file.close()


if __name__ == "__main__":
    main()
