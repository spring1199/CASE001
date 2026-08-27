import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-phase04-content.mjs <authored-markdown>');

const authored = readFileSync(resolve(sourcePath), 'utf8').replace(/\r\n/g, '\n');
const outputRoot = resolve('content/cases/case-001');

function section(start, end) {
  const startIndex = authored.indexOf(start);
  const endIndex = authored.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Missing authored section: ${start}`);
  return authored.slice(startIndex + start.length, endIndex).trim();
}

function dialogueRecords(markdown, prefix) {
  const lines = markdown.split('\n');
  const records = [];
  let contextLabel = '';
  let clockLabel = '';
  const speakerNames = {
    USER_6F21: '18473', ENG_04: 'Тэнүүн', MARAL: '18473', TENUUN: 'Тэнүүн',
    OYUNAA: 'Оюунаа', TUYA: 'Туяа', BILGUUN: 'Билгүүн', ORGIL: 'Оргил',
    MUNKH: 'Мөнх', SARUUL: 'Саруул',
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (/^#{2,4} /.test(line)) {
      contextLabel = line.replace(/^#{2,4}\s+/, '');
      clockLabel = contextLabel;
      continue;
    }
    if (/^\d{2}:\d{2}$/.test(line)) {
      clockLabel = `${contextLabel} · ${line}`;
      continue;
    }

    const speakerMatch = /^([A-Z0-9_]+):$/.exec(line);
    if (!speakerMatch || speakerNames[speakerMatch[1]] === undefined) continue;
    const body = [];
    for (let child = index + 1; child < lines.length; child += 1) {
      const candidate = lines[child].trim();
      if (!candidate) {
        if (body.length > 0) break;
        continue;
      }
      if (/^#{2,4} /.test(candidate) || /^\d{2}:\d{2}$/.test(candidate) || /^([A-Z0-9_]+):$/.test(candidate)) break;
      body.push(candidate);
      index = child;
    }
    if (body.length === 0) continue;
    const senderLabel = speakerNames[speakerMatch[1]];
    records.push({
      id: `${prefix}_${String(records.length + 1).padStart(3, '0')}`,
      senderLabel,
      direction: senderLabel === 'Тэнүүн' ? 'outgoing' : 'incoming',
      body: body.join('\n'),
      timestampLabel: clockLabel || contextLabel || 'Архив',
      read: true,
    });
  }
  return records;
}

function thread(id, title, subtitle, markdown) {
  return { id, kind: 'message-thread', title, subtitle, messages: dialogueRecords(markdown, id) };
}

const incidentMarkdown = section('# 2. INC-18473 MASTER CONVERSATION', '# 3. FINAL RECOVERED AUDIO');
const incident = thread('msg_inc_18473', '18473', '217 өдрийн сэргээгдсэн архив', incidentMarkdown);

const familySections = [
  ['msg_oyunaa', 'Ээж', '## 4.1 TENUUN ↔ OYUNAA (mother)', '## 4.2 TENUUN ↔ TUYA'],
  ['msg_tuya', 'Туяа', '## 4.2 TENUUN ↔ TUYA', '## 4.3 TENUUN ↔ BILGUUN'],
  ['msg_bilguun_admission', 'Билгүүн', '## 4.3 TENUUN ↔ BILGUUN', '---'],
].map(([id, title, start, end]) => thread(id, title, 'Гэр бүл', section(start, end)));

const workSections = [
  ['msg_orgil_public', 'Оргил', '## 5.1 TENUUN ↔ ORGIL SODNOM', '## 5.2 TENUUN ↔ MUNKH'],
  ['msg_munkh', 'Мөнх', '## 5.2 TENUUN ↔ MUNKH', '## 5.3 TENUUN ↔ SARUUL'],
  ['msg_saruul', 'Саруул', '## 5.3 TENUUN ↔ SARUUL', '---'],
].map(([id, title, start, end]) => thread(id, title, 'Ажил', section(start, end)));

const clueMessages = [
  ['msg_18473_food', '18473 · хоол', 'Кориандергүй байвал болно.'],
  ['msg_18473_habit', '18473 · зуршил', 'Стресстэхдээ эрхий хуруугаа маажчихдаг.'],
  ['msg_18473_style', '18473 · бичлэг', 'Богино. Тодорхой.'],
  ['msg_18473_work_hint', '18473 · ажил', 'Яамны гадаад зочдын хөтөлбөр сунжирлаа.'],
].map(([id, title, body]) => ({
  id,
  kind: 'message-thread',
  title,
  subtitle: 'INC-18473 clue extract',
  messages: [{ id: `${id}_01`, senderLabel: '18473', direction: 'incoming', body, timestampLabel: 'INC-18473 clue extract', read: true }],
}));

const fillerTopics = [
  ['msg_delivery', 'Хүргэлт', 'Захиалга үүдэнд ирлээ.'],
  ['msg_building', 'СӨХ', 'Усны засвар 10:00–13:00.'],
  ['msg_internet', 'Интернэт', 'Төлбөр амжилттай.'],
  ['msg_bank_notice', 'Банкны мэдэгдэл', 'Гүйлгээ баталгаажлаа.'],
  ['msg_bookshop', 'Номын дэлгүүр', 'Захиалга бэлэн боллоо.'],
  ['msg_repair', 'Засвар', 'Keyboard-ийн сэлбэг ирсэн.'],
  ['msg_taxi', 'Такси', 'Жолооч 3 минутын дараа очно.'],
  ['msg_grocery', 'Хүнс', 'Талх аваарай.'],
  ['msg_neighbor', 'Хөрш', 'Түлхүүрийг жижүүрт үлдээлээ.'],
  ['msg_weather', 'Цаг агаар', 'Орой цас орно.'],
  ['msg_calendar', 'Calendar', 'Team sync 09:30.'],
  ['msg_hr', 'HR', 'Амралтын хүсэлт хүлээн авлаа.'],
  ['msg_security', 'Security bot', 'Нууц үгээ шинэчилнэ үү.'],
  ['msg_cafe', 'Кафе', 'Таны захиалга бэлэн.'],
  ['msg_pharmacy', 'Эмийн сан', 'Захиалгыг 20:00 хүртэл авна уу.'],
  ['msg_laundry', 'Угаалга', 'Пальто бэлэн болсон.'],
  ['msg_gym', 'Фитнес', 'Гишүүнчлэл дуусахад 3 хоног үлдлээ.'],
  ['msg_bus', 'Автобус', 'Маршрут түр өөрчлөгдлөө.'],
  ['msg_storage', 'Cloud storage', 'Backup дууслаа.'],
  ['msg_music', 'Music', 'Шинэ playlist бэлэн.'],
  ['msg_food_group', 'Өдрийн хоол', 'Ramen авах хүн байна уу?'],
  ['msg_game_group', 'Тоглоом', 'Орой нэг match?'],
  ['msg_alumni', 'Их сургуулийнхан', 'Уулзалт бямба гарагт.'],
  ['msg_office_ops', 'Office ops', 'Кофены машин засвартай.'],
  ['msg_unknown_spam', 'Танихгүй дугаар', 'Сурталчилгааны зурвас хаагдсан.'],
].map(([id, title, body]) => ({
  id, kind: 'message-thread', title, subtitle: 'Ердийн зурвас',
  messages: [{ id: `${id}_01`, senderLabel: title, direction: 'incoming', body, timestampLabel: 'Архив', read: true }],
}));

const messages = [incident, ...familySections, ...workSections, ...clueMessages, ...fillerTopics];

const artifacts = [
  { id: 'art_package_note', kind: 'file', title: '18473', body: 'Илгээгчгүй хайрцаг дотор байсан ганц тоо.', discovery: { evidenceIds: ['ev_18473_paper'] } },
  { id: 'doc_graph_help', kind: 'system-info', title: 'GRAPH confidence', body: 'Баталгаажсан холбоос бүр identity confidence-ийг дахин тооцно.', discovery: { evidenceIds: ['ev_graph_confidence_tutorial'] } },
  { id: 'graph_f17', kind: 'system-info', title: 'F17 хамгаалагдсан edge', body: 'Тэнүүн F17 гэсэн нэргүй хүний холбоосыг зориуд бүдгэрүүлсэн.', discovery: { evidenceIds: ['ev_f17_edge'] } },
  { id: 'audit_winter47', kind: 'file', title: 'WINTER-47 query export', body: 'target: minor F/17\nmedical risk: HIGH\nauthorization: PENDING\nrelationship expansion: ENABLED', hiddenUntilFacts: ['fact_f17_is_maral'], discovery: { evidenceIds: ['ev_winter47_operator'] } },
  { id: 'graph_decoy', kind: 'system-info', title: 'Decoy topology', body: 'Олон эмзэг node TB-CORE дээр зориуд төвлөрсөн.', discovery: { evidenceIds: ['ev_decoy_topology'] } },
  { id: 'graph_live_signal', kind: 'system-info', title: 'Fresh live signal', body: 'Cache, proxy, Билгүүний төхөөрөмжөөр тайлбарлагдахгүй шинэхэн activity.', discovery: { evidenceIds: ['ev_live_signal'] } },
  { id: 'txn_post_missing', kind: 'file', title: 'Post-missing bank activity', body: 'Алга болсны дараах activity. Шууд амьд гэдгийг батлахгүй.', discovery: { evidenceIds: ['ev_bank_hope1'] } },
  { id: 'device_post_missing', kind: 'file', title: 'Post-missing device activity', body: 'Алга болсны дараа төхөөрөмж ассан.', discovery: { evidenceIds: ['ev_device_hope2'] } },
  { id: 'file_graph_matrix', kind: 'file', title: 'GRAPH capability matrix', body: 'identity resolution\nco-location inference\nrecurring-contact inference\nhousehold probability\nemergency re-identification\nmanual override\naudit requirement' },
  { id: 'file_winter47', kind: 'file', title: 'WINTER47 redacted query export', body: 'target: minor F/17\nmedical risk: HIGH\nauthorization: PENDING\nrelationship expansion: ENABLED', deepLinks: [{ label: 'Audit mail', appId: 'mail', contentId: 'mail_winter47' }], hiddenUntilFacts: ['fact_f17_is_maral'], discovery: { evidenceIds: ['ev_winter47_operator'] } },
  { id: 'file_decoy_plan', kind: 'file', title: 'Decoy edge plan', body: 'If one node must look guilty, use mine.', discovery: { evidenceIds: ['ev_decoy_topology'] } },
  { id: 'file_cabin_budget', kind: 'file', title: 'Cabin budget', body: 'Land\nTimber\nSolar\nGreenhouse\nDog fence\nRaspberry — 6', discovery: { evidenceIds: ['ev_raspberry_plan'] } },
];

const browserSearches = [
  'entity resolution probabilistic relationship inference audit',
  'can co-location metadata identify domestic violence shelter',
  'winter tire black ice stopping distance',
  'wooden cabin insulation arvantai province',
  'raspberry greenhouse cold climate',
  'dog breeds good with children cold weather',
  'how to remove metadata from exported logs',
  'encrypted archive dead drop design',
  'selective autobiographical amnesia trauma head injury',
  'how much sunlight does raspberry need',
  'used off-grid vehicle cash purchase',
  'can deleted support call audio be recovered',
  'sore throat tea honey',
  'best cheap ramen near central district',
  'why do people stop singing when older',
];
const browser = browserSearches.map((query, index) => ({
  id: `browser_${String(index + 1).padStart(3, '0')}`,
  kind: 'web-page', title: query, body: `Хайлтын түүх: ${query}`, timestampLabel: 'Архив',
}));
browser.push({ id: 'browser_cabin_plan', kind: 'web-page', title: 'Small Timber House Plan 84m²', body: '2 bedrooms · small office · greenhouse extension', deepLinks: [{ label: 'Cabin budget', appId: 'files', contentId: 'file_cabin_budget' }] });

const finalCallTranscript = section('# 3. FINAL RECOVERED AUDIO — CALL_18473_03', '# 4. FAMILY CHAT CONTENT');
const calls = [
  ['call_mother', 'Ээж', '02:11', 'Ердийн гэр бүлийн яриа.'],
  ['call_tuya', 'Туяа', '05:34', 'Мөнгө болон ах дүүсийн тоглоом.'],
  ['call_munkh_last', 'Мөнх', '08:17', section('### MUNKH_03 — last call transcript, 8m17s selected excerpt', '---')],
  ['call_orgil', 'Оргил', '03:49', 'Халуун маргаан; аллагын нотолгоо биш.'],
  ['call_saruul', 'Танихгүй prepaid', '01:02', 'Саруулын logistics.'],
  ['call_18473_01', '18473', '12:44', section('### Day 61 — Voice troubleshooting call', '### Private note — same night')],
  ['call_18473_02', '18473', '18:09', section('### Day 77 — Voice call', '### Day 83')],
  ['call_18473_03', '18473', 'Сэргээгдсэн', finalCallTranscript],
  ['voice_maral_autonomy', 'Марал · хуучин voice', '00:19', 'Миний өмнөөс битгий шийд.'],
].map(([id, title, durationLabel, transcript]) => ({
  id, kind: 'call', title, subtitle: durationLabel, body: transcript,
  audio: { durationLabel, transcript, productionStatus: 'scripted' },
  ...(id === 'call_18473_03' ? { hiddenUntilEndings: ['ending_trace', 'ending_sever'] } : {}),
}));

const emails = [
  { id: 'mail_accuracy_review', kind: 'mail', title: 'Resolution Accuracy Review — Q3', subtitle: 'Tenuun → Entity Resolution Team', body: 'False-match rate improved after behavioral-pattern weighting, but high-confidence relationship inference should require explicit audit context when used outside emergency workflows.' },
  { id: 'mail_orgil_scope', kind: 'mail', title: 'Re: Access scope', subtitle: 'Orgil → Tenuun', body: 'I approved temporary access for the demo window. Do not turn a process mistake into a moral crisis after the fact. We got the contract because your work functioned under real conditions.' },
  { id: 'mail_winter47', kind: 'mail', title: 'Query Review Request / WINTER-47', subtitle: 'Automated', body: 'An emergency relationship-resolution query associated with incident WINTER-47 has been moved to restricted review. Attribution sealed pending internal assessment.', hiddenUntilFacts: ['fact_f17_is_maral'] },
  { id: 'mail_deleted_draft', kind: 'mail', title: '(subject байхгүй)', subtitle: 'Устгасан draft', body: 'The system did exactly what we taught it to do. That may be the problem.' },
];

const locations = [
  { id: 'loc_cafe_day', kind: 'location', title: 'Roadside café route', body: 'Кафены зураг авсан өдөр Маралын хуучин calendar/route record ижил замтай давхцана.', discovery: { evidenceIds: ['ev_f17_cafe_route'] } },
  { id: 'loc_winter_road', kind: 'location', title: 'WINTER-47 road context', body: 'Black ice болон whiteout нөхцөл.' },
  { id: 'loc_safehouse_class', kind: 'location', title: 'Remote wooden structures', body: 'Яг байршил түгжээтэй.', hiddenUntilFacts: ['fact_tenuun_alive'] },
];

const notes = [
  { id: 'note_cabin', kind: 'note', title: 'Cabin', body: 'Not rich. Quiet.\nBig window facing east.\nKitchen should be larger than living room.\nDog.\n2 kids?\nRaspberry — six plants.' },
  { id: 'note_rule', kind: 'note', title: 'Rule', body: 'A system can be lawful and still be wrong.\nA person can break the law and still save someone.\nNeither sentence cancels the other.' },
  { id: 'note_laugh', kind: 'note', title: 'Инээд', body: 'Тэр инээхээр хэдхэн секунд энэ бүх юм зүгээр юм шиг болдог.', discovery: { evidenceIds: ['ev_tenuun_laugh_note'] } },
];

const meaningfulPhotos = [
  ['photo_family_kitchen', 'Childhood family kitchen', 'FAM-002', 'Залуу Тэнүүн модон халбагаар дуулж, Туяа инээж байна.'],
  ['photo_university_lab', 'University lab', 'WORK-001', 'Тэнүүн, Мөнх, ард нь Оргил.'],
  ['photo_first_badge', 'First office badge', 'WORK-003', 'Тэнүүн Tenkhleg-д орсон өдрийн гэр бүлийн зураг.'],
  ['photo_whiteboard', 'Entity-resolution whiteboard', 'GR-003', 'Холбоосын scoring бүдүүвч.'],
  ['photo_cafe_exterior', 'Roadside café exterior', 'F17-IMG-004', 'Маралын route-тэй давхцах timestamp.'],
  ['photo_cafe_reflection', 'Café reflection', 'REL-002', 'Нүүр танигдахгүй; бугуйн жижиг сорви харагдана.'],
  ['photo_receipt', 'Two drinks', 'F17-IMG-002', 'Хоёр уух зүйл, кориандергүй нэг хоол.'],
  ['photo_cabin', 'Cabin screenshot', 'REL-005', 'Хүлэмжтэй жижиг модон байшингийн sketch.'],
  ['photo_raspberry', 'Raspberry seedlings', 'REL-006', 'Зургаан бөөрөлзгөний суулгац.'],
  ['photo_shelter_fragment', 'Shelter map fragment', 'W47-002', 'Эхэндээ сэжигтэй, дараа нь хамгаалалтын logistics.'],
  ['photo_black_ice', 'Black-ice road', 'W47-001', 'Ослын өмнөх өвлийн аюултай зам.'],
  ['photo_audit_screen', 'Deleted audit screen', 'GR-005', 'WINTER-47 болон partial user code.'],
  ['photo_tuya_drive', 'Туяа ба drive', 'GR-002', 'Ширээн дээр encrypted drive харагдана.'],
  ['photo_old_vehicle', 'Old vehicle', 'DIS-001', 'Хожим escape vehicle гэж танигдана.'],
  ['photo_safehouse', 'Empty wooden interior', 'HOPE-001', 'EXIF арилгасан хэв маяг, байшингийн хэмжээ.'],
];
const fillerAssets = ['LIFE-001','LIFE-002','LIFE-003','LIFE-004','LIFE-005','LIFE-006','LIFE-007','LIFE-008','LIFE-009','LIFE-010','LIFE-011','LIFE-012','FAM-003','FAM-007','FAM-008','WORK-004','WORK-007','WORK-008','DEC-005','TEN-WALL-001'];
const photos = meaningfulPhotos.map(([id, title, assetId, description]) => ({
  id, kind: 'photo', title, visual: { assetId, alt: title, description },
  ...(id === 'photo_cafe_reflection' ? { discovery: { evidenceIds: ['ev_f17_scar'] } } : {}),
}));
fillerAssets.forEach((assetId, index) => photos.push({
  id: `photo_filler_${String(index + 1).padStart(2, '0')}`,
  kind: 'photo', title: `Ердийн зураг ${index + 1}`,
  visual: { assetId, alt: 'Тэнүүний утасны ердийн зураг', description: 'Plot fact нэмэхгүй өдөр тутмын зураг.' },
}));

const outputs = { artifacts, browser, calls, emails, locations, messages, notes, photos };
for (const [name, records] of Object.entries(outputs)) {
  writeFileSync(resolve(outputRoot, `${name}.json`), `${JSON.stringify(records, null, 2)}\n`);
}

console.log(`Imported ${Object.values(outputs).reduce((sum, records) => sum + records.length, 0)} authored records from ${sourcePath}`);
