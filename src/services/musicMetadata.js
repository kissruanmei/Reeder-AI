import { parseTrackName } from './musicUtils';

const MAX_TAG_BYTES = 2 * 1024 * 1024;

function syncSafeToInt(bytes) {
  return ((bytes[0] & 0x7f) << 21) | ((bytes[1] & 0x7f) << 14) | ((bytes[2] & 0x7f) << 7) | (bytes[3] & 0x7f);
}

function bytesToInt(bytes, syncSafe = false) {
  if (syncSafe) return syncSafeToInt(bytes);
  return ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
}

function findTerminator(bytes, start, encoding) {
  if (encoding === 1 || encoding === 2) {
    for (let index = start; index + 1 < bytes.length; index += 2) {
      if (bytes[index] === 0 && bytes[index + 1] === 0) return index;
    }
    return bytes.length;
  }
  const index = bytes.indexOf(0, start);
  return index === -1 ? bytes.length : index;
}

function decodeText(bytes, encoding = 3) {
  if (!bytes?.length) return '';
  let charset = 'utf-8';
  let content = bytes;
  if (encoding === 0) charset = 'windows-1252';
  if (encoding === 1) charset = 'utf-16';
  if (encoding === 2) charset = 'utf-16be';
  if (encoding === 3) charset = 'utf-8';
  if (encoding === 1 && bytes[0] === 0xff && bytes[1] === 0xfe) content = bytes.slice(2);
  try {
    return new TextDecoder(charset).decode(content).replace(/\0/g, '').trim();
  } catch {
    return new TextDecoder('utf-8').decode(content).replace(/\0/g, '').trim();
  }
}

function parsePicture(frame) {
  const encoding = frame[0];
  const mimeEnd = frame.indexOf(0, 1);
  if (mimeEnd === -1 || mimeEnd + 2 >= frame.length) return null;
  const mime = decodeText(frame.slice(1, mimeEnd), 0) || 'image/jpeg';
  const descriptionStart = mimeEnd + 2;
  const descriptionEnd = findTerminator(frame, descriptionStart, encoding);
  const imageStart = descriptionEnd + ((encoding === 1 || encoding === 2) ? 2 : 1);
  if (imageStart >= frame.length) return null;
  const binary = frame.slice(imageStart);
  let value = '';
  for (let index = 0; index < binary.length; index += 0x8000) {
    value += String.fromCharCode(...binary.subarray(index, Math.min(index + 0x8000, binary.length)));
  }
  return `data:${mime};base64,${btoa(value)}`;
}

async function readId3Metadata(file) {
  if (!/\.(mp3|mpeg)$/i.test(file.name)) return {};
  const bytes = new Uint8Array(await file.slice(0, MAX_TAG_BYTES).arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3') return {};
  const version = bytes[3];
  const tagEnd = Math.min(bytes.length, 10 + syncSafeToInt(bytes.slice(6, 10)));
  const metadata = {};
  let offset = 10;
  while (offset + 10 <= tagEnd) {
    const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const frameSize = bytesToInt(bytes.slice(offset + 4, offset + 8), version === 4);
    if (!frameSize || offset + 10 + frameSize > tagEnd) break;
    const frame = bytes.slice(offset + 10, offset + 10 + frameSize);
    if (id === 'TIT2') metadata.title = decodeText(frame.slice(1), frame[0]);
    if (id === 'TPE1') metadata.artist = decodeText(frame.slice(1), frame[0]);
    if (id === 'TALB') metadata.album = decodeText(frame.slice(1), frame[0]);
    if (id === 'APIC' && !metadata.cover) metadata.cover = parsePicture(frame);
    offset += 10 + frameSize;
  }
  return metadata;
}

function readDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (duration = 0) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute('src');
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    const timeout = window.setTimeout(() => finish(0), 5000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(0);
    audio.src = objectUrl;
  });
}

export async function extractTrackMetadata(file) {
  const fallback = parseTrackName(file.name);
  const [tags, duration] = await Promise.all([readId3Metadata(file).catch(() => ({})), readDuration(file)]);
  return {
    title: tags.title || fallback.title,
    artist: tags.artist || fallback.artist,
    album: tags.album || '',
    cover: tags.cover || '',
    duration
  };
}
