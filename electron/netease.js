import { createCipheriv, createHash, randomBytes, randomInt } from 'node:crypto';

const web = 'https://music.163.com';
const player = 'https://interface.music.163.com';
const device = { os: 'pc', appver: '2.10.13' };
const webKey = '0CoJUm6Qyw8W8jud';
const webIv = '0102030405060708';
const rsaModulus = BigInt('0xe0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7');
const sessionCookies = new Set(['MUSIC_U', '__csrf', 'MUSIC_A_T', 'MUSIC_R_T', 'NMTID']);
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export class NeteaseError extends Error {
  constructor(message, code = 'netease') {
    super(message);
    this.code = code;
  }
}

function aes(algorithm, key, iv, text, encoding) {
  const cipher = createCipheriv(algorithm, key, iv);
  return Buffer.concat([cipher.update(text), cipher.final()]).toString(encoding);
}

// NetEase web login uses raw RSA with the public exponent 65537 over the reversed AES key.
function wrapWebKey(key) {
  const input = BigInt(`0x${Buffer.from(key).reverse().toString('hex')}`);
  let squared = input;
  for (let i = 0; i < 16; i++) squared = squared * squared % rsaModulus;
  return (squared * input % rsaModulus).toString(16).padStart(256, '0');
}

function webForm(payload) {
  const key = randomBytes(8).toString('hex');
  const encrypted = aes('aes-128-cbc', webKey, webIv, JSON.stringify(payload), 'base64');
  return new URLSearchParams({
    params: aes('aes-128-cbc', key, webIv, encrypted, 'base64'),
    encSecKey: wrapWebKey(key),
  });
}

function clientForm(path, payload, session) {
  const credentials = Object.fromEntries(session.split('; ').map(pair => {
    const equals = pair.indexOf('=');
    return [pair.slice(0, equals), pair.slice(equals + 1)];
  }).filter(([name]) => name === 'MUSIC_U' || name === '__csrf'));
  const header = { ...device, requestId: `${Date.now()}_${randomInt(1000)}`, ...credentials };
  const json = JSON.stringify({ ...payload, header });
  const hash = createHash('md5').update(`nobody${path}use${json}md5forencrypt`).digest('hex');
  const text = [path, json, hash].join('-36cd479b6b5-');
  return new URLSearchParams({
    params: aes('aes-128-ecb', 'e82ckenh8dichen8', null, text, 'hex').toUpperCase(),
  });
}

function checkCode(code) {
  if (Number(code) === 301) throw new NeteaseError('网易云登录已过期，请重新扫码。', 'login');
  if ([-462, 405, 429].includes(Number(code))) throw new NeteaseError('网易云暂时限制了请求，请稍后重试。');
}

function musicUrl(value) {
  try {
    const url = new URL(value);
    const trusted = ['music.163.com', 'music.126.net'].some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    if (!trusted || url.username || url.password || url.port || !['http:', 'https:'].includes(url.protocol)) return '';
    url.protocol = 'https:';
    return url.href;
  } catch {
    return '';
  }
}

function parseTrack(row) {
  const album = row.al || row.album;
  return {
    id: String(row.id),
    title: row.name || '未知曲目',
    artist: (row.ar || row.artists || []).map(artist => artist.name).filter(Boolean).join(' / '),
    album: album?.name || '',
    cover: musicUrl(album?.picUrl),
    duration: Number(row.dt ?? row.duration) / 1000 || 0,
  };
}

export function musicId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,15}$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new NeteaseError('网易云曲目或歌单编号无效。');
  }
  return value;
}

export function createNeteaseClient(fetchRequest = fetch) {
  async function request(url, { session = '', body, outer = false } = {}) {
    const headers = { 'User-Agent': userAgent, Referer: `${web}/` };
    if (!outer) headers.Cookie = `os=${device.os}; appver=${device.appver}${session ? `; ${session}` : ''}`;
    try {
      const response = await fetchRequest(url, {
        method: body ? 'POST' : 'GET', body, headers,
        redirect: 'manual', signal: AbortSignal.timeout(10000),
      });
      if (outer) {
        const location = response.headers.get('location');
        const isAudio = response.ok && response.headers.get('content-type')?.startsWith('audio/');
        await response.body?.cancel();
        return location && response.status >= 300 && response.status < 400 ? musicUrl(location) : (isAudio ? url : '');
      }
      checkCode(response.status);
      if (!response.ok) throw new NeteaseError('网易云服务暂时不可用，请稍后重试。', 'service');
      const data = await response.json();
      checkCode(data.code);
      return { data, cookies: response.headers.getSetCookie() };
    } catch (error) {
      if (error instanceof NeteaseError) throw error;
      throw new NeteaseError('暂时无法连接网易云，请检查网络后重试。', 'network');
    }
  }

  async function get(path, query, session) {
    const url = new URL(path, web);
    url.search = new URLSearchParams(query).toString();
    return (await request(url, { session })).data;
  }

  return {
    async createQr() {
      const { data } = await request(`${web}/weapi/login/qrcode/unikey`, { body: webForm({ type: 1 }) });
      if (!data.unikey || typeof data.unikey !== 'string') throw new NeteaseError('网易云未返回二维码，请重试。');
      return data.unikey;
    },

    async pollQr(key) {
      const { data, cookies } = await request(`${web}/weapi/login/qrcode/client/login`, { body: webForm({ key, type: 1 }) });
      if (data.code === 800) return { status: 'expired' };
      if (data.code === 801) return { status: 'waiting' };
      if (data.code === 802) return { status: 'scanned' };
      if (data.code === 803) {
        const pairs = new Map(cookies.map(header => {
          const pair = header.split(';', 1)[0];
          const equals = pair.indexOf('=');
          return [pair.slice(0, equals).trim(), pair.slice(equals + 1)];
        }).filter(([name, value]) => sessionCookies.has(name) && value));
        if (pairs.has('MUSIC_U')) {
          return { status: 'confirmed', session: Array.from(pairs, ([key, value]) => `${key}=${value}`).join('; ') };
        }
      }
      throw new NeteaseError('网易云登录未完成，请重新生成二维码。');
    },

    async account(session) {
      const { profile, account, code } = await get('/api/nuser/account/get', {}, session);
      if (code !== 200) throw new NeteaseError('暂时无法读取网易云账号，请重试。');
      const id = profile?.userId || account?.id;
      if (!id) throw new NeteaseError('网易云登录已过期，请重新扫码。', 'login');
      return { id: musicId(String(id)), name: profile?.nickname || '网易云音乐' };
    },

    async playlists(uid, session) {
      const { playlist } = await get('/api/user/playlist/', { uid, limit: 1000, offset: 0 }, session);
      if (!Array.isArray(playlist)) throw new NeteaseError('无法读取你的网易云歌单，请重试。');
      return playlist.filter(row => row?.id).map(row => ({
        id: String(row.id), title: row.name || '未命名歌单',
        count: row.trackCount || 0, cover: musicUrl(row.coverImgUrl),
      }));
    },

    async tracks(id, session) {
      const { playlist } = await get('/api/v6/playlist/detail', { id, n: 200, s: 0 }, session);
      if (!playlist) throw new NeteaseError('无法打开这份歌单，请重试。');
      const known = new Map((playlist.tracks || []).filter(row => row?.id).map(row => [String(row.id), parseTrack(row)]));
      const orderedIds = playlist.trackIds?.map(row => String(row.id)) ?? [...known.keys()];
      const missing = orderedIds.filter(id => !known.has(id));
      for (let start = 0; start < missing.length; start += 200) {
        const ids = missing.slice(start, start + 200);
        const { songs } = await get('/api/song/detail', { ids: `[${ids.join(',')}]` }, session);
        if (!Array.isArray(songs)) throw new NeteaseError('无法读取完整歌单，请重试。');
        for (const row of songs) if (row?.id) known.set(String(row.id), parseTrack(row));
      }
      return orderedIds.map(id => known.get(id)).filter(Boolean);
    },

    async stream(id, session) {
      const path = '/api/song/enhance/player/url/v1';
      const ids = `[${id}]`;
      let preview;
      let requestError;
      for (const level of ['exhigh', 'standard', 'legacy']) {
        let result;
        try {
          result = level === 'legacy'
            ? await get('/api/song/enhance/player/url', { ids, br: 192000 }, session)
            : (await request(`${player}/eapi/song/enhance/player/url/v1`, {
              session, body: clientForm(path, { ids, level, encodeType: 'mp3' }, session),
            })).data;
        } catch (error) {
          if (error.code !== 'network' && error.code !== 'service') throw error;
          requestError = error;
          continue;
        }
        const row = Array.isArray(result.data) && result.data.find(item => String(item?.id) === id);
        if (!row) continue;
        checkCode(row.code);
        const url = musicUrl(row.url);
        if (!url || (row.code && row.code !== 200)) continue;
        if (!row.freeTrialInfo) return { url, preview: false };
        preview ??= { url, preview: true };
      }
      if (preview) return preview;
      const url = await request(`${web}/song/media/outer/url?id=${id}.mp3`, { outer: true });
      if (url) return { url, preview: false };
      if (requestError) throw requestError;
      throw new NeteaseError('网易云未提供这首歌的可播放音源。', 'unavailable');
    },
  };
}
