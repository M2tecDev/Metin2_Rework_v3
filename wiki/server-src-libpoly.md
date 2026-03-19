# server-src-libpoly

> A standalone polynomial and mathematical formula expression evaluator used to parse and compute skill damage formulas, stat scaling curves, and other game calculations expressed as text strings.

## Overview

`libpoly` is NOT a network layer or a monitoring component. It is a small expression-evaluator library. Its purpose is to take a formula string such as `"floor(min(skill * 2.5 + level, 500))"`, compile it into a postfix token stream, bind named variables to their current values, and evaluate the result as a `double`. The game process uses this to evaluate skill and ability formulas loaded from configuration files.

The library implements a recursive-descent parser that produces a postfix token list. Evaluation walks the token list with a simple stack machine. Named variables (like `skill`, `level`, `atk`) are registered in a sorted symbol table (`CSymTable`) and can be updated between calls to `Eval()` without re-parsing.

## Dependencies

- C++17 standard library (`<string>`, `<vector>`).
- No external dependencies.

## Files

| File | Purpose |
|------|---------|
| `Poly.h` / `Poly.cpp` | `CPoly` — main parser and evaluator class |
| `SymTable.h` / `SymTable.cpp` | `CSymTable` — symbol table entry: name, token type, double value |
| `Symbol.h` / `Symbol.cpp` | `CSymbol` — operator/symbol token with type comparisons |
| `Base.h` / `Base.cpp` | `CBase` — base token type with `id` field and type-query methods |
| `Constants.h` | Token-type integer constants (`NUM`, `ID`, `PLU`, `MIN`, `MUL`, `DIV`, `POW`, `ROOT`, `SIN`, `COS`, `ABS`, `IRAND`, `FRAND`, `MINF`, `MAXF`, `FLOOR`, `SIGN`, `MOD`, etc.) |
| `main.cpp` | Minimal stand-alone test/demo driver |

## Classes / Functions

### `CBase` (`Base.h`)

**Purpose:** Abstract base token type. Identifies what category a token belongs to.

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `id` | `int` | Token type identifier (one of `MID_NUMBER`, `MID_VARIABLE`, `MID_SYMBOL`, or `MID_UNKNOWN`) |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `isNumber()` | — | `bool` | True if `id == MID_NUMBER` (256 range) |
| `isVar()` | — | `bool` | True if `id == MID_VARIABLE` (512 range) |
| `isSymbol()` | — | `bool` | True if `id == MID_SYMBOL` (1024 range) |

---

### `CSymbol` (`Symbol.h`)

**Purpose:** Represents an operator or punctuation token. Inherits `CBase`.

Operator token constants defined in `Symbol.h`:

| Constant | Value | Character |
|----------|-------|-----------|
| `ST_PLUS` / `SY_PLUS` | 11 / `'+'` | Addition |
| `ST_MINUS` / `SY_MINUS` | 12 / `'-'` | Subtraction |
| `ST_MULTIPLY` / `SY_MULTIPLY` | 23 / `'*'` | Multiplication |
| `ST_DIVIDE` / `SY_DIVIDE` | 24 / `'/'` | Division |
| `ST_CARET` / `SY_CARET` | 35 / `'^'` | Exponentiation |
| `ST_OPEN` / `SY_OPEN` | 6 / `'('` | Open parenthesis |
| `ST_CLOSE` / `SY_CLOSE` | 7 / `')'` | Close parenthesis |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `issymbol(ch)` | `int ch` | `int` | Static; true if `ch` is a recognised operator character |
| `SetType(Type)` | `int Type` | `void` | Sets the operator type |
| `GetType()` | — | `int` | Returns the operator type |
| `Equal(dif)` | `CSymbol dif` | `bool` | True if same type |
| `Less(dif)` | `CSymbol dif` | `bool` | True if this type < dif type (ordering for precedence) |

---

### `CSymTable` (`SymTable.h`)

**Purpose:** A symbol table entry: pairs a name with its token type and current numeric value.

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `dVal` | `double` | Current numeric value of this symbol (updated externally via `CPoly::SetVar`) |
| `token` | `int` | Token type code (e.g., `ID`, `IRAND`, `SIN`, etc.) |
| `strlex` | `std::string` | The name as it appears in the formula string |

---

### `CPoly` (`Poly.h` / `Poly.cpp`)

**Purpose:** The main formula parser and evaluator. Parses an expression string into a postfix token stream, binds named variables, and evaluates the result.

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `tokenBase` | `std::vector<int>` | Postfix token stream |
| `numBase` | `std::vector<double>` | Literal numeric values corresponding to `NUM` tokens |
| `lSymbol` | `std::vector<CSymTable*>` | Symbol table entries (owned pointers) |
| `SymbolIndex` | `std::vector<int>` | Sorted index into `lSymbol` for binary search by name |
| `STSize` | `int` | Current number of entries in the symbol table |
| `strData` | `std::string` | The raw formula string |
| `ErrorOccur` | `bool` | Set to `true` if parsing or evaluation fails |
| `iLookAhead` | `int` | Current lookahead token during parsing |
| `uiLookPos` | `unsigned int` | Current character position in `strData` |

#### Public Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetStr` | `const std::string& str` | `void` | Sets the formula string without parsing |
| `Analyze` | `const char* pszStr = NULL` | `int` | Parses the formula; returns true on success. Optionally sets the formula string first |
| `Eval` | — | `double` | Evaluates the compiled postfix token stream using a stack machine; returns 0 on error |
| `SetVar` | `const std::string& strName, double dVar` | `int` | Updates the value of a named variable; returns false if the name is not found |
| `GetVar` | `const std::string& strName` | `double` | Returns the current value of a named variable |
| `Clear` | — | `void` | Clears the token stream, numeric values, and symbol table |

#### Pre-registered Symbols

The constructor calls `init()`, which registers the following built-in functions and constants:

| Name(s) | Token | Description |
|---------|-------|-------------|
| `min` | `MINF` | Minimum of two arguments |
| `max` | `MAXF` | Maximum of two arguments |
| `number`, `irandom`, `irand` | `IRAND` | Integer random in `[a, b]` |
| `frandom`, `frand` | `FRAND` | Float random in `[a, b]` |
| `rt`, `sqrt` | `ROOT` | Square root |
| `cos` | `COS` | Cosine |
| `sin` | `SIN` | Sine |
| `tan` | `TAN` | Tangent |
| `cot` | `COT` | Cotangent |
| `csc`, `cosec` | `CSC` | Cosecant |
| `sec` | `SEC` | Secant |
| `pi` | `ID` | π ≈ 3.14159… |
| `e` | `ID` | e ≈ 2.71828… |
| `log` | `LOG` | Logarithm base b: `log(b, x)` |
| `ln` | `LN` | Natural logarithm |
| `log10` | `LOG10` | Base-10 logarithm |
| `abs` | `ABS` | Absolute value |
| `mod` | `MOD` | Modulo |
| `floor` | `FLOOR` | Floor |
| `sign` | `SIGN` | Sign: -1, 0, or 1 |

#### Protected Parsing Methods

These implement the recursive-descent grammar `expr → term { +/- term }`, `term → factor { */% factor }`, `factor → expo { ^ expo }`:

| Method | Description |
|--------|-------------|
| `expr()` | Handles `+` and `-` operators |
| `term()` | Handles `*`, `/`, `%` operators |
| `factor()` | Handles `^` (exponentiation) |
| `expo()` | Handles atoms: numbers, identifiers, parenthesised expressions, function calls |
| `lexan()` | Lexer: tokenises the next token from `strData` at `uiLookPos` |
| `emit(t, tval)` | Appends a token to `tokenBase` (and value to `numBase` for `NUM`) |
| `match(t)` | Asserts lookahead == `t`, then advances |
| `error()` | Sets `ErrorOccur = true` |
| `init()` | Registers all built-in functions and constants |
| `insert(s, tok)` | Inserts a new symbol into the sorted symbol table |
| `find(s)` | Binary search over the sorted symbol table; returns index or -1 |
| `my_irandom(start, end)` | Returns a random integer in `[start, end]` |
| `my_frandom(start, end)` | Returns a random float in `[start, end]` |

## Typical Usage Pattern

```cpp
CPoly poly;
poly.Analyze("floor(min(skill * 2.5 + level, 500))");

poly.SetVar("skill", 30.0);
poly.SetVar("level", 50.0);

double result = poly.Eval();  // => floor(min(30*2.5+50, 500)) = 125.0
```

The `Analyze` step is done once at startup. `SetVar` + `Eval` are called each time the formula is needed at runtime.
