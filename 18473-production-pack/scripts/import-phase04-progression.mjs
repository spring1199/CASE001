import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('content/cases/case-001');
const write = (name, value) => writeFileSync(resolve(root, name), `${JSON.stringify(value, null, 2)}\n`);
const existing = (name) => JSON.parse(readFileSync(resolve(root, name), 'utf8'));

const manifest = {
  ...existing('case.json'),
  targetMinutes: 150,
  initialObjectiveIds: ['obj_find_sender'],
  appIds: ['messages', 'gallery', 'calls', 'mail', 'browser', 'notes', 'files', 'settings'],
  progressionComplete: true,
};

const characters = existing('characters.json').map((character) => (
  character.id === 'char_orgil' ? { ...character, age: 42 } : character
));
characters.push(
  { id: 'char_oyunaa', name: 'Оюунаа', role: 'family' },
  { id: 'char_batzorig_father', name: 'Батзориг', role: 'family' },
);

const e = (id, title, sourceArtifactId, description, tags = [], extra = {}) => ({
  id, title, sourceArtifactId, description, tags, ...extra,
});
const evidence = [
  e('ev_missing_article', 'Алга болсон хүний мэдээ', 'browser_001', 'Тэнүүн Батзориг алга болсон тухай нээлттэй мэдээ.', ['opening']),
  e('ev_18473_paper', '18473 гэсэн цаас', 'art_package_note', 'Илгээгчгүй хайрцаг дотор байсан ганц тоо.', ['opening', '18473']),
  e('ev_family_photo', 'Тэнүүний гэр бүлийн зураг', 'photo_family_kitchen', 'Утасны эзнийг гэр бүлийн хүрээнд тогтооно.', ['family']),
  e('ev_childhood_singing', 'Бага насны дуулж буй зураг', 'photo_family_kitchen', 'Тэнүүний дуулдаг байсан үе.', ['family', 'motif']),
  e('ev_ceo_threat', 'Оргилын сүрдүүлэг мэт мессеж', 'msg_orgil_public', 'If this goes public, there is no company left.', ['orgil', 'suspect']),
  e('ev_munkh_last_call', 'Мөнхийн сүүлчийн дуудлага', 'call_munkh_last', 'Тэнүүн өөрийн бүтээсэн системийн хор уршгийг хүлээн зөвшөөрсөн.', ['munkh']),
  e('ev_sealed_audit', 'Sealed GRAPH audit notice', 'mail_winter47', 'WINTER-47 attribution sealed.', ['graph', 'winter47']),
  e('ev_architecture_access', 'Architecture access mail', 'mail_orgil_scope', 'Formal approval-гүй production mirror access.', ['orgil', 'access']),
  e('ev_graph_matrix', 'GRAPH capability matrix', 'file_graph_matrix', 'Identity-аас гадна relationship inference хийдэг.', ['graph']),
  e('ev_saruul_prepaid', 'Танихгүй prepaid дуудлага', 'call_saruul', 'Саруулын хамгаалалтын logistics.', ['saruul']),
  e('ev_shelter_map', 'Shelter map fragment', 'photo_shelter_fragment', 'Хамгаалалтын сүлжээний хэсэг.', ['winter47', 'shelter']),
  e('ev_cabin_plan', 'Cabin plan', 'browser_cabin_plan', 'Тэнүүн ирээдүйгээ бодитоор төлөвлөсөн.', ['hope1']),
  e('ev_raspberry_plan', 'Raspberry — 6', 'file_cabin_budget', 'Cabin budget-ийн жижиг мөр.', ['hope1', 'raspberry']),
  e('ev_vehicle_trace', 'Used vehicle trace', 'photo_old_vehicle', 'Бүртгэлгүй хуучин тээврийн хэрэгслийн мөр.', ['hope1', 'decoy']),
  e('ev_device_hope2', 'Алга болсны дараах device activity', 'device_post_missing', 'Амьд мэт харагдах боловч хуурамч байршлын дохио.', ['hope2']),
  e('ev_tuya_drive', 'Туяагийн encrypted drive', 'photo_tuya_drive', 'Алга болохоос өмнөх handoff.', ['family', 'hope1']),
  e('ev_inc_archive', 'INC-18473 archive header', 'msg_inc_18473', '217 өдрийн сэргээгдсэн яриа.', ['18473'], { grantsFacts: ['fact_18473_archive_open'] }),
  e('ev_f17_laugh', 'CALL_18473_01 инээд', 'call_18473_01', 'Танил сонсогдох инээд.', ['f17', 'identity']),
  e('ev_f17_coriander', 'F17 кориандерт дургүй', 'msg_18473_food', '18473 preference clue.', ['f17', 'identity']),
  e('ev_cafe_receipt', 'Кафены кориандергүй хоол', 'photo_receipt', 'Хоёр уух зүйл, кориандергүй нэг хоол.', ['f17', 'cafe']),
  e('ev_f17_scar', 'Кафены бугуйн сорви', 'photo_cafe_reflection', 'Нүүр танигдахгүй эмэгтэйн бугуйн сорви.', ['f17', 'identity']),
  e('ev_maral_scar', 'Маралын ижил сорви', 'photo_cafe_reflection', 'Одоогийн Маралын сорвитой таарна.', ['f17', 'identity']),
  e('ev_f17_punctuation', 'F17 бичлэгийн хэв маяг', 'msg_18473_style', 'Богино өгүүлбэр, цэг таслал.', ['f17', 'identity']),
  e('ev_maral_writing', 'Маралын бичлэгийн хэв маяг', 'msg_inc_18473', 'F17 sample-тэй давхцана.', ['f17', 'identity']),
  e('ev_f17_cafe_route', 'Кафены route/date match', 'loc_cafe_day', 'Маралын хуучин route ижил өдөр давхцана.', ['f17', 'identity']),
  e('ev_f17_ministry', 'F17 яамны ажлын clue', 'msg_18473_work_hint', 'Гадаад зочдын хөтөлбөрийн мөр.', ['f17', 'identity']),
  e('ev_tenuun_query', 'Unauthorized identity-resolution query', 'file_graph_matrix', 'Тэнүүн access boundary зөрчсөн.', ['graph', 'access']),
  e('ev_private_identity_note', 'USER_6F21 = M.E.', 'note_laugh', 'Тэнүүний нуусан private identity note.', ['f17', 'identity']),
  e('ev_winter47_incident', 'WINTER-47 incident record', 'loc_winter_road', '47 минутын medical-risk timeline.', ['winter47']),
  e('ev_winter47_operator', 'WINTER47_AUDIT_07 operator', 'audit_winter47', 'Unauthorized query operator attribution.', ['winter47'], { hiddenUntilFacts: ['fact_f17_is_maral'] }),
  e('ev_relationship_expansion', 'Shelter relationship expansion', 'photo_shelter_fragment', 'Query shelter-related nodes руу тэлсэн.', ['winter47', 'graph']),
  e('ev_relocation_harm', 'Later harm and relocation', 'photo_shelter_fragment', 'Амжилттай rescue-ийн дараах бодит хор.', ['winter47', 'consequence']),
  e('ev_audit_obscured', 'Tenuun audit modification', 'mail_winter47', 'Тэнүүн attribution trail-ийн хэсгийг бүдгэрүүлсэн.', ['winter47', 'tenuun']),
  e('ev_decoy_plan', 'Decoy edge plan', 'file_decoy_plan', 'If one node must look guilty, use mine.', ['decoy']),
  e('ev_decoy_topology', 'TB-CORE super-node diagram', 'graph_decoy', 'Эмзэг node-уудыг Тэнүүн дээр төвлөрүүлсэн.', ['decoy']),
  e('ev_saruul_decoy', 'Саруулын decoy confirmation', 'msg_saruul', 'Noise edge random биш, Тэнүүн рүү чиглэсэн.', ['decoy', 'saruul']),
  e('ev_live_signal', 'True live signal', 'graph_live_signal', 'Anti-spoof heartbeat + one-time key behavior.', ['hope3', 'finale']),
  e('ev_graph_confidence', 'GRAPH confidence projection', 'doc_graph_help', '41→57→73→88→91 progression.', ['graph', 'finale']),
  e('ev_maral_voice', 'Final autonomy note', 'voice_maral_autonomy', 'Миний өмнөөс битгий сонго.', ['autonomy', 'finale']),
  e('ev_final_call', 'CALL_18473_03', 'call_18473_03', 'Post-choice recovered audio.', ['ending']),
  e('ev_black_ice', 'Black ice photo', 'photo_black_ice', 'Өвлийн замын аюултай нөхцөл.', ['optional', 'winter47']),
  e('ev_accident_report', 'Accident aftermath', 'photo_black_ice', 'Ослын physical cause.', ['optional', 'winter47']),
  e('ev_volunteer_death', 'Volunteer loss record', 'photo_shelter_fragment', 'Rescue aftermath дахь амь насны гарз.', ['optional', 'winter47']),
  e('ev_maral_medical_gap', 'Маралын medical gap', 'loc_winter_road', 'Trauma-related memory gap.', ['optional', 'maral']),
  e('ev_mother_memory', 'Ээжийн withheld-memory record', 'msg_oyunaa', 'Гэр бүлийн хамгаалалт ба нуусан дурсамж.', ['optional', 'family']),
  e('ev_fuel_purchase', 'Old vehicle fuel purchase', 'photo_old_vehicle', 'Cash trail-ийн хэсэг.', ['optional', 'hope1']),
  e('ev_safehouse_geometry', 'Safehouse geometry', 'photo_safehouse', 'Cabin plan-тай хэмжээс давхцана.', ['optional', 'hope3']),
  e('ev_cash_plan', 'Device-free cash plan', 'file_cabin_budget', 'Digital trace үлдээхгүй practical prep.', ['optional', 'hope1']),
  e('ev_bank_hope1', 'Post-missing bank activity', 'txn_post_missing', 'Hope #1; шууд амьд гэдгийг батлахгүй.', ['hope1']),
  e('ev_bilguun_device', 'Билгүүн device-ийг хөдөлгөсөн', 'msg_bilguun_admission', 'Hope #2-ийн үнэн.', ['hope2', 'family']),
  e('ev_tenuun_laugh_note', 'Инээдний private note', 'note_laugh', 'Хэдхэн секунд бүх юм зүгээр мэт.', ['18473']),
  e('ev_f17_thumb_habit', 'F17 stress habit', 'msg_18473_habit', 'Эрхий хуруугаа мааждаг.', ['f17', 'identity']),
  e('ev_graph_confidence_tutorial', 'GRAPH confidence тайлбар', 'doc_graph_help', 'Шинэ холбоос бүр confidence-ийг дахин тооцно.', ['graph'], { grantsFacts: ['fact_graph_recalculates'] }),
  e('ev_f17_edge', 'F17 хамгаалагдсан edge', 'graph_f17', 'Нэргүй хүний зориуд бүдгэрүүлсэн edge.', ['f17']),
];

const d = (id, title, requiredAll, grantsFacts, extra = {}) => ({ id, title, requiredAll, grantsFacts, ...extra });
const deductions = [
  d('ded_planned_disappearance', 'Тэнүүн амиа хорлохоор бус, алга болохоор төлөвлөсөн', ['ev_cabin_plan', 'ev_vehicle_trace', 'ev_tuya_drive'], ['fact_planned_disappearance']),
  d('ded_orgil_context', 'Оргилын сүрдүүлэг бодит боловч аллагын нотолгоо биш', ['ev_ceo_threat', 'ev_architecture_access', 'ev_munkh_last_call'], ['fact_orgil_threat_context']),
  d('ded_munkh_reported', 'Мөнх Тэнүүнийг мэдээлсэн', ['ev_munkh_last_call', 'ev_tenuun_query', 'ev_ceo_threat'], ['fact_munkh_reported']),
  d('ded_bilguun_device', 'Hope #2 бол Билгүүний асаасан төхөөрөмж', ['ev_device_hope2', 'ev_bilguun_device'], ['fact_bilguun_device']),
  d('ded_graph_relationships', 'GRAPH identities-аас гадна relationships resolve хийдэг', ['ev_graph_matrix', 'ev_sealed_audit', 'ev_relationship_expansion'], ['fact_graph_relationships']),
  d('ded_access_violation', 'Тэнүүн whistleblower болохоосоо өмнө access boundary зөрчсөн', ['ev_architecture_access', 'ev_tenuun_query'], ['fact_access_violation']),
  d('ded_f17_cafe', 'F17 ба кафены эмэгтэй нэг хүн', ['ev_cafe_receipt', 'ev_f17_scar', 'ev_f17_cafe_route'], ['fact_f17_cafe_match']),
  {
    id: 'ded_f17_identity', title: 'F17 бол Марал', requiredAll: ['ev_f17_edge'],
    requiredAnyGroups: [[
      'ev_f17_coriander', 'ev_f17_scar', 'ev_f17_thumb_habit', 'ev_f17_punctuation',
      'ev_f17_ministry', 'ev_f17_laugh', 'ev_f17_cafe_route',
    ]],
    minimumFromAnyGroup: 4,
    prerequisiteFacts: ['fact_18473_archive_open', 'fact_f17_cafe_match'],
    grantsFacts: ['fact_f17_is_maral'],
  },
  d('ded_winter47_saved', 'Winter 47 охиныг аварсан', ['ev_winter47_incident', 'ev_black_ice', 'ev_accident_report'], ['fact_winter47_saved']),
  d('ded_winter47_exposed', 'Winter 47 shelter network-ийг ил болгосон', ['ev_relationship_expansion', 'ev_shelter_map', 'ev_relocation_harm'], ['fact_winter47_exposed']),
  d('ded_maral_winter47', 'Winter 47 query-г Марал хийсэн', ['ev_winter47_operator', 'ev_private_identity_note'], ['fact_maral_winter47_operator'], { prerequisiteFacts: ['fact_f17_is_maral'] }),
  d('ded_tenuun_obscured', 'Тэнүүн Маралын attribution-ийг нуусан', ['ev_audit_obscured', 'ev_tenuun_query', 'ev_private_identity_note'], ['fact_tenuun_obscured'], { prerequisiteFacts: ['fact_maral_winter47_operator'] }),
  d('ded_tenuun_decoy', 'Тэнүүн өөрийгөө decoy super-node болгосон', ['ev_decoy_plan', 'ev_decoy_topology', 'ev_saruul_decoy'], ['fact_tenuun_decoy'], { prerequisiteFacts: ['fact_tenuun_obscured'] }),
  d('ded_tenuun_alive', 'Тэнүүн одоо амьд', ['ev_live_signal', 'ev_safehouse_geometry'], ['fact_tenuun_alive'], { prerequisiteFacts: ['fact_tenuun_decoy'] }),
  d('ded_graph_confidence_cost', 'Мөрдлөг үргэлжлэх тусам GRAPH confidence нэмэгддэг', ['ev_graph_confidence', 'ev_graph_confidence_tutorial'], ['fact_graph_confidence_cost']),
  d('ded_autonomy_conflict', 'Хамгаалалт autonomy-г зөрчиж чадна', ['ev_maral_voice', 'ev_audit_obscured'], ['fact_autonomy_conflict'], { kind: 'contradiction' }),
  d('ded_inaction_choice', 'Юу ч хийхгүй байх нь бас сонголт', ['ev_winter47_incident', 'ev_winter47_operator'], ['fact_inaction_choice'], { kind: 'contradiction', prerequisiteFacts: ['fact_f17_is_maral'] }),
];

const facts = [
  { id: 'fact_18473_archive_open', secret: false },
  { id: 'fact_graph_recalculates', secret: false },
  ...[
    ['fact_planned_disappearance', 'ded_planned_disappearance'],
    ['fact_orgil_threat_context', 'ded_orgil_context'],
    ['fact_munkh_reported', 'ded_munkh_reported'],
    ['fact_bilguun_device', 'ded_bilguun_device'],
    ['fact_graph_relationships', 'ded_graph_relationships'],
    ['fact_access_violation', 'ded_access_violation'],
    ['fact_f17_cafe_match', 'ded_f17_cafe'],
    ['fact_f17_is_maral', 'ded_f17_identity'],
    ['fact_winter47_saved', 'ded_winter47_saved'],
    ['fact_winter47_exposed', 'ded_winter47_exposed'],
    ['fact_maral_winter47_operator', 'ded_maral_winter47'],
    ['fact_tenuun_obscured', 'ded_tenuun_obscured'],
    ['fact_tenuun_decoy', 'ded_tenuun_decoy'],
    ['fact_tenuun_alive', 'ded_tenuun_alive'],
    ['fact_graph_confidence_cost', 'ded_graph_confidence_cost'],
    ['fact_autonomy_conflict', 'ded_autonomy_conflict'],
    ['fact_inaction_choice', 'ded_inaction_choice'],
  ].map(([id, reveal]) => ({ id, secret: true, reveal })),
];

const objectives = [
  { id: 'obj_find_sender', title: 'Утасны эзнийг тогтоо', state: 'active', completeWhen: { evidence: 'ev_family_photo' } },
  { id: 'obj_final_72', title: 'Тэнүүний сүүлийн 72 цагийг сэргээ', state: 'locked', activateWhen: { evidence: 'ev_missing_article' }, completeWhen: { fact: 'fact_planned_disappearance' } },
  { id: 'obj_orgil_threat', title: 'Оргил яагаад сүрдүүлснийг тогтоо', state: 'locked', activateWhen: { evidence: 'ev_ceo_threat' }, completeWhen: { fact: 'fact_orgil_threat_context' } },
  { id: 'obj_understand_graph', title: 'GRAPH юу хийдгийг ойлго', state: 'locked', activateWhen: { evidence: 'ev_graph_matrix' }, completeWhen: { fact: 'fact_graph_relationships' } },
  { id: 'obj_protected', title: 'Тэнүүн хэнийг хамгаалсныг ол', state: 'locked', activateWhen: { fact: 'fact_graph_relationships' }, completeWhen: { fact: 'fact_f17_is_maral' } },
  { id: 'obj_open_18473', title: 'INC-18473-г нээ', state: 'locked', activateWhen: { evidence: 'ev_18473_paper' }, completeWhen: { fact: 'fact_18473_archive_open' } },
  { id: 'obj_identify_f17', title: 'F17-г тогтоо', state: 'locked', activateWhen: { fact: 'fact_18473_archive_open' }, completeWhen: { fact: 'fact_f17_is_maral' } },
  { id: 'obj_reconstruct_winter47', title: 'Winter 47-г сэргээ', state: 'locked', activateWhen: { fact: 'fact_f17_is_maral' }, completeWhen: { allFacts: ['fact_winter47_saved', 'fact_winter47_exposed'] } },
  { id: 'obj_operator', title: 'Unauthorized operator-ийг тогтоо', state: 'locked', activateWhen: { fact: 'fact_f17_is_maral' }, completeWhen: { fact: 'fact_maral_winter47_operator' } },
  { id: 'obj_graph_change', title: 'Тэнүүн GRAPH-д юу өөрчилснийг тогтоо', state: 'locked', activateWhen: { fact: 'fact_tenuun_obscured' }, completeWhen: { fact: 'fact_tenuun_decoy' } },
  { id: 'obj_find_tenuun', title: 'Тэнүүн амьд эсэхийг тогтоо', state: 'locked', activateWhen: { fact: 'fact_tenuun_decoy' }, completeWhen: { fact: 'fact_tenuun_alive' } },
  { id: 'obj_final_choice', title: 'Final relationship edge-ийн хувь заяаг шийд', state: 'locked', activateWhen: { fact: 'fact_tenuun_alive' }, completeWhen: { allFacts: ['fact_tenuun_alive', 'fact_autonomy_conflict', 'fact_graph_confidence_cost'] } },
];

const locks = [
  { id: 'lock_18473_archive', title: '18473 archive', unlockWhen: { fact: 'fact_18473_archive_open' } },
  { id: 'lock_winter47_operator', title: 'Winter 47 operator attribution', unlockWhen: { fact: 'fact_f17_is_maral' } },
  { id: 'lock_decoy_plan', title: 'Decoy edge plan', unlockWhen: { fact: 'fact_tenuun_obscured' } },
  { id: 'lock_live_signal', title: 'True live signal', unlockWhen: { fact: 'fact_tenuun_decoy' } },
  { id: 'lock_final_choice', title: 'TRACE / SEVER', unlockWhen: { allFacts: ['fact_tenuun_decoy', 'fact_tenuun_alive'] }, requiredEvidence: ['ev_maral_voice', 'ev_graph_confidence_tutorial'] },
];

const triggers = [
  { id: 'tr_unlock_18473', when: { fact: 'fact_18473_archive_open' }, effects: [{ type: 'unlock', target: 'msg_inc_18473' }] },
  { id: 'tr_unlock_winter47', when: { fact: 'fact_f17_is_maral' }, effects: [{ type: 'unlock', target: 'audit_winter47' }] },
  { id: 'tr_unlock_decoy', when: { fact: 'fact_tenuun_obscured' }, effects: [{ type: 'unlock', target: 'file_decoy_plan' }] },
  { id: 'tr_unlock_live', when: { fact: 'fact_tenuun_decoy' }, effects: [{ type: 'unlock', target: 'graph_live_signal' }] },
  { id: 'tr_unlock_final', when: { allFacts: ['fact_tenuun_decoy', 'fact_tenuun_alive'] }, effects: [{ type: 'unlock', target: 'choice_final' }] },
];

const graph = [
  { recordType: 'node', id: 'node_tenuun', nodeType: 'person', publicLabel: 'TENUUN BATZORIG', canonicalCharacterId: 'char_tenuun', identityRevealFact: 'fact_18473_archive_open' },
  { recordType: 'node', id: 'node_f17', nodeType: 'person', publicLabel: 'F17', canonicalCharacterId: 'char_maral', identityRevealFact: 'fact_f17_is_maral' },
  { recordType: 'node', id: 'node_orgil', nodeType: 'person', publicLabel: 'ORGIL', canonicalCharacterId: 'char_orgil', identityRevealFact: 'fact_orgil_threat_context' },
  { recordType: 'node', id: 'node_munkh', nodeType: 'person', publicLabel: 'MUNKH', canonicalCharacterId: 'char_munkh', identityRevealFact: 'fact_munkh_reported' },
  { recordType: 'node', id: 'node_saruul', nodeType: 'person', publicLabel: 'SARUUL', canonicalCharacterId: 'char_saruul', identityRevealFact: 'fact_tenuun_decoy' },
  { recordType: 'node', id: 'node_bilguun', nodeType: 'person', publicLabel: 'BILGUUN', canonicalCharacterId: 'char_bilguun', identityRevealFact: 'fact_bilguun_device' },
  { recordType: 'node', id: 'node_phone', nodeType: 'device', publicLabel: 'DEVICE / POST-MISSING' },
  { recordType: 'node', id: 'node_shelter', nodeType: 'location', publicLabel: 'PROTECTED NETWORK' },
  { recordType: 'node', id: 'node_safehouse', nodeType: 'location', publicLabel: 'LOCATION: UNKNOWN', hiddenUntilFacts: ['fact_tenuun_alive'] },
  { recordType: 'node', id: 'node_zero', nodeType: 'account', publicLabel: 'NODE: 0', hiddenUntilEndings: ['ending_trace', 'ending_sever'] },
  { recordType: 'edge', id: 'edge_f17_identity', fromNodeId: 'node_f17', toNodeId: 'node_tenuun', label: 'INC-18473', kind: 'inferred', confidenceSources: [{ evidenceId: 'ev_f17_edge', weight: 20 }, { evidenceId: 'ev_f17_laugh', weight: 20 }, { evidenceId: 'ev_f17_scar', weight: 20 }, { evidenceId: 'ev_f17_punctuation', weight: 20 }], hiddenUntilFacts: ['fact_18473_archive_open'] },
  { recordType: 'edge', id: 'edge_orgil_tenuun', fromNodeId: 'node_orgil', toNodeId: 'node_tenuun', label: 'MENTOR / EMPLOYEE', kind: 'observed', confidenceSources: [{ evidenceId: 'ev_ceo_threat', weight: 50 }, { evidenceId: 'ev_architecture_access', weight: 50 }] },
  { recordType: 'edge', id: 'edge_munkh_tenuun', fromNodeId: 'node_munkh', toNodeId: 'node_tenuun', label: 'COLLEAGUE', kind: 'observed', confidenceSources: [{ evidenceId: 'ev_munkh_last_call', weight: 100 }] },
  { recordType: 'edge', id: 'edge_shelter', fromNodeId: 'node_f17', toNodeId: 'node_shelter', label: 'WINTER-47', kind: 'inferred', confidenceSources: [{ evidenceId: 'ev_relationship_expansion', weight: 50 }, { evidenceId: 'ev_relocation_harm', weight: 50 }], hiddenUntilFacts: ['fact_f17_is_maral'] },
  { recordType: 'edge', id: 'edge_bilguun_device', fromNodeId: 'node_bilguun', toNodeId: 'node_phone', label: 'DEVICE ACTIVATION', kind: 'observed', confidenceSources: [{ evidenceId: 'ev_bilguun_device', weight: 100 }], hiddenUntilFacts: ['fact_bilguun_device'] },
  { recordType: 'edge', id: 'edge_tenuun_location', fromNodeId: 'node_tenuun', toNodeId: 'node_safehouse', label: 'FINAL IDENTITY–LOCATION', kind: 'inferred', confidenceSources: [{ evidenceId: 'ev_planned_disappearance', weight: 41 }, { evidenceId: 'ev_decoy_topology', weight: 16 }, { evidenceId: 'ev_live_signal', weight: 16 }, { evidenceId: 'ev_safehouse_geometry', weight: 15 }, { evidenceId: 'ev_graph_confidence', weight: 3 }], hiddenUntilFacts: ['fact_tenuun_alive'], playerCanConfirm: true, playerCanSever: true },
];

// The first confidence source is the authored Hope #1 deduction payoff represented by its core evidence.
graph.at(-1).confidenceSources[0].evidenceId = 'ev_cabin_plan';

const timeline = [
  { recordType: 'position', id: 'tpos_1', title: '72 цагийн өмнө', order: 1 },
  { recordType: 'position', id: 'tpos_2', title: '24 цагийн өмнө', order: 2 },
  { recordType: 'position', id: 'tpos_3', title: 'Алга болсон өдөр', order: 3 },
  { recordType: 'position', id: 'tpos_4', title: 'Алга болсны дараа', order: 4 },
  { recordType: 'position', id: 'tpos_5', title: 'Одоо', order: 5 },
  { recordType: 'event', id: 'tev_drive_handoff', title: 'Туяад encrypted drive өгсөн', acceptablePositionIds: ['tpos_1'], requiredEvidenceIds: ['ev_tuya_drive'] },
  { recordType: 'event', id: 'tev_vehicle', title: 'Хуучин vehicle бэлдсэн', acceptablePositionIds: ['tpos_1', 'tpos_2'], requiredEvidenceIds: ['ev_vehicle_trace'] },
  { recordType: 'event', id: 'tev_saruul', title: 'Саруултай decoy logistics тохирсон', acceptablePositionIds: ['tpos_2'], requiredEvidenceIds: ['ev_saruul_decoy'] },
  { recordType: 'event', id: 'tev_munkh_call', title: 'Мөнхтэй сүүлчийн удаа ярьсан', acceptablePositionIds: ['tpos_3'], requiredEvidenceIds: ['ev_munkh_last_call'] },
  { recordType: 'event', id: 'tev_device', title: 'Билгүүн төхөөрөмж асаасан', acceptablePositionIds: ['tpos_4'], requiredEvidenceIds: ['ev_device_hope2', 'ev_bilguun_device'] },
  { recordType: 'event', id: 'tev_audit', title: 'Winter 47 attribution сэргэсэн', acceptablePositionIds: ['tpos_4'], requiredEvidenceIds: ['ev_winter47_operator'], hiddenUntilFacts: ['fact_f17_is_maral'] },
  { recordType: 'event', id: 'tev_heartbeat', title: 'True live signal ирсэн', acceptablePositionIds: ['tpos_5'], requiredEvidenceIds: ['ev_live_signal'], hiddenUntilFacts: ['fact_tenuun_decoy'] },
  { recordType: 'event', id: 'tev_final_choice', title: 'GRAPH 91% хүрсэн', acceptablePositionIds: ['tpos_5'], requiredEvidenceIds: ['ev_graph_confidence'], hiddenUntilFacts: ['fact_tenuun_alive'] },
];

const endings = [
  { id: 'ending_trace', title: 'TRACE', choiceLabel: 'TRACE', description: 'Final relationship edge-ийг баталгаажуулж Тэнүүний яг байршлыг ил гаргана.', canon: false, gateLockId: 'lock_final_choice', revealsExactLocation: true, onSelect: { confirmGraphEdgeIds: ['edge_tenuun_location'] } },
  { id: 'ending_sever', title: 'SEVER', choiceLabel: 'SEVER', description: 'Final relationship edge-ийг устгаж LOCATION: UNKNOWN үлдээнэ.', canon: true, gateLockId: 'lock_final_choice', revealsExactLocation: false, onSelect: { severGraphEdgeIds: ['edge_tenuun_location'] } },
];

write('case.json', manifest);
write('characters.json', characters);
write('evidence.json', evidence);
write('facts.json', facts);
write('deductions.json', deductions);
write('objectives.json', objectives);
write('locks.json', locks);
write('triggers.json', triggers);
write('endings.json', endings);
write('graph.json', graph);
write('timeline.json', timeline);

console.log(`Imported ${evidence.length} evidence, ${deductions.length} deductions, and ${objectives.length} objectives.`);
