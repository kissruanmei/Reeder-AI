import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBookExtension,
  getBookFormatLabel,
  SUPPORTED_BOOK_ACCEPT,
  SUPPORTED_BOOK_EXTENSIONS
} from '../src/services/bookFormats.js';

test('the reader exposes all supported import extensions to file pickers', () => {
  for (const extension of SUPPORTED_BOOK_EXTENSIONS) {
    assert.match(SUPPORTED_BOOK_ACCEPT, new RegExp(`\\.${extension}(,|$)`));
  }
});

test('format detection is case insensitive', () => {
  assert.equal(getBookExtension('Novel.AZW3'), 'azw3');
  assert.equal(getBookFormatLabel('notes.Markdown'), 'Markdown');
});

test('the supported set covers common ebook, document, and comic containers', () => {
  for (const extension of ['epub', 'txt', 'pdf', 'mobi', 'azw3', 'fb2', 'docx', 'cbz']) {
    assert.ok(SUPPORTED_BOOK_EXTENSIONS.includes(extension));
  }
});
