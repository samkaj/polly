#!/usr/bin/env python3

import sys
import argparse
import time

from selenium.webdriver import Chrome, ChromeOptions
import json


def main():
    parser = argparse.ArgumentParser(
        prog="polly",
        description="polly monitors property accesses on websites using JavaScript and selenium",
    )
    parser.add_argument(
        "-p",
        "--prop",
        help="""the property to monitor; if
                        omitted, polly tries to infer it from the url
                        query/hash params""",
    )
    parser.add_argument(
        "-w",
        help="""include the query params in the request when visiting the page""",
        action="store_false",
    )
    parser.add_argument(
        "--head",
        help="""run browser with head""",
        action="store_true",
    )
    parser.add_argument("url", help="the website to visit")
    args = parser.parse_args()
    url = args.url

    if "?" not in url:
        url = url + "?__proto__[1337]=bar"

    if "http" not in url:
        url = "http://" + url

    prop = args.prop if args.prop is not None else infer_property(url)
    if prop is None:
        eprint(f"polly: failed to infer a property to monitor from '{args.url}'")
        exit(1)

    accesses = visit_site(url, prop, args.w, not args.head)
    for access in accesses:
        print(json.dumps(access))


def visit_site(url, prop, skip_waf_bypass, head) -> list[dict]:
    onload_scripts = proxy_script(prop)
    if onload_scripts is None:
        eprint(f"polly: failed to create proxy script for property '{prop}'")
        exit(1)

    if not skip_waf_bypass:
        onload_scripts = f"{inject_params(get_params(url, prop))}\n{onload_scripts}"

    driver = get_driver(onload_scripts, head)

    if not skip_waf_bypass:
        url = clean_url(url)

    return monitor(url, driver)



def clean_url(url: str) -> str:
    """Remove query/fragment params from a URL."""
    clean_url = url
    if "?" in clean_url:
        clean_url = clean_url.split("?")[0]
    if "#" in clean_url:
        clean_url = clean_url.split("#")[0]
    return clean_url


def monitor(url: str, driver) -> list[dict]:
    """Visit the webpage on the given URL and return relevant logs."""
    try:
        driver.get(url)
        time.sleep(1)
        # input("Good?")
        logs: list[dict] = driver.execute_script("return logs")
    except:
        eprint(f"an error occured when visiting {url}")
        logs = []
    finally:

        driver.close()
        driver.quit()

    return logs


def get_driver(onload_scripts, headless):
    """Build a standard chrome driver instance for web security analysis."""
    opts = ChromeOptions()
    opts.add_argument("--disable-web-security")
    opts.add_argument("--disable-xss-auditor")
    opts.add_argument("--disable-search-engine-choice-screen")
    opts.add_argument("--ignore-certificate-errors")
    if headless:
        opts.add_argument("--headless")
    driver = Chrome(options=opts)
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument", {"source": onload_scripts}
    )

    driver.set_page_load_timeout(30)

    return driver


def infer_property(url: str) -> str | None:
    """Infer what property to monitor based on the given URL. This is not
    exhaustive, but it provides a nice utility when using the CLI.

    Examples:
    - `?__proto__[foo]=bar` -> foo
    - `?constructor.prototype.foo=bar` -> foo
    """
    if "#" not in url and "?" not in url:
        return None

    def get_prop(prefix, suffix):
        if prefix in url:
            start = url.split(prefix)[1]
            prop = start.split(suffix)[0]
            return prop
        return None

    pairs = [
        ("__proto__.", "="),
        ("__proto__[", "]"),
        ("__proto__][", "]"),
        ("constructor[prototype][", "]"),
        ("constructor.prototype.", "="),
    ]

    for prefix, suffix in pairs:
        prop = get_prop(prefix, suffix)
        if prop:
            return prop

    return None


def inject_params(query) -> str:
    """A script to load query params when loading the document rather than
    including it in the GET request."""
    history = f"history.pushState({{}}, '', '?{query}')"
    return history


def proxy_script(prop) -> str:
    """A script that proxies the get/sets to the prototype object. It works as
    usual, just that we log the accesses to see where they occur in the code."""
    with open("./proxy.js", "r") as f:
        lines = "\n".join(f.readlines())
        lines = lines.replace("PLACEHOLDER", prop)
        return lines


def get_params(url, prop) -> str:
    """Get the query/fragment params from the given url. If none are provided,
    the standard prototype pollution query is added."""
    params = url.split("?")[1]
    if params == url:
        # Query is not used, the params come from the fragment part of the URL
        params = url.split("#")[1]

    if params == url:
        # No query or fragment exists; falling back to standard payload
        params = f"?__proto__[{prop}]=polluted"

    return params


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


if __name__ == "__main__":
    main()
