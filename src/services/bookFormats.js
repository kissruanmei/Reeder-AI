export const SUPPORTED_BOOK_EXTENSIONS = [
  'epub', 'txt', 'pdf', 'mobi', 'azw', 'azw3', 'fb2',
  'html', 'htm', 'md', 'markdown', 'docx', 'rtf', 'cbz'
];

export const SUPPORTED_BOOK_ACCEPT = SUPPORTED_BOOK_EXTENSIONS.map(extension => `.${extension}`).join(',');

export const BOOK_FORMAT_LABELS = {
  epub: 'EPUB', txt: 'TXT', pdf: 'PDF', mobi: 'MOBI', azw: 'AZW', azw3: 'AZW3',
  fb2: 'FB2', html: 'HTML', htm: 'HTML', md: 'Markdown', markdown: 'Markdown',
  docx: 'DOCX', rtf: 'RTF', cbz: 'CBZ'
};

export function getBookExtension(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function getBookFormatLabel(fileName = '') {
  const extension = getBookExtension(fileName);
  return BOOK_FORMAT_LABELS[extension] || extension.toUpperCase();
}
