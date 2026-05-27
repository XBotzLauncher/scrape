const { randomUUID } = require('crypto');
const { readFile } = require('fs/promises');
const { basename, extname } = require('path');
const { lookup: mimeLookup } = require('mime-types');

const BASE_URL = 'https://claude.ai';

const DEFAULT_HEADERS = {
  'authority': 'claude.ai',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'anthropic-client-platform': 'web_claude_ai',
  'anthropic-client-version': '1.0.0',
  'content-type': 'application/json',
  'origin': 'https://claude.ai',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};

const SUPPORTED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'text/html', 'text/markdown',
  'application/json',
]);

class ClaudeClient {
  constructor({ cookie, orgId, model = 'claude-sonnet-4-6', deviceId }) {
    if (!cookie) throw new Error('cookie wajib diisi');
    if (!orgId)  throw new Error('orgId wajib diisi');

    this.cookie   = cookie;
    this.orgId    = orgId;
    this.model    = model;
    this.deviceId = deviceId || randomUUID();
  }

  #headers(extra = {}) {
    return {
      ...DEFAULT_HEADERS,
      'cookie': this.cookie,
      'anthropic-device-id': this.deviceId,
      ...extra,
    };
  }

  async #get(path, params = {}) {
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url, {
      method: 'GET',
      headers: this.#headers({ 'accept': '*/*' }),
    });

    if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
    return res.json();
  }

  async getOrg() {
    return this.#get(`/api/organizations/${this.orgId}`);
  }

  async getConversations(limit = 20) {
    return this.#get(`/api/organizations/${this.orgId}/chat_conversations`, { limit });
  }

  async getConversation(conversationId) {
    return this.#get(
      `/api/organizations/${this.orgId}/chat_conversations/${conversationId}`,
      { tree: 'True', rendering_mode: 'messages', render_all_tools: 'true', consistency: 'eventual' }
    );
  }

  async createConversation(name = '') {
    const res = await fetch(`${BASE_URL}/api/organizations/${this.orgId}/chat_conversations`, {
      method: 'POST',
      headers: this.#headers({ 'accept': 'application/json' }),
      body: JSON.stringify({ name, model: this.model }),
    });

    if (!res.ok) throw new Error(`createConversation → ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.uuid;
  }

  async uploadFile(conversationId, file, filename, mimeType) {
    let buffer, name, mime;

    if (typeof file === 'string') {
      buffer   = await readFile(file);
      name     = filename || basename(file);
      mime     = mimeType || mimeLookup(file) || 'application/octet-stream';
    } else {
      buffer   = file;
      name     = filename || 'upload.bin';
      mime     = mimeType || 'application/octet-stream';
    }

    if (!SUPPORTED_MIME.has(mime)) {
      console.warn(`⚠ MIME "${mime}" mungkin tidak didukung Claude`);
    }

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mime }), name);

    const headers = this.#headers({ 'accept': '*/*' });
    delete headers['content-type'];

    const res = await fetch(
      `${BASE_URL}/api/organizations/${this.orgId}/conversations/${conversationId}/wiggle/upload-file`,
      {
        method: 'POST',
        headers,
        body: form,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`uploadFile → ${res.status}: ${err.slice(0, 300)}`);
    }

    const data = await res.json();
    const fileId = data.file_uuid || data.uuid || data.id;
    if (!fileId) throw new Error(`uploadFile: tidak dapat file ID dari response: ${JSON.stringify(data)}`);

    return fileId;
  }

  async sendMessage(conversationId, prompt, {
    onChunk,
    newConv = false,
    files = [],
    parentMsgUUID,
    thinkingMode,
  } = {}) {
    const humanUUID     = randomUUID();
    const assistantUUID = randomUUID();

    const body = {
      prompt,
      timezone: 'Asia/Jakarta',
      locale: 'id-ID',
      model: this.model,
      personalized_styles: [
        {
          type: 'default', key: 'Default', name: 'Normal',
          nameKey: 'normal_style_name', prompt: 'Normal\n',
          summary: 'Default responses from Claude',
          summaryKey: 'normal_style_summary', isDefault: true,
        }
      ],
      tools: [
        { type: 'web_search_v0', name: 'web_search' },
        { type: 'artifacts_v0',  name: 'artifacts' },
        { type: 'repl_v0',       name: 'repl' },
      ],
      turn_message_uuids: {
        human_message_uuid:    humanUUID,
        assistant_message_uuid: assistantUUID,
      },
      attachments: [],
      files,
      sync_sources: [],
      rendering_mode: 'messages',
    };

    if (parentMsgUUID) {
      body.parent_message_uuid = parentMsgUUID;
    }

    if (thinkingMode) {
      body.thinking_mode = thinkingMode;
    }

    if (newConv) {
      body.create_conversation_params = {
        name: '',
        model: this.model,
        include_conversation_preferences: true,
        is_temporary: false,
      };
    }

    const res = await fetch(
      `${BASE_URL}/api/organizations/${this.orgId}/chat_conversations/${conversationId}/completion`,
      {
        method: 'POST',
        headers: this.#headers({
          'accept':  'text/event-stream',
          'referer': `${BASE_URL}/chat/${conversationId}`,
        }),
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`sendMessage → ${res.status}: ${err.slice(0, 300)}`);
    }

    const text = await this.#parseSSE(res, onChunk);
    return { text, assistantUUID };
  }

  async #parseSSE(res, onChunk) {
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer   = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        let evt;
        try { evt = JSON.parse(raw); } catch { continue; }

        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          const chunk = evt.delta.text || '';
          fullText += chunk;
          if (onChunk) onChunk(chunk);
        }

        if (evt.type === 'error') {
          throw new Error(`Claude error: ${JSON.stringify(evt.error)}`);
        }
      }
    }

    return fullText;
  }

  async chat(prompt, { onChunk } = {}) {
    const conversationId = await this.createConversation();
    const { text, assistantUUID } = await this.sendMessage(
      conversationId, prompt, { onChunk, newConv: true }
    );
    return { conversationId, text, assistantUUID };
  }

  async chatWithFile(prompt, file, { filename, mimeType, onChunk } = {}) {
    const conversationId = await this.createConversation();
    const fileId = await this.uploadFile(conversationId, file, filename, mimeType);

    const { text, assistantUUID } = await this.sendMessage(
      conversationId, prompt,
      { onChunk, newConv: true, files: [fileId] }
    );

    return { conversationId, fileId, text, assistantUUID };
  }

  async continueChat(conversationId, prompt, opts = {}) {
    return this.sendMessage(conversationId, prompt, opts);
  }
}

module.exports = ClaudeClient;