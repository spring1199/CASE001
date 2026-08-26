import { createPhoneContentIndex } from '@/phone/data/schema';

function createNeutralAudioSource(): string {
  const sampleRate = 8_000;
  const sampleCount = sampleRate;
  const bytes = new Uint8Array(44 + sampleCount);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + sampleCount, true);
  writeAscii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeAscii(36, 'data');
  view.setUint32(40, sampleCount, true);
  for (let index = 0; index < sampleCount; index += 1) {
    bytes[44 + index] = 128 + Math.round(22 * Math.sin((2 * Math.PI * 440 * index) / sampleRate));
  }

  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const NEUTRAL_AUDIO_SOURCE = createNeutralAudioSource();

const neutralSeedInput = {
  version: 1,
  locale: 'mn',
  device: {
    ownerLabel: 'Туршилтын төхөөрөмж',
    modelLabel: 'Aru 5',
    systemLabel: 'Aru OS 12.4',
    lockPrompt: 'Төхөөрөмжийг нээхийн тулд дээш шударна уу',
  },
  apps: [
    {
      id: 'messages',
      label: 'Зурвас',
      shortLabel: 'Зурвас',
      iconLabel: 'Зурвас апп',
      lockedInitially: false,
      items: [
        {
          id: 'weekend-plan-thread',
          kind: 'message-thread',
          title: 'Амралтын өдрийн төлөвлөгөө',
          subtitle: '3 зурвас',
          timestampLabel: 'Өчигдөр',
          messages: [
            {
              id: 'weekend-plan-message-1',
              senderLabel: 'Найз',
              direction: 'incoming',
              body: 'Бямба гарагт цэцэрлэгт хүрээлэнд уулзах уу?',
              timestampLabel: '18:20',
              read: true,
            },
            {
              id: 'weekend-plan-message-2',
              senderLabel: 'Төхөөрөмжийн эзэмшигч',
              direction: 'outgoing',
              body: 'Тэгье. Өглөө цагийг нь баталгаажуулъя.',
              timestampLabel: '18:24',
              read: true,
            },
            {
              id: 'weekend-plan-message-3',
              senderLabel: 'Найз',
              direction: 'incoming',
              timestampLabel: '18:31',
              read: false,
              audio: {
                src: NEUTRAL_AUDIO_SOURCE,
                durationLabel: '0:01',
                transcript: 'Бороотой бол кофе шопт уулзаж болно шүү.',
              },
            },
          ],
          audio: {
            src: NEUTRAL_AUDIO_SOURCE,
            durationLabel: '0:01',
            transcript: 'Бороотой бол кофе шопт уулзаж болно шүү.',
          },
          discovery: {
            artifactIds: ['neutral-voice-note'],
            evidenceIds: ['neutral-weather-detail'],
            unlockAppIds: ['files'],
            unlockContentIds: ['neutral-receipt-file'],
          },
        },
      ],
    },
    {
      id: 'gallery',
      label: 'Зураг',
      shortLabel: 'Зураг',
      iconLabel: 'Зургийн цомог',
      lockedInitially: false,
      items: [
        {
          id: 'park-rain-photo',
          kind: 'photo',
          title: 'Борооны дараах цэцэрлэг',
          timestampLabel: 'Даваа · 19:12',
          visual: {
            alt: 'Борооны дараа норсон явган зам ба хоосон сандал',
            description: 'Саарал тэнгэрийн доор нойтон зам гялалзаж, модон сандал хоосон байна.',
            width: 3024,
            height: 4032,
          },
          metadata: [
            { label: 'Огноо', value: '8 сарын 24 · 19:12' },
            { label: 'Хэмжээ', value: '3024 × 4032' },
            { label: 'Байршил', value: 'Хадгалаагүй' },
          ],
        },
      ],
    },
    {
      id: 'calls',
      label: 'Дуудлага',
      shortLabel: 'Дуудлага',
      iconLabel: 'Дуудлагын жагсаалт',
      lockedInitially: false,
      items: [
        {
          id: 'delivery-call',
          kind: 'call',
          title: 'Хүргэлтийн ажилтан',
          subtitle: 'Ирсэн дуудлага · 1 мин 12 сек',
          timestampLabel: 'Өчигдөр · 14:08',
          metadata: [{ label: 'Дугаар', value: '+976 7000 0101' }],
        },
      ],
    },
    {
      id: 'mail',
      label: 'Шуудан',
      shortLabel: 'Шуудан',
      iconLabel: 'Цахим шуудан',
      lockedInitially: false,
      items: [
        {
          id: 'community-library-mail',
          kind: 'mail',
          title: 'Ном буцаах сануулга',
          subtitle: 'Хотын нийтийн номын сан',
          timestampLabel: 'Мягмар · 09:10',
          body: 'Таны авсан номын буцаах хугацаа баасан гарагт дуусна.',
          deepLinks: [
            {
              label: 'Сануулагч тэмдэглэлийг нээх',
              target: { appId: 'notes', itemId: 'friday-reminder-note' },
            },
          ],
        },
      ],
    },
    {
      id: 'browser',
      label: 'Хөтөч',
      shortLabel: 'Хөтөч',
      iconLabel: 'Вэб хөтөч',
      lockedInitially: false,
      items: [
        {
          id: 'weather-page',
          kind: 'web-page',
          title: 'Долоо хоногийн цаг агаар',
          subtitle: 'Хадгалсан хуудас',
          timestampLabel: 'Өчигдөр · 17:42',
          body: 'Бямба гарагт түр зуурын бороотой. Өдрийн дундаж 18°.',
          deepLinks: [
            {
              label: 'Амралтын өдрийн зурвасыг нээх',
              target: { appId: 'messages', itemId: 'weekend-plan-thread' },
            },
          ],
        },
      ],
    },
    {
      id: 'notes',
      label: 'Тэмдэглэл',
      shortLabel: 'Тэмдэглэл',
      iconLabel: 'Тэмдэглэлийн дэвтэр',
      lockedInitially: false,
      items: [
        {
          id: 'friday-reminder-note',
          kind: 'note',
          title: 'Баасан гараг',
          timestampLabel: 'Мягмар · 09:14',
          body: 'Номын санд очих\nЦай авах\nДугуйн гэрэл шалгах',
        },
      ],
    },
    {
      id: 'files',
      label: 'Файл',
      shortLabel: 'Файл',
      iconLabel: 'Файл хадгалах сан',
      lockedInitially: true,
      items: [
        {
          id: 'neutral-receipt-file',
          kind: 'file',
          title: 'баримт-08.pdf',
          subtitle: 'Татсан файлууд · 84 КБ',
          timestampLabel: 'Даваа · 16:03',
          body: 'Загвар баримтын урьдчилан харах хэсэг.',
          metadata: [
            { label: 'Төрөл', value: 'PDF баримт' },
            { label: 'Хэмжээ', value: '84 КБ' },
          ],
        },
      ],
    },
    {
      id: 'settings',
      label: 'Тохиргоо',
      shortLabel: 'Тохиргоо',
      iconLabel: 'Системийн тохиргоо',
      lockedInitially: false,
      items: [
        {
          id: 'system-overview',
          kind: 'system-info',
          title: 'Төхөөрөмжийн мэдээлэл',
          subtitle: 'Aru OS 12.4',
          metadata: [
            { label: 'Загвар', value: 'Aru 5' },
            { label: 'Багтаамж', value: '128 ГБ' },
            { label: 'Сул зай', value: '42.6 ГБ' },
          ],
        },
      ],
    },
  ],
} as const;

export const neutralPhoneIndex = createPhoneContentIndex(neutralSeedInput);
export const neutralPhoneContent = neutralPhoneIndex.content;
