# EterLocale

> Localization and character encoding utilities providing Arabic text shaping and code-page definitions for multi-language support.

## Overview

EterLocale is a small library containing locale-specific text processing helpers. It provides Arabic script shaping (converting Unicode code points to their correct positional presentation forms), Japanese character utilities, and a UTF-8 code-page constant. These utilities are used by the text rendering system when displaying localized content.

## Dependencies

None beyond the standard C++ library.

## Files

| File | Purpose |
|------|---------|
| `Arabic.h/.cpp` | Arabic Unicode shaping: converts Arabic base letters to their contextual presentation forms for correct RTL rendering |
| `Japanese.h/.cpp` | Japanese character utilities (purpose unclear from source, likely kana/kanji helpers) |
| `CodePageId.h` | Defines `CP_UTF8 = 65001` for Windows code-page API calls |

## Functions

### Arabic shaping (`Arabic.h`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `Arabic_MakeShape` | `wchar_t* src, size_t srcLen, wchar_t* dst, size_t dstLen` | `size_t` | Converts a sequence of Arabic Unicode code points into their correctly shaped presentation-form equivalents for visual rendering |
| `Arabic_IsInSpace` | `wchar_t code` | `bool` | Returns true if the character is an Arabic whitespace code point |
| `Arabic_IsInSymbol` | `wchar_t code` | `bool` | Returns true if the character is an Arabic punctuation/symbol |
| `Arabic_IsInPresentation` | `wchar_t code` | `bool` | Returns true if the character is already in a presentation form |
| `Arabic_HasPresentation` | `wchar_t* codes, int last` | `bool` | Returns true if the character sequence should use a presentation form |
| `Arabic_ConvSymbol` | `wchar_t c` | `wchar_t` | Converts an Arabic symbol to its display form |
| `Arabic_ConvEnglishModeSymbol` | `wchar_t code` | `wchar_t` | Converts a symbol for use in English/Latin mixed text with Arabic |

### Code-page constant (`CodePageId.h`)

| Constant | Value | Description |
|----------|-------|-------------|
| `CP_UTF8` | `65001` | Windows code-page identifier for UTF-8; passed to Win32 `MultiByteToWideChar` / `WideCharToMultiByte` |
