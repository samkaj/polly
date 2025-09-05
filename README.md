# polly

Polly finds the location of prototype pollution in vulnerable websites.

> [!CAUTION]
> Only use polly on websites where you have permission. Prototype pollution is a
> vulnerability.

## Installation

To run polly, you need the following installed on your system:

- Python 3 (tested on 3.13)
- Chromedriver

The recommended method for running is through a virtual environment. To install,
run the following commands:

```
python3 -m venv venv # start a virtual environment: `venv`
source venv/bin/activate # activate the environment
pip install -r requirements.txt # install dependencies 
```

## Usage

**Test a website**

```
./polly.py "website.com"
```

**Monitor a specific property**

```
./polly.py -p property "website.com?payload.property"
```
