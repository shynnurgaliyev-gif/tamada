import type { AppEnv } from '@tamada/config';

export type AudioFile = {
  data: Buffer;
  filename: string;
  mimeType: string;
};

export type SpeechToTextProvider = {
  transcribeAudio(file: AudioFile): Promise<string>;
};

export function createSpeechToTextProvider(env: AppEnv): SpeechToTextProvider {
  if (env.SPEECH_TO_TEXT_PROVIDER === 'openai') {
    return new OpenAISpeechToTextProvider(env);
  }
  return {
    async transcribeAudio() {
      throw new Error(`Unsupported speech-to-text provider: ${env.SPEECH_TO_TEXT_PROVIDER}`);
    },
  };
}

class OpenAISpeechToTextProvider implements SpeechToTextProvider {
  constructor(private readonly env: AppEnv) {}

  async transcribeAudio(file: AudioFile): Promise<string> {
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required for speech-to-text');

    const form = new FormData();
    form.set('model', this.env.SPEECH_TO_TEXT_MODEL);
    form.set('file', new Blob([file.data], { type: file.mimeType }), file.filename);

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI transcription failed: ${res.status} ${body.slice(0, 200)}`);
    }

    const json = await res.json() as { text?: unknown };
    const text = typeof json.text === 'string' ? json.text.trim() : '';
    if (!text) throw new Error('OpenAI transcription returned empty text');
    return text;
  }
}
