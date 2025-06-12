# `polly`

Detect property reads and writes on the prototype
object for the given website.

> Requires rust with cargo + working chrome/chromium. 

## Usage

Detect accesses to the `foo` property on `example.com`:

```sh
cargo r -- -p foo -t 2 https://example.com
```
