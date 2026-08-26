import { createPhoneContentIndex } from '@/phone/data/schema';

const NEUTRAL_AUDIO_SOURCE =
  'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAh46TlpaTj4iBeXNta2pscXd/ho2SlZaUkImCe3Rua2pscHZ9hYyRlZaUkYuDfHVva2prb3V8g4uRlJaVkYyFfXZwbGprbnR7gomQlJaVko2Gf3dxbGprbXN5gYiPk5aWk46HgHlybWpqbXF4f4eNk5WWlI+JgXpzbmtqbHB3foWMkpWWlJCKg3t0b2tqbG91fYSLkZWWlZGLhH11b2xqa290e4OKkJSWlZKMhX53cGxqa25zeoGJj5SWlZONh394cW1qam1yeYCHjpOWlpOPiIF5c21ramxxd3+GjZKVlpSQiYJ7dG5ramxwdn2FjJGVlpSRi4N8dW9ramtvdXyDi5GUlpWRjIV9dnBsamtudHuCiZCUlpWSjYZ/d3Fsamttc3mBiI+TlpaTjoeAeXJtamptcXh/h42TlZaUj4mBenNua2pscHd+hYySlZaUkIqDe3Rva2psb3V9hIuRlZaVkYuEfXVvbGprb3R7g4qQlJaVkoyFfndwbGprbnN6gYmPlJaVk42Hf3hxbWpqbXJ5gIeOk5aWk4+IgXlzbWtqbHF3f4aNkpWWlJCJgnt0bmtqbHB2fYWMkZWWlJGLg3x1b2tqa291fIOLkZSWlZGMhX12cGxqa250e4KJkJSWlZKNhn93cWxqa21zeYGIj5OWlpOOh4B5cm1qam1xeH+HjZOVlpSPiYF6c25ramxwd36FjJKVlpSQioN7dG9ramxvdX2Ei5GVlpWRi4R9dW9samtvdHuDipCUlpWSjIV+d3Bsamtuc3qBiY+UlpWTjYd/eHFtamptcnmAh46TlpaTj4iBeXNta2pscXd/ho2SlZaUkImCe3Rua2pscHZ9hYyRlZaUkYuDfHVva2prb3V8g4uRlJaVkYyFfXZwbGprbnR7gomQlJaVko2Gf3dxbGprbXN5gYiPk5aWk46HgHlybWpqbXF4f4eNk5WWlI+JgXpzbmtqbHB3foWMkpWWlJCKg3t0b2tqbG91fYSLkZWWlZGLhH11b2xqa290e4OKkJSWlZKMhX53cGxqa25zeoGJj5SWlZONh394cW1qam1yeQ==';

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
